"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Wallet } from "lucide-react";
import { useWallet } from "@/components/web3/WalletProvider";
import { formatAddress } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/advertiser", label: "Advertiser" },
  { href: "/influencer", label: "Creator" },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, usdcBalance, connect, connecting } = useWallet();

  return (
    <header className="sticky top-0 z-50 bg-[#714b67] text-white shadow-sm">
      <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
            <ShieldCheck className="h-5 w-5" />
            TRUST
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {NAV.map((n) => {
              const active = n.href === "/" ? pathname === "/" : pathname?.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`px-3 py-1.5 rounded ${active ? "bg-white/20 font-medium" : "text-white/80 hover:bg-white/10"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {address && (
            <span className="hidden sm:block text-white/80 tabular-nums">
              {usdcBalance === null ? "—" : (Number(usdcBalance) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
            </span>
          )}
          <button
            onClick={connect}
            disabled={connecting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-white text-[#714b67] font-medium hover:bg-gray-100 disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" />
            {address ? formatAddress(address) : connecting ? "Connecting…" : "Connect wallet"}
          </button>
        </div>
      </div>
    </header>
  );
}
