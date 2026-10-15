import { promises as fs } from "fs";
import path from "path";
import type { AuditReport, Snapshot } from "./types";

// Dev/self-hosted persistence. Swap for Postgres (services/crawler/prisma) when deploying multi-instance.
const FILE = path.join(process.cwd(), ".data", "audits.json");
const MAX = 500;

async function readAll(): Promise<AuditReport[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    return [];
  }
}

export async function snapshotsFor(url: string, orderId?: string): Promise<Snapshot[]> {
  const all = await readAll();
  return all
    .filter((r) => r.snapshot && (r.url === url || (orderId && r.orderId === orderId)))
    .map((r) => r.snapshot!)
    .sort((a, b) => a.fetchedAt - b.fetchedAt);
}

export async function saveReport(report: AuditReport): Promise<void> {
  const all = await readAll();
  all.push(report);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(all.slice(-MAX), null, 1));
}

export async function reportsFor(orderId: string): Promise<AuditReport[]> {
  return (await readAll()).filter((r) => r.orderId === orderId).sort((a, b) => b.generatedAt - a.generatedAt);
}
