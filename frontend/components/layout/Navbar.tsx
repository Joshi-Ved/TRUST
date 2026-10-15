"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/components/web3/WalletProvider";
import { formatAddress } from "@/lib/utils";
import { ShieldCheck, Activity, Cpu, ArrowUpRight, Wallet, Layers, Sparkles } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { address, usdcBalance, connect, connecting } = useWallet();

  const isAdvertiser = pathname?.includes("advertiser");
  const isInfluencer = pathname?.includes("influencer");
  const isLanding = !isAdvertiser && !isInfluencer;

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#030712]/75 backdrop-blur-2xl">
      {/* Live Protocol Telemetry Ribbon */}
      <div className="border-b border-white/[0.04] bg-black/50 overflow-hidden text-[11px] font-mono select-none">
        <div className="flex items-center h-8">
          <div className="animate-ticker flex items-center gap-10 whitespace-nowrap text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">TOTAL LOCKED TVL</span>
              <span className="font-semibold text-emerald-400 tabular-nums">$148,250.00 USDC</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ACTIVE ESCROWS</span>
              <span className="font-semibold text-white tabular-nums">42 CONTRACTS</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ICP SUBNET STATUS</span>
              <span className="text-teal-400 font-mono">HEALTHY (100% FINALITY)</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">TELEMETRY</span>
              <span className="text-cyan-400 font-mono">SEPOLIA BLOCK #6,841,920</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">DISPUTE RATE</span>
              <span className="text-emerald-400 tabular-nums font-bold">&lt; 0.01%</span>
            </span>
            <span className="text-zinc-800">•</span>
            {/* Duplicated for smooth infinite ticker */}
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">TOTAL LOCKED TVL</span>
              <span className="font-semibold text-emerald-400 tabular-nums">$148,250.00 USDC</span>
            </span>
            <span className="text-zinc-800">•</span>
            <span className="flex items-center gap-2">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-bold">ACTIVE ESCROWS</span>
              <span className="font-semibold text-white tabular-nums">42 CONTRACTS</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Holographic Navigation Bar */}
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-black font-extrabold shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all group-hover:scale-105">
              <ShieldCheck className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wider text-white">TRUST</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-semibold">
                  3D CYBER-TERMINAL
                </span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono -mt-0.5">
                AUTONOMOUS SETTLEMENT PROTOCOL
              </span>
            </div>
          </Link>

          {/* 3D Interactive Role Switcher */}
          <nav className="hidden md:flex items-center p-1.5 bg-zinc-950/80 border border-white/[0.08] rounded-2xl text-xs font-mono backdrop-blur-xl">
            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                isLanding
                  ? "bg-zinc-800 text-white font-bold shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Overview
            </Link>
            <Link
              href="/advertiser"
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                isAdvertiser
                  ? "bg-emerald-500/20 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Advertiser Terminal
            </Link>
            <Link
              href="/influencer"
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                isInfluencer
                  ? "bg-cyan-500/20 text-cyan-300 font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)] border border-cyan-500/30"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Creator Studio
            </Link>
          </nav>
        </div>

        {/* Global HUD Monospace Wallet Module */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-xs font-mono shadow-inner">
            <div className="flex items-center gap-1.5 pr-2.5 border-r border-white/[0.08]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-zinc-300">Sepolia Testnet</span>
            </div>
            <div className="flex items-center gap-2 pl-1">
              <span className="text-zinc-400 tabular-nums">{usdcBalance === null ? "—" : (Number(usdcBalance) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
              <span className="text-emerald-400 font-bold text-[11px]">USDC</span>
            </div>
          </div>

          <button
            onClick={connect}
            disabled={connecting}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-zinc-900 to-zinc-950 border border-emerald-500/30 text-xs font-mono text-zinc-200 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          >
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            <span className="tabular-nums font-semibold">
              {address ? formatAddress(address) : connecting ? "Connecting…" : "Connect Wallet"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
