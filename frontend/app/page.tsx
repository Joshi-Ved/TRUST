import Link from "next/link";
import { ShieldCheck, ArrowRight, Zap, Coins, CheckCircle, BarChart3, Lock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col justify-between">
      {/* Background glow effects */}
      <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-emerald-500/10 blur-[130px] pointer-events-none rounded-full" />
      <div className="absolute top-[20rem] right-[-5rem] w-[400px] h-[300px] bg-cyan-500/10 blur-[120px] pointer-events-none rounded-full" />

      {/* Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-black stroke-[2.5]" />
            </div>
            <span className="font-bold text-lg tracking-wider text-white">
              TRUST<span className="text-emerald-400">.</span>
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
              EVM + ICP v1.0
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/advertiser"
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Advertiser Portal
            </Link>
            <Link
              href="/influencer"
              className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
            >
              Influencer Portal
            </Link>
            <button className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all">
              Sepolia Testnet
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 mb-6">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Autonomous Web3 Escrow with t-ECDSA Settlement
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.15] max-w-4xl">
          Zero-Fraud Settlement for <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            Influencer Marketing
          </span>
        </h1>

        <p className="mt-6 text-lg text-zinc-400 max-w-2xl leading-relaxed">
          Lock campaign USDC on Ethereum. Verify content and deliverables natively through 
          Internet Computer state machines. Release instantaneous payouts with cryptographically proven 
          threshold-ECDSA signatures.
        </p>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          {/* Card 1: Advertiser */}
          <Link
            href="/advertiser"
            className="group relative rounded-2xl glass-panel p-8 border border-zinc-800/80 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Coins className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Advertiser & Brand Portal</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Discover verified influencers with bot-score inspection, fund smart escrow campaigns in USDC, 
              and inspect real-time proof-of-work submissions.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
              <span>Launch Discovery Engine</span>
              <span>→</span>
            </div>
          </Link>

          {/* Card 2: Influencer */}
          <Link
            href="/influencer"
            className="group relative rounded-2xl glass-panel p-8 border border-zinc-800/80 hover:border-cyan-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-cyan-500/10"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <BarChart3 className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-zinc-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Creator & Influencer Portal</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              Accept locked orders with guaranteed on-chain payout protection, track deliverables on 
              a live Kanban board, and claim USDC directly upon approval.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
              <span>Open Creator Kanban</span>
              <span>→</span>
            </div>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-10 border-t border-zinc-900">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Trustless EVM Escrow</h4>
              <p className="text-xs text-zinc-400 mt-1">Funds stay locked on-chain and can only unlock via t-ECDSA or timelock refund.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-teal-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">HTTP RPC Outcalls</h4>
              <p className="text-xs text-zinc-400 mt-1">Direct EVM receipt verification by ICP nodes without off-chain centralized oracles.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-cyan-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Threshold-ECDSA Signing</h4>
              <p className="text-xs text-zinc-400 mt-1">Canister-governed cryptography emits EIP-712 releases directly to Ethereum.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600 font-mono">
        TRUST Protocol • Autonomous Influencer Escrow • Built on EVM & Internet Computer (ICP)
      </footer>
    </div>
  );
}
