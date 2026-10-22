"use client";

import { useState, useMemo } from "react";
import { isAddress, parseEther, parseUnits } from "ethers";
import {
  ArrowRightLeft,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Coins,
  Wallet,
} from "lucide-react";
import { useWallet } from "./WalletProvider";
import { useInfluencers } from "@/lib/influencers";
import { useAddressBook } from "@/lib/addressBook";
import {
  transferUsdc,
  transferEth,
  errMessage,
  toRawUsdc,
  CHAIN,
  LOCAL_DEV_ACCOUNTS,
  EXPLORER_URL,
} from "@/lib/chain";
import { formatAddress } from "@/lib/utils";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRecipient?: string;
}

export function TransferModal({ isOpen, onClose, defaultRecipient }: TransferModalProps) {
  const {
    signer,
    address,
    usdcBalance,
    ethBalance,
    refreshBalance,
    requestFaucet,
    connect,
  } = useWallet();
  const { influencers } = useInfluencers();
  const { entries: savedAddresses } = useAddressBook();

  const [token, setToken] = useState<"USDC" | "ETH">("USDC");
  const [recipient, setRecipient] = useState<string>(defaultRecipient || "");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build list of quick recipient options
  const recipientOptions = useMemo(() => {
    const list: { label: string; address: string }[] = [];

    // Dev accounts
    if (CHAIN.chainId === 31337) {
      LOCAL_DEV_ACCOUNTS.forEach((acc) => {
        list.push({
          label: acc.label,
          address: acc.address,
        });
      });
    }

    // Influencers
    influencers.forEach((inf) => {
      if (!list.some((item) => item.address.toLowerCase() === inf.evmAddress.toLowerCase())) {
        list.push({
          label: `${inf.handle} (${inf.platform})`,
          address: inf.evmAddress,
        });
      }
    });

    // Saved address book entries
    savedAddresses.forEach((saved) => {
      if (!list.some((item) => item.address.toLowerCase() === saved.address.toLowerCase())) {
        list.push({
          label: `${saved.label} (Address Book)`,
          address: saved.address,
        });
      }
    });

    return list;
  }, [influencers, savedAddresses]);

  if (!isOpen) return null;

  const currentBalFormatted =
    token === "USDC"
      ? usdcBalance !== null
        ? (Number(usdcBalance) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : "—"
      : ethBalance !== null
      ? (Number(ethBalance) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 4 })
      : "—";

  const handleSetMax = () => {
    if (token === "USDC" && usdcBalance !== null) {
      const val = Number(usdcBalance) / 1e6;
      setAmount(val.toString());
    } else if (token === "ETH" && ethBalance !== null) {
      // Keep a small buffer for gas
      const val = Math.max(0, Number(ethBalance) / 1e18 - 0.01);
      setAmount(val.toFixed(4));
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    const target = recipient.trim();
    if (!isAddress(target)) {
      setError("Please provide a valid 0x Ethereum address.");
      return;
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid transfer amount greater than 0.");
      return;
    }

    if (!signer) {
      setError("Connect your wallet or select a dev account first.");
      return;
    }

    setIsSubmitting(true);
    try {
      let hash = "";
      if (token === "USDC") {
        const raw = toRawUsdc(amount);
        if (usdcBalance !== null && raw > usdcBalance) {
          throw new Error("Insufficient USDC balance.");
        }
        hash = await transferUsdc(signer, target, raw);
      } else {
        const wei = parseEther(amount);
        if (ethBalance !== null && wei > ethBalance) {
          throw new Error("Insufficient ETH balance.");
        }
        hash = await transferEth(signer, target, wei);
      }

      setTxHash(hash);
      refreshBalance();
      setAmount("");
    } catch (err: any) {
      setError(errMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-auto max-h-[90vh] overflow-y-auto glass-panel p-6 sm:p-8 rounded-2xl border border-cyan-500/30 space-y-6 custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Direct Token Transfer</h3>
              <p className="text-[11px] font-mono text-cyan-400">
                SEND USDC & ETH BETWEEN WALLETS ON {CHAIN.network.toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sender Status */}
        <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl flex items-center justify-between text-xs font-mono">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase text-gray-500">From (Active Signer)</div>
            <div className="text-white font-semibold">
              {address ? formatAddress(address) : "Not Connected"}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="text-[10px] uppercase text-gray-500">Available Balance</div>
            <div className="text-cyan-300 font-bold">
              {currentBalFormatted} {token}
            </div>
          </div>
        </div>

        <form onSubmit={handleTransfer} className="space-y-5">
          {/* Token Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-gray-300">
              Select Token
            </label>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <button
                type="button"
                onClick={() => setToken("USDC")}
                className={`py-2.5 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all ${
                  token === "USDC"
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <Coins className="h-4 w-4" />
                USDC (MockUSDC)
              </button>
              <button
                type="button"
                onClick={() => setToken("ETH")}
                className={`py-2.5 rounded-lg border font-semibold flex items-center justify-center gap-2 transition-all ${
                  token === "ETH"
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-white/[0.02] border-white/10 text-gray-400 hover:text-white"
                }`}
              >
                <Wallet className="h-4 w-4" />
                ETH (Gas / Native)
              </button>
            </div>
          </div>

          {/* Quick Recipient Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-300">
                Recipient Destination
              </label>
              {recipientOptions.length > 0 && (
                <span className="text-[10px] text-gray-500 font-mono">Quick-pick presets</span>
              )}
            </div>

            <select
              onChange={(e) => {
                if (e.target.value) setRecipient(e.target.value);
              }}
              defaultValue=""
              className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            >
              <option value="" className="bg-[#0c101a] text-gray-400">
                -- Choose from Quick Presets (Dev / Creators / Book) --
              </option>
              {recipientOptions.map((opt, i) => (
                <option key={`${opt.address}-${i}`} value={opt.address} className="bg-[#0c101a]">
                  {opt.label} ({opt.address.slice(0, 6)}...{opt.address.slice(-4)})
                </option>
              ))}
            </select>

            <input
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Or paste recipient address 0x..."
              className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono mt-1.5"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono uppercase tracking-wider text-gray-300">
                Transfer Amount
              </label>
              <button
                type="button"
                onClick={handleSetMax}
                className="text-[10px] font-mono text-cyan-400 hover:underline font-semibold"
              >
                Use Max Balance
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={token === "USDC" ? "500" : "1.0"}
                className="w-full rounded-lg bg-white/[0.04] border border-white/10 p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 font-mono pr-16"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                {token}
              </span>
            </div>

            {/* Quick preset amount chips */}
            <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-[10px]">
              {token === "USDC"
                ? ["100", "500", "1000", "2500"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                    >
                      +{preset}
                    </button>
                  ))
                : ["0.1", "0.5", "1", "5"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border border-white/10"
                    >
                      +{preset}
                    </button>
                  ))}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {txHash && (
            <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                Transfer Confirmed on Blockchain!
              </div>
              <div className="text-[11px] text-gray-400 break-all">
                Tx: {txHash}
              </div>
              {EXPLORER_URL && (
                <a
                  href={`${EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                >
                  View on Explorer <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            {!address ? (
              <button
                type="button"
                onClick={() => connect()}
                className="px-5 py-2.5 rounded-lg bg-cyan-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:bg-cyan-400 font-mono"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:from-cyan-400 hover:to-emerald-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 transition-all font-mono"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-3.5 w-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                    Broadcasting...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Send {token}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
