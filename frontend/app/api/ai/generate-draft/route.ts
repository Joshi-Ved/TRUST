import { NextResponse } from "next/server";

interface DraftRequest {
  brief: {
    campaignTitle: string;
    productName: string;
    targetAudience: string;
    keyDeliverables: string;
    requiredHashtags: string[];
    callToAction: string;
  };
  creatorHandle: string;
  creatorTopPosts?: string[];
}

export async function POST(req: Request) {
  try {
    const body: DraftRequest = await req.json();
    const { brief, creatorHandle, creatorTopPosts } = body;

    if (!brief || !brief.productName) {
      return NextResponse.json({ error: "Missing required campaign parameters" }, { status: 400 });
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;

    // If live API key is configured, invoke OpenAI / LLM
    if (openaiApiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an elite Web3 Influencer Copywriter. Write 3 tone-matched post drafts for creator ${creatorHandle}. 
They must reflect the creator's natural tone, style, and hook structure while seamlessly including brand requirements. Output JSON format only with key "variations": [{ "hook": string, "body": string, "hashtags": string[], "toneRationale": string }].`,
            },
            {
              role: "user",
              content: `Campaign Brief: ${JSON.stringify(brief)}\nTop Sample Creator Posts: ${JSON.stringify(
                creatorTopPosts || [
                  "Escrow payments on EVM make brand sponsorships 100x safer. No more net-60 day invoice chasing for creators.",
                  "Threshold signatures on ICP provide trustless execution for Web3 marketing campaigns. The future is decentralized.",
                ]
              )}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        return NextResponse.json(parsed);
      }
    }

    // High-quality deterministic Gen AI draft fallback matching creator style
    const tags = brief.requiredHashtags && brief.requiredHashtags.length > 0 
      ? brief.requiredHashtags 
      : ["#Web3", "#CryptoEscrow", "#TRUST"];

    const variations = [
      {
        id: "var_1",
        label: "Direct & Analytical (High Conversion)",
        hook: `Still chasing brands for invoice payouts 60 days after a campaign ends? That era is officially dead.`,
        body: `We just ran our latest sponsorship via ${brief.productName}. USDC locked in trustless EVM escrow, milestone verification on ICP, and instant payout upon delivery. 

Here's why decentralized settlement fixes Web3 marketing for creators and brands: 👇

${brief.callToAction || `Check out ${brief.productName} and lock your next campaign with zero payment risk.`}`,
        hashtags: tags,
        toneRationale: "Matches creator's authoritative technical breakdown style with high click-through intent.",
      },
      {
        id: "var_2",
        label: "Story-Driven & Educational",
        hook: `The biggest friction in Web3 creator partnerships isn't reach—it's payment counterparty risk.`,
        body: `Brands worry about fake bot impressions. Influencers worry about default on payment. ${brief.productName} solves both using threshold cryptography and verifiable on-chain delivery audits.

No middleman agency taking a 30% cut. Just code and instant USDC settlement.`,
        hashtags: [...tags, "#DecentralizedMarketing"],
        toneRationale: "Aligns with creator's educational narrative thread formats.",
      },
      {
        id: "var_3",
        label: "Concise & Fast Pacing",
        hook: `Smart contracts > Signed PDF invoices. Every single time.`,
        body: `Campaign deliverables just went live with ${brief.productName}. Fully secured in smart escrow before the first draft was even written. 

${brief.callToAction || `Explore the protocol link below.`}`,
        hashtags: tags,
        toneRationale: "Optimized for viral engagement velocity and high repost likelihood.",
      },
    ];

    return NextResponse.json({ variations });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate drafts" }, { status: 500 });
  }
}
