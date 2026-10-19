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
  ShieldAlert,
  X,
  FileCheck,
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
  const { signer, address, connect, refreshBalance } = useWallet();
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [isSubmitOpen, setIsSubmitOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [liveUrl, setLiveUrl] = useState("");
  const [platform, setPlatform] = useState("X / Twitter");
  const [claimedOrders, setClaimedOrders] = useState<Record<string, boolean>>({});

  // Creator Profile Verification State
  const [isVerifiedCreator, setIsVerifiedCreator] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Gen AI Draft Generator State
  const [isAiDraftOpen, setIsAiDraftOpen] = useState(false);
  const [isGeneratingDrafts, setIsGeneratingDrafts] = useState(false);
  const [draftVariations, setDraftVariations] = useState<DraftVariation[]>([]);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);

  // Categorize orders for Kanban columns
  const paymentVerifiedOrders = orders.filter((o) => o.status.type === "PaymentVerified");
  const inProgressOrders = orders.filter((o) => o.status.type === "Accepted");
  const proofSubmittedOrders = orders.filter((o) => o.status.type === "ProofSubmitted");
  const approvedOrders = orders.filter((o) => o.status.type === "Approved" || o.status.type === "Settled");

  const handleVerifyOwnership = async () => {
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const s = signer ?? (await connect());
      if (!s) throw new Error("Connect your wallet to verify handle");
      const message = `TRUST Protocol Creator Handle Verification\nHandle: @satoshi_vibes\nSigner: ${await s.getAddress()}\nTimestamp: ${Date.now()}`;
      await s.signMessage(message);
      setIsVerifiedCreator(true);
    } catch (e: any) {
      setVerificationError(errMessage(e));
    } finally {
      setIsVerifying(false);
    }
  };

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
    <div className="min-h-screen text-gray-100 flex flex-col bg-[#07090e]">
      <Navbar />

      <main className="max-w-[1440px] w-full mx-auto px-6 py-10 space-y-10 flex-1">
        {/* Creator Identity & Settlement Vault Header */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-emerald-500/20 to-cyan-500/10 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 text-2xl shadow-[0_0_20px_rgba(6,182,212,0.2)]">
              S
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-xl font-bold text-white tracking-tight">@satoshi_vibes</h1>
                {isVerifiedCreator ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> VERIFIED WALLET SIGNER
                  </span>
                ) : (
                  <button
                    onClick={handleVerifyOwnership}
                    disabled={isVerifying}
                    className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-500/20 transition-all flex items-center gap-1"
                  >
                    <ShieldCheck className="h-3 w-3" />
                    {isVerifying ? "Signing Challenge..." : "Verify Creator Handle"}
                  </button>
                )}
              </div>
              <div className="text-xs font-mono text-gray-400 flex flex-wrap items-center gap-3">
                <span>EVM: 0x7099...79C8</span>
                <span>·</span>
                <span>AUDIENCE: 245,000</span>
                <span>·</span>
                <span className="text-emerald-400 font-semibold">AUTHENTICITY: 97%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8 font-mono">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">SECURED ESCROW BALANCE</div>
              <div className="text-2xl font-bold text-white tabular-nums tracking-tight mt-0.5">
                $4,700.00 <span className="text-sm font-normal text-cyan-400">USDC</span>
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

        {verificationError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center justify-between">
            <span>{verificationError}</span>
            <button onClick={() => setVerificationError(null)} className="text-rose-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

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

                      <div className="text-xs text-gray-400 leading-relaxed font-sans">
                        Funds locked on Ethereum. Accept order to activate deliverable milestone.
                      </div>

                      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                        <button
                          onClick={() => handleAcceptOrder(ord.orderId)}
                          className="w-full py-2 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all font-mono"
                        >
                          Accept Campaign
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-6">
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

      {/* AI Draft Generator Modal */}
      {isAiDraftOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 space-y-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" />
                AI Content Brief & Script Variations
              </h3>
              <button onClick={() => setIsAiDraftOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isGeneratingDrafts ? (
              <div className="py-12 text-center space-y-3 font-mono text-xs text-cyan-400">
                <div className="h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <div>Generating audience-optimized variations via AI engine...</div>
              </div>
            ) : draftVariations.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400 font-mono">
                No draft variations generated. Click re-run to generate scripts.
              </div>
            ) : (
              <div className="space-y-4">
                {draftVariations.map((draft) => (
                  <div key={draft.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        {draft.label}
                      </span>
                      <button
                        onClick={() => handleCopyDraft(`${draft.hook}\n\n${draft.body}\n\n${draft.hashtags.join(" ")}`, draft.id)}
                        className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/[0.04] border border-white/10 text-xs font-mono text-gray-300 hover:text-white hover:bg-white/[0.08] transition-all"
                      >
                        {copiedDraftId === draft.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedDraftId === draft.id ? "Copied" : "Copy Script"}
                      </button>
                    </div>

                    <div className="text-xs font-semibold text-white">Hook: "{draft.hook}"</div>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans">{draft.body}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {draft.hashtags.map((tag) => (
                        <span key={tag} className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="text-[11px] font-mono text-gray-500 pt-1 border-t border-white/[0.06]">
                      Strategy: {draft.toneRationale}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
