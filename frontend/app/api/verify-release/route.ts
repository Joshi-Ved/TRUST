import { NextResponse } from "next/server";
import { Contract, JsonRpcProvider } from "ethers";
import { CHAIN, RPC_URL, toOrderIdBytes32 } from "@/lib/chain";
import { TRUST_ESCROW_ABI } from "@/lib/contracts";
import type { Order, VerificationResult } from "@/lib/icp-agent";
import { buildReport, hasHashtag } from "@/lib/audit/analyze";
import { crawl } from "@/lib/audit/fetchers";
import { fetchProfile, scanPosts } from "@/lib/audit/profile";
import { saveReport, snapshotsFor } from "@/lib/audit/store";
import type { AuditReport, Snapshot } from "@/lib/audit/types";
import { readInfluencers, scanPlatformOf } from "@/lib/server/influencerStore";
import { patchOrder, readOrders } from "@/lib/server/orderStore";
import { signRelease } from "@/lib/server/settlementSigner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ESCROW_FUNDED = 1; // TrustEscrow.EscrowStatus.Funded
const RELEASE_NONCE = 1; // one release per order; the contract also refuses a second release of the same deposit
// For now the campaign hashtag is preferred, not required. Set true to only accept posts tagged #<hashtag>.
const REQUIRE_HASHTAG = false;

const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * POST { orderId }: the only way a payout signature is issued.
 * 1. Reads the deposit from TrustEscrow (amount, creator, lock time come from the chain, not the browser).
 * 2. Scans the registered creator's public profile for their posts published after the lock (#<campaign hashtag> posts first).
 * 3. Audits each candidate post: right author, posted after funding, live public view count >= agreed target,
 *    no manipulation flags.
 * 4. Signs the EIP-712 release only if a post passes. Otherwise records why and signs nothing.
 */
export async function POST(req: Request) {
  let orderId: string;
  try {
    orderId = (await req.json()).orderId;
  } catch {
    return fail("Invalid JSON");
  }
  const orders = await readOrders();
  const order = orders.find((o) => o.orderId === orderId);
  if (!order) return fail("Order not found", 404);
  if (order.status.type === "Approved" || order.status.type === "Settled") {
    return NextResponse.json({ order, verification: order.verification, report: null });
  }
  if (order.status.type === "Disputed") return fail("Order is disputed. Resolve the dispute before releasing.", 409);
  if (!order.campaign?.targetViews) return fail("Set the agreed reach for this order before verifying.", 409);
  const { hashtag, targetViews } = order.campaign;

  const creator = (await readInfluencers()).find((i) => i.evmAddress.toLowerCase() === order.influencerAddress.toLowerCase());
  if (!creator) return fail("The order's payout wallet does not belong to any registered creator.", 409);
  const platform = scanPlatformOf(creator.platform);
  if (!platform) return fail(`${creator.platform} does not publish view counts, so reach cannot be verified automatically.`, 409);

  // The chain is the source of truth for who gets paid, how much, and since when.
  let amount = BigInt(order.amountUsdcRaw);
  let lockedAt = order.createdAt;
  if (order.onChain) {
    try {
      const escrow = new Contract(CHAIN.escrow, TRUST_ESCROW_ABI, new JsonRpcProvider(RPC_URL, CHAIN.chainId, { staticNetwork: true }));
      const d = await escrow.getEscrowDetails(toOrderIdBytes32(order.orderId));
      if (Number(d.status) !== ESCROW_FUNDED) return fail("The escrow deposit is not in the Funded state (already released or refunded).", 409);
      if (String(d.influencer).toLowerCase() !== order.influencerAddress.toLowerCase()) {
        return fail("The on-chain beneficiary does not match this order's creator.", 409);
      }
      amount = BigInt(d.amount);
      lockedAt = Number(d.lockTimestamp) * 1000;
    } catch (e: any) {
      return fail(`Could not read the escrow on-chain: ${e?.shortMessage || e?.message}`, 502);
    }
  }

  // Posts that already paid out another order cannot be reused.
  const usedPosts = new Set(
    orders.filter((o) => o.orderId !== orderId && o.verification?.passed && o.verification.bestPost).map((o) => o.verification!.bestPost!.url)
  );

  let posts: Snapshot[];
  try {
    posts = await scanPosts(await fetchProfile(platform, creator.handle), 3);
  } catch (e: any) {
    return fail(`Could not scan ${creator.handle}'s profile: ${e?.message}`, 502);
  }
  const submitted = order.status.type === "ProofSubmitted" ? order.status.liveUrl : null;
  if (submitted && !posts.some((p) => p.url === submitted)) {
    try {
      posts.push(await crawl(submitted));
    } catch {}
  }
  const isTagged = (p: Snapshot) => hasHashtag(p.text, hashtag);
  const allTagged = posts.filter(isTagged);
  const tagged = allTagged.filter((p) => !usedPosts.has(p.url));
  // Hashtag not required: any own post published after the lock can count, tagged posts are checked first.
  const candidates = REQUIRE_HASHTAG
    ? tagged
    : [...tagged, ...posts.filter((p) => !isTagged(p) && !usedPosts.has(p.url) && (p.postedAt === null || p.postedAt >= lockedAt))];

  const reports: AuditReport[] = [];
  for (const snap of candidates.slice(0, 30)) {
    const history = await snapshotsFor(snap.url, orderId);
    reports.push(
      buildReport(
        {
          url: snap.url,
          orderId,
          expectedHandle: creator.handle,
          orderCreatedAt: lockedAt,
          targetViews,
          requirements: REQUIRE_HASHTAG ? { hashtags: [hashtag] } : {},
        },
        snap,
        history
      )
    );
  }
  const byViews = (a: AuditReport, b: AuditReport) => (b.snapshot?.views ?? -1) - (a.snapshot?.views ?? -1);
  const tagFirst = (a: AuditReport, b: AuditReport) => Number(isTagged(b.snapshot!)) - Number(isTagged(a.snapshot!)) || byViews(a, b);
  const winner = reports.filter((r) => r.verdict === "verified").sort(tagFirst)[0];
  const best = winner ?? [...reports].sort(tagFirst)[0];
  if (best) await saveReport(best);

  const s = best?.snapshot;
  const what = s && isTagged(s) ? `#${hashtag} post` : "post";
  const verification: VerificationResult = {
    checkedAt: Date.now(),
    passed: !!winner,
    postsScanned: posts.length,
    matchingPosts: tagged.length,
    summary: winner
      ? `Verified: ${s!.views!.toLocaleString()} public views on a ${what} (target ${targetViews.toLocaleString()}). Payout released.`
      : !candidates.length && allTagged.length
      ? `The only eligible posts found already paid out another order. Each post can pay one order. Nothing released.`
      : !candidates.length
      ? REQUIRE_HASHTAG
        ? `No post tagged #${hashtag} found among ${creator.handle}'s ${posts.length} most recent posts. Nothing released.`
        : `No post by ${creator.handle} published after the deposit among their ${posts.length} most recent posts. Nothing released.`
      : `Not released. Best ${what}: ${best!.checks.filter((c) => c.pass !== true).map((c) => c.detail).join("; ") || best!.summary}`,
    bestPost: s ? { url: s.url, views: s.views, likes: s.likes, postedAt: s.postedAt } : undefined,
    reportId: best?.id,
    reportHash: best?.reportHash,
  };

  let signature: string | undefined;
  if (winner && order.onChain) {
    try {
      signature = await signRelease(toOrderIdBytes32(order.orderId), order.influencerAddress, amount, BigInt(RELEASE_NONCE));
    } catch (e: any) {
      return fail(e?.message || "Settlement signer unavailable", 500);
    }
  }

  const updated = await patchOrder(orderId, (o): Order =>
    winner ? { ...o, status: { type: "Approved" }, signature, nonce: RELEASE_NONCE, verification } : { ...o, verification }
  );
  return NextResponse.json({ order: updated.find((o) => o.orderId === orderId), verification, report: best ?? null });
}
