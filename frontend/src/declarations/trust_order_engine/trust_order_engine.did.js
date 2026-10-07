export const idlFactory = ({ IDL }: { IDL: any }) => {
  const OrderStatus = IDL.Variant({
    Created: IDL.Null,
    PaymentVerified: IDL.Null,
    Accepted: IDL.Null,
    ProofSubmitted: IDL.Record({
      live_url: IDL.Text,
      platform: IDL.Text,
      submitted_at: IDL.Nat64,
    }),
    Approved: IDL.Null,
    Settled: IDL.Record({ tx_hash: IDL.Opt(IDL.Text) }),
    Disputed: IDL.Record({ reason: IDL.Text }),
  });

  const Order = IDL.Record({
    order_id: IDL.Text,
    evm_tx_hash: IDL.Text,
    advertiser_address: IDL.Text,
    influencer_address: IDL.Text,
    amount_usdc_raw: IDL.Nat64,
    status: OrderStatus,
    created_at: IDL.Nat64,
    nonce: IDL.Nat64,
  });

  const CreateOrderArgs = IDL.Record({
    order_id: IDL.Text,
    evm_tx_hash: IDL.Text,
    advertiser_address: IDL.Text,
    influencer_address: IDL.Text,
    amount_usdc_raw: IDL.Nat64,
  });

  const SubmitProofArgs = IDL.Record({
    order_id: IDL.Text,
    live_url: IDL.Text,
    platform: IDL.Text,
  });

  const SettlementSignatureResponse = IDL.Record({
    order_id: IDL.Text,
    influencer_address: IDL.Text,
    amount_usdc_raw: IDL.Nat64,
    nonce: IDL.Nat64,
    signature_hex: IDL.Text,
  });

  const InfluencerProfile = IDL.Record({
    principal: IDL.Principal,
    evm_address: IDL.Text,
    handle: IDL.Text,
    platform: IDL.Text,
    followers: IDL.Nat64,
    avg_views: IDL.Nat64,
    engagement_rate_bps: IDL.Nat32,
    bot_score_pct: IDL.Nat8,
  });

  const HttpHeader = IDL.Record({
    name: IDL.Text,
    value: IDL.Text,
  });

  const HttpResponse = IDL.Record({
    status: IDL.Nat,
    headers: IDL.Vec(HttpHeader),
    body: IDL.Vec(IDL.Nat8),
  });

  const TransformArgs = IDL.Record({
    response: HttpResponse,
    context: IDL.Vec(IDL.Nat8),
  });

  return IDL.Service({
    initiate_order: IDL.Func([CreateOrderArgs], [IDL.Variant({ Ok: Order, Err: IDL.Text })], []),
    verify_payment: IDL.Func([IDL.Text], [IDL.Variant({ Ok: Order, Err: IDL.Text })], []),
    accept_order: IDL.Func([IDL.Text, IDL.Text], [IDL.Variant({ Ok: Order, Err: IDL.Text })], []),
    submit_proof: IDL.Func([SubmitProofArgs, IDL.Text], [IDL.Variant({ Ok: Order, Err: IDL.Text })], []),
    approve_and_release: IDL.Func(
      [IDL.Text, IDL.Text, IDL.Nat64, IDL.Text],
      [IDL.Variant({ Ok: SettlementSignatureResponse, Err: IDL.Text })],
      []
    ),
    get_order: IDL.Func([IDL.Text], [IDL.Opt(Order)], ["query"]),
    list_orders: IDL.Func([], [IDL.Vec(Order)], ["query"]),
    list_influencers: IDL.Func([], [IDL.Vec(InfluencerProfile)], ["query"]),
    transform_http_response: IDL.Func([TransformArgs], [HttpResponse], ["query"]),
  });
};

export const init = ({ IDL }: { IDL: any }) => {
  return [];
};
