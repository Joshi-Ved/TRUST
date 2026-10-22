import { NextResponse } from "next/server";
import { getAddress, isAddress } from "ethers";
import { readJson, updateJson } from "@/lib/server/jsonStore";
import type { SavedAddress } from "@/lib/addressBook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = "addresses.json";

export async function GET() {
  return NextResponse.json(await readJson<SavedAddress[]>(FILE, []));
}

/** POST one entry or an array of entries (used to migrate an old localStorage address book). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const incoming = (Array.isArray(body) ? body : [body]) as Partial<SavedAddress>[];
  const clean: SavedAddress[] = [];
  for (const e of incoming) {
    if (typeof e?.address !== "string" || !isAddress(e.address.trim())) {
      return NextResponse.json({ error: "Invalid Ethereum address" }, { status: 400 });
    }
    if (typeof e.label !== "string" || !e.label.trim()) {
      return NextResponse.json({ error: "A label is required" }, { status: 400 });
    }
    clean.push({
      address: getAddress(e.address.trim()),
      label: e.label.trim().slice(0, 80),
      note: typeof e.note === "string" && e.note.trim() ? e.note.trim().slice(0, 280) : undefined,
      addedAt: typeof e.addedAt === "number" ? e.addedAt : Date.now(),
    });
  }

  const next = await updateJson<SavedAddress[]>(FILE, [], (all) => {
    const keys = new Set(clean.map((c) => c.address.toLowerCase()));
    return [...clean, ...all.filter((a) => !keys.has(a.address.toLowerCase()))];
  });
  return NextResponse.json(next);
}

export async function DELETE(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.toLowerCase();
  if (!address) return NextResponse.json({ error: "address is required" }, { status: 400 });
  return NextResponse.json(await updateJson<SavedAddress[]>(FILE, [], (all) => all.filter((a) => a.address.toLowerCase() !== address)));
}
