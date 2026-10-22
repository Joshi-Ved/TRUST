export type Platform = "x" | "youtube" | "instagram" | "tiktok" | "other";

/** One crawl of a public post: exactly what the platform showed at `fetchedAt`. */
export interface Snapshot {
  fetchedAt: number;
  platform: Platform;
  source: string; // where the numbers came from, e.g. "fxtwitter public API"
  url: string;
  postId: string | null;
  author: string | null; // handle without @
  authorFollowers: number | null;
  text: string;
  postedAt: number | null;
  /** null = the platform did not expose it publicly. Never guessed. */
  views: number | null;
  likes: number | null;
  reposts: number | null;
  replies: number | null;
}

export interface Requirements {
  hashtags?: string[];
  mentions?: string[];
  links?: string[];
  productName?: string;
}

export interface AuditRequest {
  url: string;
  orderId?: string;
  expectedHandle?: string;
  orderCreatedAt?: number;
  claimedViews?: number;
  /** Views the post must reach for the campaign to count as delivered. */
  targetViews?: number;
  requirements?: Requirements;
}

export interface Check {
  id: string;
  label: string;
  pass: boolean | null; // null = could not be determined
  detail: string;
}

export interface Flag {
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
}

export type Verdict = "verified" | "flagged" | "partial" | "unverifiable";

export interface AuditReport {
  id: string;
  orderId?: string;
  url: string;
  verdict: Verdict;
  summary: string;
  generatedAt: number;
  snapshot: Snapshot | null;
  history: Snapshot[]; // earlier crawls of the same URL, oldest first
  checks: Check[];
  flags: Flag[];
  authenticityScore: number | null;
  claimedViews?: number;
  /** keccak256 of the canonical report body: tamper-evidence, can be anchored on-chain. */
  reportHash: string;
  error?: string;
}
