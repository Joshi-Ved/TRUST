import { promises as fs } from "fs";
import path from "path";

// Dev/self-hosted persistence in frontend/.data/. Swap for Postgres (services/crawler/prisma) when deploying multi-instance.
const DIR = path.join(process.cwd(), ".data");

// Serialise writes per file so concurrent requests cannot interleave read-modify-write cycles.
const queues: Record<string, Promise<unknown>> = {};

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DIR, name), "utf8"));
  } catch {
    return fallback;
  }
}

export function updateJson<T>(name: string, fallback: T, update: (current: T) => T): Promise<T> {
  const run = (queues[name] ?? Promise.resolve()).then(async () => {
    const next = update(await readJson(name, fallback));
    await fs.mkdir(DIR, { recursive: true });
    // Write to a temp file and rename, so a crash mid-write never leaves a truncated file.
    const tmp = path.join(DIR, `${name}.${process.pid}.tmp`);
    await fs.writeFile(tmp, JSON.stringify(next, null, 1));
    await fs.rename(tmp, path.join(DIR, name));
    return next;
  });
  queues[name] = run.catch(() => {});
  return run;
}
