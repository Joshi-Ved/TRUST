"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { JsonRpcSigner } from "ethers";
import { connectWallet, errMessage, getUsdcBalance, getEthereum, restoreWallet } from "@/lib/chain";

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

  // Restore an already-authorized session on load, and re-sync on account/chain change
  useEffect(() => {
    let eth: any;
    try {
      eth = getEthereum();
    } catch {
      return;
    }
    const sync = async () => {
      try {
        const s = await restoreWallet();
        setSigner(s);
        setAddress(s ? await s.getAddress() : null);
        if (!s) setUsdcBalance(null);
      } catch {
        setSigner(null);
        setAddress(null);
      }
    };
    sync();
    if (!eth?.on) return;
    eth.on("accountsChanged", sync);
    eth.on("chainChanged", sync);
    return () => {
      eth.removeListener?.("accountsChanged", sync);
      eth.removeListener?.("chainChanged", sync);
    };
  }, []);

  return (
    <Ctx.Provider value={{ signer, address, usdcBalance, connecting, error, connect, refreshBalance }}>
      {children}
    </Ctx.Provider>
  );
}
