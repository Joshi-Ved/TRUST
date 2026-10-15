"use client";

import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  Coins,
  CheckCircle,
  BarChart3,
  Lock,
  Sparkles,
  Terminal,
  Activity,
  Cpu,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { ThreeDCard } from "@/components/ui/ThreeDCard";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";

export default function HomePage() {
  return (
    <div className="relative min-h-screen text-zinc-100 flex flex-col justify-between">
      <Navbar />

      {/* Hero Cyber-Terminal Stage */}
      <main className="max-w-[1440px] w-full mx-auto px-6 py-16 flex-1 flex flex-col justify-center space-y-16">
        <div className="max-w-4xl space-y-6">
          {/* Holographic Protocol Status Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.35)] text-xs font-mono text-emerald-400 backdrop-blur-2xl animate-pulse">
            <Terminal className="h-3.5 w-3.5" />
            <span>INSTITUTIONAL 3D CYBER-TERMINAL • EVM + ICP t-ECDSA</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-[1.05] font-sans">
            Autonomous <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-200 to-emerald-400">
              Smart Escrow
            </span>{" "}
            Protocol
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Eliminate payment defaults and fake influencer metrics. Lock campaign USDC into 
            tamper-proof EVM smart escrow. Settle instantaneously with cryptographic threshold-ECDSA signatures.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link href="/advertiser">
              <LaserBeamBorder glowColor="emerald">
                <button className="px-8 py-4 text-sm font-extrabold font-mono text-white flex items-center gap-2 tracking-wide uppercase">
                  <span>Initialize Escrow Campaign</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </LaserBeamBorder>
            </Link>

            <Link
              href="/influencer"
              className="px-6 py-4 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/40 text-sm font-mono text-zinc-300 hover:text-white transition-all flex items-center gap-2"
            >
              <span>Creator Studio Kanban</span>
              <ArrowUpRight className="h-4 w-4 text-cyan-400" />
            </Link>
          </div>
        </div>

        {/* Live Architecture Pipeline (Step-Sequencer) */}
        <section className="space-y-4">
          <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
            TRUST PROTOCOL EXECUTION FLOW
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-terminal p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="text-xs font-mono text-emerald-400 font-bold">STAGE 01</div>
              <div className="text-base font-bold text-white">USDC Lock (EVM)</div>
              <p className="text-xs text-zinc-400">
                Advertiser locks campaign budget into Solidity escrow contract with a strict 7-day refund timelock.
              </p>
            </div>

            <div className="glass-terminal p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="text-xs font-mono text-teal-400 font-bold">STAGE 02</div>
              <div className="text-base font-bold text-white">HTTP Outcall (ICP)</div>
              <p className="text-xs text-zinc-400">
                Canister queries EVM RPC node directly to verify transaction inclusion without centralized oracles.
              </p>
            </div>

            <div className="glass-terminal p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="text-xs font-mono text-cyan-400 font-bold">STAGE 03</div>
              <div className="text-base font-bold text-white">Proof Audit (AI)</div>
              <p className="text-xs text-zinc-400">
                Multimodal AI scans live social links, validating mandatory product tags, mentions, and brand safety.
              </p>
            </div>

            <div className="glass-terminal p-5 rounded-2xl border border-white/[0.08] space-y-2">
              <div className="text-xs font-mono text-emerald-400 font-bold">STAGE 04</div>
              <div className="text-base font-bold text-white">t-ECDSA Settlement</div>
              <p className="text-xs text-zinc-400">
                Canister issues a threshold cryptographic signature that unlocks USDC straight to the creator wallet.
              </p>
            </div>
          </div>
        </section>

        {/* Protocol Metrics Bento Grid with 3D Tilt Cards */}
        <section className="space-y-4">
          <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono">
            ON-CHAIN PROTOCOL TELEMETRY
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ThreeDCard>
              <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">
                  TOTAL VALUE LOCKED (TVL)
                </div>
                <div className="text-4xl font-black text-white font-mono tabular-nums">
                  $148,250.00 <span className="text-sm font-semibold text-emerald-400">USDC</span>
                </div>
                <div className="text-xs text-emerald-400 font-mono pt-2">
                  100% Locked Across 42 Active Escrows
                </div>
              </div>
            </ThreeDCard>

            <ThreeDCard>
              <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">
                  VERIFIED CREATOR AUDIENCE
                </div>
                <div className="text-4xl font-black text-cyan-400 font-mono tabular-nums">
                  1,840,000+ <span className="text-sm font-semibold text-zinc-400">Reach</span>
                </div>
                <div className="text-xs text-cyan-400 font-mono pt-2">
                  Attested via Big Data Crawler & Bot Score Filters
                </div>
              </div>
            </ThreeDCard>

            <ThreeDCard>
              <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 font-mono">
                  DISPUTE ARBITRATION RATE
                </div>
                <div className="text-4xl font-black text-teal-400 font-mono tabular-nums">
                  &lt; 0.01% <span className="text-sm font-semibold text-zinc-400">Default</span>
                </div>
                <div className="text-xs text-teal-400 font-mono pt-2">
                  Zero Counterparty Payment Default in 2026
                </div>
              </div>
            </ThreeDCard>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-zinc-500 font-mono">
        TRUST Protocol • Ethereum USDC Smart Escrow & Internet Computer (ICP) Cryptographic Release
      </footer>
    </div>
  );
}
