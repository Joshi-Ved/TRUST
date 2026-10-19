import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { WalletProvider } from "@/components/web3/WalletProvider";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TRUST | Smart Escrow Protocol for Influencer Marketing",
  description: "Cryptographic smart escrow protocol: USDC locked in EVM contracts and released via Internet Computer threshold ECDSA signatures upon verified proof of work.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#07090e] text-[#f1f5f9] min-h-screen antialiased selection:bg-cyan-500/30 selection:text-cyan-200`}>
        <div className="flex flex-col min-h-screen relative z-10">
          <WalletProvider>{children}</WalletProvider>
        </div>
      </body>
    </html>
  );
}
