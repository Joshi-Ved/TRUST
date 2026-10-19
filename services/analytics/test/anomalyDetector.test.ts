import assert from "assert";
import { calculateCommentEntropy, analyzeInfluencerMetrics } from "../src/anomalyDetector";

function runTests() {
  console.log("Running Analytics Service Unit Tests...\n");

  // 1. Comment Entropy Tests
  console.log("Test 1: Shannon Entropy calculation for diverse comments");
  const diverseComments = [
    "This is a great protocol architecture",
    "Escrow contracts on EVM with ICP state machines make total sense",
    "How does the threshold signature verification compare to oracles?",
    "Very informative writeup on creator sponsorship settlements",
  ];
  const highEntropy = calculateCommentEntropy(diverseComments);
  assert(highEntropy > 3.0, `Expected entropy > 3.0, got ${highEntropy}`);
  console.log(`  Passed: diverse comments entropy = ${highEntropy}`);

  console.log("\nTest 2: Repetitive bot comments have low vocabulary entropy");
  const botComments = [
    "dm for promo",
    "dm for promo",
    "dm for promo",
    "dm for promo",
  ];
  const lowEntropy = calculateCommentEntropy(botComments);
  assert(lowEntropy < 2.0, `Expected low entropy < 2.0, got ${lowEntropy}`);
  console.log(`  Passed: bot comments entropy = ${lowEntropy}`);

  // 2. Metrics analysis tests
  console.log("\nTest 3: Legitimate organic influencer produces high authenticity score");
  const organicMetrics = analyzeInfluencerMetrics("@organic_creator", {
    followers: 100000,
    posts: [
      {
        views: 45000,
        likes: 1800, // 4% like ratio
        reposts: 250,
        comments: [
          { text: "Awesome project breakdown" },
          { text: "Can't wait to test this on Sepolia" },
        ],
      },
    ],
  });
  assert(organicMetrics.authenticityScore >= 80, `Expected authenticity >= 80, got ${organicMetrics.authenticityScore}`);
  assert(organicMetrics.botRiskPercent <= 25, `Expected low bot risk <= 25, got ${organicMetrics.botRiskPercent}`);
  console.log(`  Passed: organic score = ${organicMetrics.authenticityScore}, bot risk = ${organicMetrics.botRiskPercent}%`);

  console.log("\nTest 4: Spam/bot ring influencer triggers penalties and high bot risk");
  const botMetrics = analyzeInfluencerMetrics("@spammer_hub", {
    followers: 100000,
    posts: [
      {
        views: 2000,
        likes: 1900, // 95% like ratio
        reposts: 2500,
        comments: [
          { text: "telegram group link in bio", isSuspectedBot: true },
          { text: "crypto promo dm", isSuspectedBot: true },
        ],
      },
    ],
  });
  assert(botMetrics.botRiskPercent > 30, `Expected elevated bot risk, got ${botMetrics.botRiskPercent}%`);
  console.log(`  Passed: spammer bot risk = ${botMetrics.botRiskPercent}%, authenticity = ${botMetrics.authenticityScore}`);

  console.log("\nAll Analytics Service tests passed successfully!");
}

runTests();
