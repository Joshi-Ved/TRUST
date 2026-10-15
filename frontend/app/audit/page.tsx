"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AuditReport } from "@/components/audit/AuditReport";
import type { AuditReport as Report } from "@/lib/audit/types";

const split = (s: string) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [tags, setTags] = useState("");
  const [mentions, setMentions] = useState("");
  const [claimed, setClaimed] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          expectedHandle: handle || undefined,
          claimedViews: claimed ? Number(claimed.replace(/,/g, "")) : undefined,
          requirements: { hashtags: split(tags), mentions: split(mentions) },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setReport(data);
    } catch (err: any) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const input = "w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#714b67] focus:ring-1 focus:ring-[#714b67]";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="max-w-[1000px] w-full mx-auto px-6 py-10 space-y-8 flex-1">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Independent post audit</h1>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Paste any influencer post. TRUST's crawler reads the public page itself, so the numbers come from the platform and not from the creator.
            It checks the numbers for manipulation and confirms the post meets your campaign terms.
          </p>
        </div>

        <form onSubmit={run} className="glass-terminal rounded-lg p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600">Post link (X, YouTube, Instagram, TikTok)</label>
            <input required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://x.com/handle/status/1234567890" className={input} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Creator you hired (optional)</label>
              <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@handle" className={input} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Impressions the creator claimed (optional)</label>
              <input value={claimed} onChange={(e) => setClaimed(e.target.value)} placeholder="50000" className={input} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Required hashtags</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#ad #YourBrand" className={input} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Required mentions</label>
              <input value={mentions} onChange={(e) => setMentions(e.target.value)} placeholder="@yourbrand" className={input} />
            </div>
          </div>
          <button
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#714b67] text-white text-sm font-medium hover:bg-[#5d3c54] disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {loading ? "Crawling…" : "Run audit"}
          </button>
        </form>

        {error && <div className="rounded border border-red-300 bg-red-50 text-red-700 text-sm p-3">{error}</div>}
        {report && <AuditReport report={report} />}

        <div className="text-xs text-gray-500 max-w-2xl space-y-1">
          <p><b>What this can and cannot prove.</b> Platforms only publish impression counts for some posts (X and YouTube do; Instagram and TikTok do not). Where a number is not public we show "Not public" and never estimate it.</p>
          <p>Private analytics screenshots cannot be verified by a crawler. Each report has a hash so it can be shown to the creator and anchored on-chain later.</p>
        </div>
      </main>
    </div>
  );
}
