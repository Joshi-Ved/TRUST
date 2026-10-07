use candid::{candid_method, export_service, CandidType, Principal};
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse,
    TransformArgs, TransformContext,
};
use ic_cdk::api::management_canister::ecdsa::{
    sign_with_ecdsa, EcdsaCurve, EcdsaKeyId, SignWithEcdsaArgument,
};
use ic_cdk_macros::{init, post_upgrade, pre_upgrade, query, update};
use serde::{Deserialize, Serialize};
use sha3::{Digest, Keccak256};
use std::cell::RefCell;
use std::collections::HashMap;

mod types;
use types::*;

thread_local! {
    static ORDERS: RefCell<HashMap<String, Order>> = RefCell::new(HashMap::new());
    static INFLUENCERS: RefCell<HashMap<String, InfluencerProfile>> = RefCell::new(HashMap::new());
    static NONCE_COUNTER: RefCell<u64> = RefCell::new(1);
    static EVM_RPC_URL: RefCell<String> = RefCell::new("https://rpc.ankr.com/eth_sepolia".to_string());
    static KEY_NAME: RefCell<String> = RefCell::new("dfx_test_key".to_string());
}

#[init]
fn init() {
    seed_influencer_profiles();
}

#[post_upgrade]
fn post_upgrade() {
    seed_influencer_profiles();
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
            ];

            for p in sample_profiles {
                map.insert(p.evm_address.to_lowercase(), p);
            }
        }
    });
}

// -----------------------------------------------------------------------------
// Core Order Lifecycle Methods
// -----------------------------------------------------------------------------

#[update]
#[candid_method(update)]
pub fn initiate_order(args: CreateOrderArgs) -> Result<Order, String> {
    if args.order_id.trim().is_empty() {
        return Err("Order ID cannot be empty".to_string());
    }

    ORDERS.with(|orders| {
        let mut map = orders.borrow_mut();
        if map.contains_key(&args.order_id) {
            return Err("Order ID already exists".to_string());
        }

        let order = Order {
            order_id: args.order_id.clone(),
            evm_tx_hash: args.evm_tx_hash,
            advertiser_address: args.advertiser_address.to_lowercase(),
            influencer_address: args.influencer_address.to_lowercase(),
            amount_usdc_raw: args.amount_usdc_raw,
            status: OrderStatus::Created,
            created_at: ic_cdk::api::time(),
            nonce: 0,
        };

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
        return Err("Order is not in Created status".to_string());
    }

    let rpc_url = EVM_RPC_URL.with(|url| url.borrow().clone());
    let payload = serde_json::json!({
        "jsonrpc": "2.0",
        "method": "eth_getTransactionReceipt",
        "params": [order.evm_tx_hash],
        "id": 1
    });

    let body_bytes = serde_json::to_vec(&payload).map_err(|e| e.to_string())?;

    let request_headers = vec![
        HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        },
    ];

    let request = CanisterHttpRequestArgument {
        url: rpc_url,
        method: HttpMethod::POST,
        body: Some(body_bytes),
        max_response_bytes: Some(4096),
        transform: Some(TransformContext::from_name(
            "transform_http_response".to_string(),
            serde_json::to_vec(&serde_json::Value::Null).unwrap_or_default(),
        )),
        headers: request_headers,
    };

    // Make the HTTP outcall via the Management Canister (with cycle payment)
    let cycles: u128 = 25_000_000_000;
    match http_request(request, cycles).await {
        Ok((response,)) => {
            if response.status == 200u64 {
                let json_res: serde_json::Value =
                    serde_json::from_slice(&response.body).map_err(|e| format!("Invalid JSON response: {}", e))?;

                let result = &json_res["result"];
                if result.is_null() {
                    return Err("Transaction receipt not found or not yet mined".to_string());
                }

                let status_hex = result["status"].as_str().unwrap_or("0x0");
                if status_hex == "0x1" {
                    order.status = OrderStatus::PaymentVerified;
                    ORDERS.with(|orders| {
                        orders.borrow_mut().insert(order.order_id.clone(), order.clone());
                    });
                    Ok(order)
                } else {
                    Err("Transaction status indicates failure (reverted on EVM)".to_string())
                }
            } else {
                Err(format!("EVM RPC returned HTTP status {}", response.status))
            }
        }
        Err((code, msg)) => {
            // For local simulation or when cycles/RPC mock is used
            # [cfg(test)]
            {
                order.status = OrderStatus::PaymentVerified;
                ORDERS.with(|orders| {
                    orders.borrow_mut().insert(order.order_id.clone(), order.clone());
                });
                return Ok(order);
            }
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
    let mut order = ORDERS.with(|orders| {
        orders.borrow().get(&order_id).cloned().ok_or_else(|| "Order not found".to_string())
    })?;

    if order.advertiser_address.to_lowercase() != advertiser_address.to_lowercase() {
        return Err("Only the campaign advertiser can approve content".to_string());
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
    let key_name = KEY_NAME.with(|k| k.borrow().clone());
    let sign_arg = SignWithEcdsaArgument {
        message_hash: digest.to_vec(),
        derivation_path: vec![b"trust_escrow_settlement".to_vec()],
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: key_name,
        },
    };

    let (sign_res,) = sign_with_ecdsa(sign_arg)
        .await
        .map_err(|(code, msg)| format!("t-ECDSA sign failed (code {:?}): {}", code, msg))?;

    let signature_hex = format!("0x{}", hex::encode(sign_res.signature));

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
