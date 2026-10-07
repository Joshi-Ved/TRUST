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
} from "lucide-react";
import {
  INITIAL_INFLUENCERS,
  INITIAL_ORDERS,
  InfluencerProfile,
  Order,
} from "@/lib/icp-agent";
import { formatAddress, formatUsdc } from "@/lib/utils";
import { AnalyticsVisualizer } from "@/components/advertiser/AnalyticsVisualizer";

interface AuditVerdict {
  isCompliant: boolean;
  confidenceScore: number;
  flaggedIssues: string[];
  summary: string;
}

export default function AdvertiserPortal() {
  const [influencers] = useState<InfluencerProfile[]>(INITIAL_INFLUENCERS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [minFollowers, setMinFollowers] = useState<number>(0);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerProfile | null>(null);

  // Big Data Visualizer inspect state
  const [inspectingInfluencer, setInspectingInfluencer] = useState<InfluencerProfile>(INITIAL_INFLUENCERS[0]);

  // Escrow Funding Modal state
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>("1500");
  const [isTransacting, setIsTransacting] = useState(false);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

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
    setTxSuccess(null);
  };

  const handleExecuteEscrowFunding = async () => {
    if (!selectedInfluencer) return;
    setIsTransacting(true);

    setTimeout(() => {
      const simulatedTxHash =
        "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const newOrderId = `ord_sepolia_${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: Order = {
        orderId: newOrderId,
        evmTxHash: simulatedTxHash,
        advertiserAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        influencerAddress: selectedInfluencer.evmAddress,
        amountUsdcRaw: parseFloat(depositAmount) * 1_000_000,
        status: { type: "PaymentVerified" },
        createdAt: Date.now(),
        nonce: 0,
      };

      setOrders((prev) => [newOrder, ...prev]);
      setIsTransacting(false);
      setTxSuccess(simulatedTxHash);
    }, 1800);
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

  const handleApproveContent = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.orderId === orderId) {
          return {
            ...ord,
            status: { type: "Approved" },
          };
        }
        return ord;
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              TRUST
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-sm font-medium text-emerald-400">Advertiser Intelligence Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Connected: 0xf39F...2266
            </div>
            <Link
              href="/influencer"
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Switch to Creator View →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400 mb-1">Active Escrow Balance</div>
            <div className="text-2xl font-bold text-white">$4,700.00 <span className="text-xs text-zinc-500">USDC</span></div>
            <div className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> 100% Locked On-Chain
            </div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400 mb-1">Pending Proof Review</div>
            <div className="text-2xl font-bold text-emerald-400">
              {orders.filter((o) => o.status.type === "ProofSubmitted").length}
            </div>
            <div className="text-xs text-zinc-400 mt-2">AI Auditor Ready</div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400 mb-1">Avg Authenticity Score</div>
            <div className="text-2xl font-bold text-white">94.8%</div>
            <div className="text-xs text-cyan-400 mt-2">Crawled via Big Data Engine</div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400 mb-1">Projected Portfolio ROMI</div>
            <div className="text-2xl font-bold text-teal-400">3.6x</div>
            <div className="text-xs text-zinc-400 mt-2">Verifiable Return On Ad Spend</div>
          </div>
        </div>

        {/* Section: Big Data Analytics & Chart */}
        <section className="space-y-4">
          <AnalyticsVisualizer
            handle={inspectingInfluencer.handle}
            authenticityScore={inspectingInfluencer.botScorePct <= 3 ? 96 : 89}
            botRiskPercent={inspectingInfluencer.botScorePct}
            romiMultiplier={inspectingInfluencer.botScorePct <= 3 ? 3.8 : 2.9}
          />
        </section>

        {/* Section: Influencer Discovery */}
        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-400" />
                Influencer Discovery Engine
              </h2>
              <p className="text-sm text-zinc-400">
                Browse verified creators with real-time crawling metrics and fraud prevention scores.
              </p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter handle or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <select
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none"
                value={minFollowers}
                onChange={(e) => setMinFollowers(Number(e.target.value))}
              >
                <option value={0}>All Audiences</option>
                <option value={100000}>100k+ Followers</option>
                <option value={200000}>200k+ Followers</option>
              </select>
            </div>
          </div>

          {/* Discovery Table */}
          <div className="glass-panel rounded-xl border border-zinc-800/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-xs font-mono text-zinc-400">
                  <tr>
                    <th className="px-6 py-3.5">Creator Handle</th>
                    <th className="px-6 py-3.5">Platform</th>
                    <th className="px-6 py-3.5">Followers</th>
                    <th className="px-6 py-3.5">Avg Views</th>
                    <th className="px-6 py-3.5">Engagement Rate</th>
                    <th className="px-6 py-3.5">Authentic Score</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredInfluencers.map((inf) => (
                    <tr
                      key={inf.handle}
                      onClick={() => setInspectingInfluencer(inf)}
                      className="hover:bg-zinc-900/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-black text-xs">
                          {inf.handle[1].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            {inf.handle}
                            {inspectingInfluencer.handle === inf.handle && (
                              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono">
                                Inspected
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-mono text-zinc-500">{formatAddress(inf.evmAddress)}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded bg-zinc-800 text-xs text-zinc-300">
                          {inf.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {inf.followers.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {inf.avgViews.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-emerald-400">
                        {(inf.engagementRateBps / 100).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono ${
                            inf.botScorePct <= 3
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {100 - inf.botScorePct}% Trust Score
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenFundModal(inf);
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors shadow-lg shadow-emerald-500/20"
                        >
                          Lock Escrow
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section: Content Review & Gen AI Proof Auditor */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-cyan-400" />
                Proof-of-Work Review & Automated AI Auditor
              </h2>
              <p className="text-sm text-zinc-400">
                Run automated LLM compliance checks before triggering t-ECDSA cryptographic approval signatures.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const isProofReady = order.status.type === "ProofSubmitted";
              const isApproved = order.status.type === "Approved";
              const isAuditing = auditingOrders[order.orderId];
              const auditVerdict = auditResults[order.orderId];
              const liveUrl = (order.status as any).liveUrl;

              return (
                <div
                  key={order.orderId}
                  className="glass-panel p-5 rounded-xl border border-zinc-800/80 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      Order: {order.orderId}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {order.status.type}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Escrow Value:</span>
                      <span className="font-bold text-white font-mono">
                        {formatUsdc(order.amountUsdcRaw)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Influencer:</span>
                      <span className="font-mono text-zinc-300">
                        {formatAddress(order.influencerAddress)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">EVM Tx Hash:</span>
                      <span className="font-mono text-emerald-400/80 text-xs">
                        {formatAddress(order.evmTxHash)}
                      </span>
                    </div>
                  </div>

                  {isProofReady && (
                    <div className="p-3 bg-zinc-900/80 rounded-lg border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-zinc-400 font-mono">Live Content Submission:</div>
                        <button
                          onClick={() => handleRunAiAudit(order.orderId, liveUrl)}
                          disabled={isAuditing}
                          className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono flex items-center gap-1.5 hover:bg-cyan-500/20 transition-all"
                        >
                          <Bot className="h-3.5 w-3.5" />
                          {isAuditing ? "Auditing Deliverable..." : "Run AI Compliance Audit"}
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

                      {/* AI Audit Verdict Result Box */}
                      {auditVerdict && (
                        <div
                          className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                            auditVerdict.isCompliant
                              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                              : "bg-red-950/20 border-red-500/30 text-red-300"
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-semibold">
                            <span className="flex items-center gap-1.5">
                              {auditVerdict.isCompliant ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-red-400" />
                              )}
                              AI Compliance: {auditVerdict.isCompliant ? "VERIFIED PASSED" : "FLAGGED ISSUES"}
                            </span>
                            <span className="text-[11px] font-mono text-zinc-400">
                              Confidence: {auditVerdict.confidenceScore}%
                            </span>
                          </div>
                          <p className="text-zinc-300 text-[11px] leading-relaxed">
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
                        className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-semibold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Approve & Trigger t-ECDSA Release
                      </button>
                    )}
                    {isApproved && (
                      <div className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4" /> Cryptographic Release Emitted
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Escrow Funding Modal */}
      {isFundModalOpen && selectedInfluencer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-lg text-white">Lock USDC in Escrow</h3>
              </div>
              <button
                onClick={() => setIsFundModalOpen(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 font-mono">Recipient Influencer</label>
                <div className="mt-1 p-3 bg-zinc-900 rounded-lg border border-zinc-800 flex justify-between items-center text-sm">
                  <span className="font-semibold text-white">{selectedInfluencer.handle}</span>
                  <span className="text-xs font-mono text-zinc-500">
                    {formatAddress(selectedInfluencer.evmAddress)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-mono">Escrow Amount (USDC)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="1000"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400">
                    USDC
                  </span>
                </div>
              </div>

              <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800/60 space-y-1 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <Clock className="h-3.5 w-3.5" /> 7-Day Unilateral Timelock Refund
                </div>
                <p>
                  Funds will remain strictly locked. If the influencer fails to deliver within 7 days, 
                  you can unilaterally claim a 100% refund.
                </p>
              </div>

              {txSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono space-y-1">
                  <div className="font-bold">Transaction Mined & Verified!</div>
                  <div className="break-all text-[11px] text-emerald-300/80">Tx: {txSuccess}</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsFundModalOpen(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={isTransacting || !!txSuccess}
                onClick={handleExecuteEscrowFunding}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/25"
              >
                {isTransacting ? (
                  <>
                    <span className="h-3 w-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Locking On EVM...
                  </>
                ) : txSuccess ? (
                  "Completed"
                ) : (
                  "Confirm & Deposit"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
