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
  RotateCcw,
  AlertOctagon,
  X,
  UserPlus,
  Trash2,
} from "lucide-react";
import {
  CAMPAIGN_HASHTAG,
  INITIAL_INFLUENCERS,
  InfluencerProfile,
  Order,
  VerificationResult,
} from "@/lib/icp-agent";
import { formatAddress, formatUsdc } from "@/lib/utils";
import { AnalyticsVisualizer } from "@/components/advertiser/AnalyticsVisualizer";
import { Navbar } from "@/components/layout/Navbar";
import { AuditReport } from "@/components/audit/AuditReport";
import type { AuditReport as Report } from "@/lib/audit/types";
import { useWallet } from "@/components/web3/WalletProvider";
import { useOrders } from "@/lib/orders";
import { useInfluencers } from "@/lib/influencers";
import { approveUsdc, depositToEscrow, claimRefund, errMessage, toRawUsdc, CHAIN } from "@/lib/chain";
import { ThreeDCard } from "@/components/ui/ThreeDCard";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";

export default function AdvertiserPortal() {
  const { influencers, remove: removeInfluencer } = useInfluencers();
  const [orders, setOrders, reloadOrders] = useOrders();
  const { signer, address, connect, connectDevAccount, requestFaucet, usdcBalance, refreshBalance } = useWallet();
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccessMessage, setTxSuccessMessage] = useState<string | null>(null);
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
  const [targetViews, setTargetViews] = useState<string>("");
  const [brief, setBrief] = useState({ productName: "", keyMessage: "", link: "", mention: "" });
  const [fundStep, setFundStep] = useState<number>(1);
  const [isTransacting, setIsTransacting] = useState(false);
  const [txSuccessHash, setTxSuccessHash] = useState<string | null>(null);

  // Dispute Modal state
  const [disputeOrderId, setDisputeOrderId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  // Gen AI Audit state per order
  const [auditingOrders, setAuditingOrders] = useState<Record<string, boolean>>({});
  const [auditResults, setAuditResults] = useState<Record<string, Report>>({});
  const [auditError, setAuditError] = useState<Record<string, string>>({});

  // Profile scan + release verification state per order
  const [verifyingOrders, setVerifyingOrders] = useState<Record<string, boolean>>({});
  const [verifyError, setVerifyError] = useState<Record<string, string>>({});
  const [legacyTargets, setLegacyTargets] = useState<Record<string, string>>({});
  const [reclaimingOrders, setReclaimingOrders] = useState<Record<string, boolean>>({});

  const handleClaimRefund = async (orderId: string) => {
    const ord = orders.find((o) => o.orderId === orderId);
    if (!ord) return;
    setTxError(null);
    setTxSuccessMessage(null);
    setReclaimingOrders((prev) => ({ ...prev, [orderId]: true }));

    try {
      let s = signer;
      if (!s) {
        if (CHAIN.chainId === 31337) {
          s = await connectDevAccount("account-0");
        } else {
          s = await connect();
        }
      }
      if (!s) throw new Error("Connect your wallet first");

      if (ord.onChain) {
        const hash = await claimRefund(s, ord.orderId);
        setTxSuccessMessage(`Refund claimed from smart contract. EVM Tx: ${hash}`);
        refreshBalance();
      }
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Refunded" } } : o))
      );
    } catch (err: any) {
      setTxError(errMessage(err));
    } finally {
      setReclaimingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const filteredInfluencers = influencers.filter((inf) => {
    const matchesSearch =
      inf.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.platform.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFollowers = inf.followers >= minFollowers;
    return matchesSearch && matchesFollowers;
  });

  const handleOpenFundModal = (inf: InfluencerProfile) => {
    setSelectedInfluencer(inf);
    setTargetViews(String(inf.avgViews || 10_000));
    setIsFundModalOpen(true);
    setFundStep(1);
    setTxSuccessHash(null);
    setTxError(null);
    setTxSuccessMessage(null);
  };

  const handleNextFundingStep = async () => {
    setTxError(null);
    setIsTransacting(true);
    try {
      let s = signer;
      if (!s) {
        if (CHAIN.chainId === 31337) {
          s = await connectDevAccount("account-0");
        } else {
          s = await connect();
        }
      }
      if (!s) throw new Error("Connect your wallet first");

      const myAddr = await s.getAddress();
      if (selectedInfluencer && myAddr.toLowerCase() === selectedInfluencer.evmAddress.toLowerCase()) {
        throw new Error("Self-dealing prohibited: Your connected wallet is the same as the creator's payout wallet. To deposit as an advertiser on the same device, switch to Account #0.");
      }

      const raw = toRawUsdc(depositAmount || "0");
      if (raw <= BigInt(0)) throw new Error("Enter an amount greater than 0");
      const target = Math.floor(Number(targetViews));
      if (!(target > 0)) throw new Error("Enter the number of views the post must reach before payment");
      if (!brief.productName.trim() || !brief.keyMessage.trim()) {
        throw new Error("Fill in the campaign brief: what you're promoting and what the post must say");
      }

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
        // Step 3: register the funded order
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
          campaign: {
            hashtag: CAMPAIGN_HASHTAG,
            targetViews: target,
            brief: {
              productName: brief.productName.trim(),
              keyMessage: brief.keyMessage.trim(),
              link: brief.link.trim() || undefined,
              mention: brief.mention.trim().replace(/^@/, "") || undefined,
            },
          },
        };
        setOrders((prev) => [newOrder, ...prev]);
        setIsFundModalOpen(false);
        setTxSuccessMessage(`Escrow vault created successfully with Order ID: ${pendingOrderId}`);
      }
    } catch (e) {
      setTxError(errMessage(e));
    } finally {
      setIsTransacting(false);
    }
  };

  const handleRunAiAudit = async (orderId: string, proofUrl: string) => {
    const ord = orders.find((o) => o.orderId === orderId);
    const inf = influencers.find((i) => i.evmAddress.toLowerCase() === ord?.influencerAddress.toLowerCase());
    setAuditingOrders((prev) => ({ ...prev, [orderId]: true }));
    setAuditError((prev) => ({ ...prev, [orderId]: "" }));

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: proofUrl,
          orderId,
          expectedHandle: inf?.handle,
          orderCreatedAt: ord?.createdAt,
          targetViews: ord?.campaign?.targetViews,
          // The campaign hashtag is preferred, not required (see REQUIRE_HASHTAG in /api/verify-release).
          requirements: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Audit failed");
      setAuditResults((prev) => ({ ...prev, [orderId]: data }));
    } catch (err: any) {
      setAuditError((prev) => ({ ...prev, [orderId]: err.message }));
    } finally {
      setAuditingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Payment is released only by the server, after it scans the creator's profile and proves the agreed reach.
  const handleVerifyAndRelease = async (orderId: string) => {
    setVerifyingOrders((prev) => ({ ...prev, [orderId]: true }));
    setVerifyError((prev) => ({ ...prev, [orderId]: "" }));
    try {
      const res = await fetch("/api/verify-release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");
      if (data.report) setAuditResults((prev) => ({ ...prev, [orderId]: data.report }));
      await reloadOrders();
      if (data.verification?.passed) setTxSuccessMessage(`${orderId}: ${data.verification.summary}`);
    } catch (err: any) {
      setVerifyError((prev) => ({ ...prev, [orderId]: err.message }));
    } finally {
      setVerifyingOrders((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Orders created before campaign terms existed: the advertiser records the agreed reach once.
  const handleSetLegacyTarget = (orderId: string) => {
    const target = Math.floor(Number(legacyTargets[orderId]));
    if (!(target > 0)) return;
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, campaign: { hashtag: CAMPAIGN_HASHTAG, targetViews: target } } : o))
    );
  };


  const handleConfirmDispute = () => {
    if (!disputeOrderId) return;
    setOrders((prev) =>
      prev.map((o) => (o.orderId === disputeOrderId ? { ...o, status: { type: "Disputed", reason: disputeReason || "Campaign terms violated" } } : o))
    );
    setDisputeOrderId(null);
    setDisputeReason("");
  };

  return (
    <div className="min-h-screen text-gray-100 flex flex-col bg-[#07090e]">
      <Navbar />

      <main className="max-w-[1400px] w-full mx-auto px-6 py-10 space-y-10 flex-1">
        {/* Bento Grid: Institutional High-Density Metrics with 3D Tilt */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ThreeDCard>
            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
              <div className="text-[11px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                ACTIVE ESCROW LIQUIDITY
              </div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                $148,250.00 <span className="text-sm font-normal text-cyan-400">USDC</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-medium">
                  <ArrowUpRight className="h-3 w-3" /> +14.2% this week
                </span>
                <span className="text-gray-500">· 100% On-Chain Protected</span>
              </div>
            </div>
          </ThreeDCard>

          <ThreeDCard>
            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
              <div className="text-[11px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                CRAWLER & COMPLIANCE VERIFICATION
              </div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400 tracking-tight tabular-nums">
                98.4% <span className="text-sm font-normal text-gray-400">Accuracy</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-medium">
                  <Zap className="h-3 w-3" /> Real-time public audit
                </span>
                <span className="text-gray-500">· Zero Manipulation</span>
              </div>
            </div>
          </ThreeDCard>

          <ThreeDCard>
            <div className="glass-panel p-6 rounded-xl border border-white/10 relative overflow-hidden group">
              <div className="text-[11px] uppercase font-mono tracking-wider text-gray-400 mb-2">
                PORTFOLIO ROMI MULTIPLIER
              </div>
              <div className="text-3xl font-extrabold font-mono text-cyan-300 tracking-tight tabular-nums">
                3.85x <span className="text-sm font-normal text-gray-400">Return</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 font-medium">
                  <ShieldCheck className="h-3 w-3" /> t-ECDSA Guarantee
                </span>
                <span className="text-gray-500">· Non-Custodial</span>
              </div>
            </div>
          </ThreeDCard>
        </section>

        {txSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              {txSuccessMessage}
            </span>
            <button onClick={() => setTxSuccessMessage(null)} className="text-emerald-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {txError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              {txError}
            </span>
            <button onClick={() => setTxError(null)} className="text-rose-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Big Data Analytics Visualizer */}
        <section>
          <AnalyticsVisualizer
            handle={inspectingInfluencer.handle}
            authenticityScore={100 - inspectingInfluencer.botScorePct * 8}
            botRiskPercent={inspectingInfluencer.botScorePct}
            romiMultiplier={3.8}
          />
        </section>

        {/* Section: Influencer Marketplace Discovery Engine */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase font-mono tracking-wider text-cyan-400">DISCOVERY & CONTRACTING</div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-400" />
                Verified Influencer Registry
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Filter by creator or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 w-64 font-sans"
                />
              </div>

              <select
                value={minFollowers}
                onChange={(e) => setMinFollowers(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-gray-300 focus:outline-none focus:border-cyan-400 font-mono"
              >
                <option value={0} className="bg-[#0c101a]">Any audience size</option>
                <option value={100000} className="bg-[#0c101a]">100K+ followers</option>
                <option value={250000} className="bg-[#0c101a]">250K+ followers</option>
                <option value={500000} className="bg-[#0c101a]">500K+ followers</option>
              </select>

              <Link
                href="/influencer"
                title="Creators join from Creator Studio with their own payout wallet"
                className="px-3.5 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 hover:bg-cyan-500/20 transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Creators join here
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredInfluencers.map((inf) => {
              const trustScore = 100 - inf.botScorePct * 8;
              const isInspecting = inspectingInfluencer.handle === inf.handle;

              return (
                <ThreeDCard key={`${inf.platform}:${inf.handle}`}>
                  <div
                    onClick={() => setInspectingInfluencer(inf)}
                    className={`glass-panel p-5 rounded-xl border transition-all cursor-pointer h-full flex flex-col justify-between ${
                      isInspecting
                        ? "border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-cyan-500/[0.03]"
                        : "border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-white tracking-tight flex items-center gap-1.5">
                            {inf.handle}
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                          </h3>
                          <span className="text-[11px] font-mono text-gray-400">
                            {inf.platform}
                            {inf.registered && (
                              <a
                                href={inf.registered.profileUrl}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="ml-2 text-emerald-400 hover:underline"
                                title={`Stats measured from ${inf.registered.postsSampled} recent posts on ${new Date(inf.registered.scannedAt).toLocaleString()}`}
                              >
                                scanned
                              </a>
                            )}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-gray-400">
                          {formatAddress(inf.evmAddress)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06] text-xs font-mono my-4">
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500">TRUST SCORE</div>
                          <div className="text-sm font-bold text-cyan-400 tabular-nums flex items-center gap-1.5 mt-0.5">
                            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                            {trustScore}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500">ENGAGEMENT</div>
                          <div className="text-sm font-bold text-white tabular-nums mt-0.5">
                            {(inf.engagementRateBps / 100).toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500">AUDIENCE</div>
                          <div className="text-xs font-semibold text-gray-300 tabular-nums mt-0.5">
                            {inf.followers ? inf.followers.toLocaleString("en-US") : "not public"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase tracking-wider text-gray-500">AVG VIEWS</div>
                          <div className="text-xs font-semibold text-gray-300 tabular-nums mt-0.5">
                            {inf.avgViews.toLocaleString("en-US")}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                      <div className="text-xs font-mono">
                        <span className="text-gray-500 text-[10px] block">STANDARD RATE</span>
                        <span className="font-bold text-white tabular-nums">$1,500 USDC</span>
                      </div>

                      {inf.registered && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remove ${inf.handle} from the registry?`)) removeInfluencer(inf);
                          }}
                          title="Remove from registry"
                          className="text-gray-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFundModal(inf);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all font-mono"
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
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase font-mono tracking-wider text-emerald-400">
                ACTIVE ESCROW CONTRACTS
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-400" />
                Campaign Deliverables & Settlement Pipeline
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orders.map((order) => {
              const isProofReady = order.status.type === "ProofSubmitted";
              const isApproved = order.status.type === "Approved";
              const isDisputed = order.status.type === "Disputed";
              const isAuditing = auditingOrders[order.orderId];
              const auditVerdict = auditResults[order.orderId];
              const liveUrl = (order.status as any).liveUrl;
              const canVerify = ["PaymentVerified", "Accepted", "ProofSubmitted"].includes(order.status.type);
              const isVerifying = verifyingOrders[order.orderId];

              return (
                <div
                  key={order.orderId}
                  className="glass-panel p-6 rounded-xl border border-white/10 space-y-4 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono px-2.5 py-1 rounded bg-white/[0.04] border border-white/10 text-gray-400">
                      ORDER ID: <span className="text-white font-semibold">{order.orderId}</span>
                    </span>
                    <span
                      className={`text-xs font-mono px-2.5 py-0.5 rounded border uppercase ${
                        isApproved
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : isDisputed
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : order.status.type === "Rejected"
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                          : isProofReady
                          ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                          : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      {order.status.type === "Rejected" ? "DECLINED BY CREATOR" : order.status.type}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 bg-white/[0.02] rounded-lg border border-white/[0.06] text-xs font-mono">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">LOCKED VALUE</div>
                      <div className="text-sm font-bold text-cyan-400 tabular-nums mt-0.5">
                        {formatUsdc(order.amountUsdcRaw)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">INFLUENCER</div>
                      <div className="text-xs font-semibold text-gray-300 mt-0.5">
                        {formatAddress(order.influencerAddress)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">EVM RECEIPT</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatAddress(order.evmTxHash)}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.06] text-xs font-mono space-y-2">
                    {order.campaign ? (
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-gray-400">
                          Pays when a post (ideally <span className="text-cyan-300">#{order.campaign.hashtag}</span>) reaches
                        </span>
                        <span className="text-white font-semibold tabular-nums">{order.campaign.targetViews.toLocaleString("en-US")} views</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-amber-300">No agreed reach yet.</span>
                        <input
                          type="number"
                          value={legacyTargets[order.orderId] ?? ""}
                          onChange={(e) => setLegacyTargets((prev) => ({ ...prev, [order.orderId]: e.target.value }))}
                          placeholder="Target views"
                          className="w-32 px-2 py-1 rounded bg-white/[0.04] border border-white/10 text-white focus:outline-none focus:border-cyan-400"
                        />
                        <button onClick={() => handleSetLegacyTarget(order.orderId)} className="px-2 py-1 rounded border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10">
                          Set
                        </button>
                      </div>
                    )}
                    {order.verification && <VerificationSummary v={order.verification} />}
                    {verifyError[order.orderId] && <div className="text-rose-400">{verifyError[order.orderId]}</div>}
                  </div>

                  {isProofReady && (
                    <div className="p-4 bg-black/40 rounded-lg border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-mono text-gray-400">Live deliverable proof:</div>
                        <button
                          onClick={() => handleRunAiAudit(order.orderId, liveUrl)}
                          disabled={isAuditing}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1.5 hover:bg-cyan-500/20 transition-all"
                        >
                          <Radar className={`h-3.5 w-3.5 ${isAuditing ? "animate-spin" : ""}`} />
                          {isAuditing ? "Crawling post..." : auditVerdict ? "Re-run crawler" : "Run crawler audit"}
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

                      {auditError[order.orderId] && (
                        <div className="text-xs text-rose-400 font-mono">{auditError[order.orderId]}</div>
                      )}
                      {auditVerdict && <AuditReport report={auditVerdict} compact />}
                    </div>
                  )}

                  {isDisputed && (
                    <div className="p-3 rounded-lg bg-rose-500/[0.08] border border-rose-500/30 text-xs font-mono text-rose-300">
                      Dispute Reason: {(order.status as any).reason || "Under review"}
                    </div>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                    {/* Unilateral Timeout Refund Action */}
                    {!isApproved && (
                      <button
                        onClick={() => handleClaimRefund(order.orderId)}
                        className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.08] text-xs font-mono flex items-center gap-1.5 transition-all"
                        title="If content was unfulfilled and 7-day timelock has expired, reclaim 100% of USDC"
                      >
                        <RotateCcw className="h-3.5 w-3.5 text-gray-400" />
                        Timelock Refund
                      </button>
                    )}

                    {/* Dispute Deliverable Button */}
                    {isProofReady && !isApproved && !isDisputed && (
                      <button
                        onClick={() => setDisputeOrderId(order.orderId)}
                        className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-mono flex items-center gap-1.5 transition-all"
                      >
                        <AlertOctagon className="h-3.5 w-3.5 text-rose-400" />
                        Dispute Proof
                      </button>
                    )}

                    {canVerify && (
                      <button
                        onClick={() => handleVerifyAndRelease(order.orderId)}
                        disabled={isVerifying || !order.campaign}
                        title={`Scans the creator's posts since the deposit (#${order.campaign?.hashtag ?? CAMPAIGN_HASHTAG} first) and releases payment only if the agreed reach is proven`}
                        className="px-5 py-2 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all font-mono flex items-center gap-2"
                      >
                        {isVerifying ? <Radar className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {isVerifying ? "Scanning profile..." : "Scan Posts & Release"}
                      </button>
                    )}

                    {isApproved && (
                      <div className="text-xs text-emerald-400 font-mono flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Reach verified, release voucher signed. Creator can claim on-chain.
                      </div>
                    )}

                    {order.status.type === "Rejected" && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs space-y-2 text-rose-300 font-sans">
                        <div className="font-semibold font-mono flex items-center gap-1.5 text-rose-400">
                          <X className="h-4 w-4" /> Creator Declined Campaign Offer
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {order.status.reason || "The creator chose not to accept this task."} Your {formatUsdc(order.amountUsdcRaw)} locked in escrow can be refunded.
                        </div>
                        <button
                          onClick={() => handleClaimRefund(order.orderId)}
                          disabled={reclaimingOrders[order.orderId]}
                          className="px-3 py-1.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-semibold"
                        >
                          {reclaimingOrders[order.orderId] ? "Processing..." : "Reclaim Escrowed Funds"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Escrow Deposit Modal */}
      {isFundModalOpen && selectedInfluencer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-lg my-auto max-h-[92vh] flex flex-col">
            <LaserBeamBorder glowColor="cyan" className="max-h-[90vh] flex flex-col">
              <div className="p-5 sm:p-7 space-y-5 overflow-y-auto max-h-[85vh] pr-2 scrollbar-thin scrollbar-thumb-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">Smart Escrow Vault Deposit</h3>
                      <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                        MULTI-STAGE CRYPTOGRAPHIC LOCK
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsFundModalOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Progress Step Sequencer */}
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono font-semibold">
                  <div
                    className={`p-2 rounded-lg border ${
                      fundStep >= 1
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                        : "bg-white/[0.02] border-white/10 text-gray-500"
                    }`}
                  >
                    1. AUTHORIZE USDC
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      fundStep >= 2
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                        : "bg-white/[0.02] border-white/10 text-gray-500"
                    }`}
                  >
                    2. LOCK ON EVM
                  </div>
                  <div
                    className={`p-2 rounded-lg border ${
                      fundStep >= 3
                        ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                        : "bg-white/[0.02] border-white/10 text-gray-500"
                    }`}
                  >
                    3. CANISTER SYNC
                  </div>
                </div>

                {/* Same-Device & Wallet Status Check */}
                {!address ? (
                  <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-xs space-y-2">
                    <div className="text-cyan-300 font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4" /> Wallet Not Connected
                    </div>
                    <div className="text-gray-400 text-[11px]">
                      Connect your wallet to approve USDC and lock funds in smart escrow.
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => connect()}
                        className="px-3 py-1.5 rounded bg-cyan-500 text-gray-950 text-xs font-semibold hover:bg-cyan-400 font-mono"
                      >
                        Connect Wallet
                      </button>
                      {CHAIN.chainId === 31337 && (
                        <button
                          type="button"
                          onClick={() => connectDevAccount("account-0")}
                          className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-cyan-300 text-xs font-mono border border-cyan-500/30"
                        >
                          Use Dev Advertiser (#0)
                        </button>
                      )}
                    </div>
                  </div>
                ) : address.toLowerCase() === selectedInfluencer.evmAddress.toLowerCase() ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs space-y-1.5 text-amber-300">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> Same Device: Creator Wallet Connected
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Your current wallet is the beneficiary creator&apos;s address ({formatAddress(address)}). The escrow contract prohibits self-dealing. Switch to an advertiser account to fund.
                    </div>
                    {CHAIN.chainId === 31337 && (
                      <button
                        type="button"
                        onClick={() => connectDevAccount("account-0")}
                        className="mt-1 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 text-xs font-mono font-semibold"
                      >
                        Switch to Advertiser Account #0
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] font-mono px-3 py-2 bg-white/[0.02] rounded-lg border border-white/[0.06] text-gray-400">
                    <div>
                      Payer: <span className="text-gray-200 font-semibold">{formatAddress(address)}</span>
                      {usdcBalance !== null && (
                        <span className="ml-2 text-cyan-300 font-semibold">
                          ({(Number(usdcBalance) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC)
                        </span>
                      )}
                    </div>
                    {CHAIN.chainId === 31337 && (
                      <button
                        type="button"
                        onClick={() => requestFaucet()}
                        className="text-[10px] text-cyan-400 hover:underline"
                      >
                        +Claim 10k USDC
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-4 font-mono">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      BENEFICIARY CREATOR
                    </label>
                    <div className="mt-1 p-3 bg-white/[0.03] rounded-lg border border-white/10 flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{selectedInfluencer.handle}</span>
                      <span className="text-gray-400 text-[11px]">
                        {formatAddress(selectedInfluencer.evmAddress)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      ESCROW VALUE (USDC)
                    </label>
                    <div className="relative mt-1">
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={fundStep > 1}
                        className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white font-mono text-lg focus:outline-none focus:border-cyan-400 tabular-nums"
                        placeholder="2400"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-bold">
                        USDC
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      CAMPAIGN BRIEF (THE CREATOR&apos;S SCRIPTS ARE WRITTEN FROM THIS)
                    </label>
                    <input
                      value={brief.productName}
                      onChange={(e) => setBrief((b) => ({ ...b, productName: e.target.value }))}
                      disabled={fundStep > 1}
                      placeholder="What you're promoting, e.g. Acme Wallet"
                      className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                    />
                    <textarea
                      value={brief.keyMessage}
                      onChange={(e) => setBrief((b) => ({ ...b, keyMessage: e.target.value }))}
                      disabled={fundStep > 1}
                      placeholder={"What the post must say, one point per line, e.g.\nSelf-custody in 30 seconds\nNo seed phrase to lose"}
                      className="w-full h-20 px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={brief.link}
                        onChange={(e) => setBrief((b) => ({ ...b, link: e.target.value }))}
                        disabled={fundStep > 1}
                        placeholder="Link (optional)"
                        className="px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                      />
                      <input
                        value={brief.mention}
                        onChange={(e) => setBrief((b) => ({ ...b, mention: e.target.value }))}
                        disabled={fundStep > 1}
                        placeholder="@account to tag (optional)"
                        className="px-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400 font-sans"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                      AGREED REACH (VIEWS ON ONE POST)
                    </label>
                    <input
                      type="number"
                      value={targetViews}
                      onChange={(e) => setTargetViews(e.target.value)}
                      disabled={fundStep > 1}
                      className="mt-1 w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-cyan-400 tabular-nums"
                      placeholder="10000"
                    />
                    <p className="mt-1 text-[10px] text-gray-500 font-sans">
                      Payment releases only when a post by the creator published after this deposit (ideally tagged #{CAMPAIGN_HASHTAG}) shows
                      at least this many public views. Their median is {selectedInfluencer.avgViews.toLocaleString("en-US")}.
                    </p>
                  </div>

                  <div className="p-3 bg-white/[0.02] rounded-lg border border-white/10 text-xs text-gray-400 space-y-1">
                    <div className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                      <Clock className="h-3.5 w-3.5" /> 7-DAY UNILATERAL REFUND TIMELOCK
                    </div>
                    <p className="text-[11px] leading-relaxed font-sans">
                      Funds remain locked under smart contract guarantee. If milestones are unfulfilled, 
                      reclaim 100% of your funds unilaterally on Ethereum.
                    </p>
                  </div>

                  {txSuccessHash && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                      <div className="font-bold">EVM Deposit Mined Successfully:</div>
                      <div className="break-all text-[11px] text-emerald-400 font-mono">{txSuccessHash}</div>
                    </div>
                  )}
                </div>

                {txError && (
                  <div className="text-[11px] font-mono text-rose-400 break-words border border-rose-500/30 rounded-lg p-2 bg-rose-500/10">
                    {txError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setIsFundModalOpen(false)}
                    className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  {!address ? (
                    <button
                      onClick={() => (CHAIN.chainId === 31337 ? connectDevAccount("account-0") : connect())}
                      className="px-6 py-2.5 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] font-mono"
                    >
                      Connect Wallet to Deposit
                    </button>
                  ) : (
                    <button
                      disabled={isTransacting}
                      onClick={handleNextFundingStep}
                      className="px-6 py-2.5 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] disabled:opacity-50 transition-all font-mono flex items-center gap-2"
                    >
                      {isTransacting ? (
                        <>
                          <span className="h-3.5 w-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
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
                  )}
                </div>
              </div>
            </LaserBeamBorder>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeOrderId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[90vh] overflow-y-auto glass-panel p-6 rounded-2xl border border-rose-500/40 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-rose-400" />
                Dispute Campaign Deliverable
              </h3>
              <button onClick={() => setDisputeOrderId(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed font-sans">
              Raising a dispute flags this order on the settlement engine, halting automatic payouts until manual resolution or timeout.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-300">Dispute Reason / Defect</label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="e.g. Mandatory hashtags missing, audio cut off, or incorrect product URL."
                className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400 h-24 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDisputeOrderId(null)}
                className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispute}
                className="px-5 py-2 rounded-lg bg-rose-500 text-white font-semibold text-xs tracking-wide hover:bg-rose-400 font-mono"
              >
                Confirm Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VerificationSummary({ v }: { v: VerificationResult }) {
  return (
    <div className={`pt-2 border-t border-white/[0.06] space-y-1 ${v.passed ? "text-emerald-300" : "text-amber-300"}`}>
      <div className="flex items-center gap-1.5">
        {v.passed ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
        <span className="break-words">{v.summary}</span>
      </div>
      <div className="text-[10px] text-gray-500">
        Scanned {v.postsScanned} posts, {v.matchingPosts} tagged · {new Date(v.checkedAt).toLocaleString("en-US")}
        {v.bestPost && (
          <>
            {" · "}
            <a href={v.bestPost.url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
              {v.bestPost.views === null ? "post" : `${v.bestPost.views.toLocaleString("en-US")} actual views`}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
