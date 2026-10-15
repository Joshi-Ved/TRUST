"use client";

import { CheckCircle2, XCircle, MinusCircle, ShieldAlert, ShieldCheck, ShieldQuestion, ExternalLink } from "lucide-react";
import type { AuditReport as Report, Verdict } from "@/lib/audit/types";

const VERDICT: Record<Verdict, { label: string; cls: string; Icon: typeof ShieldCheck }> = {
  verified: { label: "Verified", cls: "bg-green-50 border-green-300 text-green-800", Icon: ShieldCheck },
  flagged: { label: "Flagged", cls: "bg-red-50 border-red-300 text-red-700", Icon: ShieldAlert },
  partial: { label: "Partially verified", cls: "bg-amber-50 border-amber-300 text-amber-800", Icon: ShieldQuestion },
  unverifiable: { label: "Could not verify", cls: "bg-gray-100 border-gray-300 text-gray-700", Icon: ShieldQuestion },
};

const fmt = (n: number | null) => (n === null ? "Not public" : n.toLocaleString("en-US"));

export function AuditReport({ report, compact = false }: { report: Report; compact?: boolean }) {
  const v = VERDICT[report.verdict];
  const s = report.snapshot;

  return (
    <div className="rounded-lg border border-gray-200 bg-white text-sm">
      <div className={`flex items-start justify-between gap-3 p-4 border-b rounded-t-lg ${v.cls}`}>
        <div className="flex items-start gap-3">
          <v.Icon className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">{v.label}</div>
            <div className="text-xs mt-0.5 opacity-90">{report.error ? `${report.summary} (${report.error})` : report.summary}</div>
          </div>
        </div>
        {report.authenticityScore !== null && (
          <div className="text-right shrink-0">
            <div className="text-2xl font-semibold tabular-nums">{report.authenticityScore}</div>
            <div className="text-[10px] uppercase tracking-wide opacity-80">Authenticity</div>
          </div>
        )}
      </div>

      {s && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["Views", s.views],
              ["Likes", s.likes],
              ["Reposts", s.reposts],
              ["Replies", s.replies],
            ].map(([label, val]) => (
              <div key={label as string} className="rounded-md bg-gray-50 border border-gray-100 p-3">
                <div className="text-[11px] text-gray-500">{label}</div>
                <div className={`font-semibold tabular-nums ${val === null ? "text-gray-400 text-xs mt-1" : "text-gray-900"}`}>{fmt(val as number | null)}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
            {s.author && <span>Author: <b className="text-gray-700">@{s.author}</b></span>}
            {s.authorFollowers !== null && <span>Followers: <b className="text-gray-700">{s.authorFollowers.toLocaleString()}</b></span>}
            {s.postedAt && <span>Posted: <b className="text-gray-700">{new Date(s.postedAt).toISOString().slice(0, 10)}</b></span>}
          </div>

          {!compact && s.text && (
            <blockquote className="border-l-2 border-gray-300 pl-3 text-xs text-gray-600 whitespace-pre-line line-clamp-5">{s.text}</blockquote>
          )}
        </div>
      )}

      {report.checks.length > 0 && (
        <ul className="px-4 pb-4 space-y-2">
          {report.checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-xs">
              {c.pass === true && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
              {c.pass === false && <XCircle className="h-4 w-4 text-red-600 shrink-0" />}
              {c.pass === null && <MinusCircle className="h-4 w-4 text-gray-400 shrink-0" />}
              <span>
                <span className="font-medium text-gray-800">{c.label}</span>
                <span className="text-gray-500"> · {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {report.flags.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">Manipulation signals</div>
          {report.flags.map((f) => (
            <div
              key={f.code}
              className={`text-xs rounded-md border px-3 py-2 ${
                f.severity === "high" ? "bg-red-50 border-red-200 text-red-700" : f.severity === "medium" ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-gray-50 border-gray-200 text-gray-600"
              }`}
            >
              <b className="capitalize">{f.severity}</b> · {f.message}
            </div>
          ))}
        </div>
      )}

      {report.history.length > 0 && s && (
        <div className="px-4 pb-4">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Crawl history ({report.history.length + 1} snapshots)</div>
          <table className="w-full text-xs">
            <tbody>
              {[...report.history, s].slice(-5).map((h) => (
                <tr key={h.fetchedAt} className="border-t border-gray-100">
                  <td className="py-1 text-gray-500">{new Date(h.fetchedAt).toLocaleString()}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(h.views)} views</td>
                  <td className="py-1 text-right tabular-nums">{fmt(h.likes)} likes</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg text-[11px] text-gray-500 space-y-1">
        <div>
          Crawled {new Date(report.generatedAt).toLocaleString()}
          {s && <> from {s.source}</>}
          {s && (
            <a href={s.url} target="_blank" rel="noreferrer" className="ml-2 inline-flex items-center gap-1 text-[#017e84] hover:underline">
              Open post <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="break-all">Report hash: <span className="text-gray-700">{report.reportHash}</span></div>
      </div>
    </div>
  );
}
