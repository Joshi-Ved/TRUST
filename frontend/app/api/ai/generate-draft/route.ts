import { NextResponse } from "next/server";
import type { CampaignBrief } from "@/lib/icp-agent";
import { CAMPAIGN_HASHTAG } from "@/lib/icp-agent";
import { fetchProfile, scanPosts } from "@/lib/audit/profile";
import type { Snapshot } from "@/lib/audit/types";
import { briefPoints, composeScripts, DraftBasis, DraftVariation, requiredTags } from "@/lib/ai/compose";
import { detectNiche, Niche, nicheById } from "@/lib/ai/niches";
import { analyzeStyle, StyleProfile } from "@/lib/ai/style";
import { readInfluencers, scanPlatformOf } from "@/lib/server/influencerStore";
import { readOrders } from "@/lib/server/orderStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Orders funded before advertisers could write a brief fall back to the platform's own campaign.
const DEFAULT_BRIEF: CampaignBrief = {
  productName: "TRUST Protocol",
  keyMessage:
    "Sponsorship payments are locked in on-chain escrow before work starts; Payment releases automatically once the post's real reach is verified; No invoices, no chasing late payments",
  link: "https://trust-protocol.io/escrow",
};

/** Makes sure every script carries what the campaign requires, whatever wrote it. */
function enforceRequirements(v: DraftVariation, brief: CampaignBrief, hashtag: string): DraftVariation {
  const hashtags = [...new Set([...requiredTags(hashtag), ...(v.hashtags ?? []).map((t) => (t.startsWith("#") ? t : `#${t}`))])];
  let body = v.body.trim();
  // Models often repeat the hook as the body's first line, and the hashtags at its end; both are shown separately.
  if (v.hook && body.startsWith(v.hook.trim())) body = body.slice(v.hook.trim().length).trim();
  const tagSet = new Set(hashtags.map((t) => t.toLowerCase()));
  body = body.replace(/(?:\s+#\w+)+\s*$/, (run) => (run.trim().split(/\s+/).every((t) => tagSet.has(t.toLowerCase())) ? "" : run));
  if (brief.link && !`${v.hook}\n${body}`.includes(brief.link)) body += `\n${brief.link}`;
  return {
    ...v,
    hashtags,
    body,
    alternateHooks: v.alternateHooks ?? [],
    estimatedScore: v.estimatedScore ?? 92,
    hookStrength: v.hookStrength ?? "Viral Hook",
    readTimeSeconds: v.readTimeSeconds ?? Math.max(12, Math.round(body.length / 15)),
  };
}

interface Prompt {
  system: string;
  user: string;
}

function buildPrompt(
  brief: CampaignBrief,
  hashtag: string,
  platform: "x" | "youtube",
  handle: string,
  style: StyleProfile | null,
  niche: Niche | null,
  tone?: string,
  customInstructions?: string
): Prompt {
  const format =
    platform === "youtube"
      ? "spoken YouTube scripts: a 60-90s mid-roll sponsor read, a dedicated-video outline with timestamps, and a vertical Short under 45s"
      : "X posts: one in the creator's usual format, one thread (or question-led post if they never write threads), and one short take";

  const voice = style
    ? `Measured from ${style.postsAnalyzed} of their recent posts:\n- ${style.summary.join("\n- ")}\nTheir best-performing posts, verbatim (copy the voice, never the content):\n${style.exemplars
        .map((e, i) => `${i + 1}. """${e}"""`)
        .join("\n")}${style.titles.length ? `\nTheir video titles: ${style.titles.map((t) => `"${t}"`).join(", ")}` : ""}`
    : niche
    ? `Their posts could not be analysed. Write in the usual voice of the ${niche.label} niche for ${niche.voice.audience}. ${niche.voice.proof}`
    : "No style data. Write in a clear, friendly, natural voice.";

  const toneGuidance =
    tone === "hype"
      ? "Adopt a high-energy, exciting, FOMO-driven tone with bold declarations and excitement."
      : tone === "technical"
      ? "Adopt a technical, architectural, deep-dive alpha tone explaining smart contract mechanics and protocol trustlessness."
      : tone === "story"
      ? "Adopt a personal storytelling tone detailing how traditional payouts were broken and how this solves it."
      : tone === "contrarian"
      ? "Adopt a contrarian, provocative hot-take angle calling out the flaws in traditional agency invoicing."
      : tone === "minimalist"
      ? "Adopt an ultra-concise, punchy, minimalist tone under 30 words per post."
      : "Match the creator's natural voice seamlessly.";

  return {
    system: `You ghost-write sponsored content for the creator ${handle}. Write 3 ${format}.
Rules:
- Say only what the brief says about the product. Do not invent features, numbers, prices or claims.
- Tone direction: ${toneGuidance}
${customInstructions ? `- Creator's custom instruction to incorporate: "${customInstructions}"` : ""}
- Every point in the brief's key message must appear in each script, in the creator's own words.
- Sound exactly like the creator: their length, casing, punctuation, emoji habits, hooks and recurring phrases.
- Disclose the sponsorship (e.g. "#ad" or "sponsored"). Include #${hashtag}.${brief.link ? ` Include the link ${brief.link}.` : ""}${
      brief.mention ? ` Tag @${brief.mention.replace(/^@/, "")}.` : ""
    }
- Do not invent stories, giveaways, experiments, results, dates or years that are not in the brief. Video titles must describe this sponsored content, not copy the creator's old titles.
- For threads, separate the posts in "body" with blank lines and number them 2/, 3/, ...
- Put hashtags only in the "hashtags" array, not in "hook" or "body".
- Provide 2-3 "alternateHooks" for each variation so the creator can test different opening lines.
- "label" is a short human title, e.g. "Usual format", "Thread", "Mid-roll read".
Return JSON only: {
  "variations": [
    {
      "label": string,
      "format": "post"|"thread"|"video",
      "hook": string,
      "alternateHooks": string[],
      "body": string,
      "hashtags": string[],
      "toneRationale": string,
      "estimatedScore": number,
      "hookStrength": "Viral Hook"|"High CTR"|"Thought-Provoking"|"Punchy",
      "readTimeSeconds": number
    }
  ]
}.
"hook" is the opening line; "body" is everything after it. toneRationale: one sentence naming which habits or psychological angles were used.`,
    user: `CAMPAIGN BRIEF\nProduct: ${brief.productName}\nKey message:\n- ${briefPoints(brief).join("\n- ")}${brief.link ? `\nLink: ${brief.link}` : ""}${
      brief.mention ? `\nTag: @${brief.mention}` : ""
    }\n\nCREATOR VOICE\n${voice}`,
  };
}

function parseVariations(json: string): DraftVariation[] | null {
  try {
    const parsed = JSON.parse(json.replace(/^```(?:json)?\s*|\s*```$/g, "") || "{}");
    const vs: any[] = Array.isArray(parsed.variations) ? parsed.variations : [];
    const out = vs
      .slice(0, 3)
      .map((v, i) => ({
        id: `llm_${i}`,
        label: String(v.label ?? `Variation ${i + 1}`)
          .replace(/[_-]+/g, " ")
          .replace(/^\w/, (c) => c.toUpperCase()),
        format: (v.format === "thread" || v.format === "video" ? v.format : "post") as DraftVariation["format"],
        hook: String(v.hook ?? ""),
        alternateHooks: Array.isArray(v.alternateHooks) ? v.alternateHooks.map(String) : [],
        body: String(v.body ?? ""),
        hashtags: Array.isArray(v.hashtags) ? v.hashtags.map(String) : [],
        toneRationale: String(v.toneRationale ?? ""),
        estimatedScore: typeof v.estimatedScore === "number" ? Math.min(99, Math.max(75, v.estimatedScore)) : 90 + ((i * 3) % 9),
        hookStrength: (v.hookStrength as any) || (i === 0 ? "Viral Hook" : i === 1 ? "Thought-Provoking" : "Punchy"),
        readTimeSeconds: typeof v.readTimeSeconds === "number" ? v.readTimeSeconds : Math.max(12, Math.round((v.body?.length || 100) / 15)),
      }))
      .filter((v) => v.hook || v.body);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

// Tried in order: a busy model (429/503) gets one retry, then the next model is used.
const GEMINI_MODELS = [process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest"];

/** Google Gemini (GEMINI_API_KEY). JSON mode keeps the output parseable. Returns the model that answered. */
async function writeWithGemini(key: string, prompt: Prompt): Promise<{ variations: DraftVariation[] | null; model: string }> {
  let lastError = "";
  for (const model of [...new Set(GEMINI_MODELS)]) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: "user", parts: [{ text: prompt.user }] }],
          generationConfig: { temperature: 0.8, responseMimeType: "application/json" },
        }),
      });
      if (res.ok) {
        const parts: any[] = (await res.json()).candidates?.[0]?.content?.parts ?? [];
        return { variations: parseVariations(parts.map((p) => p.text ?? "").join("")), model };
      }
      lastError = `${model} responded ${res.status}: ${(await res.text()).slice(0, 160)}`;
      if (res.status !== 429 && res.status !== 503) break; // not a capacity problem: try the next model
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error(`Gemini unavailable. ${lastError}`);
}

/** OpenAI (OPENAI_API_KEY), used only when no Gemini key is configured. */
async function writeWithOpenAi(key: string, prompt: Prompt): Promise<DraftVariation[] | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI responded ${res.status}`);
  return parseVariations((await res.json()).choices?.[0]?.message?.content ?? "");
}

/**
 * POST { orderId, tone, customInstructions }: scripts for the creator of that order.
 * Content: the advertiser's brief on the order (what the post must say).
 * Voice: the creator's style measured from their recent public posts; if those cannot be read,
 * the creator's niche (chosen at onboarding, or detected from their posts).
 */
export async function POST(req: Request) {
  let orderId: string;
  let tone: string | undefined;
  let customInstructions: string | undefined;
  try {
    const body = await req.json();
    orderId = body.orderId;
    tone = body.tone;
    customInstructions = body.customInstructions;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const order = (await readOrders()).find((o) => o.orderId === orderId);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const brief = order.campaign?.brief?.productName ? order.campaign.brief : DEFAULT_BRIEF;
  const hashtag = order.campaign?.hashtag ?? CAMPAIGN_HASHTAG;
  const creator = (await readInfluencers()).find((i) => i.evmAddress.toLowerCase() === order.influencerAddress.toLowerCase());
  const platform = (creator && scanPlatformOf(creator.platform)) || "x";

  let posts: Snapshot[] = [];
  let note: string | undefined;
  if (creator?.registered && scanPlatformOf(creator.platform)) {
    try {
      const scanAsync = async () => {
        const prof = await fetchProfile(platform, creator.handle);
        return await scanPosts(prof, 1);
      };
      const timeoutPromise = new Promise<Snapshot[]>((_, reject) =>
        setTimeout(() => reject(new Error("Network profile scan timeout")), 2500)
      );
      posts = await Promise.race([scanAsync(), timeoutPromise]);
    } catch (e: any) {
      note = `Could not read ${creator.handle}'s posts (${e?.message}), so the calibrated niche voice was used.`;
    }
  } else {
    note = "This creator has no scannable profile, so the calibrated niche voice was used.";
  }

  const style = analyzeStyle(posts);
  if (!style && posts.length && !note) note = `Only ${posts.length} usable posts found, too few to model a writing style, so the niche voice was used.`;
  const niche = nicheById(creator?.niche) ?? detectNiche(posts.map((p) => p.text));

  // Gemini writes the scripts; OpenAI only if no Gemini key is set; templates if neither works.
  const gemini = process.env.GEMINI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  let variations: DraftVariation[] | null = null;
  let model: string | undefined;
  if (gemini || openai) {
    const prompt = buildPrompt(brief, hashtag, platform, creator?.handle ?? "the creator", style, niche, tone, customInstructions);
    try {
      if (gemini) ({ variations, model } = await writeWithGemini(gemini, prompt));
      else [variations, model] = [await writeWithOpenAi(openai!, prompt), process.env.OPENAI_MODEL || "gpt-4o-mini"];
    } catch (e: any) {
      console.error("[generate-draft]", e?.message);
    }
    if (!variations) note = [note, "The AI writer did not respond, so enhanced style-matched scripts were used."].filter(Boolean).join(" ");
  }
  const writer: DraftBasis["writer"] = variations ? "llm" : "template";
  variations ??= composeScripts({ brief, hashtag, platform, style, niche, tone, customInstructions });

  const basis: DraftBasis = {
    writer,
    model,
    styleSource: style ? "posts" : niche ? "niche" : "none",
    postsAnalyzed: style?.postsAnalyzed ?? 0,
    styleSummary: style?.summary ?? [],
    niche: niche?.label ?? null,
    briefSource: brief === DEFAULT_BRIEF ? "default" : "advertiser",
    brief,
    note,
    activeTone: tone || "default",
    customPrompt: customInstructions,
  };
  return NextResponse.json({ variations: variations.map((v) => enforceRequirements(v, brief, hashtag)), basis });
}
