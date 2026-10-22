export interface InfluencerProfile {
  principal: string;
  evmAddress: string;
  handle: string;
  platform: string;
  followers: number;
  avgViews: number;
  engagementRateBps: number;
  botScorePct: number;
  /** Content niche the creator chose at onboarding; drives script generation when their posts cannot be analysed. */
  niche?: string;
  /** Set for creators added through the registry; their stats come from a live profile scan. */
  registered?: { addedAt: number; profileUrl: string; scannedAt: number; postsSampled: number };
}

/** The outcome the advertiser pays for. Checked by /api/verify-release before any payout is signed. */
export interface CampaignTerms {
  hashtag: string; // without '#', e.g. "trust_bc"
  targetViews: number; // public view count the tagged post must reach
  brief?: CampaignBrief;
}

/** What the sponsored post has to say. Written by the advertiser, used by the script generator. */
export interface CampaignBrief {
  productName: string;
  keyMessage: string; // the points the post must get across
  link?: string;
  mention?: string; // account to tag, without @
}

/** Result of the last #hashtag scan of the creator's profile for this order. */
export interface VerificationResult {
  checkedAt: number;
  passed: boolean;
  summary: string;
  postsScanned: number;
  matchingPosts: number;
  bestPost?: { url: string; views: number | null; likes: number | null; postedAt: number | null };
  reportId?: string;
  reportHash?: string;
}

export type OrderStatus =
  | { type: "Created" }
  | { type: "PaymentVerified" }
  | { type: "Accepted" }
  | { type: "Rejected"; reason?: string }
  | { type: "ProofSubmitted"; liveUrl: string; platform: string; submittedAt: number }
  | { type: "Approved" }
  | { type: "Settled"; txHash?: string }
  | { type: "Disputed"; reason: string }
  | { type: "Refunded" };

export interface Order {
  orderId: string;
  evmTxHash: string;
  advertiserAddress: string;
  influencerAddress: string;
  amountUsdcRaw: number;
  status: OrderStatus;
  createdAt: number;
  nonce: number;
  onChain?: boolean; // true when funded via a real TrustEscrow deposit
  signature?: string; // settlement signature from the ICP canister (t-ECDSA)
  campaign?: CampaignTerms;
  verification?: VerificationResult;
}

export const CAMPAIGN_HASHTAG = "trust_bc";

// Initial mock data simulating on-chain ICP state
export const INITIAL_INFLUENCERS: InfluencerProfile[] = [
  {
    principal: "2vxsx-fae",
    evmAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    handle: "@satoshi_vibes",
    platform: "X / Twitter",
    followers: 245000,
    avgViews: 68500,
    engagementRateBps: 420,
    botScorePct: 3,
    niche: "crypto",
  },
  {
    principal: "renrk-eyaaa",
    evmAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    handle: "@defi_builder",
    platform: "YouTube",
    followers: 128000,
    avgViews: 45000,
    engagementRateBps: 650,
    botScorePct: 1,
    niche: "crypto",
  },
  {
    principal: "qaa6y-5yaaa",
    evmAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    handle: "@eth_narratives",
    platform: "TikTok",
    followers: 512000,
    avgViews: 180000,
    engagementRateBps: 810,
    botScorePct: 4,
    niche: "crypto",
  },
  {
    principal: "bkyz2-fmaaa",
    evmAddress: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    handle: "@zk_lens",
    platform: "Instagram",
    followers: 89000,
    avgViews: 32000,
    engagementRateBps: 510,
    botScorePct: 2,
    niche: "crypto",
  },
];

export const INITIAL_ORDERS: Order[] = [
  {
    orderId: "ord_sepolia_8841",
    evmTxHash: "0x6f99148d4e929a0fba7a28a2a8909d9c223c3b0dfb2f293b6e709a3cf781a7b9",
    advertiserAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    influencerAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    amountUsdcRaw: 1500_000_000, // 1500 USDC
    status: {
      type: "ProofSubmitted",
      liveUrl: "https://x.com/satoshi_vibes/status/1789201948",
      platform: "X / Twitter",
      submittedAt: Date.now() - 3600000,
    },
    createdAt: Date.now() - 86400000,
    nonce: 1,
    campaign: { hashtag: "trust_bc", targetViews: 50_000 },
  },
  {
    orderId: "ord_sepolia_9912",
    evmTxHash: "0x3e18a2099992fca019912781bcf612bc445582f09ba012b1c8f1092a10129bc2",
    advertiserAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    influencerAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    amountUsdcRaw: 3200_000_000, // 3200 USDC
    status: { type: "PaymentVerified" },
    createdAt: Date.now() - 43200000,
    nonce: 0,
    campaign: { hashtag: "trust_bc", targetViews: 40_000 },
  },
];
