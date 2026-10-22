"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  Radio,
  Zap,
  Play,
  Pause,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Database,
  Terminal,
  TrendingUp,
  BarChart2,
  Flame,
  Globe,
  Layers,
  Sparkles,
  RefreshCw,
} from "lucide-react";

interface ReachDataPoint {
  month: string;
  views: number;
  expected: number;
}

interface StreamPacket {
  id: string;
  time: string;
  velocity: number; // views / impressions per min
  entropy: number;  // Shannon vocabulary entropy (bits)
  botRatio: number; // percentage
  isAnomaly: boolean;
  edgeNode: string;
}

interface AuditLogEvent {
  id: string;
  time: string;
  type: "ingest" | "entropy" | "shield" | "canister";
  message: string;
  severity: "normal" | "warning" | "alert" | "success";
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

const EDGE_NODES = [
  "US-East (Virginia)",
  "EU-Central (Frankfurt)",
  "AP-South (Mumbai)",
  "AP-East (Tokyo)",
  "US-West (Oregon)",
];

export function AnalyticsVisualizer({
  handle,
  authenticityScore,
  botRiskPercent,
  romiMultiplier,
  reachData = DEFAULT_REACH_DATA,
}: AnalyticsVisualizerProps) {
  // Mode: "stream" (Continuous Big Data Telemetry) | "historical" (Monthly Bar Benchmark)
  const [viewMode, setViewMode] = useState<"stream" | "historical">("stream");
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1500); // ms per packet
  const [isSpikeActive, setIsSpikeActive] = useState<boolean>(false);
  const [tickCount, setTickCount] = useState<number>(0);

  // Generate initial rolling buffer of stream packets
  const initialStream = useMemo(() => {
    const list: StreamPacket[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const t = new Date(now - i * 1500);
      const timeStr = t.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const baseVel = 3200 + Math.sin(i * 0.5) * 600 + Math.floor(Math.random() * 300);
      list.push({
        id: `pkt_${i}`,
        time: timeStr,
        velocity: baseVel,
        entropy: parseFloat((3.75 + Math.random() * 0.25).toFixed(2)),
        botRatio: Math.max(1, Math.min(15, botRiskPercent + (Math.random() * 2 - 1))),
        isAnomaly: false,
        edgeNode: EDGE_NODES[i % EDGE_NODES.length],
      });
    }
    return list;
  }, [botRiskPercent]);

  const [streamData, setStreamData] = useState<StreamPacket[]>(initialStream);
  const [auditLogs, setAuditLogs] = useState<AuditLogEvent[]>([
    {
      id: "log_init_1",
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "canister",
      message: "Canister threshold ECDSA state root synced. Epoch #104.",
      severity: "success",
    },
    {
      id: "log_init_2",
      time: new Date().toLocaleTimeString("en-US", { hour12: false }),
      type: "entropy",
      message: `Audience vocabulary Shannon entropy: 3.88 bits (Healthy Organic Spectrum).`,
      severity: "normal",
    },
  ]);

  // Continuous Telemetry Ingestion Timer
  useEffect(() => {
    if (!isStreaming) return;

    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const nodeId = EDGE_NODES[Math.floor(Math.random() * EDGE_NODES.length)];

      let newPacket: StreamPacket;
      let newLog: AuditLogEvent | null = null;

      if (isSpikeActive) {
        // High anomaly synthetic burst
        const spikeVel = Math.floor(14000 + Math.random() * 4500);
        newPacket = {
          id: `pkt_${Date.now()}`,
          time: timeStr,
          velocity: spikeVel,
          entropy: 1.18, // Severe repetitive vocabulary drop
          botRatio: 78.4,
          isAnomaly: true,
          edgeNode: nodeId,
        };

        newLog = {
          id: `log_${Date.now()}`,
          time: timeStr,
          type: "shield",
          message: `[ANOMALY TRIGGERED] ${nodeId}: Sudden velocity divergence (+740%). Low entropy (1.18 bits). Payout locked.`,
          severity: "alert",
        };
      } else {
        // Organic stream
        setTickCount((prev) => prev + 1);
        const cycle = Math.sin(Date.now() / 3000) * 800;
        const vel = Math.floor(3400 + cycle + (Math.random() * 400 - 200));
        const ent = parseFloat((3.8 + Math.random() * 0.22 - 0.1).toFixed(2));
        const botPct = Math.max(1, Math.min(20, parseFloat((botRiskPercent + (Math.random() * 3 - 1.5)).toFixed(1))));

        newPacket = {
          id: `pkt_${Date.now()}`,
          time: timeStr,
          velocity: vel,
          entropy: ent,
          botRatio: botPct,
          isAnomaly: false,
          edgeNode: nodeId,
        };

        // Randomly emit informational packet audit log
        if (Math.random() < 0.45) {
          const logTypes: ("ingest" | "entropy" | "canister")[] = ["ingest", "entropy", "canister"];
          const selectedType = logTypes[Math.floor(Math.random() * logTypes.length)];
          let msg = "";
          if (selectedType === "ingest") {
            msg = `Ingested chunk ${Math.floor(Math.random() * 9000 + 1000)} from ${nodeId}. Delivered impressions: +${Math.floor(vel / 24)}.`;
          } else if (selectedType === "entropy") {
            msg = `Shannon vocabulary test: ${ent} bits/token. Comment cluster verified organic.`;
          } else {
            msg = `State hash verified on ICP Canister. Nonce #${Math.floor(Math.random() * 80 + 100)}.`;
          }

          newLog = {
            id: `log_${Date.now()}`,
            time: timeStr,
            type: selectedType,
            message: msg,
            severity: "normal",
          };
        }
      }

      setStreamData((prev) => [...prev.slice(1), newPacket]);
      if (newLog) {
        setAuditLogs((prev) => [newLog!, ...prev.slice(0, 7)]);
      }
    }, streamSpeed);

    return () => clearInterval(timer);
  }, [isStreaming, streamSpeed, isSpikeActive, botRiskPercent]);

  // Derived Big Data Telemetry metrics
  const latestPacket = streamData[streamData.length - 1] ?? streamData[0];
  const maxVel = Math.max(...streamData.map((p) => p.velocity), 5000);
  const minVel = Math.min(...streamData.map((p) => p.velocity), 2000);
  const hasRecentAnomaly = streamData.some((p) => p.isAnomaly);

  // SVG Waveform Path Construction
  const svgWidth = 650;
  const svgHeight = 130;
  const paddingX = 20;
  const paddingY = 15;

  const points = streamData.map((d, i) => {
    const x = paddingX + (i / (streamData.length - 1)) * (svgWidth - paddingX * 2);
    const normalizedY = (d.velocity - minVel) / Math.max(maxVel - minVel, 1000);
    const y = svgHeight - paddingY - normalizedY * (svgHeight - paddingY * 2);
    return { x, y, isAnomaly: d.isAnomaly };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1]?.x ?? svgWidth} ${svgHeight} L ${points[0]?.x ?? 0} ${svgHeight} Z`;

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6 relative overflow-hidden">
      {/* Background cyber grid effect */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono tracking-wider text-cyan-400 uppercase flex items-center gap-1.5 font-bold">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              BIG DATA ANALYTICS & ANOMALY RADAR
            </span>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isStreaming ? (hasRecentAnomaly ? "bg-rose-400" : "bg-emerald-400") : "bg-gray-400"} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isStreaming ? (hasRecentAnomaly ? "bg-rose-500" : "bg-emerald-500") : "bg-gray-500"}`} />
            </span>
          </div>

          <h3 className="text-base font-bold text-white flex items-center gap-2 mt-1">
            Continuous Post Audit & Reach Telemetry Stream
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-normal">
              {handle}
            </span>
          </h3>
        </div>

        {/* View Mode & Stream Controls */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          {/* Stream / Historical Tab */}
          <div className="flex items-center rounded-lg bg-white/[0.04] p-1 border border-white/10">
            <button
              onClick={() => setViewMode("stream")}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                viewMode === "stream"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Radio className="h-3 w-3" />
              Live Stream
            </button>
            <button
              onClick={() => setViewMode("historical")}
              className={`px-3 py-1 rounded text-xs transition-all flex items-center gap-1.5 ${
                viewMode === "historical"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <BarChart2 className="h-3 w-3" />
              Monthly Benchmarks
            </button>
          </div>

          {/* Stream Play/Pause */}
          {viewMode === "stream" && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsStreaming(!isStreaming)}
                title={isStreaming ? "Pause Stream" : "Resume Stream"}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  isStreaming
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
                }`}
              >
                {isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isStreaming ? "Live" : "Paused"}
              </button>

              {/* Stress Test Bot Spike Toggle */}
              <button
                onClick={() => setIsSpikeActive(!isSpikeActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                  isSpikeActive
                    ? "bg-rose-500/20 border-rose-400 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse"
                    : "bg-white/[0.04] border-white/10 text-gray-300 hover:border-rose-500/40 hover:text-rose-300"
                }`}
                title="Inject synthetic bot attack traffic to evaluate the anomaly detection engine"
              >
                <Zap className="h-3 w-3 text-amber-400" />
                {isSpikeActive ? "Disarm Bot Spike" : "Simulate Bot Attack"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Visualizer Area */}
      {viewMode === "stream" ? (
        <div className="space-y-4">
          {/* Active Alert Banner when Anomaly Detected */}
          {hasRecentAnomaly && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                <span>
                  <strong>ANOMALY RADAR TRIGGERED:</strong> Abnormal velocity &amp; low vocabulary entropy detected. Smart escrow payouts automatically quarantined.
                </span>
              </div>
              <button
                onClick={() => setIsSpikeActive(false)}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 border border-rose-500/40 text-[11px] shrink-0"
              >
                Reset Radar
              </button>
            </div>
          )}

          {/* Continuous Real-Time SVG Waveform Stream */}
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-cyan-300 font-semibold">Real-Time Ingestion Velocity:</span>
                <span className="text-white font-bold">{latestPacket.velocity.toLocaleString()} impressions/min</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">Node: {latestPacket.edgeNode}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-emerald-300">Entropy: {latestPacket.entropy} bits</span>
                <span className="text-gray-500">|</span>
                <span className={latestPacket.botRatio > 40 ? "text-rose-400 font-bold" : "text-cyan-300"}>
                  Bot Ratio: {latestPacket.botRatio.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="w-full h-36 flex items-center justify-center">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="streamGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={hasRecentAnomaly ? "#f43f5e" : "#06b6d4"} stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#080b12" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="85%" stopColor={hasRecentAnomaly ? "#f43f5e" : "#10b981"} />
                    <stop offset="100%" stopColor={hasRecentAnomaly ? "#fb7185" : "#34d399"} />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <line x1={paddingX} y1={svgHeight / 2} x2={svgWidth - paddingX} y2={svgHeight / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />

                {/* Filled Area */}
                <path d={areaD} fill="url(#streamGradient)" />

                {/* Smooth Polyline */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={hasRecentAnomaly ? "#f43f5e" : "url(#lineGradient)"}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Glowing Latest Point Cursor */}
                {points.length > 0 && (
                  <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
                    <circle r="7" className="animate-ping" fill={hasRecentAnomaly ? "#f43f5e" : "#34d399"} opacity="0.6" />
                    <circle r="4" fill={hasRecentAnomaly ? "#f43f5e" : "#10b981"} />
                  </g>
                )}
              </svg>
            </div>

            {/* Timestamps footer */}
            <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-1">
              <span>{streamData[0]?.time || "--:--:--"}</span>
              <span className="text-cyan-400/80">Continuous Sliding Window (24 packets)</span>
              <span>{latestPacket.time}</span>
            </div>
          </div>

          {/* Live Ingestion Audit Log Feed */}
          <div className="p-3 bg-white/[0.02] rounded-xl border border-white/10 font-mono text-xs space-y-1.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/[0.06] pb-1.5">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Terminal className="h-3.5 w-3.5" />
                Live Ingestion Audit Feed
              </span>
              <span className="text-gray-500">Real-time edge events</span>
            </div>

            <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className={`text-[11px] leading-tight flex items-start gap-2 ${
                    log.severity === "alert"
                      ? "text-rose-300 font-bold"
                      : log.severity === "success"
                      ? "text-emerald-300"
                      : "text-gray-300"
                  }`}
                >
                  <span className="text-gray-500 shrink-0">[{log.time}]</span>
                  <span className="break-words">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Historical Reach Consistency Bar Chart */
        <div className="space-y-2">
          <div className="h-44 w-full flex items-end gap-3 pt-6 px-2">
            {reachData.map((item, idx) => {
              const maxViews = Math.max(...reachData.map((d) => Math.max(d.views, d.expected)));
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

          <div className="flex items-center justify-end gap-4 text-xs font-mono pt-2">
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
      )}

      {/* Institutional Telemetry Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
        {/* Metric 1: Authenticity */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
            <span>Authenticity Index</span>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white flex items-center justify-between">
            <span>{isSpikeActive ? "38%" : `${authenticityScore}%`}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                isSpikeActive
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              }`}
            >
              {isSpikeActive ? "Spike Risk" : "High Trust"}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${isSpikeActive ? 38 : authenticityScore}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isSpikeActive ? "bg-rose-500" : "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              }`}
            />
          </div>
        </div>

        {/* Metric 2: Bot Entropy */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
            <span>Suspicious Bot Entropy</span>
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 flex items-center justify-between">
            <span className={isSpikeActive ? "text-rose-400" : "text-cyan-400"}>
              {isSpikeActive ? "78.4%" : `${latestPacket.botRatio.toFixed(1)}%`}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                isSpikeActive
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/30 font-bold"
                  : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
              }`}
            >
              {isSpikeActive ? "Filtered Ring" : "Clean Traffic"}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ width: `${isSpikeActive ? 78.4 : latestPacket.botRatio}%` }}
              className={`h-full rounded-full transition-all duration-500 ${
                isSpikeActive ? "bg-rose-500" : "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
              }`}
            />
          </div>
        </div>

        {/* Metric 3: Ingestion Stream Throughput */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
            <span>Stream Throughput</span>
            <Database className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white flex items-center justify-between">
            <span>{(2480 + (tickCount % 20) * 14).toLocaleString()}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono">
              pkt/sec
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono truncate">
            Edge nodes: 12 active · Latency 7.2ms
          </p>
        </div>

        {/* Metric 4: Projected ROMI */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
          <div className="text-xs text-gray-400 font-mono flex items-center justify-between">
            <span>ROMI Multiplier</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 flex items-center justify-between">
            <span>{romiMultiplier}x</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
              High Yield
            </span>
          </div>
          <p className="text-[10px] text-gray-400 font-mono truncate">
            Conversion yield per $1.00 USDC in vault
          </p>
        </div>
      </div>
    </div>
  );
}
