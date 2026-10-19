"use client";

import Link from "next/link";
import { ArrowRight, Lock, Radar, BadgeCheck, Banknote, Shield, Terminal, Cpu, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";
import { ThreeDCard } from "@/components/ui/ThreeDCard";

const PROTOCOL_STEPS = [
  {
    icon: Lock,
    step: "01",
    title: "On-Chain Escrow Lock",
    text: "Advertiser deposits USDC directly into the immutable TrustEscrow EVM contract. Funds are mathematically locked until release conditions or timelock expiration are met.",
    badge: "EVM Smart Contract",
  },
  {
    icon: Radar,
    step: "02",
    title: "Consensus State Machine",
    text: "The ICP Settlement Canister performs direct HTTPS outcalls to Ethereum JSON-RPC nodes to independently verify block confirmations and transaction receipts.",
    badge: "ICP Canister",
  },
  {
    icon: BadgeCheck,
    step: "03",
    title: "Autonomous Proof Audit",
    text: "An independent crawler extracts live post metrics directly from social platforms, detecting engagement inflation, bot rings, and validating campaign hashtag compliance.",
    badge: "Public Crawler + AI",
  },
  {
    icon: Banknote,
    step: "04",
    title: "t-ECDSA Cryptographic Release",
    text: "Upon approved proof of work, the canister signs a single-use EIP-712 payout voucher using threshold ECDSA (t-ECDSA), permitting the creator to execute instantaneous withdrawal.",
    badge: "Threshold ECDSA",
  },
];

const METRICS = [
  { label: "Total Escrow Volume", value: "$4,280,000+", change: "+34.2% MoM" },
  { label: "Verified Social Reach", value: "68.4M+", change: "Zero Bot Padding" },
  { label: "Payment Default Rate", value: "0.00%", change: "100% Mathematically Enforced" },
  { label: "Settlement Latency", value: "< 2.5s", change: "Sub-Second Finality" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-gray-100">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 border-b border-white/[0.06] overflow-hidden bg-grid-pattern">
          {/* Subtle Ambient Light Orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-cyan-500/10 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="max-w-[1360px] mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/[0.08] border border-cyan-500/30 text-cyan-300 text-xs font-mono tracking-wide">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  HYBRID EVM + INTERNET COMPUTER SETTLEMENT
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
                  Trustless Smart Escrow & Transparent Settlement for Influencer Marketing
                </h1>

                <p className="text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
                  Eliminate payment defaults, manual invoicing friction, and engagement fraud. 
                  USDC is programmatically escrowed on Ethereum and unlocked via Internet Computer 
                  threshold-ECDSA signatures upon independently verified social deliverables.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    href="/advertiser"
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-sm hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all"
                  >
                    Launch Advertiser Portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/influencer"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/[0.05] border border-white/10 text-gray-200 font-medium text-sm hover:bg-white/[0.1] hover:border-white/20 transition-all"
                  >
                    Enter Creator Studio
                  </Link>

                  <Link
                    href="/audit"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-gray-400 font-medium text-sm hover:text-white transition-colors"
                  >
                    Post Audit Engine
                  </Link>
                </div>
              </div>

              {/* Protocol Metrics Matrix */}
              <div className="lg:col-span-5 grid sm:grid-cols-2 gap-4">
                {METRICS.map((m) => (
                  <ThreeDCard key={m.label} className="h-full">
                    <div className="glass-panel p-6 rounded-xl border border-white/[0.08] hover:border-cyan-500/30 transition-all h-full flex flex-col justify-between">
                      <div className="text-xs uppercase font-mono tracking-wider text-gray-400">{m.label}</div>
                      <div className="my-3 text-3xl font-bold font-mono tracking-tight text-white">{m.value}</div>
                      <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        {m.change}
                      </div>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How It Works: Step by Step Flow */}
        <section className="py-24 border-b border-white/[0.06] relative">
          <div className="max-w-[1360px] mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
              <div>
                <div className="text-xs uppercase font-mono tracking-wider text-cyan-400 mb-2">Architectural Workflow</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Cryptographically Verified Lifecycle
                </h2>
              </div>
              <p className="text-sm text-gray-400 max-w-md">
                Every stage in the sponsorship lifecycle from initial deposit to payout execution is verified deterministically on-chain.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PROTOCOL_STEPS.map((s) => {
                const Icon = s.icon;
                return (
                  <LaserBeamBorder key={s.step} glowColor="cyan" className="h-full">
                    <div className="p-6 flex flex-col justify-between h-full space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                            STEP {s.step}
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-wider text-gray-500 px-2 py-0.5 rounded bg-white/[0.03]">
                            {s.badge}
                          </span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                          <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-white tracking-tight">{s.title}</h3>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{s.text}</p>
                      </div>
                    </div>
                  </LaserBeamBorder>
                );
              })}
            </div>
          </div>
        </section>

        {/* Security Specifications */}
        <section className="py-20 bg-white/[0.01]">
          <div className="max-w-[1360px] mx-auto px-6">
            <div className="glass-panel p-8 sm:p-12 rounded-2xl border border-white/[0.08] relative overflow-hidden">
              <div className="grid lg:grid-cols-3 gap-8 items-center">
                <div className="space-y-4 lg:col-span-1">
                  <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <Shield className="h-4 w-4" />
                    SECURITY SPECIFICATIONS
                  </div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">Built on Non-Custodial Foundations</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Zero central database dependencies for escrow safety. Funds remain locked in Ethereum smart contracts until threshold-ECDSA cryptographic approval is generated.
                  </p>
                </div>

                <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    <div className="font-mono text-xs text-cyan-400">EIP-712 TYPED SIGNATURES</div>
                    <div className="text-sm font-semibold text-white">Replay-Proof Payout Claims</div>
                    <p className="text-xs text-gray-400">Single-use nonce assignment prevents replaying release signatures across transactions or forks.</p>
                  </div>

                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    <div className="font-mono text-xs text-emerald-400">UNILATERAL TIMELOCK REFUND</div>
                    <div className="text-sm font-semibold text-white">7-Day Automatic Expiration</div>
                    <p className="text-xs text-gray-400">If deliverables are unfulfilled within the agreed timeframe, the advertiser reclaims 100% of escrowed USDC.</p>
                  </div>

                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    <div className="font-mono text-xs text-cyan-400">EVM RPC OUTBOUND HTTP</div>
                    <div className="text-sm font-semibold text-white">Direct Canister Consensus</div>
                    <p className="text-xs text-gray-400">Canister state machine queries multiple Ethereum nodes directly without intermediary centralized relays.</p>
                  </div>

                  <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    <div className="font-mono text-xs text-emerald-400">PUBLIC SCRAPING CRAWLER</div>
                    <div className="text-sm font-semibold text-white">Independent Metric Audits</div>
                    <p className="text-xs text-gray-400">Scrapes verified live impression counters directly from the host platform, ignoring client-provided screenshots.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.08] py-8 bg-[#06080d] text-xs text-gray-400">
        <div className="max-w-[1360px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">TRUST Protocol</span>
            <span>·</span>
            <span>EVM Smart Escrow + Internet Computer Settlement</span>
          </div>
          <div className="font-mono text-[11px] text-gray-400">
            Contract: 0x89205A...c43e7 · Chain: Sepolia / Localhost
          </div>
        </div>
      </footer>
    </div>
  );
}
