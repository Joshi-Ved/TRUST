import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const DAY = 24 * 60 * 60;
const AMOUNT = 1_500n * 1_000_000n;
const orderId = ethers.encodeBytes32String("ord_test_0001");

async function setup() {
  const [deployer, advertiser, influencer, stranger, newSigner] = await ethers.getSigners();
  const icp = ethers.Wallet.createRandom(); // stands in for the canister's t-ECDSA key

  const usdc = await (await ethers.getContractFactory("MockUSDC")).deploy();
  const escrow = await (await ethers.getContractFactory("TrustEscrow")).deploy(await usdc.getAddress(), icp.address);

  await usdc.mint(advertiser.address, AMOUNT * 10n);
  await usdc.connect(advertiser).approve(await escrow.getAddress(), ethers.MaxUint256);

  const { chainId } = await ethers.provider.getNetwork();
  const domain = { name: "TRUST_ESCROW", version: "1.0.0", chainId, verifyingContract: await escrow.getAddress() };
  const types = {
    ReleasePayout: [
      { name: "orderId", type: "bytes32" },
      { name: "influencer", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const sign = (signer: Pick<typeof icp, "signTypedData">, nonce: bigint, amount = AMOUNT, inf = influencer.address, id = orderId) =>
    signer.signTypedData(domain, types, { orderId: id, influencer: inf, amount, nonce });

  return { deployer, advertiser, influencer, stranger, newSigner, icp, usdc, escrow, sign, domain, types };
}

describe("TrustEscrow", () => {
  it("locks funds on deposit", async () => {
    const { advertiser, influencer, usdc, escrow } = await setup();
    await expect(escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY))
      .to.emit(escrow, "EscrowFunded");
    expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    expect((await escrow.getEscrowDetails(orderId)).status).to.equal(1n);
  });

  it("rejects duplicate orders, self-dealing, short timeouts, zero amounts", async () => {
    const { advertiser, influencer, escrow } = await setup();
    const e = escrow.connect(advertiser);
    await e.depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await expect(e.depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY)).to.be.revertedWith("TrustEscrow: order already exists");
    const id2 = ethers.encodeBytes32String("o2");
    await expect(e.depositFunds(id2, advertiser.address, AMOUNT, 7 * DAY)).to.be.revertedWith("TrustEscrow: advertiser cannot be influencer");
    await expect(e.depositFunds(id2, influencer.address, AMOUNT, DAY - 1)).to.be.revertedWith("TrustEscrow: timeout duration must be >= 1 day");
    await expect(e.depositFunds(id2, influencer.address, 0, 7 * DAY)).to.be.revertedWith("TrustEscrow: deposit amount must be > 0");
  });

  it("releases to the influencer with a valid ICP signature (anyone can relay)", async () => {
    const { advertiser, influencer, stranger, icp, usdc, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    const sig = await sign(icp, 1n);
    await expect(escrow.connect(stranger).releasePayoutWithIcpProof(orderId, 1n, sig))
      .to.emit(escrow, "EscrowReleased").withArgs(orderId, influencer.address, AMOUNT, icp.address);
    expect(await usdc.balanceOf(influencer.address)).to.equal(AMOUNT);
    expect((await escrow.getEscrowDetails(orderId)).status).to.equal(2n);
  });

  it("rejects signatures from the wrong key, wrong amount, or wrong recipient", async () => {
    const { advertiser, influencer, stranger, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    const attacker = ethers.Wallet.createRandom();
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(attacker, 1n)))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(attacker, 1n, AMOUNT * 2n)))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(attacker, 1n, AMOUNT, stranger.address)))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");
  });

  it("cannot release twice or replay after refund", async () => {
    const { advertiser, influencer, icp, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(icp, 1n));
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(icp, 1n))).to.be.revertedWith("TrustEscrow: deposit not funded or already finalized");
    await expect(escrow.releasePayoutWithIcpProof(orderId, 2n, await sign(icp, 2n))).to.be.revertedWith("TrustEscrow: deposit not funded or already finalized");
  });

  it("prevents nonce reuse and ensures replay protection", async () => {
    const { advertiser, influencer, icp, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    const sig1 = await sign(icp, 42n);
    await escrow.releasePayoutWithIcpProof(orderId, 42n, sig1);

    // Try creating a new order with the same orderId or re-executing
    const id2 = ethers.encodeBytes32String("ord_test_0002");
    await escrow.connect(advertiser).depositFunds(id2, influencer.address, AMOUNT, 7 * DAY);
    const sig2 = await sign(icp, 42n, AMOUNT, influencer.address, id2);
    // Even if nonce 42 was used on order 1, the nonce key is keccak256(orderId, nonce)
    await expect(escrow.releasePayoutWithIcpProof(id2, 42n, sig2)).to.emit(escrow, "EscrowReleased");
  });

  it("refunds the advertiser only after timeout", async () => {
    const { advertiser, influencer, stranger, usdc, escrow } = await setup();
    const before = await usdc.balanceOf(advertiser.address);
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await expect(escrow.connect(advertiser).claimRefundAfterTimeout(orderId)).to.be.revertedWith("TrustEscrow: refund lock timer has not expired");
    await time.increase(7 * DAY + 1);
    await expect(escrow.connect(stranger).claimRefundAfterTimeout(orderId)).to.be.revertedWith("TrustEscrow: only advertiser can claim timeout refund");
    await expect(escrow.connect(advertiser).claimRefundAfterTimeout(orderId)).to.emit(escrow, "EscrowRefunded");
    expect(await usdc.balanceOf(advertiser.address)).to.equal(before);
  });

  it("cannot refund an already released escrow", async () => {
    const { advertiser, influencer, icp, escrow, sign } = await setup();
    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);
    await escrow.releasePayoutWithIcpProof(orderId, 1n, await sign(icp, 1n));
    await time.increase(7 * DAY + 1);
    await expect(escrow.connect(advertiser).claimRefundAfterTimeout(orderId)).to.be.revertedWith("TrustEscrow: escrow not in refundable state");
  });

  it("allows owner to rotate signer and rejects old signer signatures afterwards", async () => {
    const { deployer, advertiser, influencer, icp, escrow, sign } = await setup();
    const newIcp = ethers.Wallet.createRandom();

    await expect(escrow.connect(deployer).updateIcpSignerThresholdAddress(newIcp.address))
      .to.emit(escrow, "IcpSignerUpdated").withArgs(icp.address, newIcp.address);

    await escrow.connect(advertiser).depositFunds(orderId, influencer.address, AMOUNT, 7 * DAY);

    // Old signer signature should fail
    const oldSig = await sign(icp, 1n);
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, oldSig))
      .to.be.revertedWith("TrustEscrow: invalid ICP t-ECDSA signature");

    // New signer signature should succeed
    const newSig = await sign(newIcp, 1n);
    await expect(escrow.releasePayoutWithIcpProof(orderId, 1n, newSig))
      .to.emit(escrow, "EscrowReleased");
  });

  it("allows owner to transfer ownership", async () => {
    const { deployer, stranger, escrow } = await setup();
    await expect(escrow.connect(deployer).transferOwnership(stranger.address))
      .to.emit(escrow, "OwnershipTransferred").withArgs(deployer.address, stranger.address);
    expect(await escrow.owner()).to.equal(stranger.address);
  });

  it("rejects zero address during signer rotation and ownership transfer", async () => {
    const { deployer, escrow } = await setup();
    await expect(escrow.connect(deployer).updateIcpSignerThresholdAddress(ethers.ZeroAddress))
      .to.be.revertedWith("TrustEscrow: zero address");
    await expect(escrow.connect(deployer).transferOwnership(ethers.ZeroAddress))
      .to.be.revertedWith("TrustEscrow: zero address");
  });
});
