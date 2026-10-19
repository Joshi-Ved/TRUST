"use client";

import { useState } from "react";
import { Search, ShieldAlert, Sparkles, Activity, FileCheck, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { AuditReport } from "@/components/audit/AuditReport";
import type { AuditReport as Report } from "@/lib/audit/types";

const split = (s: string) => s.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);

const DEMO_SAMPLES = [
  {
    label: "Sample Verified Post",
    url: "https://x.com/satoshi_vibes/status/1789201948",
    handle: "satoshi_vibes",
    tags: "web3, escrow, defi",
    mentions: "trustprotocol",
  },
  {
    label: "Sample YouTube Review",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    handle: "RickAstleyVEVO",
    tags: "music",
    mentions: "",
  },
];

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
      if (!res.ok) throw new Error(data.error || "Audit execution failed");
      setReport(data);
    } catch (err: any) {
      setError(err.message);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const loadSample = (sample: typeof DEMO_SAMPLES[0]) => {
    setUrl(sample.url);
    setHandle(sample.handle);
    setTags(sample.tags);
    setMentions(sample.mentions);
  };

  const inputStyle =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans";

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-gray-100">
      <Navbar />

      <main className="max-w-[1100px] w-full mx-auto px-6 py-12 space-y-10 flex-1">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2 uppercase tracking-wider">
            <Activity className="h-3.5 w-3.5" />
            Independent Public Crawler
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Social Post Audit Engine</h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-sm leading-relaxed">
            Directly extracts impression counts, likes, reposts, and author verification from host platform endpoints.
            Evaluates engagement ratios, bot farm signatures, and enforces campaign contractual deliverables.
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs font-mono text-gray-500">Quick load demo:</span>
            {DEMO_SAMPLES.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => loadSample(s)}
                className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-xs text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all font-mono"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Request Form */}
        <form onSubmit={run} className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Post URL (X / Twitter, YouTube, Instagram, TikTok)</span>
              <span className="text-cyan-400 text-[11px] lowercase">must be public</span>
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://x.com/creator/status/1234567890"
              className={inputStyle}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider">Contracted Creator Handle</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="e.g. satoshi_vibes"
                className={inputStyle}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider">Claimed Minimum Impressions</label>
              <input
                type="text"
                value={claimed}
                onChange={(e) => setClaimed(e.target.value)}
                placeholder="e.g. 50,000"
                className={inputStyle}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider">Required Hashtags (comma separated)</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. #TRUST, #Escrow"
                className={inputStyle}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-300 uppercase tracking-wider">Required Mentions</label>
              <input
                type="text"
                value={mentions}
                onChange={(e) => setMentions(e.target.value)}
                placeholder="e.g. @trustprotocol"
                className={inputStyle}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <span className="text-xs font-mono text-gray-400">
              Runs heuristic & Shannon entropy vocabulary analysis
            </span>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all font-mono"
            >
              <Search className="h-4 w-4" />
              {loading ? "Crawling & Auditing..." : "Execute Post Audit"}
            </button>
          </div>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <div className="font-semibold">Audit Failed</div>
              <div className="text-xs mt-0.5 text-rose-300/80">{error}</div>
            </div>
          </div>
        )}

        {report && (
          <div className="space-y-4">
            <div className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Cryptographic Audit Certificate Generated
            </div>
            <AuditReport report={report} />
          </div>
        )}
      </main>
    </div>
  );
}
