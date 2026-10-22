import type { CampaignBrief } from "@/lib/icp-agent";
import type { Niche } from "./niches";
import type { StyleProfile } from "./style";

export interface DraftVariation {
  id: string;
  label: string;
  format: "post" | "thread" | "video";
  hook: string;
  body: string;
  hashtags: string[];
  toneRationale: string;
}

/** What a set of scripts was based on, shown to the creator next to the scripts. */
export interface DraftBasis {
  writer: "llm" | "template";
  model?: string; // which AI model wrote the scripts, when writer is "llm"
  styleSource: "posts" | "niche" | "none";
  postsAnalyzed: number;
  styleSummary: string[];
  niche: string | null;
  briefSource: "advertiser" | "default";
  brief: CampaignBrief;
  note?: string;
}

export interface ComposeInput {
  brief: CampaignBrief;
  hashtag: string; // campaign hashtag without '#'
  platform: "x" | "youtube";
  style: StyleProfile | null;
  niche: Niche | null;
}

/** Sponsored posts must be disclosed (FTC / ASA / ASCI rules), so every script carries #ad. */
export const DISCLOSURE_TAG = "#ad";

/** The brief's key message as separate points: one per line, sentence or semicolon. */
export function briefPoints(brief: CampaignBrief): string[] {
  return brief.keyMessage
    .split(/\n|;|(?<=[.!?])\s+/)
    .map((p) => p.trim().replace(/^[-•*\d.)\s]+/, "").replace(/[.;]+$/, ""))
    .filter((p) => p.length > 2);
}

export const requiredTags = (hashtag: string) => [`#${hashtag}`, DISCLOSURE_TAG];

const fill = (tpl: string, product: string, benefit: string) =>
  tpl.replace(/\{product\}/g, product).replace(/\{benefit\}/g, benefit.charAt(0).toUpperCase() + benefit.slice(1));

/**
 * Template-based scripts used when no LLM key is configured. The content comes only from the brief;
 * the shape (length, casing, emojis, hooks, lists, threads) comes from the creator's measured style,
 * or from the niche's usual framing when their posts could not be analysed.
 */
export function composeScripts({ brief, hashtag, platform, style, niche }: ComposeInput): DraftVariation[] {
  const product = brief.productName.trim();
  const points = briefPoints(brief);
  const benefit = points[0] ?? `${product} is worth a look`;
  const mention = brief.mention ? `@${brief.mention.replace(/^@/, "")}` : "";
  const cta = [niche?.voice.cta ?? "Check it out:", brief.link].filter(Boolean).join(" ");
  const tags = requiredTags(hashtag);
  const used: string[] = [];

  const lower = (style?.lowercaseStartRatio ?? 0) >= 0.5;
  const emoji = style ? (style.emojisPerPost >= 1 ? style.topEmojis[0] ?? "👇" : "") : "";
  const bang = (style?.exclamationRatio ?? 0) >= 0.4;
  const asList = style ? style.listRatio >= 0.25 || points.length >= 3 : points.length >= 3;
  const short = (style?.medianWords ?? 40) < 25;

  const caseLine = (t: string) => (lower && !t.startsWith(product) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const end = (t: string) => (/[.!?:]$/.test(t) ? t : t + (bang ? "!" : "."));
  const lines = (xs: string[]) => xs.filter(Boolean).map(caseLine).join("\n");

  if (style) {
    used.push(`${short ? "short" : "fuller"} length (your median is ${style.medianWords} words)`);
    if (lower) used.push("lowercase like your posts");
    used.push(emoji ? `your emoji ${emoji}` : "no emojis, like your posts");
    if (bang) used.push("your high-energy punctuation");
  } else if (niche) {
    used.push(`${niche.label} framing for ${niche.voice.audience}`);
  }

  const hooks = [
    fill(niche?.voice.hooks[0] ?? "Been using {product} lately.", product, benefit),
    (style?.questionHookRatio ?? 0) >= 0.25 ? `Have you tried ${product} yet?` : fill(niche?.voice.hooks[1] ?? "{benefit}.", product, benefit),
    fill(niche?.voice.hooks[2] ?? "Quick one on {product}:", product, benefit),
  ].map((h) => end(caseLine(h)) + (emoji ? ` ${emoji}` : ""));

  if (platform === "youtube") {
    const segments = (points.length ? points : [benefit]).map((p, i) => `[${i + 1}] ${end(p)}`);
    const title = style?.titles[0] ? `Styled like your titles, e.g. "${style.titles[0]}"` : "";
    const open = niche?.voice.videoOpen ?? "Before we start, a quick word about today's sponsor.";
    return [
      {
        id: "yt_integration",
        label: "Mid-roll sponsor segment (60-90s)",
        format: "video",
        hook: hooks[0],
        body: [
          `[HOOK] ${hooks[0]}`,
          `[DISCLOSE] This part of the video is sponsored by ${product}${mention ? ` (${mention})` : ""}.`,
          `[WHAT IT DOES]`,
          ...segments,
          `[PROOF] ${niche?.voice.proof ?? "Show it working on screen."}`,
          `[CTA] ${cta}${brief.link ? " (link in the description and pinned comment)" : ""}`,
        ].join("\n"),
        hashtags: tags,
        toneRationale: ["Spoken script for a mid-roll read", ...used].join("; ") + ".",
      },
      {
        id: "yt_dedicated",
        label: "Dedicated video outline",
        format: "video",
        hook: open,
        body: [
          `[0:00 COLD OPEN] ${open}`,
          `[0:10 INTRO] Today: ${product}. ${end(benefit)} Sponsored, but my opinions are my own.`,
          ...segments.map((s, i) => `[${i + 1}:00 SEGMENT] ${s.slice(4)}`),
          `[OUTRO] ${cta}`,
          title && `[TITLE] ${title}`,
          `[DESCRIPTION] ${product}: ${benefit}. ${brief.link ?? ""} ${tags.join(" ")}`.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
        hashtags: tags,
        toneRationale: ["Full video structure built from the brief's points", ...used].join("; ") + ".",
      },
      {
        id: "yt_short",
        label: "Short / Reel (under 45s)",
        format: "video",
        hook: hooks[2],
        body: [`[0-3s] ${hooks[2]}`, `[3-30s] ${end(benefit)}${points[1] ? ` ${end(points[1])}` : ""}`, `[30-45s] ${cta}`, `[ON SCREEN] Sponsored by ${product}`].join("\n"),
        hashtags: tags,
        toneRationale: ["Vertical short with the hook in the first 3 seconds", ...used].join("; ") + ".",
      },
    ];
  }

  const bullet = (p: string) => `${emoji && asList ? "→" : "-"} ${end(p)}`;
  const pointBlock = asList ? points.map(bullet) : [points.map(end).join(" ")];
  const sig = [mention && `${product} by ${mention}`, cta].filter(Boolean);

  const main: DraftVariation = {
    id: "x_style",
    label: style ? "In your usual format" : `${niche?.label ?? "General"} sponsored post`,
    format: "post",
    hook: hooks[0],
    body: lines(short ? [end(benefit), ...sig] : [...pointBlock, "", ...sig]),
    hashtags: tags,
    toneRationale: [style ? `Matched to ${style.postsAnalyzed} of your recent posts` : "Your posts could not be analysed, so this follows your niche", ...used].join("; ") + ".",
  };

  const threadParts = [
    `1/ ${caseLine(`A quick thread on ${product}`)}${emoji ? ` ${emoji}` : ":"}`,
    ...(points.length ? points : [benefit]).map((p, i) => `${i + 2}/ ${end(caseLine(p))}`),
    `${(points.length || 1) + 2}/ ${caseLine(cta)}${mention ? ` ${mention}` : ""}`,
  ];
  const second: DraftVariation =
    (style?.threadRatio ?? 0) >= 0.2 || points.length >= 3
      ? {
          id: "x_thread",
          label: "Thread",
          format: "thread",
          hook: threadParts[0],
          body: threadParts.slice(1).join("\n\n"),
          hashtags: tags,
          toneRationale: ["One brief point per post", ...used].join("; ") + ".",
        }
      : {
          id: "x_question",
          label: "Question-led",
          format: "post",
          hook: hooks[1],
          body: lines([end(benefit), ...sig]),
          hashtags: tags,
          toneRationale: ["Opens with a question to drive replies", ...used].join("; ") + ".",
        };

  const third: DraftVariation = {
    id: "x_short",
    label: "Short take",
    format: "post",
    hook: hooks[2],
    body: lines([brief.link ? `${caseLine(cta)}` : end(benefit)]),
    hashtags: tags,
    toneRationale: ["Minimal version for fast reposts", ...used].join("; ") + ".",
  };

  return [main, second, third];
}
