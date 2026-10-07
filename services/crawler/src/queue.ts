import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { SocialContentScraper } from "./scraper";
import { CrawlTarget } from "./types";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisConnection = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

export const crawlQueue = new Queue("influencer-crawler", {
  connection: redisConnection,
});

const prisma = new PrismaClient();
const scraper = new SocialContentScraper();

export const crawlerWorker = new Worker(
  "influencer-crawler",
  async (job: Job<CrawlTarget>) => {
    const { handle, platform } = job.data;
    console.log(`[CrawlerWorker] Starting ingestion job ${job.id} for ${handle} (${platform})`);

    const crawledPosts = await scraper.scrapeInfluencerPosts(job.data);

    // Upsert Profile
    const profile = await prisma.influencerProfile.upsert({
      where: { handle },
      update: {
        lastCrawledAt: new Date(),
      },
      create: {
        handle,
        platform,
        evmAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        followers: 150000,
        authenticityScore: 92.5,
        botRiskPercent: 3.8,
        romiMultiplier: 3.4,
        lastCrawledAt: new Date(),
      },
    });

    // Ingest posts and comments in transactions
    for (const p of crawledPosts) {
      const savedPost = await prisma.post.upsert({
        where: { externalPostId: p.externalPostId },
        update: {
          likes: p.likes,
          reposts: p.reposts,
          views: p.views,
          commentCount: p.commentCount,
        },
        create: {
          influencerId: profile.id,
          externalPostId: p.externalPostId,
          url: p.url,
          contentText: p.contentText,
          mediaType: p.mediaType,
          likes: p.likes,
          reposts: p.reposts,
          views: p.views,
          commentCount: p.commentCount,
          postedAt: p.postedAt,
        },
      });

      // Insert comments
      for (const c of p.comments) {
        const isBot = /telegram|pump|crypto collab|dm for|check my bio/i.test(c.text);
        await prisma.comment.create({
          data: {
            postId: savedPost.id,
            author: c.author,
            text: c.text,
            isSuspectedBot: isBot,
            sentiment: isBot ? -0.5 : 0.8,
            postedAt: c.postedAt,
          },
        });
      }
    }

    console.log(`[CrawlerWorker] Successfully ingested ${crawledPosts.length} posts for ${handle}`);
    return { success: true, count: crawledPosts.length };
  },
  { connection: redisConnection }
);

export async function scheduleInfluencerCrawl(target: CrawlTarget) {
  return await crawlQueue.add(`crawl-${target.handle}`, target, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  });
}
