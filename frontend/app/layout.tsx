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
  title: "TRUST | Smart Escrow for Influencer Marketing",
  description: "Pay influencers safely: USDC held in an Ethereum escrow and released only when the work is verified.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-[#f4f5f7] text-[#212529] min-h-screen antialiased selection:bg-[#714b67]/20`}>
        <div className="flex flex-col min-h-screen">
          <WalletProvider>{children}</WalletProvider>
        </div>
      </body>
    </html>
  );
}
