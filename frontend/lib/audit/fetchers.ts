import type { Platform, Snapshot } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

// Only crawl known social hosts. User-supplied URLs must never make the server fetch arbitrary addresses (SSRF).
const HOSTS: Array<[RegExp, Platform]> = [
  [/^(www\.|mobile\.)?(x|twitter)\.com$/, "x"],
  [/^(www\.|m\.)?youtube\.com$|^youtu\.be$/, "youtube"],
  [/^(www\.)?instagram\.com$/, "instagram"],
  [/^(www\.|vm\.)?tiktok\.com$/, "tiktok"],
];

// Simple in-memory rate limiter per domain
const lastRequestTime: Record<string, number> = {};
const MIN_REQUEST_INTERVAL_MS = 500; // minimum 500ms between hits to same domain

export function parseTarget(raw: string): { url: URL; platform: Platform } {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("That is not a valid URL");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Only http(s) links are supported");
  const hit = HOSTS.find(([re]) => re.test(url.hostname.toLowerCase()));
  if (!hit) throw new Error("Unsupported platform. Supported: X / Twitter, YouTube, Instagram, TikTok");
  return { url, platform: hit[1] };
}

export async function getTextWithRetry(url: string, headers: Record<string, string> = {}, maxRetries = 2): Promise<string> {
  const host = new URL(url).hostname;
  const now = Date.now();
  const last = lastRequestTime[host] || 0;
  if (now - last < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - (now - last)));
  }
  lastRequestTime[host] = Date.now();

  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "en", ...headers },
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
      });
      if (res.status === 429) {
        // Rate limited, wait backoff
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`${host} responded ${res.status}`);
      return await res.text();
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error(`Failed to fetch from ${host}`);
}

const num = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : null);

// ---------------------------------------------------------------------------------------------
// X / Twitter: the public fxtwitter mirror returns the same counters the logged-out page shows.
// ---------------------------------------------------------------------------------------------
async function crawlX(url: URL): Promise<Snapshot> {
  const m = url.pathname.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/);
  if (!m) throw new Error("Not a link to a specific post (expected x.com/<user>/status/<id>)");
  const [, user, id] = m;
  const body = await getTextWithRetry(`https://api.fxtwitter.com/${user}/status/${id}`);
  const t = JSON.parse(body)?.tweet;
  if (!t) throw new Error("Post not found (deleted, private or wrong link)");
  return {
    fetchedAt: Date.now(),
    platform: "x",
    source: "X public post data (via fxtwitter)",
    url: t.url || url.toString(),
    postId: String(t.id),
    author: t.author?.screen_name ?? user,
    authorFollowers: num(t.author?.followers),
    text: String(t.text ?? ""),
    postedAt: num(t.created_timestamp) ? t.created_timestamp * 1000 : null,
    views: num(t.views),
    likes: num(t.likes),
    reposts: num(t.retweets),
    replies: num(t.replies),
  };
}

// ---------------------------------------------------------------------------------------------
// YouTube: view/like counts are embedded in the public watch page.
// ---------------------------------------------------------------------------------------------
function videoIdOf(url: URL): string | null {
  if (url.hostname === "youtu.be") return url.pathname.slice(1) || null;
  if (url.pathname === "/watch") return url.searchParams.get("v");
  const m = url.pathname.match(/^\/(shorts|live|embed)\/([\w-]{6,})/);
  return m ? m[2] : null;
}

function jsonStr(html: string, key: string): string | null {
  const m = html.match(new RegExp(`"${key}":"((?:[^"\\\\]|\\\\.)*)"`));
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

async function crawlYouTube(url: URL): Promise<Snapshot> {
  const id = videoIdOf(url);
  if (!id) throw new Error("Not a link to a specific video");
  const html = await getTextWithRetry(`https://www.youtube.com/watch?v=${id}`);
  const views = jsonStr(html, "viewCount");
  if (views === null) throw new Error("Video not found or unavailable");
  const likes = jsonStr(html, "likeCount");
  const publish = jsonStr(html, "publishDate");
  let handle = jsonStr(html, "author");
  try {
    const o = JSON.parse(await getTextWithRetry(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`));
    const h = String(o.author_url || "").match(/@([\w.-]+)/);
    handle = h ? h[1] : o.author_name || handle;
  } catch {}
  return {
    fetchedAt: Date.now(),
    platform: "youtube",
    source: "YouTube public watch page",
    url: `https://www.youtube.com/watch?v=${id}`,
    postId: id,
    author: handle,
    authorFollowers: null,
    text: `${jsonStr(html, "title") ?? ""}\n${jsonStr(html, "shortDescription") ?? ""}`.trim(),
    postedAt: publish ? Date.parse(publish) || null : null,
    views: Number(views),
    likes: likes === null ? null : Number(likes),
    reposts: null,
    replies: null,
  };
}

// ---------------------------------------------------------------------------------------------
// Instagram / TikTok: public page metadata scraper.
// ---------------------------------------------------------------------------------------------
function meta(html: string, prop: string): string | null {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"));
  return m ? m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#039;/g, "'") : null;
}

async function crawlGeneric(url: URL, platform: Platform): Promise<Snapshot> {
  const html = await getTextWithRetry(url.toString());
  const title = meta(html, "og:title");
  const desc = meta(html, "og:description");
  if (!title && !desc) throw new Error("Page is not publicly readable (login wall or removed)");
  const handle = url.pathname.match(/^\/@?([\w.]+)\/(?:video|p|reel)\//)?.[1] ?? null;
  return {
    fetchedAt: Date.now(),
    platform,
    source: `${platform} public page (no impression counts exposed)`,
    url: url.toString(),
    postId: url.pathname.split("/").filter(Boolean).pop() ?? null,
    author: handle,
    authorFollowers: null,
    text: `${title ?? ""}\n${desc ?? ""}`.trim(),
    postedAt: null,
    views: null,
    likes: null,
    reposts: null,
    replies: null,
  };
}

export async function crawl(rawUrl: string): Promise<Snapshot> {
  const { url, platform } = parseTarget(rawUrl);
  if (platform === "x") return crawlX(url);
  if (platform === "youtube") return crawlYouTube(url);
  return crawlGeneric(url, platform);
}
