"use client";

import Link from "next/link";
import { ShieldCheck, Activity, Terminal, ArrowUpRight } from "lucide-react";

interface HeaderProps {
  activePortal: "advertiser" | "influencer" | "landing";
}

export function TerminalHeader({ activePortal }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#030712]/80 backdrop-blur-2xl">
      {/* Institutional Metric Ribbon */}
      <div className="border-b border-white/[0.04] bg-black/40 overflow-hidden text-[11px] font-mono select-none">
        <div className="flex items-center h-8">
          <div className="animate-ticker flex items-center gap-10 whitespace-nowrap text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">TOTAL LOCKED TVL</span>
              <span className="font-semibold text-emerald-400 tabular-nums">$148,250.00 USDC</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ACTIVE ESCROWS</span>
              <span className="font-semibold text-white tabular-nums">42 ORDERS</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ICP t-ECDSA PROOFS</span>
              <span className="font-semibold text-teal-400 tabular-nums">100% FINALITY</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">SETTLEMENT ENGINE</span>
              <span className="text-cyan-400 font-mono">SEPOLIA + ICP SUBNET</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">AVG SETTLEMENT LATENCY</span>
              <span className="text-zinc-300 tabular-nums">1.8s BLOCK CONFIRMATION</span>
            </span>
            <span className="text-zinc-800">•</span>
            {/* Duplicated chunk for seamless infinite ticker cycle */}
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">TOTAL LOCKED TVL</span>
              <span className="font-semibold text-emerald-400 tabular-nums">$148,250.00 USDC</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ACTIVE ESCROWS</span>
              <span className="font-semibold text-white tabular-nums">42 ORDERS</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ICP t-ECDSA PROOFS</span>
              <span className="font-semibold text-teal-400 tabular-nums">100% FINALITY</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Terminal Header Bar */}
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-black font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-transform group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider text-white">TRUST</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                  TERMINAL v2
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono -mt-0.5">
                SMART ESCROW PROTOCOL
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 p-1 bg-zinc-950/80 border border-white/[0.06] rounded-xl text-xs font-medium">
            <Link
              href="/advertiser"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activePortal === "advertiser"
                  ? "bg-zinc-800/90 text-white shadow-sm font-semibold border border-white/[0.05]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Advertiser Terminal
            </Link>
            <Link
              href="/influencer"
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activePortal === "influencer"
                  ? "bg-zinc-800/90 text-white shadow-sm font-semibold border border-white/[0.05]"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Creator Kanban & Settlement
            </Link>
          </nav>
        </div>

        {/* Connected Wallet & Network Pill */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-white/[0.06] text-xs font-mono">
            <div className="flex items-center gap-1.5 pr-2 border-r border-white/[0.08]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300">Sepolia</span>
            </div>
            <div className="flex items-center gap-2 pl-1">
              <span className="text-zinc-400 tabular-nums">48,500.00</span>
              <span className="text-emerald-400 font-semibold text-[11px]">USDC</span>
            </div>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-white/[0.08] text-xs font-mono text-zinc-200 flex items-center gap-2 shadow-inner">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="tabular-nums">0x71C...392F</span>
          </div>
        </div>
      </div>
    </header>
  );
}
