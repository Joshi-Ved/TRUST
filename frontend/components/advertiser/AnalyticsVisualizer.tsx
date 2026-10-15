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
    <div className="glass-panel p-6 rounded-lg border border-gray-200 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs  text-[#714b67]">BIG DATA AUDIT ENGINE</div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Historical Reach Consistency & Bot Analysis
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-normal">
              {handle}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-4 text-xs ">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#714b67] inline-block" />
            <span className="text-gray-600">Delivered Reach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-gray-400 inline-block" />
            <span className="text-gray-600">Benchmark Expectation</span>
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
                    className="w-1/2 max-w-[28px] bg-gradient-to-t from-[#714b67] to-[#714b67] rounded-t group-hover:brightness-125 transition-all relative"
                  >
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-100 border border-gray-300 px-1.5 py-0.5 rounded text-[10px]  text-gray-900 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                      {(item.views / 1000).toFixed(1)}k
                    </div>
                  </div>

                  {/* Benchmark bar */}
                  <div
                    style={{ height: `${benchmarkHeight}%` }}
                    className="w-1/2 max-w-[28px] bg-gray-300 rounded-t border-t border-gray-400 relative"
                  />
                </div>
                <span className="text-[11px]  text-gray-600">{item.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Metric 1 */}
        <div className="p-4 rounded-md bg-gray-50 border border-gray-200 space-y-1.5">
          <div className="text-xs text-gray-600 ">Authenticity Index</div>
          <div className="text-2xl font-bold text-gray-900  flex items-center justify-between">
            <span>{authenticityScore}%</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#714b67]/10 text-[#714b67] border border-[#714b67]/40 font-sans">
              High Trust
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${authenticityScore}%` }}
              className="bg-[#714b67] h-full rounded-full"
            />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-md bg-gray-50 border border-gray-200 space-y-1.5">
          <div className="text-xs text-gray-600 ">Suspicious Bot Entropy</div>
          <div className="text-2xl font-bold text-[#017e84]  flex items-center justify-between">
            <span>{botRiskPercent}%</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#017e84]/10 text-[#017e84] border border-[#017e84]/40 font-sans">
              Clean Audience
            </span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${botRiskPercent}%` }}
              className="bg-[#017e84] h-full rounded-full"
            />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-md bg-gray-50 border border-gray-200 space-y-1.5">
          <div className="text-xs text-gray-600 ">Projected ROMI Multiplier</div>
          <div className="text-2xl font-bold text-[#017e84]  flex items-center justify-between">
            <span>{romiMultiplier}x</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#017e84]/10 text-[#017e84] border border-[#017e84]/40 font-sans">
              High ROI
            </span>
          </div>
          <p className="text-[11px] text-gray-600">
            Estimated conversion value per $1 USDC locked in escrow.
          </p>
        </div>
      </div>
    </div>
  );
}
