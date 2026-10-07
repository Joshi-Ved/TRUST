export interface MetricAnalysisResult {
  handle: string;
  followerCount: number;
  averageEngagementRate: number; // percentage
  authenticityScore: number;     // 0 - 100
  botRiskPercent: number;        // percentage
  commentEntropy: number;        // Shannon entropy (bits)
  projectedRomiMultiplier: number;
  reachConsistencyScore: number; // 0 - 100
  suspiciousCommentRatio: number;
}

export interface RawEngagementData {
  followers: number;
  posts: Array<{
    views: number;
    likes: number;
    reposts: number;
    comments: Array<{
      text: string;
      isSuspectedBot?: boolean;
    }>;
  }>;
}

/**
 * Calculates Shannon entropy of comment vocabulary to detect copy-paste/bot comment rings.
 * Low entropy (< 2.5) indicates highly repetitive boilerplate strings.
 */
export function calculateCommentEntropy(comments: string[]): number {
  if (comments.length === 0) return 0;

  const wordCounts = new Map<string, number>();
  let totalWords = 0;

  for (const c of comments) {
    const tokens = c
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    for (const token of tokens) {
      wordCounts.set(token, (wordCounts.get(token) || 0) + 1);
      totalWords++;
    }
  }

  if (totalWords === 0) return 0;

  let entropy = 0;
  for (const count of wordCounts.values()) {
    const p = count / totalWords;
    entropy -= p * Math.log2(p);
  }

  return parseFloat(entropy.toFixed(3));
}

/**
 * Evaluates authenticity based on engagement velocity, comment entropy,
 * and view-to-interaction distributions.
 */
export function analyzeInfluencerMetrics(
  handle: string,
  data: RawEngagementData
): MetricAnalysisResult {
  const { followers, posts } = data;
  if (!posts || posts.length === 0) {
    return {
      handle,
      followerCount: followers,
      averageEngagementRate: 0,
      authenticityScore: 70,
      botRiskPercent: 10,
      commentEntropy: 3.0,
      projectedRomiMultiplier: 1.5,
      reachConsistencyScore: 50,
      suspiciousCommentRatio: 0.1,
    };
  }

  // 1. Compute engagement rate per post
  let totalEngagementSum = 0;
  let allComments: string[] = [];
  let botCommentCount = 0;
  let viewVarianceSum = 0;
  const viewCounts = posts.map((p) => p.views);
  const avgViews = viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length;

  for (const post of posts) {
    const interactions = post.likes + post.reposts + post.comments.length;
    const rate = post.views > 0 ? (interactions / post.views) * 100 : (interactions / Math.max(followers, 1)) * 100;
    totalEngagementSum += rate;

    for (const c of post.comments) {
      allComments.push(c.text);
      if (c.isSuspectedBot || /dm for|telegram|crypto promo|link in bio/i.test(c.text)) {
        botCommentCount++;
      }
    }

    viewVarianceSum += Math.pow(post.views - avgViews, 2);
  }

  const avgEngagementRate = parseFloat((totalEngagementSum / posts.length).toFixed(2));
  const commentEntropy = calculateCommentEntropy(allComments);
  const suspiciousRatio = allComments.length > 0 ? botCommentCount / allComments.length : 0;

  // Consistency: lower standard deviation in legitimate organic posts relative to views
  const stdDev = Math.sqrt(viewVarianceSum / posts.length);
  const cv = avgViews > 0 ? stdDev / avgViews : 1;
  const reachConsistencyScore = Math.max(20, Math.min(100, Math.round(100 - cv * 35)));

  // Authenticity Score Algorithm:
  // Baseline 100 -> penalize for bot comments, low vocabulary entropy, or abnormal engagement ratios
  let authenticity = 95;
  authenticity -= suspiciousRatio * 60; // Up to -60 for high bot spam
  if (commentEntropy < 3.0) {
    authenticity -= (3.0 - commentEntropy) * 12; // Penalize repetitive comment rings
  }
  if (avgEngagementRate > 25.0) {
    authenticity -= 15; // Suspect artificial engagement padding
  }
  const finalAuthenticity = Math.max(10, Math.min(99, Math.round(authenticity)));

  // Bot risk inverse to authenticity
  const botRisk = Math.max(1, Math.min(90, Math.round((100 - finalAuthenticity) * 0.4 + suspiciousRatio * 40)));

  // Projected Return On Marketing Investment (ROMI) multiplier
  // Higher authenticity + strong engagement rate = higher multiplier
  const romi = parseFloat((1.2 + (finalAuthenticity / 100) * 2.5 + (avgEngagementRate / 10) * 1.2).toFixed(2));

  return {
    handle,
    followerCount: followers,
    averageEngagementRate: avgEngagementRate,
    authenticityScore: finalAuthenticity,
    botRiskPercent: botRisk,
    commentEntropy,
    projectedRomiMultiplier: romi,
    reachConsistencyScore,
    suspiciousCommentRatio: parseFloat(suspiciousRatio.toFixed(3)),
  };
}
