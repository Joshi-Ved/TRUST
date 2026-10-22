import { normHandle } from "@/lib/creatorRegistration";
import { getTextWithRetry } from "./fetchers";
import type { Snapshot } from "./types";

/** Platforms whose public profiles expose a post list with view counts, so reach can be verified. */
export type ScanPlatform = "x" | "youtube";

export interface ProfileInfo {
  platform: ScanPlatform;
  handle: string; // without @, as the platform spells it
  name: string | null;
  followers: number | null; // null = not published
  profileUrl: string;
  bio: string; // public profile description, where creators put their ownership code
  channelId?: string; // YouTube
}

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

// ---------------------------------------------------------------------------------------------
// X / Twitter: fxtwitter's public profile and timeline endpoints (same data a logged-out visitor sees).
// ---------------------------------------------------------------------------------------------
async function xProfile(handle: string): Promise<ProfileInfo> {
  if (!/^\w{1,15}$/.test(handle)) throw new Error("X handles are 1-15 letters, digits or underscores");
  const u = JSON.parse(await getTextWithRetry(`https://api.fxtwitter.com/${handle}`))?.user;
  if (!u?.screen_name) throw new Error(`No public X profile found for @${handle}`);
  return {
    platform: "x",
    handle: u.screen_name,
    name: u.name ?? null,
    followers: num(u.followers),
    profileUrl: `https://x.com/${u.screen_name}`,
    bio: `${u.description ?? ""}
${u.raw_description?.text ?? ""}`,
  };
}

async function xPosts(handle: string, pages: number): Promise<Snapshot[]> {
  const out: Snapshot[] = [];
  let cursor = "";
  for (let page = 0; page < pages; page++) {
    const body = JSON.parse(
      await getTextWithRetry(`https://api.fxtwitter.com/2/profile/${handle}/statuses${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`)
    );
    for (const t of body?.results ?? []) {
      // The timeline includes reposts of other accounts; only the creator's own posts count.
      if (t?.type !== "status" || t.reposted_by || t.author?.screen_name?.toLowerCase() !== handle.toLowerCase()) continue;
      out.push({
        fetchedAt: Date.now(),
        platform: "x",
        source: "X public profile timeline (via fxtwitter)",
        url: t.url,
        postId: String(t.id),
        author: t.author.screen_name,
        authorFollowers: num(t.author.followers),
        text: String(t.raw_text?.text ?? t.text ?? ""),
        postedAt: num(t.created_timestamp) ? t.created_timestamp * 1000 : null,
        views: num(t.views),
        likes: num(t.likes),
        reposts: num(t.reposts),
        replies: num(t.replies),
      });
    }
    cursor = body?.cursor?.bottom;
    if (!cursor || !body?.results?.length) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// YouTube: the channel page gives the channel id; its public RSS feed lists the latest 15 videos
// with full descriptions, view counts and like counts.
// ---------------------------------------------------------------------------------------------
async function youtubeProfile(handle: string): Promise<ProfileInfo> {
  if (!/^[\w.-]{3,30}$/.test(handle)) throw new Error("YouTube handles are 3-30 letters, digits, '.', '_' or '-'");
  const html = await getTextWithRetry(`https://www.youtube.com/@${handle}`).catch(() => "");
  const channelId = html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1];
  if (!channelId) throw new Error(`No public YouTube channel found for @${handle}`);
  const name = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? null;
  const bio = xmlText(html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] ?? "");
  return { platform: "youtube", handle, name, followers: null, profileUrl: `https://www.youtube.com/@${handle}`, bio, channelId };
}

const xmlText = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

async function youtubePosts(profile: ProfileInfo): Promise<Snapshot[]> {
  const xml = await getTextWithRetry(`https://www.youtube.com/feeds/videos.xml?channel_id=${profile.channelId}`);
  return xml
    .split("<entry>")
    .slice(1)
    .map((e) => {
      const tag = (re: RegExp) => e.match(re)?.[1] ?? null;
      const id = tag(/<yt:videoId>([^<]+)</);
      const views = tag(/<media:statistics views="(\d+)"/);
      const likes = tag(/<media:starRating count="(\d+)"/);
      const published = tag(/<published>([^<]+)</);
      return {
        fetchedAt: Date.now(),
        platform: "youtube" as const,
        source: "YouTube public channel feed",
        url: `https://www.youtube.com/watch?v=${id}`,
        postId: id,
        author: profile.handle,
        authorFollowers: null,
        text: xmlText(`${tag(/<media:title>([^<]*)</) ?? ""}\n${tag(/<media:description>([\s\S]*?)<\/media:description>/) ?? ""}`).trim(),
        postedAt: published ? Date.parse(published) || null : null,
        views: views === null ? null : Number(views),
        likes: likes === null ? null : Number(likes),
        reposts: null,
        replies: null,
      };
    })
    .filter((s) => s.postId);
}

export async function fetchProfile(platform: ScanPlatform, rawHandle: string): Promise<ProfileInfo> {
  const handle = normHandle(rawHandle);
  if (!handle) throw new Error("Enter the creator's handle");
  return platform === "x" ? xProfile(handle) : youtubeProfile(handle);
}

/** The creator's most recent own posts, newest first. X: up to `pages` timeline pages (~20 each). */
export async function scanPosts(profile: ProfileInfo, pages = 3): Promise<Snapshot[]> {
  return profile.platform === "x" ? xPosts(profile.handle, pages) : youtubePosts(profile);
}
