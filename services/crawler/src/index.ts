import { config } from "dotenv";
import { scheduleInfluencerCrawl } from "./queue";

config();

async function main() {
  console.log("=== TRUST Ingestion & Crawler Worker Initialized ===");
  
  // Seed sample crawl target if triggered standalone
  if (process.env.AUTO_SEED === "true") {
    await scheduleInfluencerCrawl({
      handle: "@satoshi_vibes",
      platform: "TWITTER",
    });
  }
}

main().catch(console.error);
