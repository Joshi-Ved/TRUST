"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Zap, Coins, CheckCircle, BarChart3, Lock, Sparkles, Terminal } from "lucide-react";
import { TerminalHeader } from "@/components/layout/TerminalHeader";
import { ThreeDCard } from "@/components/ui/ThreeDCard";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";

// Dynamically import Three.js canvas to eliminate SSR hydration mismatch
const BlockchainScene = dynamic(() => import("@/components/canvas/BlockchainScene"), {
  ssr: false,
});

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#030712] text-zinc-100 flex flex-col justify-between overflow-hidden">
      {/* 3D WebGL Background Scene */}
      <BlockchainScene />

      <TerminalHeader activePortal="landing" />

      {/* Hero Cyber-Terminal Stage */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16 flex-1 flex flex-col justify-center">
        {/* Holographic Protocol Pill */}
        <div className="inline-flex items-center gap-2 self-start px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-xs font-mono text-emerald-400 mb-6 backdrop-blur-xl animate-pulse">
          <Terminal className="h-3.5 w-3.5" />
          <span>CYBERNETIC ESCROW ENGINE • EVM + ICP t-ECDSA</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] max-w-4xl font-sans">
          Autonomous 3D Escrow for <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Influencer Marketing
          </span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Lock campaign USDC on Ethereum. Verify content and deliverables natively through 
          Internet Computer state machines. Release instantaneous payouts with cryptographically proven 
          threshold-ECDSA signatures.
        </p>

        {/* 3D Perspective Tilt Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {/* Card 1: Advertiser Portal */}
          <ThreeDCard>
            <LaserBeamBorder glowColor="emerald">
              <Link
                href="/advertiser"
                className="block p-8 h-full transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                    <Coins className="h-7 w-7" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-2">Advertiser Terminal</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Discover verified creators with bot-score inspection, fund smart escrow campaigns in USDC, 
                  and audit proof-of-work submissions using multimodal AI.
                </p>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
                  <span>Enter Advertiser Matrix</span>
                  <span>→</span>
                </div>
              </Link>
            </LaserBeamBorder>
          </ThreeDCard>

          {/* Card 2: Creator Portal */}
          <ThreeDCard>
            <LaserBeamBorder glowColor="cyan">
              <Link
                href="/influencer"
                className="block p-8 h-full transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]">
                    <BarChart3 className="h-7 w-7" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-2xl font-extrabold text-white mb-2">Creator Kanban Terminal</h3>
                <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                  Accept locked orders with guaranteed on-chain payout protection, draft tone-matched copy 
                  with Gen AI, and claim USDC directly upon milestone sign-off.
                </p>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  <span>Open Creator Pipeline</span>
                  <span>→</span>
                </div>
              </Link>
            </LaserBeamBorder>
          </ThreeDCard>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-10 border-t border-white/[0.08]">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Trustless EVM Escrow</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Funds stay locked on-chain and can only unlock via t-ECDSA or unilateral timelock refunds.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">On-Chain HTTP Outcalls</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Direct EVM receipt verification by ICP nodes without off-chain centralized oracles.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-white/[0.08] text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Threshold-ECDSA Cryptography</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Canister-governed cryptography produces EIP-712 release proofs directly to Ethereum.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.05] py-6 text-center text-xs text-zinc-500 font-mono">
        TRUST Cyber-Terminal • Powered by Ethereum Smart Contracts & Internet Computer (ICP)
      </footer>
    </div>
  );
}
