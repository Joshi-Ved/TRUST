import { NextResponse } from "next/server";
import { fetchProfile, scanPosts, type ScanPlatform } from "@/lib/audit/profile";
import { detectNiche } from "@/lib/ai/niches";
import { analyzeStyle } from "@/lib/ai/style";
import { profileFromScan } from "@/lib/server/influencerStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?platform=x|youtube&handle=: read-only look at a public profile for onboarding.
 * Shows the creator the stats and writing style we measured, and the niche we detected, before they register.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const platform = q.get("platform");
  if (platform !== "x" && platform !== "youtube") {
    return NextResponse.json({ error: "Platform must be X or YouTube" }, { status: 400 });
  }
  try {
    const profile = await fetchProfile(platform as ScanPlatform, q.get("handle") ?? "");
    const posts = await scanPosts(profile, 2);
    const stats = profileFromScan(profile, "0x0000000000000000000000000000000000000000", posts);
    return NextResponse.json({
      handle: profile.handle,
      name: profile.name,
      profileUrl: profile.profileUrl,
      followers: profile.followers,
      medianViews: stats.avgViews,
      engagementRateBps: stats.engagementRateBps,
      postsSampled: stats.registered?.postsSampled ?? 0,
      detectedNiche: detectNiche(posts.map((p) => p.text))?.id ?? null,
      style: analyzeStyle(posts)?.summary ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not read the profile" }, { status: 422 });
  }
}
