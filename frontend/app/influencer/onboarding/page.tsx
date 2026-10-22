"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle, Copy, Radar, Search, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useWallet } from "@/components/web3/WalletProvider";
import { useInfluencers } from "@/lib/influencers";
import { NICHES } from "@/lib/ai/niches";
import { CreatorPlatform, ownershipCode, registrationMessage } from "@/lib/creatorRegistration";
import { errMessage } from "@/lib/chain";

interface Preview {
  handle: string;
  name: string | null;
  profileUrl: string;
  followers: number | null;
  medianViews: number;
  engagementRateBps: number;
  postsSampled: number;
  detectedNiche: string | null;
  style: string[];
}

const STEPS = ["Payout wallet", "Your account", "Your niche", "Prove it's you", "Done"];

export default function CreatorOnboarding() {
  const router = useRouter();
  const { address, signer, connect, connecting, ready } = useWallet();
  const { influencers, loaded, register } = useInfluencers();
  const existing = address ? influencers.find((i) => i.registered && i.evmAddress.toLowerCase() === address.toLowerCase()) ?? null : null;

  const [step, setStep] = useState(0);
  const [platform, setPlatform] = useState<CreatorPlatform>("x");
  const [handle, setHandle] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [niche, setNiche] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A connected wallet moves the creator past step 1; losing it sends them back.
  useEffect(() => {
    if (address && step === 0) setStep(1);
    if (!address && step > 0 && step < 4) setStep(0);
  }, [address, step]);

  const code = address ? ownershipCode(address) : "";

  const findAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch(`/api/influencers/preview?platform=${platform}&handle=${encodeURIComponent(handle)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not find that account");
      setPreview(data);
      setNiche(data.detectedNiche);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const signAndRegister = async () => {
    setBusy(true);
    setError(null);
    try {
      const s = signer ?? (await connect());
      if (!s) throw new Error("Connect the wallet you want to be paid to");
      const wallet = await s.getAddress();
      const issuedAt = Date.now();
      const signature = await s.signMessage(registrationMessage(platform, handle, wallet, issuedAt));
      await register({ platform, handle, evmAddress: wallet, issuedAt, signature, niche: niche ?? undefined });
      setStep(4);
    } catch (err: any) {
      setError(errMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const input =
    "w-full rounded-lg bg-white/[0.04] border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono";
  const primary =
    "px-5 py-2.5 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide hover:bg-cyan-400 disabled:opacity-50 font-mono flex items-center gap-2";
  const back = (to: number) => (
    <button type="button" onClick={() => setStep(to)} className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1.5">
      <ArrowLeft className="h-3.5 w-3.5" /> Back
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-gray-100">
      <Navbar />

      <main className="max-w-[760px] w-full mx-auto px-6 py-12 space-y-8 flex-1">
        <div>
          <div className="text-[11px] uppercase font-mono tracking-wider text-cyan-400">CREATOR ONBOARDING</div>
          <h1 className="text-3xl font-bold text-white tracking-tight mt-1">Get paid for verified reach</h1>
          <p className="text-gray-400 mt-2 text-sm leading-relaxed">
            Advertisers lock payment in escrow before you post. Once your post reaches the agreed views, the payment is
            released to your wallet. Setup takes about two minutes.
          </p>
        </div>

        <ol className="grid grid-cols-5 gap-2 text-[10px] font-mono font-semibold text-center">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`p-2 rounded-lg border ${
                i < step
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : i === step
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                  : "bg-white/[0.02] border-white/10 text-gray-500"
              }`}
            >
              {i < step ? <Check className="h-3 w-3 inline mr-1" /> : `${i + 1}. `}
              {label}
            </li>
          ))}
        </ol>

        {existing && step < 4 && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex flex-wrap items-center justify-between gap-3">
            <span>
              This wallet is already registered as {existing.handle} ({existing.platform}). Continue only to change account or niche.
            </span>
            <Link href="/influencer" className="underline hover:text-white">
              Go to dashboard
            </Link>
          </div>
        )}

        <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/10 space-y-5">
          {step === 0 && (
            <>
              <h2 className="font-bold text-white flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-400" /> Connect your payout wallet
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                Every payment for your campaigns goes to this wallet and nowhere else. Advertisers cannot change it.
              </p>
              <button onClick={() => connect()} disabled={connecting || !ready} className={primary}>
                <Wallet className="h-3.5 w-3.5" /> {connecting ? "Connecting..." : "Connect MetaMask"}
              </button>
            </>
          )}

          {step === 1 && (
            <form onSubmit={findAccount} className="space-y-5">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-cyan-400" /> Find your account
              </h2>
              <div className="text-xs font-mono text-gray-400">
                Payout wallet: <span className="text-white break-all">{address}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {(["x", "youtube"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPlatform(p);
                      setPreview(null);
                    }}
                    className={`p-2.5 rounded-lg border ${
                      platform === p ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300" : "bg-white/[0.02] border-white/10 text-gray-400"
                    }`}
                  >
                    {p === "x" ? "X / Twitter" : "YouTube"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={handle}
                  onChange={(e) => {
                    setHandle(e.target.value);
                    setPreview(null);
                  }}
                  placeholder="@your_handle"
                  spellCheck={false}
                  className={input}
                />
                <button type="submit" disabled={busy || !handle.trim()} className={primary}>
                  <Radar className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> {busy ? "Scanning..." : "Scan"}
                </button>
              </div>
              <p className="text-[11px] text-gray-500">Instagram and TikTok are not supported yet: they do not publish view counts, so reach cannot be verified.</p>

              {preview && (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-semibold">{preview.name ?? preview.handle}</div>
                      <a href={preview.profileUrl} target="_blank" rel="noreferrer" className="text-xs font-mono text-cyan-400 hover:underline">
                        @{preview.handle}
                      </a>
                    </div>
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    <Stat label="FOLLOWERS" value={preview.followers ? preview.followers.toLocaleString("en-US") : "not public"} />
                    <Stat label="MEDIAN VIEWS" value={preview.medianViews.toLocaleString("en-US")} />
                    <Stat label="ENGAGEMENT" value={`${(preview.engagementRateBps / 100).toFixed(2)}%`} />
                  </div>
                  {preview.style.length > 0 && (
                    <div className="text-xs text-gray-400 space-y-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                        Your writing style, from {preview.postsSampled} recent posts
                      </div>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {preview.style.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <span />
                <button type="button" onClick={() => setStep(2)} disabled={!preview} className={primary}>
                  This is me <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <>
              <h2 className="font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-cyan-400" /> What do you post about?
              </h2>
              <p className="text-sm text-gray-400">
                The script generator writes in your own style from your posts. When it cannot read them, it uses the usual voice of
                your niche.{preview?.detectedNiche ? " We pre-selected the one your posts match best." : ""}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {NICHES.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNiche(n.id)}
                    className={`p-3 rounded-lg border text-left text-xs ${
                      niche === n.id ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-200" : "bg-white/[0.02] border-white/10 text-gray-300 hover:border-white/20"
                    }`}
                  >
                    <div className="font-semibold">{n.label}</div>
                    {preview?.detectedNiche === n.id && <div className="text-[10px] font-mono text-emerald-400 mt-0.5">matches your posts</div>}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                {back(1)}
                <button type="button" onClick={() => setStep(3)} disabled={!niche} className={primary}>
                  Continue <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-400" /> Prove the account is yours
              </h2>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal pl-5">
                <li>
                  Add this code to your {platform === "x" ? "X bio" : "YouTube channel description"} (or publish it in a post):
                  <div className="mt-2 flex items-center gap-2">
                    <code className="text-base font-mono text-cyan-300 px-3 py-1.5 rounded bg-black/40 border border-white/10">{code}</code>
                    <button type="button" onClick={copy} title="Copy code" className="text-gray-400 hover:text-cyan-300">
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </li>
                <li>Save your profile and wait about a minute.</li>
                <li>Sign with your wallet. Signing is free and sends no transaction.</li>
              </ol>
              <p className="text-[11px] text-gray-500">
                The code is made from your wallet address, so only the real owner of @{preview?.handle ?? handle} can link it to this
                wallet. You can remove it once you are registered.
              </p>
              <div className="flex justify-between">
                {back(2)}
                <button type="button" onClick={signAndRegister} disabled={busy} className={primary}>
                  <Radar className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
                  {busy ? "Checking your profile..." : "Sign & finish"}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto" />
              <h2 className="text-xl font-bold text-white">You&apos;re verified, @{preview?.handle ?? handle}</h2>
              <p className="text-sm text-gray-400 max-w-md mx-auto">
                Advertisers can now find you in the registry and lock escrow payments to your wallet. Campaigns appear in your
                dashboard.
              </p>
              <button onClick={() => router.push("/influencer")} className={`${primary} mx-auto`}>
                Open dashboard <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {error && <div className="text-xs font-mono text-rose-400 border border-rose-500/30 rounded-lg p-3 bg-rose-500/10">{error}</div>}
        </section>

        {!loaded && <p className="text-xs text-gray-500 font-mono">Loading registry...</p>}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
      <div className="text-[9px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="text-sm font-bold text-white tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
