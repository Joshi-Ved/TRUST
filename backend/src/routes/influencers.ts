import { Router } from "express";

export const influencerRouter = Router();

// In-memory fallback registry if database is unseeded
const INFLUENCER_STORE = [
  {
    evmAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    handle: "@satoshi_vibes",
    platform: "X / Twitter",
    followers: 245000,
    avgViews: 68500,
    engagementRateBps: 420,
    botScorePct: 3,
    isVerified: true,
  },
  {
    evmAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    handle: "@defi_builder",
    platform: "YouTube",
    followers: 128000,
    avgViews: 45000,
    engagementRateBps: 650,
    botScorePct: 1,
    isVerified: true,
  },
  {
    evmAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    handle: "@eth_narratives",
    platform: "TikTok",
    followers: 512000,
    avgViews: 180000,
    engagementRateBps: 810,
    botScorePct: 4,
    isVerified: false,
  },
];

influencerRouter.get("/", (_req, res) => {
  res.json({ success: true, data: INFLUENCER_STORE });
});

influencerRouter.get("/:address", (req, res) => {
  const inf = INFLUENCER_STORE.find(
    (i) => i.evmAddress.toLowerCase() === req.params.address.toLowerCase()
  );
  if (!inf) return res.status(404).json({ success: false, error: "Influencer not found" });
  res.json({ success: true, data: inf });
});
