"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Coins,
  FileCheck,
  Clock,
  Sparkles,
  ExternalLink,
  Bot,
  TrendingUp,
  ArrowUpRight,
  Zap,
  Activity,
  Layers,
  Check,
  Radar,
  Lock,
} from "lucide-react";
import {
  INITIAL_INFLUENCERS,
  INITIAL_ORDERS,
  InfluencerProfile,
  Order,
} from "@/lib/icp-agent";
import { formatAddress, formatUsdc } from "@/lib/utils";
import { AnalyticsVisualizer } from "@/components/advertiser/AnalyticsVisualizer";
import { Navbar } from "@/components/layout/Navbar";
import { useWallet } from "@/components/web3/WalletProvider";
import { useOrders } from "@/lib/orders";
import { approveUsdc, depositToEscrow, errMessage, toOrderIdBytes32, toRawUsdc } from "@/lib/chain";
import { ThreeDCard } from "@/components/ui/ThreeDCard";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";

interface AuditVerdict {
  isCompliant: boolean;
  confidenceScore: number;
  flaggedIssues: string[];
  summary: string;
}

export default function AdvertiserPortal() {
  const [influencers] = useState<InfluencerProfile[]>(INITIAL_INFLUENCERS);
  const [orders, setOrders] = useOrders();
  const { signer, address, connect, refreshBalance } = useWallet();
  const [txError, setTxError] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string>("");
  const [lastApproveTx, setLastApproveTx] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [minFollowers, setMinFollowers] = useState<number>(0);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerProfile | null>(null);

  // Big Data Visualizer state
  const [inspectingInfluencer, setInspectingInfluencer] = useState<InfluencerProfile>(INITIAL_INFLUENCERS[0]);

  // Multi-step Escrow Funding Modal state
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("2400");
  const [fundStep, setFundStep] = useState<number>(1);
  const [isTransacting, setIsTransacting] = useState(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);

  // Gen AI Audit state per order
  const [auditingOrders, setAuditingOrders] = useState<Record<string, boolean>>({});
  const [auditResults, setAuditResults] = useState<Record<string, AuditVerdict>>({});

  const filteredInfluencers = influencers.filter((inf) => {
    const matchesSearch =
      inf.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFollowers = inf.followers >= minFollowers;
    return matchesSearch && matchesFollowers;
  });

  const handleOpenFundModal = (inf: InfluencerProfile) => {
    setSelectedInfluencer(inf);
    setIsFundModalOpen(true);
    setFundStep(1);
    setTxSuccessHash(null);
    setTxError(null);
  };

  const handleNextFundingStep = async () => {
    setTxError(null);
    setIsTransacting(true);
    try {
      const s = signer ?? (await connect());
      if (!s) throw new Error("Connect your wallet first");
      const raw = toRawUsdc(depositAmount || "0");
      if (raw <= BigInt(0)) throw new Error("Enter an amount greater than 0");

      if (fundStep === 1) {
        // Step 1: real ERC-20 approve for the escrow contract
        setLastApproveTx(await approveUsdc(s, raw));
        setFundStep(2);
      } else if (fundStep === 2) {
        // Step 2: real depositFunds() into TrustEscrow
        const orderId = `ord_${Date.now().toString(36)}`; // <= 31 chars so it fits bytes32
        const hash = await depositToEscrow(s, orderId, selectedInfluencer!.evmAddress, raw);
        setPendingOrderId(orderId);
        setTxSuccessHash(hash);
        setFundStep(3);
        refreshBalance();
      } else if (fundStep === 3) {
        // Step 3: register the funded order (canister sync is simulated until ICP is deployed)
        const newOrder: Order = {
          orderId: pendingOrderId,
          evmTxHash: txSuccessHash || "",
          advertiserAddress: (address || (await s.getAddress())).toLowerCase(),
          influencerAddress: selectedInfluencer!.evmAddress.toLowerCase(),
          amountUsdcRaw: Number(raw),
          status: { type: "PaymentVerified" },
          createdAt: Date.now(),
          nonce: 0,
          onChain: true,
        };
        setOrders((prev) => [newOrder, ...prev]);
        setIsFundModalOpen(false);
      }
    } catch (e) {
      setTxError(errMessage(e));
    } finally {
      setIsTransacting(false);
    }
  };

  const handleRunAiAudit = async (orderId: string, proofUrl: string) => {
    setAuditingOrders((prev) => ({ ...prev, [orderId]: true }));

    try {
      const res = await fetch("/api/ai/audit-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proofUrl,
          campaignRequirements: {
            productName: "TRUST Protocol",
            requiredHashtags: ["#TRUST", "#CryptoEscrow"],
            requiredMentions: ["@TRUST_Protocol"],
          },
        }),
      });

      const data = await res.json();
      setAuditResults((prev) => ({ ...prev, [orderId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setAuditingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleApproveContent = async (orderId: string) => {
    const ord = orders.find((o) => o.orderId === orderId);
    if (!ord) return;
    let signature: string | undefined;
    let nonce = ord.nonce || 1;

    if (ord.onChain) {
      try {
        const res = await fetch("/api/dev/icp-sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderIdBytes32: toOrderIdBytes32(ord.orderId),
            influencer: ord.influencerAddress,
            amountRaw: String(ord.amountUsdcRaw),
            nonce,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signer unavailable");
        signature = data.signature;
      } catch (e) {
        setTxError(errMessage(e));
        return;
      }
    }

    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Approved" }, nonce, signature } : o))
    );
  };

  return (
    <div className="min-h-screen text-zinc-100 flex flex-col">
      <Navbar />

      <main className="max-w-[1440px] w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Bento Grid: Institutional High-Density Metrics with 3D Tilt */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ThreeDCard>
            <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 font-mono">
                ACTIVE ESCROW LIQUIDITY
              </div>
              <div className="text-3xl font-extrabold text-white font-mono tracking-tight tabular-nums">
                $148,250.00 <span className="text-sm font-semibold text-emerald-400">USDC</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-medium">
                  <ArrowUpRight className="h-3 w-3" /> +14.2% this week
                </span>
                <span className="text-zinc-500">• 100% On-Chain Protected</span>
              </div>
            </div>
          </ThreeDCard>

          <ThreeDCard>
            <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 font-mono">
                AI AUDIT & COMPLIANCE VERIFICATION
              </div>
              <div className="text-3xl font-extrabold text-cyan-400 font-mono tracking-tight tabular-nums">
                98.4% <span className="text-sm font-semibold text-zinc-400 font-sans">Accuracy</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center gap-1 font-medium">
                  <Zap className="h-3 w-3" /> Real-time multimodal analysis
                </span>
                <span className="text-zinc-500">• Zero Fraud Incidents</span>
              </div>
            </div>
          </ThreeDCard>

          <ThreeDCard>
            <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] relative overflow-hidden group">
              <div className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 mb-2 font-mono">
                PORTFOLIO ROMI MULTIPLIER
              </div>
              <div className="text-3xl font-extrabold text-teal-400 font-mono tracking-tight tabular-nums">
                3.85x <span className="text-sm font-semibold text-zinc-400 font-sans">Return</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3 w-3" /> t-ECDSA Release Guarantee
                </span>
                <span className="text-zinc-500">• Verified Settlement</span>
              </div>
            </div>
          </ThreeDCard>
        </section>

        {/* Big Data Analytics Visualizer */}
        <section>
          <AnalyticsVisualizer
            handle={inspectingInfluencer.handle}
            authenticityScore={inspectingInfluencer.botScorePct <= 3 ? 96 : 89}
            botRiskPercent={inspectingInfluencer.botScorePct}
            romiMultiplier={inspectingInfluencer.botScorePct <= 3 ? 3.8 : 2.9}
          />
        </section>

        {/* Influencer Marketplace Matrix (3D Tilt Cards with Specular Glare) */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 font-mono">
                3D CREATOR MARKETPLACE MATRIX
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                Verified Creators & Rate Cards
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter handle or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-zinc-950/80 border border-white/[0.08] rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 font-mono w-56"
                />
              </div>

              <select
                className="bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none font-mono"
                value={minFollowers}
                onChange={(e) => setMinFollowers(Number(e.target.value))}
              >
                <option value={0}>All Audiences</option>
                <option value={100000}>&gt; 100k Reach</option>
                <option value={200000}>&gt; 200k Reach</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredInfluencers.map((inf) => {
              const trustScore = 100 - inf.botScorePct;
              const isSelected = inspectingInfluencer.handle === inf.handle;

              return (
                <ThreeDCard
                  key={inf.handle}
                  onClick={() => setInspectingInfluencer(inf)}
                  className="cursor-pointer"
                >
                  <div
                    className={`glass-terminal p-5 rounded-2xl border relative flex flex-col justify-between h-full ${
                      isSelected
                        ? "border-emerald-500/60 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                        : "border-white/[0.07]"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Creator Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-extrabold text-black text-sm shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                            {inf.handle[1].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white flex items-center gap-1">
                              {inf.handle}
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 inline" />
                            </div>
                            <div className="text-[10px] font-mono text-zinc-500">
                              {formatAddress(inf.evmAddress)}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-[10px] font-mono text-zinc-400">
                          {inf.platform}
                        </span>
                      </div>

                      {/* 3D Trust Radial Metric */}
                      <div className="p-3 rounded-xl bg-black/50 border border-white/[0.04] grid grid-cols-2 gap-2 font-mono text-xs">
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">TRUST INDEX</div>
                          <div className="text-sm font-bold text-emerald-400 tabular-nums flex items-center gap-1.5 mt-0.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            {trustScore}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">ENGAGEMENT</div>
                          <div className="text-sm font-bold text-white tabular-nums mt-0.5">
                            {(inf.engagementRateBps / 100).toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">AUDIENCE</div>
                          <div className="text-xs font-semibold text-zinc-300 tabular-nums mt-0.5">
                            {inf.followers.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">AVG VIEWS</div>
                          <div className="text-xs font-semibold text-zinc-300 tabular-nums mt-0.5">
                            {inf.avgViews.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 mt-3 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="font-mono text-xs">
                        <span className="text-zinc-500 text-[10px] block">RATE</span>
                        <span className="font-bold text-white tabular-nums">$1,500 USDC</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFundModal(inf);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-black font-extrabold text-xs transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center gap-1"
                      >
                        Lock Escrow
                      </button>
                    </div>
                  </div>
                </ThreeDCard>
              );
            })}
          </div>
        </section>

        {/* Section: Live Deliverables & AI Proof Auditor with Radar Scan */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono">
                MULTIMODAL AUDIT VERIFICATION
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-cyan-400" />
                Proof-of-Work Verification Suite
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((order) => {
              const isProofReady = order.status.type === "ProofSubmitted";
              const isApproved = order.status.type === "Approved";
              const isAuditing = auditingOrders[order.orderId];
              const auditVerdict = auditResults[order.orderId];
              const liveUrl = (order.status as any).liveUrl;

              return (
                <div
                  key={order.orderId}
                  className="glass-terminal p-6 rounded-2xl border border-white/[0.08] space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-black/50 border border-white/[0.06] text-zinc-400">
                      ORDER ID: <span className="text-white font-semibold">{order.orderId}</span>
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {order.status.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-black/40 rounded-xl border border-white/[0.04] text-xs font-mono">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">LOCKED VALUE</div>
                      <div className="text-sm font-bold text-emerald-400 tabular-nums mt-0.5">
                        {formatUsdc(order.amountUsdcRaw)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">INFLUENCER</div>
                      <div className="text-xs font-semibold text-zinc-300 mt-0.5">
                        {formatAddress(order.influencerAddress)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">EVM RECEIPT</div>
                      <div className="text-xs text-cyan-400/90 mt-0.5">
                        {formatAddress(order.evmTxHash)}
                      </div>
                    </div>
                  </div>

                  {isProofReady && (
                    <div className="p-4 bg-zinc-950/80 rounded-xl border border-white/[0.06] space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-400 font-mono">Live Link Deliverable:</div>
                        <button
                          onClick={() => handleRunAiAudit(order.orderId, liveUrl)}
                          disabled={isAuditing}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono flex items-center gap-1.5 hover:bg-cyan-500/20 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        >
                          <Radar className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                          {isAuditing ? "Scanning with AI Radar..." : "Scan & Audit Content"}
                        </button>
                      </div>

                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1.5 font-mono break-all"
                      >
                        {liveUrl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>

                      {auditVerdict && (
                        <div
                          className={`p-3.5 rounded-xl border text-xs space-y-1.5 font-mono ${
                            auditVerdict.isCompliant
                              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                              : "bg-red-950/20 border-red-500/30 text-red-300"
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5">
                              {auditVerdict.isCompliant ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                              )}
                              RADAR SCAN: {auditVerdict.isCompliant ? "100% COMPLIANT" : "FLAGGED ISSUES"}
                            </span>
                            <span className="text-[11px] text-zinc-400 tabular-nums">
                              {auditVerdict.confidenceScore}% Confidence
                            </span>
                          </div>
                          <p className="text-zinc-300 text-[11px] leading-relaxed font-sans">
                            {auditVerdict.summary}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-3">
                    {isProofReady && (
                      <button
                        onClick={() => handleApproveContent(order.orderId)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-black font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-2 hover:brightness-110"
                      >
                        <Sparkles className="h-4 w-4" />
                        Approve & Emit t-ECDSA Release
                      </button>
                    )}
                    {isApproved && (
                      <div className="text-xs text-emerald-400 font-mono flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> t-ECDSA Cryptographic Release Emitted
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Hologram Escrow Funding Drawer with Laser Border */}
      {isFundModalOpen && selectedInfluencer && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <LaserBeamBorder glowColor="emerald">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-white">Smart Escrow Vault Deposit</h3>
                      <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        MULTI-STAGE CRYPTOGRAPHIC LOCK
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFundModalOpen(false)}
                    className="text-zinc-500 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Progress Step Sequencer */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-semibold">
                  <div
                    className={`p-2 rounded-xl border ${
                      fundStep >= 1
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-black/30 border-white/[0.05] text-zinc-500"
                    }`}
                  >
                    1. PERMIT USDC
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      fundStep >= 2
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-black/30 border-white/[0.05] text-zinc-500"
                    }`}
                  >
                    2. LOCK ON EVM
                  </div>
                  <div
                    className={`p-2 rounded-xl border ${
                      fundStep >= 3
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-black/30 border-white/[0.05] text-zinc-500"
                    }`}
                  >
                    3. CANISTER SYNC
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                      BENEFICIARY CREATOR
                    </label>
                    <div className="mt-1 p-3 bg-black/40 rounded-xl border border-white/[0.06] flex justify-between items-center text-xs">
                      <span className="font-bold text-white font-mono">{selectedInfluencer.handle}</span>
                      <span className="font-mono text-zinc-500 text-[11px]">
                        {formatAddress(selectedInfluencer.evmAddress)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                      ESCROW VALUE (USDC)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={fundStep > 1}
                        className="w-full px-4 py-3 bg-black/50 border border-white/[0.08] rounded-xl text-white font-mono text-lg focus:outline-none focus:border-emerald-500 tabular-nums"
                        placeholder="2400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400 font-bold">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/70 rounded-xl border border-white/[0.06] text-xs text-zinc-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono text-[11px]">
                      <Clock className="h-3.5 w-3.5" /> 7-DAY UNILATERAL REFUND TIMELOCK
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Funds remain locked under smart contract guarantee. If milestones are unfulfilled, 
                      reclaim 100% of your funds unilaterally on Ethereum.
                    </p>
                  </div>

                  {txSuccessHash && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono space-y-1">
                      <div className="font-bold">EVM Deposit Mined Successfully:</div>
                      <div className="break-all text-[11px] text-emerald-300/80">{txSuccessHash}</div>
                    </div>
                  )}
                </div>

                {txError && (
                  <div className="text-[11px] font-mono text-red-400 break-words border border-red-500/30 rounded-lg p-2">{txError}</div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsFundModalOpen(false)}
                    className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isTransacting}
                    onClick={handleNextFundingStep}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-extrabold text-xs transition-all disabled:opacity-50 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                  >
                    {isTransacting ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        Executing Stage {fundStep}...
                      </>
                    ) : fundStep === 1 ? (
                      "Authorize Allowance"
                    ) : fundStep === 2 ? (
                      "Deposit into Escrow"
                    ) : (
                      "Sync Canister & Finalize"
                    )}
                  </button>
                </div>
              </div>
            </LaserBeamBorder>
          </div>
        </div>
      )}
    </div>
  );
}
