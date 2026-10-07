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
} from "lucide-react";
import { INITIAL_ORDERS, Order } from "@/lib/icp-agent";
import { formatUsdc } from "@/lib/utils";

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
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              TRUST
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-sm font-medium text-cyan-400">Creator & Influencer Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              Creator: @satoshi_vibes
            </div>
            <Link
              href="/advertiser"
              className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Switch to Advertiser View →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Creator Stats Banner */}
        <div className="glass-panel p-6 rounded-2xl border border-zinc-800/80 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-cyan-500/20">
              S
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                @satoshi_vibes
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  Verified Creator
                </span>
              </h1>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Wallet: 0x7099...79C8 • Attested Follower Base: 245,000 • Authenticity Score: 96%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs font-mono text-zinc-500">Unsettled Escrow Locked</div>
              <div className="text-2xl font-bold text-white font-mono">$4,700.00 <span className="text-xs text-zinc-500">USDC</span></div>
            </div>
            <div className="h-10 w-px bg-zinc-800" />
            <div>
              <div className="text-xs font-mono text-zinc-500">Projected Campaign ROMI</div>
              <div className="text-2xl font-bold text-teal-400 font-mono">3.8x</div>
            </div>
          </div>
        </div>

        {/* Kanban Board of Deliverables */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Kanban className="h-5 w-5 text-cyan-400" />
              Active Orders & Settlement Pipeline
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Column 1: Payment Locked */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono text-zinc-400">
                <span>1. ESCROW LOCKED</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  {paymentVerifiedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[350px] p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                {paymentVerifiedOrders.map((ord) => (
                  <div key={ord.orderId} className="glass-panel p-4 rounded-xl border border-zinc-800/80 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-zinc-400">{ord.orderId}</span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {formatUsdc(ord.amountUsdcRaw)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Funds verified on Ethereum. Accept order to begin content creation.
                    </p>
                    <button
                      onClick={() => handleAcceptOrder(ord.orderId)}
                      className="w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white transition-colors"
                    >
                      Accept Order
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: In Progress */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono text-zinc-400">
                <span>2. IN PRODUCTION</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  {inProgressOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[350px] p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                {inProgressOrders.map((ord) => (
                  <div key={ord.orderId} className="glass-panel p-4 rounded-xl border border-zinc-800/80 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-zinc-400">{ord.orderId}</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">
                        {formatUsdc(ord.amountUsdcRaw)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Order accepted. Generate drafts with AI or submit your published content link.
                    </p>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleGenerateAiDrafts(ord.orderId)}
                        className="w-full py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-cyan-500/50 text-xs font-medium text-zinc-200 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Bot className="h-3.5 w-3.5 text-cyan-400" />
                        Draft with Tone-Match AI
                      </button>

                      <button
                        onClick={() => handleOpenSubmitDrawer(ord.orderId)}
                        className="w-full py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Send className="h-3 w-3" /> Submit Live Proof
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Proof Submitted */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono text-zinc-400">
                <span>3. UNDER REVIEW</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  {proofSubmittedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[350px] p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                {proofSubmittedOrders.map((ord) => (
                  <div key={ord.orderId} className="glass-panel p-4 rounded-xl border border-zinc-800/80 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono text-zinc-400">{ord.orderId}</span>
                      <span className="text-xs font-mono text-amber-400 font-bold">
                        {formatUsdc(ord.amountUsdcRaw)}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>Proof submitted:</div>
                      <a
                        href={(ord.status as any).liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-mono break-all"
                      >
                        {(ord.status as any).liveUrl}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Brand AI auditor running
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Approved & Settled */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs font-mono text-zinc-400">
                <span>4. READY TO CLAIM</span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                  {approvedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[350px] p-2 rounded-xl bg-zinc-950/40 border border-zinc-900">
                {approvedOrders.map((ord) => {
                  const isSettled = ord.status.type === "Settled" || claimedOrders[ord.orderId];
                  return (
                    <div key={ord.orderId} className="glass-panel p-4 rounded-xl border border-emerald-500/30 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono text-zinc-400">{ord.orderId}</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400">
                        {isSettled
                          ? "USDC transferred into your wallet on EVM."
                          : "t-ECDSA signature authorized by ICP Canister!"}
                      </div>

                      {isSettled ? (
                        <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" /> Settled On-Chain
                        </div>
                      ) : (
                        <button
                          onClick={() => handleClaimSettlement(ord.orderId)}
                          className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1"
                        >
                          <Wallet className="h-3 w-3" /> Claim USDC Payout
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-zinc-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <Bot className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-lg text-white">Gen AI Tone-Matched Content Generator</h3>
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
                      className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-semibold text-cyan-400">
                          {v.label}
                        </span>
                        <button
                          onClick={() => handleCopyDraft(fullText, v.id)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 flex items-center gap-1 transition-colors"
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

                      <div className="text-sm font-semibold text-white">{v.hook}</div>
                      <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                        {v.body}
                      </p>

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {v.hashtags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-cyan-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-zinc-500 border-t border-zinc-800/80 pt-2 font-mono">
                        Rationale: {v.toneRationale}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proof-of-Work Submission Modal */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitProofOfWork}
            className="glass-panel w-full max-w-md rounded-2xl border border-zinc-800 p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-lg text-white">Submit Proof-of-Work</h3>
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
                <label className="text-xs text-zinc-400 font-mono">Target Order</label>
                <div className="mt-1 p-2.5 bg-zinc-900 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-300">
                  {selectedOrderId}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-mono">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:outline-none"
                >
                  <option>X / Twitter</option>
                  <option>YouTube</option>
                  <option>TikTok</option>
                  <option>Instagram</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-400 font-mono">Live Content URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://x.com/satoshi_vibes/status/..."
                  value={liveUrl}
                  onChange={(e) => setLiveUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsSubmitOpen(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs transition-colors"
              >
                Submit for Verification
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
