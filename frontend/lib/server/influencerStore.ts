import { INITIAL_INFLUENCERS, type InfluencerProfile } from "@/lib/icp-agent";
import { anomalyFlags } from "@/lib/audit/analyze";
import type { ProfileInfo, ScanPlatform } from "@/lib/audit/profile";
import type { Snapshot } from "@/lib/audit/types";
import { readJson, updateJson } from "./jsonStore";

const FILE = "influencers.json";

export const PLATFORM_LABEL: Record<ScanPlatform, string> = { x: "X / Twitter", youtube: "YouTube" };

export const scanPlatformOf = (label: string): ScanPlatform | null =>
  label === PLATFORM_LABEL.x ? "x" : label === PLATFORM_LABEL.youtube ? "youtube" : null;

const sameHandle = (a: InfluencerProfile, b: InfluencerProfile) =>
  a.platform === b.platform && a.handle.toLowerCase() === b.handle.toLowerCase();

/** Registered creators first, then the demo seed creators. */
export async function readInfluencers(): Promise<InfluencerProfile[]> {
  const registered = await readJson<InfluencerProfile[]>(FILE, []);
  return [...registered, ...INITIAL_INFLUENCERS.filter((s) => !registered.some((r) => sameHandle(r, s)))];
}

export const upsertInfluencer = (inf: InfluencerProfile) =>
  updateJson<InfluencerProfile[]>(FILE, [], (all) => [inf, ...all.filter((r) => !sameHandle(r, inf))]);

export const removeInfluencer = (platform: string, handle: string) =>
  updateJson<InfluencerProfile[]>(FILE, [], (all) =>
    all.filter((r) => !(r.platform === platform && r.handle.toLowerCase() === handle.toLowerCase()))
  );

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2);
};

/** Profile stats measured from the creator's recent public posts, not self-reported. */
export function profileFromScan(profile: ProfileInfo, evmAddress: string, posts: Snapshot[]): InfluencerProfile {
  const withViews = posts.filter((p) => p.views !== null && p.views > 0);
  const views = withViews.reduce((a, p) => a + p.views!, 0);
  const likes = withViews.reduce((a, p) => a + (p.likes ?? 0), 0);
  const flagged = withViews.filter((p) => anomalyFlags(p, []).some((f) => f.severity !== "low")).length;
  return {
    principal: "",
    evmAddress,
    handle: `@${profile.handle}`,
    platform: PLATFORM_LABEL[profile.platform],
    followers: profile.followers ?? 0,
    avgViews: median(withViews.map((p) => p.views!)),
    engagementRateBps: views ? Math.round((likes / views) * 10_000) : 0,
    // Share of recent posts showing manipulation signals, on the same 0-12 scale as the seed data.
    botScorePct: withViews.length ? Math.round((flagged / withViews.length) * 12) : 0,
    registered: { addedAt: Date.now(), profileUrl: profile.profileUrl, scannedAt: Date.now(), postsSampled: withViews.length },
  };
}
