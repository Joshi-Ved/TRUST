import type { Snapshot } from "@/lib/audit/types";

/** How a creator writes, measured from their real posts. Every field is computed, none guessed. */
export interface StyleProfile {
  postsAnalyzed: number;
  medianWords: number;
  lowercaseStartRatio: number; // posts that start with a lowercase letter
  emojisPerPost: number;
  topEmojis: string[];
  hashtagsPerPost: number;
  lineBreakRatio: number; // posts split over several lines
  threadRatio: number; // posts written as threads (🧵, 1/, "thread")
  questionHookRatio: number; // first sentence is a question
  exclamationRatio: number;
  listRatio: number; // posts with bullet or numbered lines
  openers: string[]; // first words they reuse, e.g. "gm", "Just"
  phrases: string[]; // word pairs/triples they reuse across posts
  exemplars: string[]; // best-performing posts, verbatim
  titles: string[]; // YouTube: their real video titles
  summary: string[]; // the above, in plain words
}

const URL_RE = /https?:\/\/\S+/g;
const EMOJI_RE = /\p{Extended_Pictographic}/gu;
const STOP = new Set(
  "the a an and or but of to in on for with at by from is are was were be been it this that these those i you we they he she my your our their me us them so just not no yes do does did have has had will would can could should what when where who how why all any more most some such than then there here about into over out up down very really also as if its it's i'm you're".split(
    " "
  )
);

const ratio = (n: number, d: number) => (d ? Math.round((n / d) * 100) / 100 : 0);
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);

function topRepeated(items: string[][], min: number, limit: number): string[] {
  const counts = new Map<string, number>();
  for (const perPost of items) for (const it of new Set(perPost)) counts.set(it, (counts.get(it) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, c]) => c >= min)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

/** Body text to learn from: URLs removed; for YouTube, title plus the first paragraph only (rest is links/sponsors). */
function writingOf(p: Snapshot): string {
  let t = p.text;
  if (p.platform === "youtube") t = t.split(/\n\s*\n/).slice(0, 2).join("\n");
  return t.replace(URL_RE, "").trim();
}

export function analyzeStyle(posts: Snapshot[]): StyleProfile | null {
  const texts = posts.map(writingOf).filter((t) => t.split(/\s+/).length >= 4);
  if (texts.length < 3) return null; // too little to say anything honest about their style
  const n = texts.length;

  const emojis = texts.map((t) => t.match(EMOJI_RE) ?? []);
  const words = texts.map((t) => t.toLowerCase().match(/[a-z0-9'’]+/g) ?? []);
  // Phrases are built from real words only, so numbers and fragments like "8 flash" never count.
  const isWord = (w: string) => /^[a-z'’]{2,}$/.test(w);
  const grams = words.map((ws) => {
    const out: string[] = [];
    for (let i = 0; i < ws.length - 1; i++) {
      const pair = [ws[i], ws[i + 1]];
      if (pair.every((w) => isWord(w) && !STOP.has(w) && w.length > 2)) out.push(pair.join(" "));
      const tri = ws.slice(i, i + 3);
      if (tri.length === 3 && tri.every(isWord) && !STOP.has(tri[0]) && !STOP.has(tri[2])) out.push(tri.join(" "));
    }
    return out;
  });
  const firstSentence = (t: string) => t.split(/(?<=[.!?])\s|\n/)[0] ?? t;

  const byEngagement = [...posts]
    .filter((p) => writingOf(p).split(/\s+/).length >= 6)
    .sort((a, b) => (b.likes ?? 0) / Math.max(b.views ?? 1, 1) - (a.likes ?? 0) / Math.max(a.views ?? 1, 1) || (b.likes ?? 0) - (a.likes ?? 0));

  const s: StyleProfile = {
    postsAnalyzed: n,
    medianWords: median(words.map((w) => w.length)),
    lowercaseStartRatio: ratio(texts.filter((t) => /^[a-z]/.test(t)).length, n),
    emojisPerPost: ratio(emojis.flat().length, n),
    topEmojis: topRepeated(emojis, 2, 4),
    hashtagsPerPost: ratio(texts.reduce((a, t) => a + (t.match(/#\w+/g)?.length ?? 0), 0), n),
    lineBreakRatio: ratio(texts.filter((t) => t.includes("\n")).length, n),
    threadRatio: ratio(texts.filter((t) => /🧵|\b1\/\d*|\bthread\b/i.test(t)).length, n),
    questionHookRatio: ratio(texts.filter((t) => firstSentence(t).trim().endsWith("?")).length, n),
    exclamationRatio: ratio(texts.filter((t) => t.includes("!")).length, n),
    listRatio: ratio(texts.filter((t) => /^\s*([-•→▪️]|\d+[.)])\s/m.test(t)).length, n),
    openers: topRepeated(texts.map((t) => [t.split(/\s+/)[0]?.replace(/[^\p{L}\p{N}']/gu, "")].filter(Boolean) as string[]), 2, 3),
    phrases: topRepeated(grams, 2, 6),
    exemplars: byEngagement.slice(0, 4).map(writingOf).map((t) => t.slice(0, 400)),
    titles: posts.filter((p) => p.platform === "youtube").map((p) => p.text.split("\n")[0]).slice(0, 6),
    summary: [],
  };

  const sum = s.summary;
  sum.push(`Usually ${s.medianWords < 25 ? "short" : s.medianWords < 60 ? "medium-length" : "long"} posts (median ${s.medianWords} words).`);
  if (s.lowercaseStartRatio >= 0.5) sum.push("Writes in casual lowercase.");
  sum.push(s.emojisPerPost >= 1 ? `Uses emojis often${s.topEmojis.length ? ` (${s.topEmojis.join(" ")})` : ""}.` : s.emojisPerPost > 0.2 ? "Uses emojis sparingly." : "Rarely uses emojis.");
  if (s.questionHookRatio >= 0.25) sum.push("Often opens with a question.");
  if (s.threadRatio >= 0.2) sum.push("Writes threads.");
  if (s.listRatio >= 0.25) sum.push("Likes bullet or numbered lists.");
  if (s.exclamationRatio >= 0.4) sum.push("High-energy, lots of exclamation marks.");
  sum.push(s.hashtagsPerPost >= 1.5 ? "Uses several hashtags per post." : s.hashtagsPerPost > 0.3 ? "Uses a hashtag now and then." : "Barely uses hashtags.");
  if (s.openers.length) sum.push(`Often starts posts with "${s.openers.join('", "')}".`);
  if (s.phrases.length) sum.push(`Recurring phrases: "${s.phrases.slice(0, 3).join('", "')}".`);
  return s;
}
