"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Kanban,
  Send,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Wallet,
  Clock,
  Sparkles,
  Bot,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
  ShieldAlert,
  X,
  FileCheck,
  Flame,
  RefreshCw,
  Share2,
  CheckCircle2,
  TrendingUp,
  SlidersHorizontal,
  Edit3,
} from "lucide-react";
import { Order } from "@/lib/icp-agent";
import { formatAddress, formatUsdc } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { useWallet } from "@/components/web3/WalletProvider";
import { useOrders } from "@/lib/orders";
import { useInfluencers } from "@/lib/influencers";
import type { DraftBasis, DraftVariation } from "@/lib/ai/compose";
import { errMessage, releaseWithProof, CHAIN, LOCAL_DEV_ACCOUNTS } from "@/lib/chain";
import { ThreeDCard } from "@/components/ui/ThreeDCard";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";

export default function InfluencerPortal() {
  const [allOrders, setOrders] = useOrders();
  const { signer, address, connect, connectDevAccount, connecting, refreshBalance, ready } = useWallet();
  const { influencers, loaded } = useInfluencers();
  const router = useRouter();

  // Match creator profile by connected wallet address
  const myCreatorProfile = address
    ? influencers.find((i) => i.evmAddress.toLowerCase() === address.toLowerCase()) ?? null
    : null;

  // Selected creator filter for same-device multi-role testing
  const [selectedCreatorAddr, setSelectedCreatorAddr] = useState<string>("all");

  const effectiveFilter =
    selectedCreatorAddr !== "all"
      ? selectedCreatorAddr
      : myCreatorProfile
      ? myCreatorProfile.evmAddress.toLowerCase()
      : "all";

  // Filter orders by active viewing creator or show all
  const orders =
    effectiveFilter === "all"
      ? allOrders
      : allOrders.filter((o) => o.influencerAddress.toLowerCase() === effectiveFilter.toLowerCase());

  const me =
    (effectiveFilter !== "all"
      ? influencers.find((i) => i.evmAddress.toLowerCase() === effectiveFilter.toLowerCase())
      : null) || myCreatorProfile;

  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [liveUrl, setLiveUrl] = useState("");
  const [platform, setPlatform] = useState("X / Twitter");
  const [claimedOrders, setClaimedOrders] = useState<Record<string, boolean>>({});

  // Gen AI Draft Generator State
  const [isAiDraftOpen, setIsAiDraftOpen] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [draftVariations, setDraftVariations] = useState<DraftVariation[]>([]);
  const [draftBasis, setDraftBasis] = useState<DraftBasis | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>("default");
  const [customAiPrompt, setCustomAiPrompt] = useState<string>("");
  const [editableDrafts, setEditableDrafts] = useState<Record<string, { hook: string; body: string }>>({});

  // Categorize orders for Kanban columns
  const paymentVerifiedOrders = orders.filter((o) => o.status.type === "PaymentVerified");
  const inProgressOrders = orders.filter((o) => o.status.type === "Accepted");
  const proofSubmittedOrders = orders.filter((o) => o.status.type === "ProofSubmitted");
  const approvedOrders = orders.filter((o) => o.status.type === "Approved" || o.status.type === "Settled");
  const rejectedOrders = orders.filter((o) => o.status.type === "Rejected");

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Accepted" } } : o))
    );
  };

  const handleRejectOrder = (orderId: string, reason = "Declined by creator") => {
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Rejected", reason } } : o))
    );
  };

  const handleOpenSubmitDrawer = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsSubmitOpen(true);
  };

  const handleSubmitProofOfWork = (e: React.FormEvent) => {
    e.preventDefault();
    if (!liveUrl) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === selectedOrderId
          ? {
              ...o,
              status: {
                type: "ProofSubmitted",
                liveUrl,
                platform,
                submittedAt: Date.now(),
              },
            }
          : o
      )
    );

    setIsSubmitOpen(false);
    setLiveUrl("");
  };

  const handleClaimSettlement = async (orderId: string) => {
    const ord = orders.find((o) => o.orderId === orderId);
    if (!ord) return;
    setClaimError(null);
    setClaimSuccess(null);

    let txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    if (ord.onChain) {
      try {
        if (!ord.signature) throw new Error("Awaiting advertiser approval signature");
        const s = signer ?? (await connect());
        if (!s) throw new Error("Connect your wallet first");
        txHash = await releaseWithProof(s, ord.orderId, ord.nonce, ord.signature);
        refreshBalance();
        setClaimSuccess(`Payout claimed successfully! EVM Tx: ${txHash}`);
      } catch (e) {
        setClaimError(errMessage(e));
        return;
      }
    }

    setClaimedOrders((prev) => ({ ...prev, [orderId]: true }));
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Settled", txHash } } : o)));
  };

  const handleGenerateAiDrafts = async (orderId?: string, overrideTone?: string, overridePrompt?: string) => {
    const oid = orderId || selectedOrderId;
    if (!oid) return;
    setSelectedOrderId(oid);
    setIsAiDraftOpen(true);
    setIsGeneratingDrafts(true);
    setDraftError(null);

    const toneToUse = overrideTone !== undefined ? overrideTone : selectedTone;
    if (overrideTone !== undefined) setSelectedTone(overrideTone);

    const promptToUse = overridePrompt !== undefined ? overridePrompt : customAiPrompt;

    try {
      const res = await fetch("/api/ai/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: oid,
          tone: toneToUse,
          customInstructions: promptToUse.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Script generation failed");
      setDraftVariations(data.variations);
      setDraftBasis(data.basis);

      const initialEdits: Record<string, { hook: string; body: string }> = {};
      data.variations.forEach((v: DraftVariation) => {
        initialEdits[v.id] = { hook: v.hook, body: v.body };
      });
      setEditableDrafts(initialEdits);
    } catch (err: any) {
      setDraftError(err.message);
    } finally {
      setIsGeneratingDrafts(false);
    }
  };

  const handleSwapHook = (draftId: string, newHook: string) => {
    setEditableDrafts((prev) => ({
      ...prev,
      [draftId]: { ...prev[draftId], hook: newHook },
    }));
  };

  const handleUpdateText = (draftId: string, field: "hook" | "body", value: string) => {
    setEditableDrafts((prev) => ({
      ...prev,
      [draftId]: { ...prev[draftId], [field]: value },
    }));
  };

  const handlePostToTwitter = (hook: string, body: string, hashtags: string[]) => {
    const fullText = `${hook}\n\n${body}\n\n${hashtags.join(" ")}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`, "_blank");
  };

  const handleCopyDraft = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  if (!ready || !loaded) {
    return (
      <div className="min-h-screen text-gray-100 flex flex-col bg-[#07090e]">
        <Navbar />
        <main className="max-w-[560px] w-full mx-auto px-6 py-20 text-center space-y-5 flex-1">
          <p className="text-sm font-mono text-cyan-400">Loading Creator Studio...</p>
        </main>
      </div>
    );
  }

  const activeDisplayCreator =
    me ||
    (selectedCreatorAddr !== "all"
      ? influencers.find((i) => i.evmAddress.toLowerCase() === selectedCreatorAddr.toLowerCase())
      : influencers[0]) ||
    influencers[0];

  const totalSecuredValue = orders.reduce(
    (sum, o) => sum + (o.status.type !== "Settled" && o.status.type !== "Rejected" ? o.amountUsdcRaw : 0),
    0
  );

  return (
    <div className="min-h-screen text-gray-100 flex flex-col bg-[#07090e]">
      <Navbar />

      <main className="max-w-[1440px] w-full mx-auto px-6 py-10 space-y-10 flex-1">
        {/* Creator Identity & Settlement Vault Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-emerald-500/20 to-cyan-500/10 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 text-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              {(activeDisplayCreator?.handle ?? "@creator").charAt(1).toUpperCase()}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  {activeDisplayCreator?.handle ?? "Creator Studio"}
                </h1>
                {activeDisplayCreator?.registered ? (
                  <Link
                    href="/influencer/onboarding"
                    className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1"
                    title="Account and payout wallet verified. Click to update registration."
                  >
                    <CheckCircle className="h-3 w-3" /> VERIFIED · {activeDisplayCreator.platform}
                  </Link>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> SIMULATED · {activeDisplayCreator?.platform ?? "Web3"}
                  </span>
                )}

                {/* Creator Filter for Same-Device Testing */}
                <div className="flex items-center gap-1.5 ml-2">
                  <span className="text-[10px] uppercase font-mono text-gray-500">View tasks for:</span>
                  <select
                    value={selectedCreatorAddr}
                    onChange={(e) => setSelectedCreatorAddr(e.target.value)}
                    className="px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all" className="bg-[#0b0f19] text-gray-200">
                      All Creators ({allOrders.length} tasks)
                    </option>
                    {influencers.map((inf) => (
                      <option key={inf.evmAddress} value={inf.evmAddress.toLowerCase()} className="bg-[#0b0f19] text-gray-200">
                        {inf.handle} ({formatAddress(inf.evmAddress)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs font-mono text-gray-400 flex flex-wrap items-center gap-3">
                {activeDisplayCreator ? (
                  <>
                    <span title={activeDisplayCreator.evmAddress}>
                      PAYOUT WALLET: {formatAddress(activeDisplayCreator.evmAddress)}
                    </span>
                    <span>·</span>
                    <span>
                      AUDIENCE: {activeDisplayCreator.followers ? activeDisplayCreator.followers.toLocaleString("en-US") : "not public"}
                    </span>
                    <span>·</span>
                    <span>MEDIAN VIEWS: {activeDisplayCreator.avgViews.toLocaleString("en-US")}</span>
                  </>
                ) : (
                  <span>Register with your wallet to receive escrow payments.</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">SECURED ESCROW BALANCE</div>
              <div className="text-2xl font-bold text-white tabular-nums tracking-tight mt-0.5">
                {formatUsdc(totalSecuredValue)}
              </div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">PAYMENT PROTECTION</div>
              <div className="text-2xl font-bold text-emerald-400 tracking-tight mt-0.5">
                t-ECDSA <span className="text-xs font-normal text-gray-400 font-sans">ICP</span>
              </div>
            </div>
          </div>
        </div>



        {claimSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              {claimSuccess}
            </span>
            <button onClick={() => setClaimSuccess(null)} className="text-emerald-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {claimError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between">
            <span>{claimError}</span>
            <button onClick={() => setClaimError(null)} className="text-rose-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Kanban Board */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] uppercase font-mono tracking-wider text-cyan-400">
                LIFECYCLE PIPELINE
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Kanban className="h-5 w-5 text-cyan-400" />
                Active Campaigns & Milestone Escrow
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {/* Column 1: Escrow Secured */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-cyan-400 font-semibold tracking-wide">1. FUNDED IN ESCROW</span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold">
                  {paymentVerifiedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[420px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                {paymentVerifiedOrders.map((ord) => (
                  <ThreeDCard key={ord.orderId}>
                    <div className="glass-panel p-4 rounded-lg border border-white/10 space-y-3 hover:border-cyan-500/30 transition-all">
                      <div className="flex justify-between items-start font-mono">
                        <span className="text-xs text-gray-300 font-semibold">{ord.orderId}</span>
                        <span className="text-xs text-cyan-400 font-bold tabular-nums">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>

                      {ord.campaign && (
                        <div className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs font-sans space-y-1.5">
                          {ord.campaign.brief?.productName && (
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                Campaign
                              </span>
                              <span className="truncate">{ord.campaign.brief.productName}</span>
                            </div>
                          )}
                          {ord.campaign.brief?.keyMessage && (
                            <div className="text-[11px] text-gray-300 line-clamp-2">
                              {ord.campaign.brief.keyMessage}
                            </div>
                          )}
                          <div className="text-[10px] font-mono text-gray-400 pt-1 flex items-center justify-between border-t border-white/[0.04]">
                            <span>Reach: <b className="text-cyan-300">{ord.campaign.targetViews.toLocaleString("en-US")} views</b></span>
                            <span className="text-gray-500">#{ord.campaign.hashtag}</span>
                          </div>
                        </div>
                      )}

                      <div className="text-[11px] text-gray-400 leading-relaxed font-sans">
                        Advertiser escrow funded. Review terms and accept or decline.
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptOrder(ord.orderId)}
                          className="flex-1 py-2 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all font-mono flex items-center justify-center gap-1.5"
                        >
                          <Check className="h-3.5 w-3.5" /> Accept Task
                        </button>
                        <button
                          onClick={() => handleRejectOrder(ord.orderId)}
                          className="px-3 py-2 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold uppercase transition-all font-mono"
                          title="Decline this campaign task"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-amber-400 font-semibold tracking-wide">2. WORK IN PROGRESS</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                  {inProgressOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[420px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                {inProgressOrders.map((ord) => (
                  <ThreeDCard key={ord.orderId}>
                    <div className="glass-panel p-4 rounded-lg border border-white/10 space-y-3 hover:border-amber-500/30 transition-all">
                      <div className="flex justify-between items-start font-mono">
                        <span className="text-xs text-gray-300 font-semibold">{ord.orderId}</span>
                        <span className="text-xs text-amber-400 font-bold tabular-nums">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-400 leading-relaxed font-sans">
                        Order accepted. Create content and submit live URL for crawler audit.
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
                        <button
                          onClick={() => handleGenerateAiDrafts(ord.orderId)}
                          className="w-full py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-cyan-300 hover:bg-cyan-500/10 text-xs font-mono flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Sparkles className="h-3 w-3" />
                          AI Script Generator
                        </button>
                        <button
                          onClick={() => handleOpenSubmitDrawer(ord.orderId)}
                          className="w-full py-2 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 transition-all font-mono"
                        >
                          Submit Proof
                        </button>
                      </div>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            </div>

            {/* Column 3: Proof Submitted */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-purple-400 font-semibold tracking-wide">3. AUDIT PENDING</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                  {proofSubmittedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[420px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                {proofSubmittedOrders.map((ord) => {
                  const proof = ord.status as any;
                  return (
                    <ThreeDCard key={ord.orderId}>
                      <div className="glass-panel p-4 rounded-lg border border-white/10 space-y-3 hover:border-purple-500/30 transition-all">
                        <div className="flex justify-between items-start font-mono">
                          <span className="text-xs text-gray-300 font-semibold">{ord.orderId}</span>
                          <span className="text-xs text-purple-400 font-bold tabular-nums">
                            {formatUsdc(ord.amountUsdcRaw)}
                          </span>
                        </div>

                        <div className="p-2.5 rounded bg-black/40 border border-white/10 text-xs font-mono space-y-1">
                          <div className="text-[10px] text-gray-400 uppercase">SUBMITTED URL</div>
                          <a
                            href={proof.liveUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline flex items-center gap-1 truncate"
                          >
                            {proof.liveUrl}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>

                        <div className="text-xs text-gray-400 font-mono flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                          Under review by advertiser
                        </div>
                      </div>
                    </ThreeDCard>
                  );
                })}
              </div>
            </div>

            {/* Column 4: Approved & Settled */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-emerald-400 font-semibold tracking-wide">4. SETTLEMENT READY</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                  {approvedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[420px] p-3 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                {approvedOrders.map((ord) => {
                  const isSettled = ord.status.type === "Settled";
                  return (
                    <ThreeDCard key={ord.orderId}>
                      <div className="glass-panel p-4 rounded-lg border border-white/10 space-y-3 hover:border-emerald-500/30 transition-all">
                        <div className="flex justify-between items-start font-mono">
                          <span className="text-xs text-gray-300 font-semibold">{ord.orderId}</span>
                          <span className="text-xs text-emerald-400 font-bold tabular-nums">
                            {formatUsdc(ord.amountUsdcRaw)}
                          </span>
                        </div>

                        <div className="text-xs text-gray-300 font-sans">
                          {isSettled
                            ? "Payout settled and transferred directly to your EVM wallet."
                            : "Voucher signed via t-ECDSA. Claim payment on Ethereum."}
                        </div>

                        <div className="pt-2 border-t border-white/[0.06]">
                          {isSettled ? (
                            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle className="h-3.5 w-3.5" /> Payout Settled
                            </div>
                          ) : (
                            <button
                              onClick={() => handleClaimSettlement(ord.orderId)}
                              className="w-full py-2 rounded-lg bg-emerald-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all font-mono"
                            >
                              Claim Escrow Payout
                            </button>
                          )}
                        </div>
                      </div>
                    </ThreeDCard>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Proof Submission Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto max-h-[88vh] overflow-y-auto glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-cyan-400" />
                Submit Proof of Deliverable
              </h3>
              <button onClick={() => setIsSubmitOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProofOfWork} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-gray-300">Social Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                >
                  <option value="X / Twitter" className="bg-[#0c101a]">X / Twitter</option>
                  <option value="YouTube" className="bg-[#0c101a]">YouTube</option>
                  <option value="Instagram" className="bg-[#0c101a]">Instagram</option>
                  <option value="TikTok" className="bg-[#0c101a]">TikTok</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono text-gray-300">Public Live Post URL</label>
                <input
                  type="url"
                  required
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  placeholder="https://x.com/creator/status/1234567890"
                  className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSubmitOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 transition-all font-mono"
                >
                  Submit for Audit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced AI Content Studio & Script Generator Modal */}
      {isAiDraftOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-auto max-h-[90vh] overflow-y-auto glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 space-y-6 custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    Neural Gen-AI Script Studio
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-normal">
                      v2.5 Dynamic Engine
                    </span>
                  </h3>
                </div>
                <p className="text-xs text-gray-400 font-sans">
                  Generate, modulate, and customize sponsor deliverables from the campaign brief.
                </p>
              </div>
              <button onClick={() => setIsAiDraftOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Interactive Tone Persona Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3 w-3 text-cyan-400" />
                  Select Content Persona & Tone:
                </label>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> FTC Compliance & #ad Auto-Enforced
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "default", label: "✨ Creator Voice", desc: "Organic cadence" },
                  { id: "hype", label: "🔥 High-Energy Hype", desc: "Bold, viral, FOMO" },
                  { id: "technical", label: "🧠 Technical Alpha", desc: "Smart contracts & proof" },
                  { id: "story", label: "📖 Storytelling", desc: "First-person narrative" },
                  { id: "contrarian", label: "⚡ Contrarian Take", desc: "Pattern interrupt" },
                  { id: "minimalist", label: "✂️ Minimalist", desc: "Ultra-punchy (<30 words)" },
                ].map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    disabled={isGeneratingDrafts}
                    onClick={() => handleGenerateAiDrafts(selectedOrderId, tone.id)}
                    className={`px-3 py-2 rounded-lg border text-left transition-all font-mono ${
                      selectedTone === tone.id
                        ? "bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                        : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="text-xs font-semibold">{tone.label}</div>
                    <div className="text-[10px] text-gray-500">{tone.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom AI Refinement Prompt Bar */}
            <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl space-y-2">
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Edit3 className="h-3 w-3 text-cyan-400" />
                Refine with Custom Prompt (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customAiPrompt}
                  onChange={(e) => setCustomAiPrompt(e.target.value)}
                  placeholder="e.g. 'Emphasize the zero invoice chasing', 'Make it humorous', 'Tailor for mobile feeds'..."
                  className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-sans"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isGeneratingDrafts) {
                      e.preventDefault();
                      handleGenerateAiDrafts(selectedOrderId, selectedTone, customAiPrompt);
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={isGeneratingDrafts}
                  onClick={() => handleGenerateAiDrafts(selectedOrderId, selectedTone, customAiPrompt)}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:from-cyan-400 hover:to-emerald-400 transition-all font-mono flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {isGeneratingDrafts ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {isGeneratingDrafts ? "Thinking..." : "Refine"}
                </button>
              </div>
            </div>

            {/* Generation Results */}
            {isGeneratingDrafts ? (
              <div className="py-14 text-center space-y-3 font-mono text-xs text-cyan-400">
                <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="font-semibold">Synthesizing personalized script variations...</div>
                <div className="text-[11px] text-gray-500">
                  Measuring vocabulary entropy, reading campaign brief, and tailoring hook velocity.
                </div>
              </div>
            ) : draftVariations.length === 0 ? (
              <div className="py-8 text-center text-xs text-rose-400 font-mono">
                {draftError ?? "No scripts generated. Click a tone above to generate."}
              </div>
            ) : (
              <div className="space-y-5">
                {draftBasis && (
                  <div className="p-4 rounded-xl bg-cyan-500/[0.05] border border-cyan-500/20 text-xs space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-cyan-400">
                      <span>Neural Engine Metadata & Brief Basis</span>
                      <span className="text-gray-400">
                        {draftBasis.writer === "llm" ? `Model: ${draftBasis.model ?? "Gemini"}` : "Enhanced Dynamic Engine"}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      <span className="text-white font-semibold">Content:</span> {draftBasis.brief.productName}: {draftBasis.brief.keyMessage}
                    </div>
                    <div className="text-gray-300">
                      <span className="text-white font-semibold">Voice Model:</span>{" "}
                      {draftBasis.styleSource === "posts"
                        ? `calibrated from ${draftBasis.postsAnalyzed} recent posts`
                        : draftBasis.styleSource === "niche"
                        ? `the ${draftBasis.niche} niche cadence`
                        : "calibrated neutral"}
                      {draftBasis.activeTone && draftBasis.activeTone !== "default" && (
                        <span className="text-cyan-300 font-mono font-semibold ml-1">
                          · Tone: {draftBasis.activeTone}
                        </span>
                      )}
                    </div>
                    {draftBasis.note && <div className="text-amber-300 text-[11px] font-mono">{draftBasis.note}</div>}
                  </div>
                )}

                {/* Script Variation Cards */}
                {draftVariations.map((draft, idx) => {
                  const currentHook = editableDrafts[draft.id]?.hook ?? draft.hook;
                  const currentBody = editableDrafts[draft.id]?.body ?? draft.body;
                  const charCount = (currentHook + "\n\n" + currentBody).length;

                  return (
                    <div
                      key={draft.id}
                      className="p-5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4 hover:border-cyan-500/30 transition-all"
                    >
                      {/* Top Bar of Script Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                            {draft.label}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5" />
                            Viral Score: {draft.estimatedScore ?? 92}/100
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-gray-300 border border-white/10">
                            {draft.hookStrength ?? "Viral Hook"}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500">
                            ~{draft.readTimeSeconds ?? 18}s read · {charCount} chars
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 font-mono text-xs shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePostToTwitter(currentHook, currentBody, draft.hashtags)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 text-[#1d9bf0] hover:bg-[#1d9bf0]/20 transition-all text-xs"
                            title="Open X / Twitter compose window with this script"
                          >
                            <Share2 className="h-3 w-3" />
                            Post to X
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyDraft(`${currentHook}\n\n${currentBody}\n\n${draft.hashtags.join(" ")}`, draft.id)
                            }
                            className="flex items-center gap-1 px-3 py-1.5 rounded bg-white/[0.04] border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all text-xs"
                          >
                            {copiedDraftId === draft.id ? (
                              <Check className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedDraftId === draft.id ? "Copied" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Alternate Hook Swapper */}
                      {draft.alternateHooks && draft.alternateHooks.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                            <Flame className="h-3 w-3 text-amber-400" /> Swap Hook Angle:
                          </label>
                          <select
                            onChange={(e) => handleSwapHook(draft.id, e.target.value)}
                            value={currentHook}
                            className="w-full text-xs font-mono rounded bg-white/[0.04] border border-white/10 px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-cyan-400"
                          >
                            <option value={draft.hook} className="bg-[#0c101a]">
                              Default: "{draft.hook.slice(0, 70)}..."
                            </option>
                            {draft.alternateHooks.map((alt, i) => (
                              <option key={i} value={alt} className="bg-[#0c101a]">
                                Alt {i + 1}: "{alt.slice(0, 70)}..."
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Editable Hook Field */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                          Hook (Opening Line):
                        </label>
                        <input
                          type="text"
                          value={currentHook}
                          onChange={(e) => handleUpdateText(draft.id, "hook", e.target.value)}
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-cyan-400 font-sans"
                        />
                      </div>

                      {/* Editable Body Field */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                          Script Body:
                        </label>
                        <textarea
                          rows={draft.format === "thread" ? 7 : 4}
                          value={currentBody}
                          onChange={(e) => handleUpdateText(draft.id, "body", e.target.value)}
                          className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-gray-200 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed custom-scrollbar"
                        />
                      </div>

                      {/* Hashtags and Disclosure */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {draft.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Strategy Rationale */}
                      <div className="text-[11px] font-mono text-gray-500 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <span>Strategy: {draft.toneRationale}</span>
                        <span className="text-[10px] text-emerald-400/80">FTC Disclosed</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
