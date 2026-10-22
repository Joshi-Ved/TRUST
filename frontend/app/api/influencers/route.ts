import { NextResponse } from "next/server";
import { getAddress, isAddress, verifyMessage } from "ethers";
import { REGISTRATION_TTL_MS, ownershipCode, registrationMessage } from "@/lib/creatorRegistration";
import { fetchProfile, scanPosts, type ScanPlatform } from "@/lib/audit/profile";
import { detectNiche, nicheById } from "@/lib/ai/niches";
import { PLATFORM_LABEL, profileFromScan, readInfluencers, removeInfluencer, upsertInfluencer } from "@/lib/server/influencerStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readInfluencers());
}

/**
 * POST { platform: "x" | "youtube", handle, evmAddress, issuedAt, signature }: a creator registers
 * themselves with their own payout wallet. Escrows for their campaigns pay only that wallet. Two proofs:
 *  - wallet: `signature` is the creator's wallet signing registrationMessage(...), so the wallet is theirs;
 *  - account: ownershipCode(wallet) appears in the profile bio or a recent post, so the account is theirs.
 * Followers, typical reach and engagement are measured from recent posts rather than entered by hand.
 */
export async function POST(req: Request) {
  let body: { platform?: string; handle?: string; evmAddress?: string; issuedAt?: number; signature?: string; niche?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.platform !== "x" && body.platform !== "youtube") {
    return NextResponse.json({ error: "Platform must be X or YouTube (the platforms that publish view counts)" }, { status: 400 });
  }
  if (typeof body.evmAddress !== "string" || !isAddress(body.evmAddress.trim())) {
    return NextResponse.json({ error: "Connect the wallet you want to be paid to" }, { status: 400 });
  }
  const evmAddress = getAddress(body.evmAddress.trim());
  const platform = body.platform as ScanPlatform;
  const handle = String(body.handle ?? "");

  if (typeof body.issuedAt !== "number" || Math.abs(Date.now() - body.issuedAt) > REGISTRATION_TTL_MS) {
    return NextResponse.json({ error: "Registration signature expired. Sign again." }, { status: 401 });
  }
  try {
    if (verifyMessage(registrationMessage(platform, handle, evmAddress, body.issuedAt), String(body.signature)) !== evmAddress) throw 0;
  } catch {
    return NextResponse.json({ error: "Wallet signature does not match the payout wallet" }, { status: 401 });
  }

  try {
    const profile = await fetchProfile(platform, handle);
    // Payouts are matched to creators by wallet, so one wallet cannot belong to two creators.
    const owner = (await readInfluencers()).find((i) => i.evmAddress.toLowerCase() === evmAddress.toLowerCase());
    if (owner && !(owner.platform === PLATFORM_LABEL[profile.platform] && owner.handle.toLowerCase() === `@${profile.handle}`.toLowerCase())) {
      return NextResponse.json({ error: `That wallet already belongs to ${owner.handle} (${owner.platform})` }, { status: 409 });
    }
    const posts = await scanPosts(profile, 2);
    const code = ownershipCode(evmAddress).toLowerCase();
    if (![profile.bio, ...posts.map((p) => p.text)].some((t) => t.toLowerCase().includes(code))) {
      return NextResponse.json(
        { error: `Code ${ownershipCode(evmAddress)} not found in @${profile.handle}'s bio or recent posts. Add it, wait a minute, then try again.` },
        { status: 403 }
      );
    }
    const niche = nicheById(body.niche) ?? detectNiche(posts.map((p) => p.text));
    const inf = { ...profileFromScan(profile, evmAddress, posts), niche: niche?.id };
    await upsertInfluencer(inf);
    return NextResponse.json(inf);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Could not read the creator's profile" }, { status: 422 });
  }
}

export async function DELETE(req: Request) {
  const q = new URL(req.url).searchParams;
  const platform = q.get("platform");
  const handle = q.get("handle");
  if (!platform || !handle) return NextResponse.json({ error: "platform and handle are required" }, { status: 400 });
  await removeInfluencer(platform, handle);
  return NextResponse.json(await readInfluencers());
}
