use candid::{candid_method, export_service, CandidType, Principal};
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse,
    TransformArgs, TransformContext,
};
use ic_cdk::api::management_canister::ecdsa::{
    ecdsa_public_key, sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument,
    SignWithEcdsaArgument,
};
use ic_cdk::{init, post_upgrade, pre_upgrade, query, update};
use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use std::cell::RefCell;
use std::collections::HashMap;

mod types;
use types::*;

#[derive(CandidType, Serialize, Deserialize)]
struct StableState {
    orders: HashMap<String, Order>,
    influencers: HashMap<String, InfluencerProfile>,
    nonce_counter: u64,
    evm_rpc_url: String,
    key_name: String,
    admin: Principal,
}

thread_local! {
    static ORDERS: RefCell<HashMap<String, Order>> = RefCell::new(HashMap::new());
    static INFLUENCERS: RefCell<HashMap<String, InfluencerProfile>> = RefCell::new(HashMap::new());
    static NONCE_COUNTER: RefCell<u64> = RefCell::new(1);
    static EVM_RPC_URL: RefCell<String> = RefCell::new("https://ethereum-sepolia-rpc.publicnode.com".to_string());
    static KEY_NAME: RefCell<String> = RefCell::new("dfx_test_key".to_string());
    static ADMIN: RefCell<Principal> = RefCell::new(Principal::anonymous());
}

#[init]
fn init() {
    ADMIN.with(|a| *a.borrow_mut() = ic_cdk::caller());
    seed_influencer_profiles();
}

#[pre_upgrade]
fn pre_upgrade() {
    let state = StableState {
        orders: ORDERS.with(|o| o.borrow().clone()),
        influencers: INFLUENCERS.with(|i| i.borrow().clone()),
        nonce_counter: NONCE_COUNTER.with(|n| *n.borrow()),
        evm_rpc_url: EVM_RPC_URL.with(|r| r.borrow().clone()),
        key_name: KEY_NAME.with(|k| k.borrow().clone()),
        admin: ADMIN.with(|a| *a.borrow()),
    };
    if let Err(e) = ic_cdk::storage::stable_save((state,)) {
        ic_cdk::trap(&format!("Failed to save state to stable memory: {:?}", e));
    }
}

#[post_upgrade]
fn post_upgrade() {
    match ic_cdk::storage::stable_restore::<(StableState,)>() {
        Ok((state,)) => {
            ORDERS.with(|o| *o.borrow_mut() = state.orders);
            INFLUENCERS.with(|i| *i.borrow_mut() = state.influencers);
            NONCE_COUNTER.with(|n| *n.borrow_mut() = state.nonce_counter);
            EVM_RPC_URL.with(|r| *r.borrow_mut() = state.evm_rpc_url);
            KEY_NAME.with(|k| *k.borrow_mut() = state.key_name);
            ADMIN.with(|a| *a.borrow_mut() = state.admin);
        }
        Err(_) => {
            seed_influencer_profiles();
        }
    }
}

fn seed_influencer_profiles() {
    INFLUENCERS.with(|infs| {
        let mut map = infs.borrow_mut();
        if map.is_empty() {
            let sample_profiles = vec![
                InfluencerProfile {
                    principal: Principal::anonymous(),
                    evm_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                    handle: "@satoshi_vibes".to_string(),
                    platform: "X / Twitter".to_string(),
                    followers: 245_000,
                    avg_views: 68_500,
                    engagement_rate_bps: 420, // 4.2%
                    bot_score_pct: 3,
                },
                InfluencerProfile {
                    principal: Principal::anonymous(),
                    evm_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".to_string(),
                    handle: "@defi_builder".to_string(),
                    platform: "YouTube".to_string(),
                    followers: 128_000,
                    avg_views: 45_000,
                    engagement_rate_bps: 650, // 6.5%
                    bot_score_pct: 1,
                },
                InfluencerProfile {
                    principal: Principal::anonymous(),
                    evm_address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".to_string(),
                    handle: "@eth_narratives".to_string(),
                    platform: "TikTok".to_string(),
                    followers: 512_000,
                    avg_views: 180_000,
                    engagement_rate_bps: 810, // 8.1%
                    bot_score_pct: 4,
                },
                InfluencerProfile {
                    principal: Principal::anonymous(),
                    evm_address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65".to_string(),
                    handle: "@zk_lens".to_string(),
                    platform: "Instagram".to_string(),
                    followers: 89_000,
                    avg_views: 32_000,
                    engagement_rate_bps: 510, // 5.1%
                    bot_score_pct: 2,
                },
            ];

            for p in sample_profiles {
                map.insert(p.evm_address.to_lowercase(), p);
            }
        }
    });
}

// -----------------------------------------------------------------------------
// State Machine Updates
// -----------------------------------------------------------------------------

#[update]
#[candid_method(update)]
pub fn initiate_order(args: CreateOrderArgs) -> Result<Order, String> {
    if args.order_id.trim().is_empty() {
        return Err("order_id cannot be empty".to_string());
    }
    if args.amount_usdc_raw == 0 {
        return Err("Deposit amount must be > 0".to_string());
    }

    let created_at = ic_cdk::api::time();
    let order = Order {
        order_id: args.order_id.clone(),
        evm_tx_hash: args.evm_tx_hash,
        advertiser_address: args.advertiser_address.to_lowercase(),
        influencer_address: args.influencer_address.to_lowercase(),
        amount_usdc_raw: args.amount_usdc_raw,
        status: OrderStatus::Created,
        created_at,
        nonce: 0,
    };

    ORDERS.with(|orders| {
        let mut map = orders.borrow_mut();
        if map.contains_key(&args.order_id) {
            return Err("Order ID already registered".to_string());
        }
        map.insert(args.order_id, order.clone());
        Ok(order)
    })
}

#[update]
#[candid_method(update)]
pub async fn verify_payment(order_id: String) -> Result<Order, String> {
    let mut order = ORDERS.with(|orders| {
        orders.borrow().get(&order_id).cloned().ok_or_else(|| "Order not found".to_string())
    })?;

    if order.status != OrderStatus::Created {
        return Ok(order);
    }

    if order.evm_tx_hash.trim().is_empty() {
        return Err("No EVM transaction hash associated with order".to_string());
    }

    let rpc_url = EVM_RPC_URL.with(|url| url.borrow().clone());

    // Cycle budgeting validation
    let cycles_needed: u128 = 25_000_000_000;
    if ic_cdk::api::canister_balance128() < cycles_needed {
        return Err("Canister cycle reserve below threshold for outbound HTTP RPC".to_string());
    }

    let json_payload = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getTransactionReceipt",
        "params": [order.evm_tx_hash],
        "id": 1
    });

    let body = serde_json::to_vec(&json_payload).map_err(|e| e.to_string())?;

    let request_headers = vec![
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        },
        HttpHeader {
            name: "User-Agent".to_string(),
            value: "TRUST-Protocol-Canister/1.0".to_string(),
        },
    ];

    let request = CanisterHttpRequestArgument {
        url: rpc_url,
        method: HttpMethod::POST,
        body: Some(body),
        max_response_bytes: Some(4096),
        transform: Some(TransformContext::from_name(
            "transform_http_response".to_string(),
            vec![],
        )),
        headers: request_headers,
    };

    match http_request(request, cycles_needed).await {
        Ok((response,)) => {
            if response.status == candid::Nat::from(200u64) {
                let json_res: serde_json::Value =
                    serde_json::from_slice(&response.body).map_err(|e| format!("Invalid JSON response: {}", e))?;

                let result = &json_res["result"];
                if result.is_null() {
                    return Err("Transaction receipt not found or not yet mined on EVM".to_string());
                }

                let status_hex = result["status"].as_str().unwrap_or("0x0");
                if status_hex == "0x1" {
                    order.status = OrderStatus::PaymentVerified;
                    ORDERS.with(|orders| {
                        orders.borrow_mut().insert(order.order_id.clone(), order.clone());
                    });
                    Ok(order)
                } else {
                    Err("Transaction status indicates reverted execution on EVM".to_string())
                }
            } else {
                Err(format!("EVM RPC node returned HTTP error {}", response.status))
            }
        }
        Err((code, msg)) => {
            Err(format!("HTTP outcall failed (code {:?}): {}", code, msg))
        }
    }
}

#[query]
#[candid_method(query)]
pub fn transform_http_response(raw: TransformArgs) -> HttpResponse {
    let mut sanitized = raw.response;
    sanitized.headers = vec![];
    sanitized
}

#[update]
#[candid_method(update)]
pub fn accept_order(order_id: String, influencer_address: String) -> Result<Order, String> {
    ORDERS.with(|orders| {
        let mut map = orders.borrow_mut();
        let order = map.get_mut(&order_id).ok_or_else(|| "Order not found".to_string())?;

        if order.status != OrderStatus::PaymentVerified {
            return Err("Order payment has not been verified yet".to_string());
        }

        if order.influencer_address.to_lowercase() != influencer_address.to_lowercase() {
            return Err("Caller does not match designated influencer".to_string());
        }

        order.status = OrderStatus::Accepted;
        Ok(order.clone())
    })
}

#[update]
#[candid_method(update)]
pub fn submit_proof(args: SubmitProofArgs, caller_address: String) -> Result<Order, String> {
    if args.live_url.trim().is_empty() {
        return Err("Proof live URL cannot be empty".to_string());
    }

    ORDERS.with(|orders| {
        let mut map = orders.borrow_mut();
        let order = map.get_mut(&args.order_id).ok_or_else(|| "Order not found".to_string())?;

        if order.status != OrderStatus::Accepted {
            return Err("Order is not in Accepted status".to_string());
        }

        if order.influencer_address.to_lowercase() != caller_address.to_lowercase() {
            return Err("Only the designated influencer can submit proof".to_string());
        }

        let now = ic_cdk::api::time();
        order.status = OrderStatus::ProofSubmitted {
            live_url: args.live_url,
            platform: args.platform,
            submitted_at: now,
        };

        Ok(order.clone())
    })
}

#[update]
#[candid_method(update)]
pub async fn approve_and_release(
    order_id: String,
    advertiser_address: String,
    chain_id: u64,
    verifying_contract: String,
) -> Result<SettlementSignatureResponse, String> {
    let caller = ic_cdk::caller();
    let is_admin = ADMIN.with(|a| *a.borrow() == caller);

    let mut order = ORDERS.with(|orders| {
        orders.borrow().get(&order_id).cloned().ok_or_else(|| "Order not found".to_string())
    })?;

    // Access control: only the campaign advertiser or canister admin may approve
    if !is_admin && order.advertiser_address.to_lowercase() != advertiser_address.to_lowercase() {
        return Err("Only the campaign advertiser or admin can approve content".to_string());
    }

    match order.status {
        OrderStatus::ProofSubmitted { .. } => {},
        _ => return Err("Order does not have proof submitted for approval".to_string()),
    }

    // Allocate single-use nonce
    let assigned_nonce = NONCE_COUNTER.with(|cnt| {
        let mut c = cnt.borrow_mut();
        let val = *c;
        *c += 1;
        val
    });

    order.nonce = assigned_nonce;
    order.status = OrderStatus::Approved;

    // Calculate EIP-712 Hash matching TrustEscrow.sol
    // RELEASE_TYPEHASH = keccak256("ReleasePayout(bytes32 orderId,address influencer,uint256 amount,uint256 nonce)")
    let release_typehash = keccak256(b"ReleasePayout(bytes32 orderId,address influencer,uint256 amount,uint256 nonce)");

    // Convert orderId string to bytes32 (padded)
    let mut order_id_bytes = [0u8; 32];
    let raw_bytes = order.order_id.as_bytes();
    let len = raw_bytes.len().min(32);
    order_id_bytes[..len].copy_from_slice(&raw_bytes[..len]);

    // Parse influencer address into 20 bytes
    let clean_addr = order.influencer_address.trim_start_matches("0x");
    let addr_bytes = hex::decode(clean_addr).map_err(|_| "Invalid influencer address hex".to_string())?;
    if addr_bytes.len() != 20 {
        return Err("Influencer address must be 20 bytes".to_string());
    }
    let mut influencer_padded = [0u8; 32];
    influencer_padded[12..32].copy_from_slice(&addr_bytes);

    let amount_u256 = u64_to_u256_be(order.amount_usdc_raw);
    let nonce_u256 = u64_to_u256_be(assigned_nonce);

    let mut struct_preimage = Vec::with_capacity(32 * 5);
    struct_preimage.extend_from_slice(&release_typehash);
    struct_preimage.extend_from_slice(&order_id_bytes);
    struct_preimage.extend_from_slice(&influencer_padded);
    struct_preimage.extend_from_slice(&amount_u256);
    struct_preimage.extend_from_slice(&nonce_u256);
    let struct_hash = keccak256(&struct_preimage);

    // EIP-712 Domain Separator
    let domain_typehash = keccak256(b"EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    let name_hash = keccak256(b"TRUST_ESCROW");
    let version_hash = keccak256(b"1.0.0");
    let chain_id_u256 = u64_to_u256_be(chain_id);

    let clean_contract = verifying_contract.trim_start_matches("0x");
    let contract_bytes = hex::decode(clean_contract).map_err(|_| "Invalid verifying contract hex".to_string())?;
    if contract_bytes.len() != 20 {
        return Err("Verifying contract must be 20 bytes".to_string());
    }
    let mut contract_padded = [0u8; 32];
    contract_padded[12..32].copy_from_slice(&contract_bytes);

    let mut domain_preimage = Vec::with_capacity(32 * 5);
    domain_preimage.extend_from_slice(&domain_typehash);
    domain_preimage.extend_from_slice(&name_hash);
    domain_preimage.extend_from_slice(&version_hash);
    domain_preimage.extend_from_slice(&chain_id_u256);
    domain_preimage.extend_from_slice(&contract_padded);
    let domain_separator = keccak256(&domain_preimage);

    // Final digest: keccak256("\x19\x01" || domainSeparator || structHash)
    let mut digest_preimage = Vec::with_capacity(2 + 32 + 32);
    digest_preimage.extend_from_slice(&[0x19, 0x01]);
    digest_preimage.extend_from_slice(&domain_separator);
    digest_preimage.extend_from_slice(&struct_hash);
    let digest = keccak256(&digest_preimage);

    // Request t-ECDSA signature from ICP management canister
    let sign_arg = SignWithEcdsaArgument {
        message_hash: digest.to_vec(),
        derivation_path: settlement_derivation_path(),
        key_id: settlement_key_id(),
    };

    let (sign_res,) = sign_with_ecdsa(sign_arg)
        .await
        .map_err(|(code, msg)| format!("t-ECDSA sign failed (code {:?}): {}", code, msg))?;

    // t-ECDSA returns 64-byte r||s; TrustEscrow.sol (ecrecover) needs r||s||v.
    let public_key = settlement_public_key().await?;
    let signature = to_evm_signature(&digest, &sign_res.signature, &public_key)?;
    let signature_hex = format!("0x{}", hex::encode(signature));

    ORDERS.with(|orders| {
        orders.borrow_mut().insert(order.order_id.clone(), order.clone());
    });

    Ok(SettlementSignatureResponse {
        order_id: order.order_id,
        influencer_address: order.influencer_address,
        amount_usdc_raw: order.amount_usdc_raw,
        nonce: assigned_nonce,
        signature_hex,
    })
}

/// Ethereum address of the canister's settlement key. Pass it as ICP_SIGNER_ADDRESS
/// when deploying TrustEscrow.sol so on-chain verification accepts canister signatures.
#[update]
#[candid_method(update)]
pub async fn get_evm_signer_address() -> Result<String, String> {
    let public_key = settlement_public_key().await?;
    evm_address_from_sec1(&public_key)
}

/// Admin-only: the analytics service pushes refreshed creator metrics.
#[update]
#[candid_method(update)]
pub fn update_influencer_metrics(
    evm_address: String,
    followers: u64,
    engagement_rate_bps: u32,
    bot_score_pct: u8,
) -> Result<bool, String> {
    if !ADMIN.with(|a| *a.borrow() == ic_cdk::caller()) {
        return Err("Only the canister admin can update metrics".to_string());
    }
    if bot_score_pct > 100 {
        return Err("bot_score_pct must be 0-100".to_string());
    }
    INFLUENCERS.with(|infs| {
        let mut map = infs.borrow_mut();
        let profile = map
            .get_mut(&evm_address.to_lowercase())
            .ok_or_else(|| "Influencer not registered".to_string())?;
        profile.followers = followers;
        profile.engagement_rate_bps = engagement_rate_bps;
        profile.bot_score_pct = bot_score_pct;
        Ok(true)
    })
}

// -----------------------------------------------------------------------------
// Queries & Influencer Registry
// -----------------------------------------------------------------------------

#[query]
#[candid_method(query)]
pub fn get_order(order_id: String) -> Option<Order> {
    ORDERS.with(|orders| orders.borrow().get(&order_id).cloned())
}

#[query]
#[candid_method(query)]
pub fn list_orders() -> Vec<Order> {
    ORDERS.with(|orders| orders.borrow().values().cloned().collect())
}

#[query]
#[candid_method(query)]
pub fn list_influencers() -> Vec<InfluencerProfile> {
    INFLUENCERS.with(|infs| infs.borrow().values().cloned().collect())
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak256::new();
    hasher.update(data);
    let result = hasher.finalize();
    let mut out = [0u8; 32];
    out.copy_from_slice(&result);
    out
}

fn settlement_key_id() -> EcdsaKeyId {
    EcdsaKeyId {
        curve: EcdsaCurve::Secp256k1,
        name: KEY_NAME.with(|k| k.borrow().clone()),
    }
}

fn settlement_derivation_path() -> Vec<Vec<u8>> {
    vec![b"trust_escrow_settlement".to_vec()]
}

async fn settlement_public_key() -> Result<Vec<u8>, String> {
    let (res,) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: None,
        derivation_path: settlement_derivation_path(),
        key_id: settlement_key_id(),
    })
    .await
    .map_err(|(code, msg)| format!("t-ECDSA public key fetch failed (code {:?}): {}", code, msg))?;
    Ok(res.public_key)
}

/// Converts a 64-byte r||s signature into the 65-byte r||s||v form ecrecover expects,
/// normalising s to the lower half-order (TrustEscrow rejects high-s signatures).
fn to_evm_signature(digest: &[u8; 32], sig64: &[u8], public_key_sec1: &[u8]) -> Result<[u8; 65], String> {
    let mut sig = Signature::from_slice(sig64).map_err(|e| format!("Invalid t-ECDSA signature: {}", e))?;
    if let Some(normalized) = sig.normalize_s() {
        sig = normalized;
    }
    let expected = VerifyingKey::from_sec1_bytes(public_key_sec1).map_err(|e| format!("Invalid public key: {}", e))?;

    for rid in 0u8..2 {
        let recovery_id = RecoveryId::from_byte(rid).expect("0 and 1 are valid recovery ids");
        if let Ok(recovered) = VerifyingKey::recover_from_prehash(digest, &sig, recovery_id) {
            if recovered == expected {
                let mut out = [0u8; 65];
                out[..64].copy_from_slice(&sig.to_bytes());
                out[64] = 27 + rid;
                return Ok(out);
            }
        }
    }
    Err("Could not derive recovery id for t-ECDSA signature".to_string())
}

fn evm_address_from_sec1(public_key_sec1: &[u8]) -> Result<String, String> {
    let key = VerifyingKey::from_sec1_bytes(public_key_sec1).map_err(|e| format!("Invalid public key: {}", e))?;
    let uncompressed = key.to_encoded_point(false);
    let hash = keccak256(&uncompressed.as_bytes()[1..]);
    Ok(format!("0x{}", hex::encode(&hash[12..])))
}

fn u64_to_u256_be(val: u64) -> [u8; 32] {
    let mut buf = [0u8; 32];
    buf[24..32].copy_from_slice(&val.to_be_bytes());
    buf
}

export_service!();

#[query(name = "__get_candid_interface_tmp_hack")]
fn export_candid() -> String {
    __export_service()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn order_args(order_id: &str, amount: u64) -> CreateOrderArgs {
        CreateOrderArgs {
            order_id: order_id.to_string(),
            evm_tx_hash: "0x123".to_string(),
            advertiser_address: "0x1111111111111111111111111111111111111111".to_string(),
            influencer_address: "0x2222222222222222222222222222222222222222".to_string(),
            amount_usdc_raw: amount,
        }
    }

    // initiate_order's happy path calls ic_cdk::api::time(), which only exists inside a
    // canister; these cover the validation that runs before it.
    #[test]
    fn test_initiate_order_validation() {
        assert!(initiate_order(order_args("  ", 1_000_000)).is_err());
        assert!(initiate_order(order_args("ord_unit_test_1", 0)).is_err());
    }

    #[test]
    fn test_evm_signature_recovery() {
        use k256::ecdsa::SigningKey;
        let signing_key = SigningKey::from_slice(&[7u8; 32]).unwrap();
        let digest = keccak256(b"settlement digest");
        let (sig, _) = signing_key.sign_prehash_recoverable(&digest).unwrap();
        let public_key = signing_key.verifying_key().to_encoded_point(true);

        let evm_sig = to_evm_signature(&digest, &sig.to_bytes(), public_key.as_bytes()).unwrap();
        let v = evm_sig[64];
        assert!(v == 27 || v == 28);
        let recovered = VerifyingKey::recover_from_prehash(
            &digest,
            &Signature::from_slice(&evm_sig[..64]).unwrap(),
            RecoveryId::from_byte(v - 27).unwrap(),
        )
        .unwrap();
        assert_eq!(&recovered, signing_key.verifying_key());
    }

    #[test]
    fn test_keccak256_hashing() {
        let hash = keccak256(b"TRUST_ESCROW");
        assert_ne!(hash, [0u8; 32]);
    }

    #[test]
    fn test_u64_to_u256_be() {
        let res = u64_to_u256_be(256);
        assert_eq!(res[30], 1);
        assert_eq!(res[31], 0);
    }
}
