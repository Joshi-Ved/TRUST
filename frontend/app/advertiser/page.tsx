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
    <div className="min-h-screen text-gray-900 flex flex-col">
      <Navbar />

      <main className="max-w-[1440px] w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Bento Grid: Institutional High-Density Metrics with 3D Tilt */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ThreeDCard>
            <div className="glass-terminal p-6 rounded-lg border border-gray-200 relative overflow-hidden group">
              <div className="text-[10px] uppercase font-bold tracking-wide text-gray-500 mb-2 ">
                ACTIVE ESCROW LIQUIDITY
              </div>
              <div className="text-3xl font-extrabold text-gray-900  tracking-tight tabular-nums">
                $148,250.00 <span className="text-sm font-semibold text-[#714b67]">USDC</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs ">
                <span className="px-2 py-0.5 rounded-full bg-[#714b67]/10 text-[#714b67] border border-[#714b67]/40 flex items-center gap-1 font-medium">
                  <ArrowUpRight className="h-3 w-3" /> +14.2% this week
                </span>
                <span className="text-gray-500">• 100% On-Chain Protected</span>
              </div>
            </div>
          </ThreeDCard>

          <ThreeDCard>
            <div className="glass-terminal p-6 rounded-lg border border-gray-200 relative overflow-hidden group">
              <div className="text-[10px] uppercase font-bold tracking-wide text-gray-500 mb-2 ">
                AI AUDIT & COMPLIANCE VERIFICATION
              </div>
              <div className="text-3xl font-extrabold text-[#017e84]  tracking-tight tabular-nums">
                98.4% <span className="text-sm font-semibold text-gray-600 font-sans">Accuracy</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs ">
                <span className="px-2 py-0.5 rounded-full bg-[#017e84]/10 text-[#017e84] border border-[#017e84]/40 flex items-center gap-1 font-medium">
                  <Zap className="h-3 w-3" /> Real-time multimodal analysis
                </span>
                <span className="text-gray-500">• Zero Fraud Incidents</span>
              </div>
            </div>
          </ThreeDCard>

          <ThreeDCard>
            <div className="glass-terminal p-6 rounded-lg border border-gray-200 relative overflow-hidden group">
              <div className="text-[10px] uppercase font-bold tracking-wide text-gray-500 mb-2 ">
                PORTFOLIO ROMI MULTIPLIER
              </div>
              <div className="text-3xl font-extrabold text-[#017e84]  tracking-tight tabular-nums">
                3.85x <span className="text-sm font-semibold text-gray-600 font-sans">Return</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs ">
                <span className="px-2 py-0.5 rounded-full bg-[#017e84]/10 text-[#017e84] border border-[#017e84]/40 flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3 w-3" /> t-ECDSA Release Guarantee
                </span>
                <span className="text-gray-500">• Verified Settlement</span>
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
              <div className="text-[10px] uppercase font-bold tracking-wide text-[#714b67] ">
                CREATOR MARKETPLACE
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-[#714b67]" />
                Verified Creators & Rate Cards
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter handle or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-md text-xs text-gray-800 placeholder-zinc-500 focus:outline-none focus:border-[#714b67]/40  w-56"
                />
              </div>

              <select
                className="bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-700 focus:outline-none "
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
                    className={`glass-terminal p-5 rounded-lg border relative flex flex-col justify-between h-full ${
                      isSelected
                        ? "border-[#714b67]/40 shadow-sm"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Creator Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-gradient-to-tr from-[#714b67] to-[#017e84] flex items-center justify-center font-extrabold text-white text-sm shadow-sm">
                            {inf.handle[1].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-gray-900 flex items-center gap-1">
                              {inf.handle}
                              <CheckCircle2 className="h-3.5 w-3.5 text-[#714b67] inline" />
                            </div>
                            <div className="text-[10px]  text-gray-500">
                              {formatAddress(inf.evmAddress)}
                            </div>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px]  text-gray-600">
                          {inf.platform}
                        </span>
                      </div>

                      {/* 3D Trust Radial Metric */}
                      <div className="p-3 rounded-md bg-gray-50 border border-gray-100 grid grid-cols-2 gap-2  text-xs">
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">TRUST INDEX</div>
                          <div className="text-sm font-bold text-[#714b67] tabular-nums flex items-center gap-1.5 mt-0.5">
                            <span className="h-2 w-2 rounded-full bg-[#714b67] animate-pulse" />
                            {trustScore}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">ENGAGEMENT</div>
                          <div className="text-sm font-bold text-gray-900 tabular-nums mt-0.5">
                            {(inf.engagementRateBps / 100).toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">AUDIENCE</div>
                          <div className="text-xs font-semibold text-gray-700 tabular-nums mt-0.5">
                            {inf.followers.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">AVG VIEWS</div>
                          <div className="text-xs font-semibold text-gray-700 tabular-nums mt-0.5">
                            {inf.avgViews.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-4 mt-3 border-t border-gray-200 flex items-center justify-between">
                      <div className=" text-xs">
                        <span className="text-gray-500 text-[10px] block">RATE</span>
                        <span className="font-bold text-gray-900 tabular-nums">$1,500 USDC</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFundModal(inf);
                        }}
                        className="px-3.5 py-1.5 rounded-md bg-gradient-to-r from-[#714b67] to-[#5d3c54] hover:brightness-110 text-white font-extrabold text-xs transition-all shadow-sm flex items-center gap-1"
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
              <div className="text-[10px] uppercase font-bold tracking-wide text-[#017e84] ">
                MULTIMODAL AUDIT VERIFICATION
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#017e84]" />
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
                  className="glass-terminal p-6 rounded-lg border border-gray-200 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className=" text-xs px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-200 text-gray-600">
                      ORDER ID: <span className="text-gray-900 font-semibold">{order.orderId}</span>
                    </span>
                    <span className="text-xs  px-2.5 py-0.5 rounded-full bg-[#714b67]/10 text-[#714b67] border border-[#714b67]/40">
                      {order.status.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-md border border-gray-100 text-xs ">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">LOCKED VALUE</div>
                      <div className="text-sm font-bold text-[#714b67] tabular-nums mt-0.5">
                        {formatUsdc(order.amountUsdcRaw)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">INFLUENCER</div>
                      <div className="text-xs font-semibold text-gray-700 mt-0.5">
                        {formatAddress(order.influencerAddress)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">EVM RECEIPT</div>
                      <div className="text-xs text-[#017e84] mt-0.5">
                        {formatAddress(order.evmTxHash)}
                      </div>
                    </div>
                  </div>

                  {isProofReady && (
                    <div className="p-4 bg-white rounded-md border border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600 ">Live Link Deliverable:</div>
                        <button
                          onClick={() => handleRunAiAudit(order.orderId, liveUrl)}
                          disabled={isAuditing}
                          className="px-3 py-1.5 rounded-md bg-[#017e84]/10 border border-[#017e84]/40 text-[#017e84] text-xs  flex items-center gap-1.5 hover:bg-[#017e84]/10 transition-all shadow-sm"
                        >
                          <Radar className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                          {isAuditing ? "Scanning with AI Radar..." : "Scan & Audit Content"}
                        </button>
                      </div>

                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-[#017e84] hover:underline flex items-center gap-1.5  break-all"
                      >
                        {liveUrl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>

                      {auditVerdict && (
                        <div
                          className={`p-3.5 rounded-md border text-xs space-y-1.5  ${
                            auditVerdict.isCompliant
                              ? "bg-[#714b67]/5 border-[#714b67]/40 text-[#714b67]"
                              : "bg-red-50 border-red-300 text-red-600"
                          }`}
                        >
                          <div className="flex items-center justify-between font-semibold">
                            <span className="flex items-center gap-1.5">
                              {auditVerdict.isCompliant ? (
                                <CheckCircle2 className="h-4 w-4 text-[#714b67]" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              )}
                              RADAR SCAN: {auditVerdict.isCompliant ? "100% COMPLIANT" : "FLAGGED ISSUES"}
                            </span>
                            <span className="text-[11px] text-gray-600 tabular-nums">
                              {auditVerdict.confidenceScore}% Confidence
                            </span>
                          </div>
                          <p className="text-gray-700 text-[11px] leading-relaxed font-sans">
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
                        className="px-5 py-2.5 rounded-md bg-gradient-to-r from-[#714b67] to-[#5d3c54] text-white font-extrabold text-xs transition-all shadow-sm flex items-center gap-2 hover:brightness-110"
                      >
                        <Sparkles className="h-4 w-4" />
                        Approve & Emit t-ECDSA Release
                      </button>
                    )}
                    {isApproved && (
                      <div className="text-xs text-[#714b67]  flex items-center gap-2 font-semibold">
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
        <div className="fixed inset-0 z-50 bg-gray-900/40  flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <LaserBeamBorder glowColor="emerald">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-md bg-[#714b67]/10 border border-[#714b67]/40 flex items-center justify-center text-[#714b67] shadow-sm">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-gray-900">Smart Escrow Vault Deposit</h3>
                      <div className="text-[10px]  text-gray-500 uppercase tracking-wide">
                        MULTI-STAGE CRYPTOGRAPHIC LOCK
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFundModalOpen(false)}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* Progress Step Sequencer */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]  font-semibold">
                  <div
                    className={`p-2 rounded-md border ${
                      fundStep >= 1
                        ? "bg-[#714b67]/10 border-[#714b67]/40 text-[#714b67]"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    1. PERMIT USDC
                  </div>
                  <div
                    className={`p-2 rounded-md border ${
                      fundStep >= 2
                        ? "bg-[#714b67]/10 border-[#714b67]/40 text-[#714b67]"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    2. LOCK ON EVM
                  </div>
                  <div
                    className={`p-2 rounded-md border ${
                      fundStep >= 3
                        ? "bg-[#714b67]/10 border-[#714b67]/40 text-[#714b67]"
                        : "bg-gray-50 border-gray-200 text-gray-500"
                    }`}
                  >
                    3. CANISTER SYNC
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wide text-gray-600 ">
                      BENEFICIARY CREATOR
                    </label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-md border border-gray-200 flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-900 ">{selectedInfluencer.handle}</span>
                      <span className=" text-gray-500 text-[11px]">
                        {formatAddress(selectedInfluencer.evmAddress)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wide text-gray-600 ">
                      ESCROW VALUE (USDC)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={fundStep > 1}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-gray-900  text-lg focus:outline-none focus:border-[#714b67] tabular-nums"
                        placeholder="2400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2  text-xs text-gray-600 font-bold">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-md border border-gray-200 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-1.5 text-[#714b67] font-semibold  text-[11px]">
                      <Clock className="h-3.5 w-3.5" /> 7-DAY UNILATERAL REFUND TIMELOCK
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Funds remain locked under smart contract guarantee. If milestones are unfulfilled, 
                      reclaim 100% of your funds unilaterally on Ethereum.
                    </p>
                  </div>

                  {txSuccessHash && (
                    <div className="p-3 rounded-md bg-[#714b67]/10 border border-[#714b67]/40 text-[#714b67] text-xs  space-y-1">
                      <div className="font-bold">EVM Deposit Mined Successfully:</div>
                      <div className="break-all text-[11px] text-[#714b67]">{txSuccessHash}</div>
                    </div>
                  )}
                </div>

                {txError && (
                  <div className="text-[11px]  text-red-600 break-words border border-red-300 rounded-lg p-2">{txError}</div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsFundModalOpen(false)}
                    className="px-4 py-2 text-xs  text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isTransacting}
                    onClick={handleNextFundingStep}
                    className="px-6 py-2.5 rounded-md bg-gradient-to-r from-[#714b67] to-[#5d3c54] hover:from-[#714b67] hover:to-[#5d3c54] text-white font-extrabold text-xs transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                  >
                    {isTransacting ? (
                      <>
                        <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
