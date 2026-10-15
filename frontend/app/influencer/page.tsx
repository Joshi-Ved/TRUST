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
  Terminal,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Order } from "@/lib/icp-agent";
import { formatAddress, formatUsdc } from "@/lib/utils";
import { Navbar } from "@/components/layout/Navbar";
import { useWallet } from "@/components/web3/WalletProvider";
import { useOrders } from "@/lib/orders";
import { errMessage, releaseWithProof } from "@/lib/chain";
import { ThreeDCard } from "@/components/ui/ThreeDCard";
import { LaserBeamBorder } from "@/components/ui/LaserBeamBorder";

interface DraftVariation {
  id: string;
  label: string;
  hook: string;
  body: string;
  hashtags: string[];
  toneRationale: string;
}

export default function InfluencerPortal() {
  const [orders, setOrders] = useOrders();
  const { signer, connect, refreshBalance } = useWallet();
  const [claimError, setClaimError] = useState<string | null>(null);
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

  const handleClaimSettlement = async (orderId: string) => {
    const ord = orders.find((o) => o.orderId === orderId);
    if (!ord) return;
    setClaimError(null);

    let txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    if (ord.onChain) {
      try {
        if (!ord.signature) throw new Error("Awaiting advertiser approval signature");
        const s = signer ?? (await connect());
        if (!s) throw new Error("Connect your wallet first");
        txHash = await releaseWithProof(s, ord.orderId, ord.nonce, ord.signature);
        refreshBalance();
      } catch (e) {
        setClaimError(errMessage(e));
        return;
      }
    }

    setClaimedOrders((prev) => ({ ...prev, [orderId]: true }));
    setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status: { type: "Settled", txHash } } : o)));
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
    <div className="min-h-screen text-gray-900 flex flex-col">
      <Navbar />

      <main className="max-w-[1440px] w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Creator Identity & 3D HUD Settlement Vault */}
        <div className="glass-terminal p-6 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-lg bg-gradient-to-tr from-[#017e84] via-[#714b67] to-[#5d3c54] flex items-center justify-center font-extrabold text-white text-2xl shadow-sm">
              S
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">@satoshi_vibes</h1>
                <span className="px-2 py-0.5 rounded-full bg-[#714b67]/10 border border-[#714b67]/40 text-[#714b67] text-xs  font-semibold flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> VERIFIED CREATOR
                </span>
              </div>
              <div className="text-xs text-gray-600  flex items-center gap-3">
                <span>EVM: 0x7099...79C8</span>
                <span className="text-gray-400">•</span>
                <span>AUDIENCE: 245,000</span>
                <span className="text-gray-400">•</span>
                <span className="text-[#714b67] font-bold">TRUST INDEX: 97%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 ">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">SECURED ESCROW BALANCE</div>
              <div className="text-2xl font-extrabold text-gray-900 tabular-nums tracking-tight mt-0.5">
                $4,700.00 <span className="text-sm font-semibold text-[#714b67]">USDC</span>
              </div>
            </div>
            <div className="h-10 w-px bg-gray-100" />
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-bold">SETTLEMENT GUARANTEE</div>
              <div className="text-2xl font-extrabold text-[#017e84] tracking-tight mt-0.5">
                t-ECDSA <span className="text-xs text-gray-500 font-sans">ICP</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Cyber Kanban Board with Hover Tilt Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wide text-[#017e84] ">
                ORDER PIPELINE
              </div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                <Kanban className="h-5 w-5 text-[#017e84]" />
                Active Deliverables Kanban
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Column 1: Escrow Secured */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs ">
                <span className="text-[#714b67] font-bold tracking-wide">1. ESCROW SECURED</span>
                <span className="px-2 py-0.5 rounded-full bg-[#714b67]/10 border border-[#714b67]/40 text-[#714b67] text-[11px] font-bold">
                  {paymentVerifiedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[400px] p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                {paymentVerifiedOrders.map((ord) => (
                  <ThreeDCard key={ord.orderId}>
                    <div className="glass-terminal p-4 rounded-md border border-gray-200 space-y-3">
                      <div className="flex justify-between items-start ">
                        <span className="text-xs text-gray-600 font-semibold">{ord.orderId}</span>
                        <span className="text-xs text-[#714b67] font-extrabold tabular-nums">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 leading-relaxed">
                        Funds locked on Ethereum. Accept order to activate deliverable milestone.
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-gray-100 text-[10px]  text-gray-600 flex items-center justify-between">
                        <span>TIMELOCK:</span>
                        <span className="text-amber-700 font-bold">06d 18h 42m</span>
                      </div>

                      <button
                        onClick={() => handleAcceptOrder(ord.orderId)}
                        className="w-full py-2 rounded-md bg-gray-200 hover:bg-gray-300 text-xs font-bold text-gray-900 transition-colors"
                      >
                        Accept Order & Begin
                      </button>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            </div>

            {/* Column 2: In Production */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs ">
                <span className="text-[#017e84] font-bold tracking-wide">2. IN PRODUCTION</span>
                <span className="px-2 py-0.5 rounded-full bg-[#017e84]/10 border border-[#017e84]/40 text-[#017e84] text-[11px] font-bold">
                  {inProgressOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[400px] p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                {inProgressOrders.map((ord) => (
                  <ThreeDCard key={ord.orderId}>
                    <div className="glass-terminal p-4 rounded-md border border-[#017e84]/40 space-y-3">
                      <div className="flex justify-between items-start ">
                        <span className="text-xs text-gray-600 font-semibold">{ord.orderId}</span>
                        <span className="text-xs text-[#017e84] font-extrabold tabular-nums">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 leading-relaxed">
                        Produce content matching brand brief. Generate copy or submit live URL.
                      </div>

                      <div className="space-y-2 pt-1">
                        <button
                          onClick={() => handleGenerateAiDrafts(ord.orderId)}
                          className="w-full py-1.5 rounded-md bg-gray-100 border border-gray-200 hover:border-[#017e84]/40 text-xs font-semibold text-gray-800 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Bot className="h-3.5 w-3.5 text-[#017e84]" />
                          Tone-Match AI Drafts
                        </button>

                        <button
                          onClick={() => handleOpenSubmitDrawer(ord.orderId)}
                          className="w-full py-2 rounded-md bg-gradient-to-r from-[#017e84] to-[#5d3c54] hover:brightness-110 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Send className="h-3.5 w-3.5" /> Submit Live Proof
                        </button>
                      </div>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            </div>

            {/* Column 3: Under Review */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs ">
                <span className="text-amber-700 font-bold tracking-wide">3. UNDER REVIEW</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-300 text-amber-700 text-[11px] font-bold">
                  {proofSubmittedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[400px] p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                {proofSubmittedOrders.map((ord) => (
                  <ThreeDCard key={ord.orderId}>
                    <div className="glass-terminal p-4 rounded-md border border-gray-200 space-y-3">
                      <div className="flex justify-between items-start ">
                        <span className="text-xs text-gray-600 font-semibold">{ord.orderId}</span>
                        <span className="text-xs text-amber-700 font-extrabold tabular-nums">
                          {formatUsdc(ord.amountUsdcRaw)}
                        </span>
                      </div>

                      <div className="text-[11px] text-gray-600 space-y-1">
                        <div>Proof URL Submitted:</div>
                        <a
                          href={(ord.status as any).liveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#017e84] hover:underline flex items-center gap-1  break-all text-xs"
                        >
                          {(ord.status as any).liveUrl}
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      </div>

                      <div className="p-2 rounded-lg bg-white border border-gray-100 text-[10px] text-gray-600 flex items-center gap-1.5 ">
                        <Clock className="h-3 w-3 text-amber-700" /> Awaiting Brand t-ECDSA Sign-Off
                      </div>
                    </div>
                  </ThreeDCard>
                ))}
              </div>
            </div>

            {/* Column 4: Settlement & Claim with High-Voltage Glow Button */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2 text-xs ">
                <span className="text-[#017e84] font-bold tracking-wide">4. SETTLEMENT & CLAIM</span>
                <span className="px-2 py-0.5 rounded-full bg-[#017e84]/10 border border-[#017e84]/40 text-[#017e84] text-[11px] font-bold">
                  {approvedOrders.length}
                </span>
              </div>
              <div className="space-y-3 min-h-[400px] p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                {claimError && <div className="text-[11px]  text-red-600 break-words border border-red-300 rounded-lg p-2">{claimError}</div>}
                {approvedOrders.map((ord) => {
                  const isSettled = ord.status.type === "Settled" || claimedOrders[ord.orderId];
                  return (
                    <ThreeDCard key={ord.orderId}>
                      <div className="glass-terminal p-4 rounded-md border border-[#714b67]/40 space-y-3 bg-[#714b67]/5">
                        <div className="flex justify-between items-start ">
                          <span className="text-xs text-gray-600 font-semibold">{ord.orderId}</span>
                          <span className="text-xs text-[#714b67] font-extrabold tabular-nums">
                            {formatUsdc(ord.amountUsdcRaw)}
                          </span>
                        </div>

                        <div className="text-[11px] text-gray-600 leading-relaxed ">
                          {isSettled
                            ? "USDC transferred into your wallet on Ethereum."
                            : "t-ECDSA signature authorized by ICP Canister!"}
                        </div>

                        {isSettled ? (
                          <div className="p-2.5 rounded-md bg-[#714b67]/10 border border-[#714b67]/40 text-xs text-[#714b67]  font-bold flex items-center justify-center gap-1.5">
                            <CheckCircle className="h-4 w-4" /> SETTLED ON-CHAIN
                          </div>
                        ) : (
                          <button
                            onClick={() => handleClaimSettlement(ord.orderId)}
                            className="w-full py-3 rounded-md bg-gradient-to-r from-[#714b67] to-[#5d3c54] hover:brightness-110 text-white text-xs font-extrabold transition-all shadow-sm flex items-center justify-center gap-2"
                          >
                            <Wallet className="h-4 w-4" /> Claim USDC Settlement
                          </button>
                        )}
                      </div>
                    </ThreeDCard>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Proof-of-Work Submission Drawer with Laser Beam Border */}
      {isSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40  flex items-center justify-center p-4">
          <div className="w-full max-w-lg">
            <LaserBeamBorder glowColor="cyan">
              <form onSubmit={handleSubmitProofOfWork} className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-[#017e84]" />
                    <h3 className="font-extrabold text-base text-gray-900">Proof-of-Work Submission</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSubmitOpen(false)}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wide text-gray-600 ">
                      TARGET ESCROW CONTRACT
                    </label>
                    <div className="mt-1 p-2.5 bg-gray-50 rounded-md border border-gray-200  text-xs text-gray-700">
                      {selectedOrderId}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wide text-gray-600 ">
                      PUBLISHED PLATFORM
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none "
                    >
                      <option>X / Twitter</option>
                      <option>YouTube</option>
                      <option>TikTok</option>
                      <option>Instagram</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wide text-gray-600 ">
                      LIVE CONTENT URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://x.com/satoshi_vibes/status/1789201948"
                      value={liveUrl}
                      onChange={(e) => setLiveUrl(e.target.value)}
                      className="w-full mt-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-800 placeholder-zinc-600 focus:outline-none focus:border-[#017e84] "
                    />
                  </div>

                  {liveUrl && (
                    <div className="p-3.5 bg-white rounded-md border border-gray-200 space-y-2">
                      <div className="flex items-center justify-between text-[10px]  text-gray-600">
                        <span>LIVE LINK EMBED METADATA:</span>
                        <span className="text-[#714b67] flex items-center gap-1 font-bold">
                          <CheckCircle className="h-3 w-3" /> Validated
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 font-sans p-2 rounded bg-gray-50 border border-gray-100">
                        "Escrow payments on EVM make brand sponsorships 100x safer. No more net-60 day invoice chasing for creators #TRUST #CryptoEscrow"
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubmitOpen(false)}
                    className="px-4 py-2 text-xs  text-gray-600 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-md bg-gradient-to-r from-[#017e84] to-[#5d3c54] hover:brightness-110 text-white font-extrabold text-xs transition-all shadow-sm"
                  >
                    Transmit for AI Radar Audit
                  </button>
                </div>
              </form>
            </LaserBeamBorder>
          </div>
        </div>
      )}

      {/* AI Draft Generator Slide-Over Drawer */}
      {isAiDraftOpen && (
        <div className="fixed inset-0 z-50 bg-gray-900/40  flex items-center justify-center p-4">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <LaserBeamBorder glowColor="cyan">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                  <div className="flex items-center gap-2.5">
                    <Bot className="h-5 w-5 text-[#017e84]" />
                    <h3 className="font-extrabold text-base text-gray-900">Tone-Matched Gen AI Draft Assistant</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAiDraftOpen(false)}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs text-gray-600">
                  Generating tailored copy variations matching your historical top-performing posts while strictly
                  adhering to the sponsor’s brand guidelines.
                </div>

                {isGeneratingDrafts ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <span className="h-6 w-6 border-2 border-[#017e84] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs  text-gray-600">
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
                          className="p-4 rounded-md bg-white border border-gray-200 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs  font-semibold text-[#017e84]">
                              {v.label}
                            </span>
                            <button
                              onClick={() => handleCopyDraft(fullText, v.id)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs  text-gray-700 flex items-center gap-1 transition-colors border border-gray-200"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="h-3 w-3 text-[#714b67]" /> Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" /> Copy Draft
                                </>
                              )}
                            </button>
                          </div>

                          <div className="text-sm font-bold text-gray-900 font-sans">{v.hook}</div>
                          <p className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                            {v.body}
                          </p>

                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {v.hashtags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[10px]  px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[#017e84]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="text-[10px] text-gray-500 border-t border-gray-200 pt-2 ">
                            RATIONALE: {v.toneRationale}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </LaserBeamBorder>
          </div>
        </div>
      )}
    </div>
  );
}
