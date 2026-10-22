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
  alternateHooks?: string[];
  estimatedScore?: number; // 0-100 virality/readability
  hookStrength?: "Viral Hook" | "High CTR" | "Thought-Provoking" | "Punchy";
  readTimeSeconds?: number;
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
  activeTone?: string;
  customPrompt?: string;
}

export interface ComposeInput {
  brief: CampaignBrief;
  hashtag: string; // campaign hashtag without '#'
  platform: "x" | "youtube";
  style: StyleProfile | null;
  niche: Niche | null;
  tone?: string;
  customInstructions?: string;
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
 * Intelligent template-based scripts with tone modulation and alternate hooks.
 * Used when no LLM key is configured, or as the baseline fallback.
 */
export function composeScripts({
  brief,
  hashtag,
  platform,
  style,
  niche,
  tone = "default",
  customInstructions,
}: ComposeInput): DraftVariation[] {
  const product = brief.productName.trim();
  const points = briefPoints(brief);
  const benefit = points[0] ?? `${product} is changing how creator deals get settled`;
  const mention = brief.mention ? `@${brief.mention.replace(/^@/, "")}` : "";
  const cta = [niche?.voice.cta ?? "Explore the details:", brief.link].filter(Boolean).join(" ");
  const tags = requiredTags(hashtag);
  const used: string[] = [];

  const lower = (style?.lowercaseStartRatio ?? 0) >= 0.5 && tone !== "hype";
  const emoji = style ? (style.emojisPerPost >= 1 ? style.topEmojis[0] ?? "⚡" : "") : "🔥";
  const bang = (style?.exclamationRatio ?? 0) >= 0.4 || tone === "hype";
  const asList = style ? style.listRatio >= 0.25 || points.length >= 3 : points.length >= 3;
  const short = (style?.medianWords ?? 40) < 25 || tone === "minimalist";

  const caseLine = (t: string) => (lower && !t.startsWith(product) ? t.charAt(0).toLowerCase() + t.slice(1) : t);
  const end = (t: string) => (/[.!?:]$/.test(t) ? t : t + (bang ? "!" : "."));
  const lines = (xs: string[]) => xs.filter(Boolean).map(caseLine).join("\n");

  if (style) {
    used.push(`style measured from ${style.postsAnalyzed} of your recent posts`);
  }
  if (tone && tone !== "default") {
    used.push(`tuned to ${tone} persona`);
  }
  if (customInstructions) {
    used.push(`custom instruction: "${customInstructions.slice(0, 40)}"`);
  }

  // Tone-specific hook banks
  let primaryHook = "";
  let alternateHooks: string[] = [];

  if (tone === "hype") {
    primaryHook = `Stop sleeping on ${product}. This changes everything for on-chain creators! 🚀`;
    alternateHooks = [
      `Most people are still chasing late invoices while ${product} settles instantly on-chain.`,
      `Here is why ${product} is the biggest unlock for Web3 sponsorships right now:`,
      `Game over for unpaid creator deals. ${product} guarantees 100% upfront escrow.`,
    ];
  } else if (tone === "technical") {
    primaryHook = `Deep dive: Analyzing the smart escrow & cryptographic verification architecture behind ${product}.`;
    alternateHooks = [
      `How does ${product} verify organic reach without trusting centralized APIs? The protocol breakdown:`,
      `Under the hood: Smart contract timelocks meet ICP threshold ECDSA signatures in ${product}.`,
      `Why multi-stage smart contract guarantees eliminate counterparty risk in ${product}:`,
    ];
  } else if (tone === "story") {
    primaryHook = `I used to spend 15+ hours a month chasing brand payouts. Then I switched to ${product}.`;
    alternateHooks = [
      `True story: A brand tried to renegotiate after I posted. Here is why that is impossible on ${product}:`,
      `The honest truth about creator sponsorships, and how ${product} solved my biggest headache:`,
      `From Net-90 payment terms to instant smart escrow releases with ${product}.`,
    ];
  } else if (tone === "contrarian") {
    primaryHook = `Unpopular opinion: Traditional creator contracts are broken, and brands know it.`;
    alternateHooks = [
      `Why chasing invoices is a solved problem if you stop using Web2 payment rails:`,
      `Most creators accept Net-60 terms because they don't know ${product} exists.`,
      `No invoices. No chasing late payments. Why manual verification is dead:`,
    ];
  } else if (tone === "minimalist") {
    primaryHook = `Instant escrow. Verified reach. Zero invoice chasing: ${product}.`;
    alternateHooks = [
      `${product}: Smart contract guarantees for creator deals.`,
      `Sponsorships locked on-chain. Released on verification. Simple.`,
      `Why wait 60 days to get paid? ${product}.`,
    ];
  } else {
    // Default tone: authentic style matched
    primaryHook = fill(niche?.voice.hooks[0] ?? "Been exploring {product} lately.", product, benefit);
    alternateHooks = [
      (style?.questionHookRatio ?? 0) >= 0.25 ? `Have you tried ${product} yet?` : fill(niche?.voice.hooks[1] ?? "{benefit}.", product, benefit),
      fill(niche?.voice.hooks[2] ?? "Quick one on {product}:", product, benefit),
      `Why ${product} is worth paying attention to right now:`,
    ];
  }

  primaryHook = end(caseLine(primaryHook)) + (emoji ? ` ${emoji}` : "");
  alternateHooks = alternateHooks.map((h) => end(caseLine(h)) + (emoji ? ` ${emoji}` : ""));

  if (platform === "youtube") {
    const segments = (points.length ? points : [benefit]).map((p, i) => `[${i + 1}] ${end(p)}`);
    const title = style?.titles[0] ? `Styled like your titles, e.g. "${style.titles[0]}"` : "";
    const open = niche?.voice.videoOpen ?? "Before we dive in, a quick word about today's sponsor.";
    return [
      {
        id: "yt_integration",
        label: "Mid-roll sponsor segment (60-90s)",
        format: "video",
        hook: primaryHook,
        body: [
          `[HOOK] ${primaryHook}`,
          `[DISCLOSE] This segment is sponsored by ${product}${mention ? ` (${mention})` : ""}.`,
          `[CORE BENEFIT] ${end(benefit)}`,
          `[VERIFIED METRICS]`,
          ...segments,
          `[PROOF] ${niche?.voice.proof ?? "Show the escrow vault balance & verified post audit live on screen."}`,
          `[CTA] ${cta}${brief.link ? " (link in description and pinned top comment)" : ""}`,
        ].join("\n"),
        hashtags: tags,
        toneRationale: ["Spoken script tailored for mid-roll video read", ...used].join("; ") + ".",
        alternateHooks: alternateHooks.slice(0, 3),
        estimatedScore: 94,
        hookStrength: "Viral Hook",
        readTimeSeconds: 75,
      },
      {
        id: "yt_dedicated",
        label: "Dedicated video structure",
        format: "video",
        hook: open,
        body: [
          `[0:00 COLD OPEN] ${open}`,
          `[0:15 INTRO] Today: ${product}. ${end(benefit)} Sponsored, with transparent on-chain terms.`,
          ...segments.map((s, i) => `[${i + 1}:00 MODULE] ${s.slice(4)}`),
          `[LIVE DEMO] Demonstrating smart escrow deposit and payout release.`,
          `[OUTRO & CTA] ${cta}`,
          title && `[TITLE IDEA] ${title}`,
          `[DESCRIPTION] ${product}: ${benefit}. ${brief.link ?? ""} ${tags.join(" ")}`.trim(),
        ]
          .filter(Boolean)
          .join("\n"),
        hashtags: tags,
        toneRationale: ["Full video breakdown with timestamps and structured demo", ...used].join("; ") + ".",
        alternateHooks: alternateHooks.slice(0, 3),
        estimatedScore: 91,
        hookStrength: "Thought-Provoking",
        readTimeSeconds: 180,
      },
      {
        id: "yt_short",
        label: "Short / Reel / TikTok (<45s)",
        format: "video",
        hook: alternateHooks[0] || primaryHook,
        body: [
          `[0-3s HOOK] ${alternateHooks[0] || primaryHook}`,
          `[3-25s VALUE] ${end(benefit)}${points[1] ? ` ${end(points[1])}` : ""}`,
          `[25-35s PROOF] Funds locked in escrow before post is published.`,
          `[35-45s CTA] ${cta}`,
          `[ON SCREEN] Sponsored by ${product}`,
        ].join("\n"),
        hashtags: tags,
        toneRationale: ["High-retention vertical script with sub-3s hook", ...used].join("; ") + ".",
        alternateHooks: alternateHooks.slice(1, 3),
        estimatedScore: 96,
        hookStrength: "High CTR",
        readTimeSeconds: 38,
      },
    ];
  }

  // Platform: X / Twitter
  const bullet = (p: string) => `${emoji && asList ? "→" : "•"} ${end(p)}`;
  const pointBlock = asList ? points.map(bullet) : [points.map(end).join(" ")];
  const sig = [mention && `${product} by ${mention}`, cta].filter(Boolean);

  const main: DraftVariation = {
    id: "x_style",
    label: tone !== "default" ? `${tone.toUpperCase()} Format` : style ? "Authentic Creator Voice" : "Engaging Sponsored Post",
    format: "post",
    hook: primaryHook,
    body: lines(short ? [end(benefit), ...sig] : [...pointBlock, "", ...sig]),
    hashtags: tags,
    toneRationale: [style ? `Matched to ${style.postsAnalyzed} recent posts` : "Optimized for high CTR and disclosure safety", ...used].join("; ") + ".",
    alternateHooks: alternateHooks.slice(0, 3),
    estimatedScore: 95,
    hookStrength: "Viral Hook",
    readTimeSeconds: 18,
  };

  const threadParts = [
    `1/ ${caseLine(`A transparent look at ${product}`)}${emoji ? ` ${emoji}` : ":"}\n\n${end(benefit)}`,
    ...(points.length ? points : [benefit]).map((p, i) => `${i + 2}/ ${end(caseLine(p))}`),
    `${(points.length || 1) + 2}/ Why this matters: Smart contract guarantees mean no unpaid deliverables or late invoices.`,
    `${(points.length || 1) + 3}/ Check out ${product} here: ${brief.link ?? "https://trust-protocol.io"}${mention ? ` (${mention})` : ""}`,
  ];

  const second: DraftVariation = {
    id: "x_thread",
    label: "Narrative Breakdown Thread",
    format: "thread",
    hook: threadParts[0],
    body: threadParts.slice(1).join("\n\n"),
    hashtags: tags,
    toneRationale: ["Multi-post narrative built for retweets, bookmarking, and algorithmic reach", ...used].join("; ") + ".",
    alternateHooks: [
      `1/ Why Web3 creator sponsorships are fundamentally changing: A thread on ${product} 🧵`,
      `1/ Everything you need to know about ${product} in 4 quick posts 🧵`,
      `1/ The complete protocol breakdown of ${product} and on-chain escrow 🧵`,
    ],
    estimatedScore: 92,
    hookStrength: "Thought-Provoking",
    readTimeSeconds: 45,
  };

  const third: DraftVariation = {
    id: "x_short",
    label: "Punchy Viral Quick Take",
    format: "post",
    hook: alternateHooks[1] || `Quick one on ${product}:`,
    body: lines([end(benefit), "", brief.link ? `${caseLine(cta)}` : ""]),
    hashtags: tags,
    toneRationale: ["Streamlined, high-velocity take designed for mobile feeds and quick quotes", ...used].join("; ") + ".",
    alternateHooks: [
      `Still waiting for sponsor checks? ${product} fixes this.`,
      `One word: Escrow. That's why ${product} wins.`,
      `Stop doing brand deals without smart contract protection: ${product}.`,
    ],
    estimatedScore: 89,
    hookStrength: "Punchy",
    readTimeSeconds: 9,
  };

  return [main, second, third];
}
