"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { JsonRpcSigner } from "ethers";
import { connectWallet, errMessage, getUsdcBalance } from "@/lib/chain";

interface WalletCtx {
  signer: JsonRpcSigner | null;
  address: string | null;
  usdcBalance: bigint | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<JsonRpcSigner | null>;
  refreshBalance: () => Promise<void>;
}

const Ctx = createContext<WalletCtx | null>(null);

export function useWallet() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used inside WalletProvider");
  return c;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!signer) return;
    try {
      setUsdcBalance(await getUsdcBalance(signer));
    } catch {
      setUsdcBalance(null);
    }
  }, [signer]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const s = await connectWallet();
      setSigner(s);
      setAddress(await s.getAddress());
      return s;
    } catch (e) {
      setError(errMessage(e));
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Reset on account/chain change
  useEffect(() => {
    const eth = typeof window !== "undefined" ? (window as any).ethereum : null;
    if (!eth?.on) return;
    const reset = () => {
      setSigner(null);
      setAddress(null);
      setUsdcBalance(null);
    };
    eth.on("accountsChanged", reset);
    eth.on("chainChanged", reset);
    return () => {
      eth.removeListener?.("accountsChanged", reset);
      eth.removeListener?.("chainChanged", reset);
    };
  }, []);

  return (
    <Ctx.Provider value={{ signer, address, usdcBalance, connecting, error, connect, refreshBalance }}>
      {children}
    </Ctx.Provider>
  );
}
