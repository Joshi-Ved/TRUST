import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { GlobalCanvasProvider } from "@/components/canvas/GlobalCanvasProvider";
import { WalletProvider } from "@/components/web3/WalletProvider";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRUST | Next-Gen 3D Smart Escrow & Transparent Settlement Protocol",
  description:
    "Cybernetic decentralized escrow platform powered by Ethereum smart contracts and Internet Computer (ICP) threshold-ECDSA cryptographic settlement.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans bg-[#030712] text-zinc-100 min-h-screen antialiased selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden`}
      >
        {/* Global Persistent 3D WebGL Canvas Layer */}
        <GlobalCanvasProvider />

        {/* Ambient CRT / Cyber Scanline Grid Overlay */}
        <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] z-[1] opacity-60" />

        {/* App Content Layer */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <WalletProvider>{children}</WalletProvider>
        </div>
      </body>
    </html>
  );
}
