use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderStatus {
    Created,
    PaymentVerified,
    Accepted,
    ProofSubmitted { live_url: String, platform: String, submitted_at: u64 },
    Approved,
    Settled { tx_hash: Option<String> },
    Disputed { reason: String },
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Order {
    pub order_id: String,
    pub evm_tx_hash: String,
    pub advertiser_address: String,
    pub influencer_address: String,
    pub amount_usdc_raw: u64,
    pub status: OrderStatus,
    pub created_at: u64,
    pub nonce: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct CreateOrderArgs {
    pub order_id: String,
    pub evm_tx_hash: String,
    pub advertiser_address: String,
    pub influencer_address: String,
    pub amount_usdc_raw: u64,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SubmitProofArgs {
    pub order_id: String,
    pub live_url: String,
    pub platform: String,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SettlementSignatureResponse {
    pub order_id: String,
    pub influencer_address: String,
    pub amount_usdc_raw: u64,
    pub nonce: u64,
    pub signature_hex: String,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct InfluencerProfile {
    pub principal: Principal,
    pub evm_address: String,
    pub handle: String,
    pub platform: String,
    pub followers: u64,
    pub avg_views: u64,
    pub engagement_rate_bps: u32, // 100 bps = 1.00%
    pub bot_score_pct: u8,        // lower is better, 0-100%
}
