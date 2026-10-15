import { NextResponse } from "next/server";
import { crawl } from "@/lib/audit/fetchers";
import { buildReport } from "@/lib/audit/analyze";
import { reportsFor, saveReport, snapshotsFor } from "@/lib/audit/store";
import type { AuditRequest } from "@/lib/audit/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST: crawl the post now and return a signed-off report. GET ?orderId=: past reports for an order. */
export async function POST(req: Request) {
  let body: AuditRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const history = await snapshotsFor(body.url, body.orderId);
  let report;
  try {
    const snap = await crawl(body.url);
    report = buildReport(body, snap, history);
  } catch (e: any) {
    report = buildReport(body, null, history, e?.message || "Crawl failed");
  }
  await saveReport(report);
  return NextResponse.json(report);
}

export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  return NextResponse.json(await reportsFor(orderId));
}
