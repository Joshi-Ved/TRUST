use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq)]
pub enum OrderStatus {
    PendingEscrowVerification,
    EscrowConfirmed,
    AcceptedByInfluencer,
    ProofSubmitted { live_url: String, timestamp: u64 },
    ApprovedByAdvertiser,
    SettledOnChain { tx_hash: Option<String> },
    Disputed,
    Refunded,
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
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SettleResponse {
    pub order_id: String,
    pub nonce: u64,
    pub signature_hex: String,
}
