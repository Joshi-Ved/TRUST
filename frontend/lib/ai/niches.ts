/**
 * Content niches. `keywords` detect a creator's niche from their posts; `voice` is how sponsored
 * content is usually framed in that niche, used when the creator's own posts cannot be analysed.
 */
export interface Niche {
  id: string;
  label: string;
  keywords: string[];
  voice: {
    audience: string; // who is reading
    hooks: string[]; // {product} and {benefit} are filled in
    proof: string; // how this niche backs up a claim
    cta: string;
    videoOpen: string; // first line of a video script
  };
}

export const NICHES: Niche[] = [
  {
    id: "crypto",
    label: "Crypto / Web3",
    keywords: ["crypto", "web3", "eth", "ethereum", "bitcoin", "btc", "defi", "onchain", "on-chain", "token", "wallet", "nft", "l2", "dao", "solana", "staking", "airdrop", "blockchain"],
    voice: {
      audience: "builders and on-chain users",
      hooks: ["Most people are sleeping on {product}.", "{benefit}. Here's how {product} does it:", "I tested {product} so you don't have to."],
      proof: "Show the transaction, the contract or the numbers.",
      cta: "DYOR, then try it:",
      videoOpen: "If you've ever lost money to a counterparty, this one's for you.",
    },
  },
  {
    id: "tech",
    label: "Tech / Software",
    keywords: ["ai", "app", "software", "code", "coding", "developer", "startup", "saas", "product", "launch", "api", "gadget", "iphone", "android", "laptop", "build", "shipping"],
    voice: {
      audience: "people who build and buy tech",
      hooks: ["I've been using {product} for a week. Honest take:", "{benefit}, and it took 5 minutes to set up.", "This replaced 3 tools in my workflow."],
      proof: "Walk through one concrete before/after.",
      cta: "Try it here:",
      videoOpen: "I replaced part of my workflow with this. Let me show you why.",
    },
  },
  {
    id: "finance",
    label: "Finance / Investing",
    keywords: ["money", "invest", "investing", "stocks", "market", "finance", "savings", "budget", "income", "wealth", "portfolio", "trading", "fed", "rates", "tax"],
    voice: {
      audience: "people managing their money",
      hooks: ["{benefit}. Most people don't know this exists.", "Here's the money mistake {product} fixes:", "Quick math on why {product} matters:"],
      proof: "Use a simple worked number example.",
      cta: "Details here (not financial advice):",
      videoOpen: "Let's talk about a money problem nobody warns you about.",
    },
  },
  {
    id: "gaming",
    label: "Gaming",
    keywords: ["game", "gaming", "gamer", "stream", "twitch", "fps", "rpg", "console", "ps5", "xbox", "nintendo", "esports", "patch", "ranked", "speedrun"],
    voice: {
      audience: "players and stream viewers",
      hooks: ["Okay this is actually sick.", "{product} just changed how I play.", "Nobody's talking about {product} and that's a mistake."],
      proof: "Show it in action, clip-style.",
      cta: "Go check it out:",
      videoOpen: "Before we jump in, I need to show you something.",
    },
  },
  {
    id: "fitness",
    label: "Fitness / Health",
    keywords: ["fitness", "gym", "workout", "training", "health", "protein", "run", "running", "lift", "diet", "nutrition", "sleep", "wellness", "yoga", "steps"],
    voice: {
      audience: "people working on their health",
      hooks: ["The one thing that actually moved the needle for me:", "{benefit} without changing your whole routine.", "30 days with {product}. Results:"],
      proof: "Share a personal routine and a result.",
      cta: "Here's what I use:",
      videoOpen: "Small change, big difference. Let me show you.",
    },
  },
  {
    id: "beauty",
    label: "Beauty / Fashion",
    keywords: ["beauty", "skincare", "makeup", "fashion", "outfit", "style", "hair", "glow", "routine", "ootd", "lipstick", "serum", "wardrobe"],
    voice: {
      audience: "followers who trust your taste",
      hooks: ["Obsessed is an understatement.", "My new everyday essential: {product}.", "{benefit}. I didn't believe it either."],
      proof: "Show the before/after or the routine step.",
      cta: "Linking it here:",
      videoOpen: "Get ready with me, because I have a new favourite.",
    },
  },
  {
    id: "food",
    label: "Food / Cooking",
    keywords: ["food", "recipe", "cook", "cooking", "kitchen", "eat", "restaurant", "chef", "bake", "baking", "meal", "dinner", "taste", "coffee"],
    voice: {
      audience: "people who love to eat and cook",
      hooks: ["This just became a weekly staple.", "{benefit}. Dinner sorted.", "Trying {product} so you know if it's worth it."],
      proof: "Show it being made or tasted.",
      cta: "Find it here:",
      videoOpen: "Let's make something you'll want every week.",
    },
  },
  {
    id: "travel",
    label: "Travel",
    keywords: ["travel", "trip", "flight", "hotel", "beach", "city", "explore", "visa", "airport", "backpacking", "itinerary", "vacation", "nomad"],
    voice: {
      audience: "people planning their next trip",
      hooks: ["The travel hack I wish I knew sooner:", "{benefit} on every trip now.", "Packed {product} for this one. Here's why."],
      proof: "Tie it to a real moment on the trip.",
      cta: "Plan yours here:",
      videoOpen: "This trip almost went wrong, until this.",
    },
  },
  {
    id: "education",
    label: "Education / Explainers",
    keywords: ["learn", "explain", "explained", "how", "why", "thread", "guide", "lesson", "study", "science", "history", "facts", "tutorial"],
    voice: {
      audience: "people who want to understand things",
      hooks: ["Let me explain {product} in under a minute.", "Why {benefit} matters, simply:", "A short thread on {product}:"],
      proof: "Break it into numbered steps.",
      cta: "Learn more:",
      videoOpen: "By the end of this, you'll understand exactly how this works.",
    },
  },
  {
    id: "lifestyle",
    label: "Lifestyle / Entertainment",
    keywords: ["life", "day", "vlog", "family", "funny", "music", "movie", "weekend", "friends", "love", "home", "challenge"],
    voice: {
      audience: "your community",
      hooks: ["Not me adding another thing to my routine.", "{product}. That's the post.", "Real talk: {benefit}."],
      proof: "Keep it personal and casual.",
      cta: "Check it out:",
      videoOpen: "Okay, quick story before we start.",
    },
  },
];

export const nicheById = (id?: string | null) => NICHES.find((n) => n.id === id) ?? null;

/** Picks the niche whose keywords appear most across the given texts. Null when nothing matches. */
export function detectNiche(texts: string[]): Niche | null {
  const words = texts.join(" ").toLowerCase().match(/[a-z0-9$#-]+/g) ?? [];
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w.replace(/^[#$]/, ""), (counts.get(w.replace(/^[#$]/, "")) ?? 0) + 1);
  let best: Niche | null = null;
  let bestScore = 0;
  for (const n of NICHES) {
    const score = n.keywords.reduce((a, k) => a + (counts.get(k) ?? 0), 0);
    if (score > bestScore) [best, bestScore] = [n, score];
  }
  return bestScore >= 3 ? best : null;
}
