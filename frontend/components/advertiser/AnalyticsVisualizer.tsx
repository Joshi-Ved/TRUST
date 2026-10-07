"use client";

import React from "react";

interface ReachDataPoint {
  month: string;
  views: number;
  expected: number;
}

interface AnalyticsVisualizerProps {
  handle: string;
  authenticityScore: number;
  botRiskPercent: number;
  romiMultiplier: number;
  reachData?: ReachDataPoint[];
}

const DEFAULT_REACH_DATA: ReachDataPoint[] = [
  { month: "May", views: 48000, expected: 45000 },
  { month: "Jun", views: 52000, expected: 50000 },
  { month: "Jul", views: 61000, expected: 55000 },
  { month: "Aug", views: 58000, expected: 58000 },
  { month: "Sep", views: 72000, expected: 64000 },
  { month: "Oct", views: 68500, expected: 65000 },
];

export function AnalyticsVisualizer({
  handle,
  authenticityScore,
  botRiskPercent,
  romiMultiplier,
  reachData = DEFAULT_REACH_DATA,
}: AnalyticsVisualizerProps) {
  const maxViews = Math.max(...reachData.map((d) => Math.max(d.views, d.expected)));

  return (
    <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        <div>
          <div className="text-xs font-mono text-emerald-400">BIG DATA AUDIT ENGINE</div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            Historical Reach Consistency & Bot Analysis
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-normal">
              {handle}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 inline-block" />
            <span className="text-zinc-400">Delivered Reach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-600 inline-block" />
            <span className="text-zinc-400">Benchmark Expectation</span>
          </div>
        </div>
      </div>

      {/* SVG Interactive Financial / Reach Chart */}
      <div className="space-y-2">
        <div className="h-44 w-full flex items-end gap-3 pt-6 px-2">
          {reachData.map((item, idx) => {
            const deliveredHeight = (item.views / maxViews) * 100;
            const benchmarkHeight = (item.expected / maxViews) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="w-full flex items-end justify-center gap-1.5 h-full">
                  {/* Delivered bar */}
                  <div
                    style={{ height: `${deliveredHeight}%` }}
                    className="w-1/2 max-w-[28px] bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t group-hover:brightness-125 transition-all relative"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-[10px] font-mono text-white pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      {(item.views / 1000).toFixed(1)}k
                    </div>
                  </div>

                  {/* Benchmark bar */}
                  <div
                    style={{ height: `${benchmarkHeight}%` }}
                    className="w-1/2 max-w-[28px] bg-zinc-700/60 rounded-t border-t border-zinc-500 relative"
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-400">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-mono">Authenticity Index</div>
          <div className="text-2xl font-bold text-white font-mono flex items-center justify-between">
            <span>{authenticityScore}%</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-sans">
              High Trust
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${authenticityScore}%` }}
              className="bg-emerald-400 h-full rounded-full"
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-mono">Suspicious Bot Entropy</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono flex items-center justify-between">
            <span>{botRiskPercent}%</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-sans">
              Clean Audience
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${botRiskPercent}%` }}
              className="bg-cyan-400 h-full rounded-full"
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
          <div className="text-xs text-zinc-400 font-mono">Projected ROMI Multiplier</div>
          <div className="text-2xl font-bold text-teal-400 font-mono flex items-center justify-between">
            <span>{romiMultiplier}x</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-sans">
              High ROI
            </span>
          </div>
          <p className="text-[11px] text-zinc-400">
            Estimated conversion value per $1 USDC locked in escrow.
          </p>
        </div>
      </div>
    </div>
  );
}
