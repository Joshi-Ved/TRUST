import { analyzeInfluencerMetrics, RawEngagementData } from "./anomalyDetector";
import { syncMetricsToCanister } from "./canisterSync";

// Sample test dataset to demonstrate runner pipeline
const SAMPLE_RUNNER_DATA: Record<string, { address: string; data: RawEngagementData }> = {
  "@satoshi_vibes": {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    data: {
      followers: 245000,
      posts: [
        {
          views: 68500,
          likes: 3120,
          reposts: 480,
          comments: [
            { text: "Great analysis on the escrow mechanism!" },
            { text: "Love the hybrid EVM and ICP architecture." },
            { text: "Very informative thread, thanks for breaking it down." },
          ],
        },
      ],
    },
  },
  "@bot_inflated_hub": {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    data: {
      followers: 500000,
      posts: [
        {
          views: 12000,
          likes: 9500, // suspicious > 70% like ratio
          reposts: 11000, // more reposts than likes
          comments: [
            { text: "dm for promo", isSuspectedBot: true },
            { text: "telegram group link in bio", isSuspectedBot: true },
            { text: "crypto promo dm", isSuspectedBot: true },
          ],
        },
      ],
    },
  },
};

export async function runAnalyticsPipeline() {
  console.log("==================================================================");
  console.log("TRUST Protocol - Anomaly Detection & Metric Sync Runner");
  console.log("==================================================================");

  const canisterId = process.env.NEXT_PUBLIC_TRUST_CANISTER_ID || "rrkah-fqaaa-aaaaa-aaaaq-cai";
  const host = process.env.NEXT_PUBLIC_IC_HOST || "http://127.0.0.1:4943";

  for (const [handle, record] of Object.entries(SAMPLE_RUNNER_DATA)) {
    console.log(`\n[Analyzing] Creator: ${handle} (EVM: ${record.address})`);
    const metrics = analyzeInfluencerMetrics(handle, record.data);

    console.log(`  - Followers: ${metrics.followerCount.toLocaleString()}`);
    console.log(`  - Average Engagement Rate: ${metrics.averageEngagementRate}%`);
    console.log(`  - Authenticity Score: ${metrics.authenticityScore}/100`);
    console.log(`  - Bot Risk: ${metrics.botRiskPercent}%`);
    console.log(`  - Comment Shannon Entropy: ${metrics.commentEntropy}`);
    console.log(`  - Projected ROMI: ${metrics.projectedRomiMultiplier}x`);

    console.log(`  -> Syncing result to ICP canister (${canisterId})...`);
    const syncRes = await syncMetricsToCanister(record.address, metrics, canisterId, host);
    if (syncRes.success) {
      console.log(`  [OK] Successfully synchronized on-chain metrics.`);
    } else {
      console.warn(`  [Notice] Canister sync warning: ${syncRes.error}`);
    }
  }

  console.log("\n[Completed] Analytics pipeline run completed successfully.\n");
}

if (require.main === module) {
  runAnalyticsPipeline().catch(console.error);
}
