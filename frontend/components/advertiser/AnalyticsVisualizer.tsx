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
    <div className="glass-panel p-6 rounded-xl border border-white/10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="text-[11px] font-mono tracking-wider text-cyan-400 uppercase">
            AUDIT & REACH VERIFICATION
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 mt-0.5">
            Historical Reach Consistency & Anomaly Engine
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-normal">
              {handle}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-cyan-400 inline-block shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
            <span className="text-gray-300">Delivered Reach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/20 inline-block" />
            <span className="text-gray-400">Benchmark Expectation</span>
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
                    className="w-1/2 max-w-[28px] bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t group-hover:brightness-125 transition-all relative group-hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-[#0a0e17] border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-mono text-cyan-300 pointer-events-none whitespace-nowrap z-10 shadow-xl">
                      {(item.views / 1000).toFixed(1)}k
                    </div>
                  </div>

                  {/* Benchmark bar */}
                  <div
                    style={{ height: `${benchmarkHeight}%` }}
                    className="w-1/2 max-w-[28px] bg-white/10 rounded-t border-t border-white/20 relative"
                  />
                </div>
                <span className="text-[11px] font-mono text-gray-400">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Metric 1 */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono">Authenticity Index</div>
          <div className="text-2xl font-bold font-mono text-white flex items-center justify-between">
            <span>{authenticityScore}%</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
              High Trust
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${authenticityScore}%` }}
              className="bg-emerald-400 h-full rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono">Suspicious Bot Entropy</div>
          <div className="text-2xl font-bold font-mono text-cyan-400 flex items-center justify-between">
            <span>{botRiskPercent}%</span>
            <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono">
              Clean Audience
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${botRiskPercent}%` }}
              className="bg-cyan-400 h-full rounded-full shadow-[0_0_8px_rgba(6,182,212,0.5)]"
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono">Projected ROMI Multiplier</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center justify-between">
            <span>{romiMultiplier}x</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
              High ROI
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Estimated conversion yield per $1.00 USDC locked in escrow.
          </p>
        </div>
      </div>
    </div>
  );
}
