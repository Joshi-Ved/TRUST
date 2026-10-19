"use client";

import { CheckCircle2, XCircle, MinusCircle, ShieldAlert, ShieldCheck, ShieldQuestion, ExternalLink } from "lucide-react";
import type { AuditReport as Report, Verdict } from "@/lib/audit/types";

const VERDICT: Record<Verdict, { label: string; cls: string; badgeCls: string; Icon: typeof ShieldCheck }> = {
  verified: {
    label: "VERIFIED",
    cls: "bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-300",
    badgeCls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    Icon: ShieldCheck,
  },
  flagged: {
    label: "FLAGGED",
    cls: "bg-rose-500/[0.08] border-rose-500/30 text-rose-300",
    badgeCls: "bg-rose-500/20 text-rose-300 border-rose-500/40",
    Icon: ShieldAlert,
  },
  partial: {
    label: "PARTIAL PROOF",
    cls: "bg-amber-500/[0.08] border-amber-500/30 text-amber-300",
    badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    Icon: ShieldQuestion,
  },
  unverifiable: {
    label: "UNVERIFIABLE",
    cls: "bg-gray-500/[0.08] border-gray-500/30 text-gray-400",
    badgeCls: "bg-gray-500/20 text-gray-300 border-gray-500/40",
    Icon: ShieldQuestion,
  },
};

const fmt = (n: number | null) => (n === null ? "Not public" : n.toLocaleString("en-US"));

export function AuditReport({ report, compact = false }: { report: Report; compact?: boolean }) {
  const v = VERDICT[report.verdict];
  const s = report.snapshot;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d121c] text-sm overflow-hidden shadow-2xl">
      <div className={`flex items-start justify-between gap-4 p-5 border-b ${v.cls}`}>
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-lg bg-black/30 border border-current">
            <v.Icon className="h-5 w-5 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider border ${v.badgeCls}`}>
                {v.label}
              </span>
              <span className="text-xs font-mono text-gray-400">ID: {report.id}</span>
            </div>
            <div className="text-xs text-gray-300 mt-1.5 leading-relaxed">
              {report.error ? `${report.summary} (${report.error})` : report.summary}
            </div>
          </div>
        </div>

        {report.authenticityScore !== null && (
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold font-mono text-white tabular-nums">
              {report.authenticityScore}
              <span className="text-sm font-normal text-gray-400">/100</span>
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
              Authenticity
            </div>
          </div>
        )}
      </div>

      {s && (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Views", s.views],
              ["Likes", s.likes],
              ["Reposts", s.reposts],
              ["Replies", s.replies],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-1">
                <div className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{label}</div>
                <div className={`font-mono text-base font-semibold tabular-nums ${val === null ? "text-gray-500 text-xs" : "text-white"}`}>
                  {fmt(val as number | null)}
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs font-mono text-gray-400 flex flex-wrap gap-x-6 gap-y-1.5 pt-1 border-t border-white/[0.06]">
            {s.author && (
              <span>
                Creator: <b className="text-cyan-400 font-semibold">@{s.author}</b>
              </span>
            )}
            {s.authorFollowers !== null && (
              <span>
                Followers: <b className="text-white">{s.authorFollowers.toLocaleString()}</b>
              </span>
            )}
            {s.postedAt && (
              <span>
                Timestamp: <b className="text-gray-300">{new Date(s.postedAt).toISOString().slice(0, 16).replace("T", " ")} UTC</b>
              </span>
            )}
          </div>

          {!compact && s.text && (
            <blockquote className="rounded-lg bg-black/40 border-l-2 border-cyan-400 p-3.5 text-xs text-gray-300 font-sans whitespace-pre-line line-clamp-5 leading-relaxed">
              {s.text}
            </blockquote>
          )}
        </div>
      )}

      {/* Compliance Checks Checklist */}
      <div className="p-5 border-t border-white/[0.08] space-y-3 bg-white/[0.01]">
        <div className="text-[11px] font-mono uppercase tracking-wider text-gray-400">Campaign Deliverable Verification</div>
        <div className="space-y-2">
          {report.checks.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5 text-xs">
              {c.pass === true ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : c.pass === false ? (
                <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <MinusCircle className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-medium text-gray-200">{c.label}</span>
                <span className="text-gray-400 ml-2">({c.detail})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Anomaly Flags */}
      {report.flags.length > 0 && (
        <div className="p-5 border-t border-white/[0.08] space-y-2.5 bg-rose-500/[0.03]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400">Detected Anomalies</div>
          <div className="space-y-2">
            {report.flags.map((f, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs text-rose-300/90">
                <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-mono uppercase font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 mr-2">
                    {f.severity}
                  </span>
                  {f.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-5 py-3 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-[11px] font-mono text-gray-500">
        <span>Report Hash: {report.reportHash.slice(0, 18)}...</span>
        <a
          href={report.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
        >
          View live post <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
