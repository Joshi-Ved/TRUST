"use client";

import { useEffect, useMemo, useState } from "react";
import { Contract, JsonRpcProvider, getAddress, isAddress } from "ethers";
import { BookUser, Check, Copy, ExternalLink, Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useWallet } from "@/components/web3/WalletProvider";
import { TransferModal } from "@/components/web3/TransferModal";
import { useAddressBook } from "@/lib/addressBook";
import { CHAIN, EXPLORER_URL, RPC_URL } from "@/lib/chain";

interface OnChainInfo {
  eth: bigint;
  usdc: bigint;
  txCount: number;
  isContract: boolean;
}

function useOnChainInfo(address: string, provider: JsonRpcProvider) {
  const [info, setInfo] = useState<OnChainInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const usdc = new Contract(CHAIN.usdc, ["function balanceOf(address) view returns (uint256)"], provider);
    Promise.all([
      provider.getBalance(address),
      usdc.balanceOf(address).catch(() => BigInt(0)),
      provider.getTransactionCount(address),
      provider.getCode(address),
    ])
      .then(([eth, usdcBal, txCount, code]) => {
        if (!cancelled) setInfo({ eth, usdc: usdcBal, txCount, isContract: code !== "0x" });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [address, provider]);

  return { info, failed };
}

function AddressRow({
  label,
  address,
  note,
  provider,
  onRemove,
  onTransfer,
}: {
  label: string;
  address: string;
  note?: string;
  provider: JsonRpcProvider;
  onRemove?: () => void;
  onTransfer?: (address: string) => void;
}) {
  const { info, failed } = useOnChainInfo(address, provider);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3 px-5 py-4 border-b border-white/[0.06] last:border-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          {info && (
            <span
              className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                info.isContract
                  ? "text-purple-300 border-purple-500/30 bg-purple-500/10"
                  : "text-cyan-300 border-cyan-500/30 bg-cyan-500/10"
              }`}
            >
              {info.isContract ? "Contract" : "Wallet"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-gray-300 break-all">{address}</code>
          <button onClick={copy} title="Copy address" className="text-gray-500 hover:text-cyan-300 transition-colors shrink-0">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {EXPLORER_URL && (
            <a
              href={`${EXPLORER_URL}/address/${address}`}
              target="_blank"
              rel="noreferrer"
              title="View on explorer"
              className="text-gray-500 hover:text-cyan-300 transition-colors shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
        {note && <p className="text-xs text-gray-500">{note}</p>}
      </div>

      <div className="flex items-center gap-4 text-xs font-mono shrink-0">
        {failed ? (
          <span className="text-red-400">RPC unreachable</span>
        ) : !info ? (
          <span className="text-gray-500">loading...</span>
        ) : (
          <>
            <span className="text-emerald-300">{(Number(info.eth) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH</span>
            <span className="text-cyan-300">{(Number(info.usdc) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC</span>
            <span className="text-gray-500">{info.txCount} txs</span>
          </>
        )}
        {onTransfer && !info?.isContract && (
          <button
            onClick={() => onTransfer(address)}
            title="Send test USDC or ETH to this address"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-all font-semibold"
          >
            <ArrowRightLeft className="h-3 w-3" />
            Send
          </button>
        )}
        {onRemove && (
          <button onClick={onRemove} title="Remove" className="text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function AddressBookPage() {
  const { address: connected } = useWallet();
  const { entries, error: bookError, save, remove } = useAddressBook();
  const provider = useMemo(() => new JsonRpcProvider(RPC_URL, CHAIN.chainId, { staticNetwork: true }), []);

  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState<string>("");

  const projectAddresses = [
    ...(connected ? [{ label: "Your connected wallet", address: connected, note: "The MetaMask account currently connected to this app." }] : []),
    { label: "Deployer", address: CHAIN.deployer, note: "Pays gas to publish the contracts. Its key lives in contracts/.env on your machine." },
    { label: "TrustEscrow contract", address: CHAIN.escrow, note: "Holds deposited USDC until release or refund. Never send ETH here directly." },
    { label: "Test USDC (MockUSDC)", address: CHAIN.usdc, note: "Token contract. Its balance column is the contract's own holdings, not yours." },
    { label: "Settlement signer (dev)", address: CHAIN.icpSigner, note: "Address whose signature unlocks payouts. Stand-in for the ICP canister." },
  ];

  const handleStartTransfer = (targetAddr?: string) => {
    setTransferRecipient(targetAddr || "");
    setIsTransferOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = address.trim();
    if (!isAddress(trimmed)) {
      setError("That is not a valid Ethereum address (0x followed by 40 hex characters).");
      return;
    }
    if (!label.trim()) {
      setError("Give the address a label so you can recognise it later.");
      return;
    }
    save({ address: getAddress(trimmed), label: label.trim(), note: note.trim() || undefined });
    setLabel("");
    setAddress("");
    setNote("");
  };

  const inputStyle =
    "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all font-sans";

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-gray-100">
      <Navbar />

      <main className="max-w-[1100px] w-full mx-auto px-6 py-12 space-y-10 flex-1">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 mb-2 uppercase tracking-wider">
            <BookUser className="h-3.5 w-3.5" />
            {CHAIN.network === "localhost" ? "Localhost (31337)" : "Sepolia (11155111)"}
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Address Book & Token Transfer</h1>
          <p className="text-gray-400 mt-2 max-w-2xl text-sm leading-relaxed">
            Label the addresses you send to, check live on-chain balances, and transfer test tokens (USDC & ETH) directly between wallets. Saved addresses are stored on the app server and shared across browsers.
          </p>
        </div>

        {/* Direct Token Transfer Quick Action Card */}
        <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cyan-500/5 via-transparent to-emerald-500/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
              <ArrowRightLeft className="h-4 w-4 text-cyan-400" /> Direct Token Transfer (USDC / ETH)
            </div>
            <p className="text-xs text-gray-300 max-w-xl">
              Transfer test tokens directly between advertiser accounts, creator accounts, or any external wallet address with immediate transaction confirmation and balance refresh.
            </p>
          </div>
          <button
            onClick={() => handleStartTransfer("")}
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-gray-950 font-semibold text-xs tracking-wide uppercase hover:from-cyan-400 hover:to-emerald-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-mono"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Transfer Tokens
          </button>
        </div>

        <form onSubmit={submit} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="grid sm:grid-cols-[1fr_2fr] gap-4">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label, e.g. My second wallet" className={inputStyle} />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              spellCheck={false}
              className={`${inputStyle} font-mono`}
            />
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputStyle} />
          {(error || bookError) && <p className="text-xs text-red-400">{error || bookError}</p>}
          <button
            type="submit"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-200 text-xs font-medium hover:border-cyan-400 hover:text-white transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Save address
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-gray-400">Saved by you</h2>
          <div className="glass-panel rounded-2xl border border-white/10">
            {entries.length === 0 ? (
              <p className="px-5 py-6 text-sm text-gray-500">No saved addresses yet. Add one above.</p>
            ) : (
              entries.map((e) => (
                <AddressRow
                  key={e.address}
                  label={e.label}
                  address={e.address}
                  note={e.note}
                  provider={provider}
                  onRemove={() => remove(e.address)}
                  onTransfer={handleStartTransfer}
                />
              ))
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-mono uppercase tracking-wider text-gray-400">Project addresses</h2>
          <div className="glass-panel rounded-2xl border border-white/10">
            {projectAddresses.map((p) => (
              <AddressRow
                key={p.label}
                {...p}
                provider={provider}
                onTransfer={p.label === "Deployer" ? handleStartTransfer : undefined}
              />
            ))}
          </div>
        </section>
      </main>

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        defaultRecipient={transferRecipient}
      />
    </div>
  );
}
