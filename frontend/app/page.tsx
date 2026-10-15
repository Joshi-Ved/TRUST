"use client";

import Link from "next/link";
import { ArrowRight, Lock, Radar, BadgeCheck, Banknote } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";

const STEPS = [
  { icon: Lock, title: "Lock the budget", text: "The advertiser deposits USDC into an Ethereum escrow contract. Nobody can touch it until the work is approved." },
  { icon: Radar, title: "Verify the order", text: "The settlement canister on the Internet Computer confirms the deposit on-chain, with no centralized oracle." },
  { icon: BadgeCheck, title: "Audit the post", text: "AI checks the live post for required tags, mentions and brand safety before the advertiser signs off." },
  { icon: Banknote, title: "Release payment", text: "On approval the canister signs a one-time release and USDC goes straight to the creator's wallet." },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-[1280px] mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 leading-tight">
                Pay influencers only for work that is actually delivered.
              </h1>
              <p className="text-lg text-gray-600 max-w-xl">
                TRUST holds campaign funds in smart-contract escrow and releases them when the post is verified.
                No chasing invoices, no payment defaults, no fake engagement.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/advertiser" className="inline-flex items-center gap-2 px-5 py-2.5 rounded bg-[#714b67] text-white font-medium hover:bg-[#5d3c54]">
                  Start a campaign <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/influencer" className="px-5 py-2.5 rounded border border-gray-300 text-gray-700 font-medium hover:bg-gray-50">
                  I am a creator
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                ["$148K", "Locked in escrow"],
                ["1.8M+", "Verified reach"],
                ["<0.01%", "Dispute rate"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-lg border border-gray-200 bg-[#f8f9fa] p-5">
                  <div className="text-2xl font-semibold text-[#714b67]">{v}</div>
                  <div className="text-sm text-gray-500 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1280px] mx-auto px-6 py-16">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">How it works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="glass-terminal rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-full bg-[#714b67]/10 text-[#714b67] flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs text-gray-500">Step {i + 1}</span>
                </div>
                <div className="font-semibold text-gray-900">{title}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        TRUST · Ethereum USDC escrow with Internet Computer settlement
      </footer>
    </div>
  );
}
