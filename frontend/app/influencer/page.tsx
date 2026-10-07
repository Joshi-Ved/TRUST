"use client";

import { useState } from "react";
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
  TrendingUp,
  AlertCircle,
  Layers,
  ArrowRight,
} from "lucide-react";
import { INITIAL_ORDERS, Order } from "@/lib/icp-agent";
import { formatAddress, formatUsdc } from "@/lib/utils";
import { TerminalHeader } from "@/components/layout/TerminalHeader";

interface DraftVariation {
  id: string;
  label: string;
  hook: string;
  body: string;
  hashtags: string[];
  toneRationale: string;
}

export default function InfluencerPortal() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [liveUrl, setLiveUrl] = useState("");
  const [platform, setPlatform] = useState("X / Twitter");
  const [claimedOrders, setClaimedOrders] = useState<Record<string, boolean>>({});

  // Gen AI Draft Generator State
  const [isAiDraftOpen, setIsAiDraftOpen] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [draftVariations, setDraftVariations] = useState<DraftVariation[]>([]);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  // Categorize orders for the Kanban columns
  const paymentVerifiedOrders = orders.filter((o) => o.status.type === "PaymentVerified");
  const inProgressOrders = orders.filter((o) => o.status.type === "Accepted");
  const proofSubmittedOrders = orders.filter((o) => o.status.type === "ProofSubmitted");
  const approvedOrders = orders.filter((o) => o.status.type === "Approved" || o.status.type === "Settled");

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Accepted" } } : o))
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

  const handleClaimSettlement = (orderId: string) => {
    setClaimedOrders((prev) => ({ ...prev, [orderId]: true }));
    setOrders((prev) =>
      prev.map((o) =>
        o.orderId === orderId
          ? {
              ...o,
              status: {
                type: "Settled",
                txHash: "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
              },
            }
          : o
      )
    );
  };

  const handleGenerateAiDrafts = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsAiDraftOpen(true);
    setIsGeneratingDrafts(true);

    try {
      const res = await fetch("/api/ai/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorHandle: "@satoshi_vibes",
          brief: {
            campaignTitle: "TRUST Protocol Launch Sponsorship",
            productName: "TRUST Protocol",
            targetAudience: "Web3 Builders, Crypto Influencers & Brands",
            keyDeliverables: "1 In-depth thread or video review highlighting trustless escrow and instant t-ECDSA releases",
            requiredHashtags: ["#TRUST", "#CryptoEscrow", "#Web3"],
            callToAction: "https://trust-protocol.io/escrow",
          },
        }),
      });

      const data = await res.json();
      if (data.variations) {
        setDraftVariations(data.variations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDrafts(false);
    }
  };

  const handleCopyDraft = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraftId(id);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-zinc-100 flex flex-col">
      <TerminalHeader activePortal="influencer" />

      <main className="max-w-[1440px] w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Creator Identity & Settlement Banner */}
        <div className="glass-terminal p-6 rounded-2xl border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-emerald-500 to-teal-600 flex items-center justify-center font-extrabold text-black text-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              S
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">@satoshi_vibes</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> VERIFIED CREATOR
                </span>
              </div>
              <div className="text-xs text-zinc-400 font-mono flex items-center gap-3">
                <span>EVM: 0x7099...79C8</span>
                <span className="text-zinc-600">•</span>
                <span>AUDIENCE: 245,000</span>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-bold">TRUST INDEX: 97%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">SECURED ON-CHAIN ESCROW</div>
              <div className="text-2xl font-extrabold text-white tabular-nums tracking-tight mt-0.5">
                $4,700.00 <span className="text-sm font-semibold text-emerald-400">USDC</span>
              </div>
            </div>
            <div className="h-10 w-px bg-white/[0.08]" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">SETTLEMENT GUARANTEE</div>
              <div className="text-2xl font-extrabold text-cyan-400 tracking-tight mt-0.5">
                t-ECDSA <span className="text-xs text-zinc-500 font-sans">ICP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Pipeline Kanban */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono">
                SETTLEMENT KANBAN
              </div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Kanban className="h-5 w-5 text-cyan-400" />
                Active Deliverable Pipeline
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Column 1: Escrow Secured */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-emerald-400 font-bold tracking-wide">1. ESCROW SECURED</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
                  {paymentVerifiedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[380px] p-2.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                {paymentVerifiedOrders.map((ord) => (
                  <div key={ord.orderId} className="glass-terminal p-4 rounded-xl border border-white/[0.08] space-y-3">
                    <div className="flex justify-between items-start font-mono">
                      <span className="text-xs text-zinc-400 font-semibold">{ord.orderId}</span>
                      <span className="text-xs text-emerald-400 font-extrabold tabular-nums">
                        {formatUsdc(ord.amountUsdcRaw)}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 leading-relaxed">
                      USDC deposit verified on Ethereum. Accept order to lock deliverable timeline.
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-950/70 border border-white/[0.04] text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                      <span>TIMELOCK:</span>
                      <span className="text-amber-400 font-bold">06d 18h 42m remaining</span>
                    </div>

                    <button
                      onClick={() => handleAcceptOrder(ord.orderId)}
                      className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
                    >
                      Accept Order & Begin
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: In Production */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-cyan-400 font-bold tracking-wide">2. IN PRODUCTION</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-bold">
                  {inProgressOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[380px] p-2.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                {inProgressOrders.map((ord) => (
                  <div key={ord.orderId} className="glass-terminal p-4 rounded-xl border border-cyan-500/30 space-y-3">
                    <div className="flex justify-between items-start font-mono">
                      <span className="text-xs text-zinc-400 font-semibold">{ord.orderId}</span>
                      <span className="text-xs text-cyan-400 font-extrabold tabular-nums">
                        {formatUsdc(ord.amountUsdcRaw)}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 leading-relaxed">
                      Deliverable in progress. Generate copy with tone-match AI or submit live link.
                    </div>

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => handleGenerateAiDrafts(ord.orderId)}
                        className="w-full py-1.5 rounded-xl bg-zinc-900 border border-white/[0.08] hover:border-cyan-500/50 text-xs font-semibold text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Bot className="h-3.5 w-3.5 text-cyan-400" />
                        Draft with Tone-Match AI
                      </button>

                      <button
                        onClick={() => handleOpenSubmitDrawer(ord.orderId)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:brightness-110 text-black text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                      >
                        <Send className="h-3.5 w-3.5" /> Submit Live Proof
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Under Review */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-amber-400 font-bold tracking-wide">3. UNDER REVIEW</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold">
                  {proofSubmittedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[380px] p-2.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                {proofSubmittedOrders.map((ord) => (
                  <div key={ord.orderId} className="glass-terminal p-4 rounded-xl border border-white/[0.08] space-y-3">
                    <div className="flex justify-between items-start font-mono">
                      <span className="text-xs text-zinc-400 font-semibold">{ord.orderId}</span>
                      <span className="text-xs text-amber-400 font-extrabold tabular-nums">
                        {formatUsdc(ord.amountUsdcRaw)}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 space-y-1">
                      <div>Proof URL Submitted:</div>
                      <a
                        href={(ord.status as any).liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-mono break-all text-xs"
                      >
                        {(ord.status as any).liveUrl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-950/70 border border-white/[0.04] text-[10px] text-zinc-400 flex items-center gap-1.5 font-mono">
                      <Clock className="h-3 w-3 text-amber-400" /> Awaiting Brand t-ECDSA Sign-Off
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Ready to Claim / Settled */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono">
                <span className="text-teal-400 font-bold tracking-wide">4. SETTLEMENT & CLAIM</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[11px] font-bold">
                  {approvedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[380px] p-2.5 rounded-2xl bg-black/40 border border-white/[0.05]">
                {approvedOrders.map((ord) => {
                  const isSettled = ord.status.type === "Settled" || claimedOrders[ord.orderId];
                  return (
                    <div key={ord.orderId} className="glass-terminal p-4 rounded-xl border border-emerald-500/40 space-y-3 bg-emerald-950/10">
                      <div className="flex justify-between items-start font-mono">
                        <span className="text-xs text-zinc-400 font-semibold">{ord.orderId}</span>
                        <span className="text-xs text-emerald-400 font-extrabold tabular-nums">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                        {isSettled
                          ? "USDC transferred into your wallet on Ethereum."
                          : "t-ECDSA signature authorized by ICP Canister!"}
                      </div>

                      {isSettled ? (
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle className="h-4 w-4" /> SETTLED ON-CHAIN
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimSettlement(ord.orderId)}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-black text-xs font-extrabold transition-all shadow-[0_0_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2"
                        >
                          <Wallet className="h-3.5 w-3.5" /> Claim USDC Payout
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Draft Generator Slide-Over Drawer */}
      {isAiDraftOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="glass-terminal w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-white/[0.1] p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Tone-Matched Gen AI Draft Assistant</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiDraftOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-zinc-400">
              Generating tailored copy variations matching your historical top-performing posts while strictly
              adhering to the sponsor’s brand guidelines.
            </div>

            {isGeneratingDrafts ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <span className="h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-zinc-400">
                  Synthesizing creator tone & campaign brief...
                </span>
              </div>
            ) : (
              <div className="space-y-4">
                {draftVariations.map((v) => {
                  const fullText = `${v.hook}\n\n${v.body}\n\n${v.hashtags.join(" ")}`;
                  const isCopied = copiedDraftId === v.id;

                  return (
                    <div
                      key={v.id}
                      className="p-4 rounded-xl bg-zinc-950/80 border border-white/[0.07] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-cyan-400">
                          {v.label}
                        </span>
                        <button
                          onClick={() => handleCopyDraft(fullText, v.id)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-300 flex items-center gap-1 transition-colors border border-white/[0.06]"
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" /> Copy Draft
                            </>
                          )}
                        </button>
                      </div>

                      <div className="text-sm font-bold text-white font-sans">{v.hook}</div>
                      <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                        {v.body}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {v.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-white/[0.05] text-cyan-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="text-[10px] text-zinc-500 border-t border-white/[0.05] pt-2 font-mono">
                        RATIONALE: {v.toneRationale}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof-of-Work Submission Modal with Instant Preview */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitProofOfWork}
            className="glass-terminal w-full max-w-lg rounded-2xl border border-white/[0.1] p-6 space-y-5 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Submit Proof-of-Work Link</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSubmitOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                  TARGET ESCROW ORDER
                </label>
                <div className="mt-1 p-2.5 bg-black/40 rounded-xl border border-white/[0.06] font-mono text-xs text-zinc-300">
                  {selectedOrderId}
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                  PUBLISHED PLATFORM
                </label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-zinc-200 focus:outline-none font-mono"
                >
                  <option>X / Twitter</option>
                  <option>YouTube</option>
                  <option>TikTok</option>
                  <option>Instagram</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-widest text-zinc-400 font-mono">
                  LIVE CONTENT URL
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://x.com/satoshi_vibes/status/1789201948"
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2.5 bg-black/40 border border-white/[0.08] rounded-xl text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Instant Embed Preview Simulation */}
              {liveUrl && (
                <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                    <span>LIVE LINK EMBED PREVIEW:</span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> URL Validated
                    </span>
                  </div>
                  <div className="text-xs text-zinc-300 font-sans p-2 rounded bg-black/40 border border-white/[0.04]">
                    "Escrow payments on EVM make brand sponsorships 100x safer. No more net-60 day invoice chasing for creators #TRUST #CryptoEscrow"
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitOpen(false)}
                className="px-4 py-2 text-xs font-mono text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:brightness-110 text-black font-extrabold text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                Submit for Automated AI Audit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
