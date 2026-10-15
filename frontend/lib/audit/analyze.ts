import { id as keccakId } from "ethers";
import type { AuditReport, AuditRequest, Check, Flag, Snapshot, Verdict } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/^[#@]/, "");

function requirementChecks(snap: Snapshot, req: AuditRequest): Check[] {
  const checks: Check[] = [];
  const text = snap.text.toLowerCase();
  const r = req.requirements ?? {};

  for (const tag of r.hashtags ?? []) {
    const ok = new RegExp(`#${norm(tag).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i").test(snap.text);
    checks.push({ id: `tag:${tag}`, label: `Hashtag #${norm(tag)}`, pass: ok, detail: ok ? "Found in the post" : "Not found in the post text" });
  }
  for (const m of r.mentions ?? []) {
    const ok = new RegExp(`@${norm(m).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w])`, "i").test(snap.text);
    checks.push({ id: `mention:${m}`, label: `Mention @${norm(m)}`, pass: ok, detail: ok ? "Found in the post" : "Not found in the post text" });
  }
  for (const l of r.links ?? []) {
    const ok = text.includes(l.toLowerCase());
    checks.push({ id: `link:${l}`, label: `Link ${l}`, pass: ok, detail: ok ? "Found in the post" : "Not found in the post text" });
  }
  if (r.productName) {
    const ok = text.includes(r.productName.toLowerCase());
    checks.push({ id: "product", label: `Names "${r.productName}"`, pass: ok, detail: ok ? "Found in the post" : "Not found in the post text" });
  }

  if (req.expectedHandle) {
    if (!snap.author) {
      checks.push({ id: "author", label: "Posted by the contracted creator", pass: null, detail: "Platform did not reveal the author" });
    } else {
      const ok = norm(snap.author) === norm(req.expectedHandle);
      checks.push({
        id: "author",
        label: "Posted by the contracted creator",
        pass: ok,
        detail: ok ? `Author is @${snap.author}` : `Post belongs to @${snap.author}, not @${norm(req.expectedHandle)}`,
      });
    }
  }

  if (req.orderCreatedAt) {
    if (snap.postedAt === null) {
      checks.push({ id: "date", label: "Published after the order was funded", pass: null, detail: "Platform did not expose a publish date" });
    } else {
      const ok = snap.postedAt >= req.orderCreatedAt;
      checks.push({
        id: "date",
        label: "Published after the order was funded",
        pass: ok,
        detail: `Posted ${new Date(snap.postedAt).toISOString().slice(0, 16).replace("T", " ")} UTC${ok ? "" : ", before the escrow existed (reused old post?)"}`,
      });
    }
  }

  if (req.claimedViews && snap.views !== null) {
    const ok = snap.views >= req.claimedViews * 0.9;
    checks.push({
      id: "claim",
      label: "Claimed impressions match public count",
      pass: ok,
      detail: `Claimed ${req.claimedViews.toLocaleString()}, public count ${snap.views.toLocaleString()}`,
    });
  } else if (req.claimedViews) {
    checks.push({ id: "claim", label: "Claimed impressions match public count", pass: null, detail: "Platform does not publish a view count for this post" });
  }
  return checks;
}

function anomalyFlags(snap: Snapshot, history: Snapshot[]): Flag[] {
  const f: Flag[] = [];
  const { views, likes, reposts, replies, authorFollowers } = snap;

  if (views !== null && views >= 1000) {
    if (likes !== null) {
      const r = likes / views;
      if (r > 0.15) f.push({ severity: "high", code: "LIKE_RATIO_HIGH", message: `Likes are ${(r * 100).toFixed(1)}% of views. Organic posts are typically 0.5–5%.` });
      else if (r < 0.0005) f.push({ severity: "medium", code: "LIKE_RATIO_LOW", message: `Only ${(r * 100).toFixed(3)}% of viewers liked the post. Views may be inflated.` });
    }
    if (likes && reposts !== null && reposts / likes > 1) {
      f.push({ severity: "medium", code: "REPOST_RATIO", message: "More reposts than likes, a pattern seen in repost farms." });
    }
    if (replies !== null && likes && replies / Math.max(likes, 1) > 0.6) {
      f.push({ severity: "low", code: "REPLY_RATIO", message: "Unusually many replies relative to likes (could be a giveaway or reply bots)." });
    }
    if (authorFollowers && authorFollowers >= 5000) {
      const reach = views / authorFollowers;
      if (reach < 0.01) f.push({ severity: "medium", code: "LOW_REACH", message: `Views are ${(reach * 100).toFixed(2)}% of followers. Follower base may be inactive or purchased.` });
      if (reach > 50) f.push({ severity: "low", code: "BOOSTED", message: "Views far exceed follower count: likely paid promotion or viral spread, not creator reach." });
    }
  }

  // Growth between crawls: bought views often arrive in bursts, and removed bots make counts fall.
  const prev = history[history.length - 1];
  if (prev && prev.views !== null && views !== null) {
    const hours = (snap.fetchedAt - prev.fetchedAt) / 3_600_000;
    if (views < prev.views * 0.95) {
      f.push({ severity: "high", code: "COUNT_DROPPED", message: `View count fell from ${prev.views.toLocaleString()} to ${views.toLocaleString()}. The platform may have purged fake views.` });
    } else if (hours <= 24 && views > Math.max(10_000, prev.views * 3)) {
      f.push({ severity: "medium", code: "VIEW_SPIKE", message: `Views jumped ${prev.views.toLocaleString()} → ${views.toLocaleString()} in ${hours.toFixed(1)}h.` });
    }
  }
  return f;
}

export function buildReport(req: AuditRequest, snap: Snapshot | null, history: Snapshot[], error?: string): AuditReport {
  const base = { orderId: req.orderId, url: req.url, generatedAt: Date.now(), history, claimedViews: req.claimedViews };

  if (!snap) {
    const body = { ...base, verdict: "unverifiable" as Verdict, summary: "The post could not be read, so nothing is verified.", snapshot: null, checks: [], flags: [], authenticityScore: null, error };
    return { id: keccakId(JSON.stringify(body)).slice(0, 18), ...body, reportHash: keccakId(JSON.stringify(body)) };
  }

  const checks: Check[] = [
    { id: "reachable", label: "Post is live and publicly readable", pass: true, detail: `Read from ${snap.source}` },
    ...requirementChecks(snap, req),
  ];
  if (history.length > 0 && !history.some((h) => h.postId === snap.postId)) {
    checks.push({ id: "same-post", label: "Same post as earlier audits", pass: false, detail: "Post ID changed since the last audit" });
  }
  const flags = anomalyFlags(snap, history);

  const failed = checks.filter((c) => c.pass === false);
  const high = flags.filter((x) => x.severity === "high");
  const hasMetrics = snap.views !== null;

  let score: number | null = null;
  if (hasMetrics) {
    score = 100;
    for (const x of flags) score -= x.severity === "high" ? 30 : x.severity === "medium" ? 15 : 5;
    score = Math.max(0, score);
  }

  let verdict: Verdict;
  let summary: string;
  if (failed.length || high.length) {
    verdict = "flagged";
    summary = [...failed.map((c) => c.label), ...high.map((x) => x.code.toLowerCase().replace(/_/g, " "))].join("; ") + ".";
    summary = "Issues found: " + summary;
  } else if (!hasMetrics) {
    verdict = "partial";
    summary = "Content requirements checked. This platform does not publish impression counts, so reach could not be independently verified.";
  } else {
    verdict = "verified";
    summary = `Public counters read directly from the platform: ${snap.views!.toLocaleString()} views. No manipulation signals detected.`;
  }

  const body = { ...base, verdict, summary, snapshot: snap, checks, flags, authenticityScore: score };
  const reportHash = keccakId(JSON.stringify(body));
  return { id: reportHash.slice(0, 18), ...body, reportHash };
}
