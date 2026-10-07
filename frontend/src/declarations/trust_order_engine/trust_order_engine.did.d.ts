import type { Principal } from "@dfinity/principal";
import type { ActorMethod } from "@dfinity/agent";

export type OrderStatus =
  | { Created: null }
  | { PaymentVerified: null }
  | { Accepted: null }
  | {
      ProofSubmitted: {
        live_url: string;
        platform: string;
        submitted_at: bigint;
      };
    }
  | { Approved: null }
  | { Settled: { tx_hash: [] | [string] } }
  | { Disputed: { reason: string } };

export interface Order {
  order_id: string;
  evm_tx_hash: string;
  advertiser_address: string;
  influencer_address: string;
  amount_usdc_raw: bigint;
  status: OrderStatus;
  created_at: bigint;
  nonce: bigint;
}

export interface CreateOrderArgs {
  order_id: string;
  evm_tx_hash: string;
  advertiser_address: string;
  influencer_address: string;
  amount_usdc_raw: bigint;
}

export interface SubmitProofArgs {
  order_id: string;
  live_url: string;
  platform: string;
}

export interface SettlementSignatureResponse {
  order_id: string;
  influencer_address: string;
  amount_usdc_raw: bigint;
  nonce: bigint;
  signature_hex: string;
}

export interface InfluencerProfile {
  principal: Principal;
  evm_address: string;
  handle: string;
  platform: string;
  followers: bigint;
  avg_views: bigint;
  engagement_rate_bps: number;
  bot_score_pct: number;
}

export interface HttpHeader {
  name: string;
  value: string;
}

export interface HttpResponse {
  status: bigint;
  headers: Array<HttpHeader>;
  body: Uint8Array | number[];
}

export interface TransformArgs {
  response: HttpResponse;
  context: Uint8Array | number[];
}

export interface _SERVICE {
  initiate_order: ActorMethod<[CreateOrderArgs], { Ok: Order } | { Err: string }>;
  verify_payment: ActorMethod<[string], { Ok: Order } | { Err: string }>;
  accept_order: ActorMethod<[string, string], { Ok: Order } | { Err: string }>;
  submit_proof: ActorMethod<[SubmitProofArgs, string], { Ok: Order } | { Err: string }>;
  approve_and_release: ActorMethod<
    [string, string, bigint, string],
    { Ok: SettlementSignatureResponse } | { Err: string }
  >;
  get_order: ActorMethod<[string], [] | [Order]>;
  list_orders: ActorMethod<[], Array<Order>>;
  list_influencers: ActorMethod<[], Array<InfluencerProfile>>;
  transform_http_response: ActorMethod<[TransformArgs], HttpResponse>;
}

export declare const idlFactory: ({ IDL }: { IDL: any }) => any;
export declare const init: ({ IDL }: { IDL: any }) => any[];
