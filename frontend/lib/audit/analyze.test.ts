import assert from "assert";
import { buildReport } from "./analyze";
import type { AuditRequest, Snapshot } from "./types";

function runTests() {
  console.log("Running Audit Engine analyze.ts Unit Tests...\n");

  const req: AuditRequest = {
    url: "https://x.com/satoshi_vibes/status/1789201948",
    orderId: "ord_test_99",
    expectedHandle: "satoshi_vibes",
    claimedViews: 50000,
    requirements: {
      hashtags: ["TRUST", "Escrow"],
      mentions: ["trustprotocol"],
      productName: "TRUST Protocol",
    },
    orderCreatedAt: 1700000000000,
  };

  const validSnapshot: Snapshot = {
    fetchedAt: 1700050000000,
    platform: "x",
    source: "X public post data",
    url: req.url,
    postId: "1789201948",
    author: "satoshi_vibes",
    authorFollowers: 250000,
    text: "Reviewing the TRUST Protocol! The best smart #TRUST and #Escrow system out there. Shoutout to @trustprotocol.",
    postedAt: 1700020000000,
    views: 65000,
    likes: 1800,
    reposts: 220,
    replies: 85,
  };

  console.log("Test 1: Full deliverable compliance yields 'verified' verdict");
  const report1 = buildReport(req, validSnapshot, []);
  assert.strictEqual(report1.verdict, "verified", `Expected verified, got ${report1.verdict}`);
  assert(report1.authenticityScore !== null && report1.authenticityScore >= 90, `Expected score >= 90, got ${report1.authenticityScore}`);
  assert(report1.checks.every((c) => c.pass === true), "Expected all requirement checks to pass");
  console.log(`  Passed: verdict = ${report1.verdict}, authenticityScore = ${report1.authenticityScore}`);

  console.log("\nTest 2: Missing required hashtags flags deliverable");
  const missingTagSnapshot: Snapshot = {
    ...validSnapshot,
    text: "Reviewing the TRUST Protocol without tags. Mention @trustprotocol.",
  };
  const report2 = buildReport(req, missingTagSnapshot, []);
  assert.strictEqual(report2.verdict, "flagged", `Expected flagged, got ${report2.verdict}`);
  const failedTag = report2.checks.find((c) => c.id.startsWith("tag:") && c.pass === false);
  assert(failedTag !== undefined, "Expected failed hashtag check");
  console.log(`  Passed: verdict = ${report2.verdict}, flagged reason: ${failedTag.label}`);

  console.log("\nTest 3: Bot farm ratio detection (abnormal like-to-view ratio)");
  const botRatioSnapshot: Snapshot = {
    ...validSnapshot,
    views: 10000,
    likes: 3500, // 35% like ratio (>15% threshold)
  };
  const report3 = buildReport(req, botRatioSnapshot, []);
  assert.strictEqual(report3.verdict, "flagged", `Expected flagged, got ${report3.verdict}`);
  const highRatioFlag = report3.flags.find((f) => f.code === "LIKE_RATIO_HIGH");
  assert(highRatioFlag !== undefined, "Expected LIKE_RATIO_HIGH anomaly flag");
  console.log(`  Passed: caught anomaly ${highRatioFlag.code}: ${highRatioFlag.message}`);

  console.log("\nTest 4: Unreachable or 404 post returns unverifiable report");
  const report4 = buildReport(req, null, [], "Post was deleted or made private");
  assert.strictEqual(report4.verdict, "unverifiable", `Expected unverifiable, got ${report4.verdict}`);
  assert.strictEqual(report4.error, "Post was deleted or made private");
  console.log(`  Passed: unverifiable verdict with error: ${report4.error}`);

  console.log("\nAll analyze.ts tests passed successfully!");
}

runTests();
