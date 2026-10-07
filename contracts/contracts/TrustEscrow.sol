// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @dev Minimal interface for ERC20 token interactions (e.g. USDC).
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

/**
 * @dev OpenZeppelin Contracts (last updated v5.0.0) ECDSA verification library.
 */
library ECDSA {
    enum RecoverError {
        NoError,
        InvalidSignature,
        InvalidSignatureLength,
        InvalidSignatureS
    }

    function tryRecover(bytes32 hash, bytes memory signature) internal pure returns (address, RecoverError) {
        if (signature.length != 65) {
            return (address(0), RecoverError.InvalidSignatureLength);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E735E3A0B17DFE6AE0F400966B4) {
            return (address(0), RecoverError.InvalidSignatureS);
        }

        address signer = ecrecover(hash, v, r, s);
        if (signer == address(0)) {
            return (address(0), RecoverError.InvalidSignature);
        }

        return (signer, RecoverError.NoError);
    }

    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        (address signer, RecoverError error) = tryRecover(hash, signature);
        require(error == RecoverError.NoError, "ECDSA: invalid signature");
        return signer;
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
    }

    function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}

/**
 * @title TrustEscrow
 * @author TRUST Platform Team
 * @notice Production-grade smart escrow enabling trustless USDC deposits for influencer ad orders.
 * Releases are gated by cryptographic threshold ECDSA (t-ECDSA) signatures produced by
 * the verified Internet Computer (ICP) Reputation and Settlement Canister.
 */
contract TrustEscrow {
    using ECDSA for bytes32;

    enum EscrowStatus {
        None,
        Funded,
        Released,
        Refunded
    }

    struct EscrowDeposit {
        bytes32 orderId;           // Unique order identifier (generated off-chain/ICP)
        address advertiser;        // Campaign creator / payer
        address influencer;        // Recipient influencer address
        uint256 amount;            // Escrow token amount (USDC, 6 decimals)
        uint256 lockTimestamp;     // Block timestamp when funds were locked
        uint256 timeoutDuration;   // Expiration threshold in seconds before refund is eligible
        EscrowStatus status;       // Current lifecycle state
    }

    IERC20 public immutable token;
    address public icpSignerThresholdAddress;
    address public owner;

    // EIP-712 Domain Separator & Typehashes
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant RELEASE_TYPEHASH = keccak256(
        "ReleasePayout(bytes32 orderId,address influencer,uint256 amount,uint256 nonce)"
    );

    // Mappings
    mapping(bytes32 => EscrowDeposit) public escrows;
    mapping(bytes32 => bool) public executedNonces;
    mapping(address => uint256) public userNonces;

    // Events
    event EscrowFunded(
        bytes32 indexed orderId,
        address indexed advertiser,
        address indexed influencer,
        uint256 amount,
        uint256 timeoutDuration,
        uint256 lockTimestamp
    );

    event EscrowReleased(
        bytes32 indexed orderId,
        address indexed influencer,
        uint256 amount,
        address signer
    );

    event EscrowRefunded(
        bytes32 indexed orderId,
        address indexed advertiser,
        uint256 amount
    );

    event IcpSignerUpdated(
        address indexed oldSigner,
        address indexed newSigner
    );

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "TrustEscrow: caller is not the owner");
        _;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status;

    /**
     * @param _token ERC20 token address (USDC)
     * @param _icpSigner Initial t-ECDSA derived Ethereum public address corresponding to ICP Canister
     */
    constructor(address _token, address _icpSigner) {
        require(_token != address(0), "TrustEscrow: invalid token");
        require(_icpSigner != address(0), "TrustEscrow: invalid signer");

        token = IERC20(_token);
        icpSignerThresholdAddress = _icpSigner;
        owner = msg.sender;
        _status = _NOT_ENTERED;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("TRUST_ESCROW")),
                keccak256(bytes("1.0.0")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Locks ERC20 tokens into escrow for a specific campaign order.
     * @param orderId Unique deterministic order identifier (UUID or bytes32 hash)
     * @param influencer Designated beneficiary wallet
     * @param amount Token amount to lock (must be approved first)
     * @param timeoutDuration Delay in seconds before advertiser can claim a unilateral refund if unfulfilled
     */
    function depositFunds(
        bytes32 orderId,
        address influencer,
        uint256 amount,
        uint256 timeoutDuration
    ) external nonReentrant {
        require(orderId != bytes32(0), "TrustEscrow: invalid orderId");
        require(influencer != address(0), "TrustEscrow: invalid influencer address");
        require(influencer != msg.sender, "TrustEscrow: advertiser cannot be influencer");
        require(amount > 0, "TrustEscrow: deposit amount must be > 0");
        require(timeoutDuration >= 1 days, "TrustEscrow: timeout duration must be >= 1 day");
        require(escrows[orderId].status == EscrowStatus.None, "TrustEscrow: order already exists");

        escrows[orderId] = EscrowDeposit({
            orderId: orderId,
            advertiser: msg.sender,
            influencer: influencer,
            amount: amount,
            lockTimestamp: block.timestamp,
            timeoutDuration: timeoutDuration,
            status: EscrowStatus.Funded
        });

        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "TrustEscrow: transferFrom failed");

        emit EscrowFunded(orderId, msg.sender, influencer, amount, timeoutDuration, block.timestamp);
    }

    /**
     * @notice Releases escrowed funds to influencer upon presentation of a valid t-ECDSA signature from ICP Canister.
     * @param orderId Identifier of the order
     * @param nonce Replay prevention nonce assigned by the settlement canister
     * @param signature Cryptographic 65-byte threshold ECDSA signature
     */
    function releasePayoutWithIcpProof(
        bytes32 orderId,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        EscrowDeposit storage deposit = escrows[orderId];
        require(deposit.status == EscrowStatus.Funded, "TrustEscrow: deposit not funded or already finalized");

        bytes32 nonceKey = keccak256(abi.encodePacked(orderId, nonce));
        require(!executedNonces[nonceKey], "TrustEscrow: nonce already consumed");
        executedNonces[nonceKey] = true;

        // Construct EIP-712 Digest
        bytes32 structHash = keccak256(
            abi.encode(
                RELEASE_TYPEHASH,
                orderId,
                deposit.influencer,
                deposit.amount,
                nonce
            )
        );
        bytes32 digest = ECDSA.toTypedDataHash(DOMAIN_SEPARATOR, structHash);

        // Verify signer is the ICP Canister threshold key
        address recoveredSigner = ECDSA.recover(digest, signature);
        require(recoveredSigner == icpSignerThresholdAddress, "TrustEscrow: invalid ICP t-ECDSA signature");

        deposit.status = EscrowStatus.Released;

        bool success = token.transfer(deposit.influencer, deposit.amount);
        require(success, "TrustEscrow: payout transfer failed");

        emit EscrowReleased(orderId, deposit.influencer, deposit.amount, recoveredSigner);
    }

    /**
     * @notice Allows advertiser to trigger an emergency/timelock refund if content was unfulfilled and timeout elapsed.
     * @param orderId Identifier of the order to refund
     */
    function claimRefundAfterTimeout(bytes32 orderId) external nonReentrant {
        EscrowDeposit storage deposit = escrows[orderId];
        require(deposit.status == EscrowStatus.Funded, "TrustEscrow: escrow not in refundable state");
        require(msg.sender == deposit.advertiser, "TrustEscrow: only advertiser can claim timeout refund");
        require(
            block.timestamp >= deposit.lockTimestamp + deposit.timeoutDuration,
            "TrustEscrow: refund lock timer has not expired"
        );

        deposit.status = EscrowStatus.Refunded;

        bool success = token.transfer(deposit.advertiser, deposit.amount);
        require(success, "TrustEscrow: refund transfer failed");

        emit EscrowRefunded(orderId, deposit.advertiser, deposit.amount);
    }

    /**
     * @notice Admin function to rotate ICP threshold signer key if canister upgrades or subnet changes.
     */
    function updateIcpSignerThresholdAddress(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "TrustEscrow: zero address");
        address old = icpSignerThresholdAddress;
        icpSignerThresholdAddress = _newSigner;
        emit IcpSignerUpdated(old, _newSigner);
    }

    /**
     * @notice Admin ownership management.
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "TrustEscrow: zero address");
        emit OwnershipTransferred(owner, _newOwner);
        owner = _newOwner;
    }

    /**
     * @notice View function to retrieve full details of an escrow deposit.
     */
    function getEscrowDetails(bytes32 orderId) external view returns (EscrowDeposit memory) {
        return escrows[orderId];
    }
}
