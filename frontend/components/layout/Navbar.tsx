"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Wallet, Activity, ExternalLink, ArrowRightLeft } from "lucide-react";
import { useWallet } from "@/components/web3/WalletProvider";
import { TransferModal } from "@/components/web3/TransferModal";
import { formatAddress } from "@/lib/utils";
import { CHAIN } from "@/lib/chain";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/advertiser", label: "Advertiser Portal" },
  { href: "/influencer", label: "Creator Studio" },
  { href: "/audit", label: "Post Audit" },
  { href: "/addresses", label: "Address Book" },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, usdcBalance, ethBalance, connect, connectDevAccount, activeDevAccount, requestFaucet, connecting, error } = useWallet();
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#080b12]/85 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:border-cyan-400 group-hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-base tracking-tight text-white flex items-center gap-2">
                TRUST
                <span className="text-[10px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-medium">
                  Protocol
                </span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all ${
                    active
                      ? "bg-white/[0.08] text-white border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Active Network Pill */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-gray-400 font-mono text-[11px]">{CHAIN.network === "localhost" ? "Localhost (31337)" : "Sepolia (11155111)"}</span>
          </div>

          {/* Localhost Role / Dev Account Switcher (Same-device testing) */}
          {CHAIN.chainId === 31337 && (
            <div className="relative">
              <select
                value={activeDevAccount ? activeDevAccount.id : "metamask"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "metamask") connect();
                  else connectDevAccount(val);
                }}
                className="px-2.5 py-1.5 rounded-md bg-white/[0.05] border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-medium hover:border-cyan-400 focus:outline-none transition-all cursor-pointer"
                title="Switch active account to test Advertiser and Influencer roles on the same device"
              >
                <option value="account-0" className="bg-[#0b0f19] text-gray-200">
                  Role: Advertiser (#0)
                </option>
                <option value="account-1" className="bg-[#0b0f19] text-gray-200">
                  Role: Creator @satoshi (#1)
                </option>
                <option value="account-2" className="bg-[#0b0f19] text-gray-200">
                  Role: Creator @defi (#2)
                </option>
                <option value="metamask" className="bg-[#0b0f19] text-gray-200">
                  Role: MetaMask
                </option>
              </select>
            </div>
          )}

          {address && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-500/[0.06] border border-cyan-500/20 text-xs">
              <span className="text-gray-400 text-[11px]">Bal:</span>
              <span className="text-cyan-300 font-mono font-medium">
                {usdcBalance === null ? "—" : (Number(usdcBalance) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
              </span>
              <span className="text-gray-600">·</span>
              <span className="text-emerald-300 font-mono font-medium">
                {ethBalance === null ? "—" : (Number(ethBalance) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 2 })} ETH
              </span>
              {CHAIN.chainId === 31337 && (
                <button
                  onClick={() => requestFaucet()}
                  title="Claim 10,000 free test USDC and 300 ETH"
                  className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-500/40 transition-colors"
                >
                  +Faucet
                </button>
              )}
              <button
                onClick={() => setIsTransferOpen(true)}
                title="Direct transfer USDC or ETH between wallets"
                className="ml-1 px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 transition-colors flex items-center gap-1 font-mono"
              >
                <ArrowRightLeft className="h-3 w-3" />
                Transfer
              </button>
            </div>
          )}

          {error && !address && (
            <span title={error} className="hidden sm:block max-w-[320px] truncate text-[11px] text-red-400">
              {error}
            </span>
          )}

          <button
            onClick={() => connect()}
            disabled={connecting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-medium tracking-wide hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:text-white transition-all disabled:opacity-50"
          >
            <Wallet className="h-3.5 w-3.5 text-cyan-400" />
            {address ? formatAddress(address) : connecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      </div>

      <TransferModal isOpen={isTransferOpen} onClose={() => setIsTransferOpen(false)} />
    </header>
  );
}
