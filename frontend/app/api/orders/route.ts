import { NextResponse } from "next/server";
import type { Order } from "@/lib/icp-agent";
import { readOrders, updateOrders } from "@/lib/server/orderStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Merge a client-sent order onto the stored one. Fields that decide whether money moves
 * (campaign terms, verification, payout signature, the Approved status) are only ever
 * written by /api/verify-release, so the browser cannot approve its own payout.
 */
function mergeOrder(stored: Order | undefined, incoming: Order): Order {
  if (!stored) {
    const { signature, verification, ...rest } = incoming;
    return { ...rest, status: incoming.status.type === "Approved" ? { type: "PaymentVerified" } : incoming.status };
  }
  let status = incoming.status;
  if (status.type === "Approved" && stored.status.type !== "Approved") status = stored.status;
  if (status.type === "Settled" && stored.status.type !== "Approved" && stored.status.type !== "Settled" && stored.onChain) {
    status = stored.status;
  }
  return {
    ...incoming,
    status,
    campaign: stored.campaign ?? incoming.campaign,
    verification: stored.verification,
    signature: stored.signature,
    nonce: stored.nonce,
  };
}

export async function GET() {
  return NextResponse.json(await readOrders());
}

/** POST: upsert the given orders (array). Returns the full list. */
export async function POST(req: Request) {
  let body: Order[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body) || body.some((o) => typeof o?.orderId !== "string" || !o.status?.type)) {
    return NextResponse.json({ error: "Expected an array of orders" }, { status: 400 });
  }

  const next = await updateOrders((all) => {
    const byId = new Map(all.map((o) => [o.orderId, o]));
    const added: Order[] = [];
    for (const o of body) {
      const merged = mergeOrder(byId.get(o.orderId), o);
      if (byId.has(o.orderId)) byId.set(o.orderId, merged);
      else added.push(merged);
    }
    return [...added, ...all.map((o) => byId.get(o.orderId)!)];
  });
  return NextResponse.json(next);
}
