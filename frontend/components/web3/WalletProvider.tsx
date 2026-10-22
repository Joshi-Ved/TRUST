"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AnySigner,
  CHAIN,
  DevAccount,
  LOCAL_DEV_ACCOUNTS,
  connectWallet,
  errMessage,
  getDevSigner,
  getEthereum,
  getUsdcBalance,
  requestTestFunds,
  restoreWallet,
} from "@/lib/chain";

interface WalletCtx {
  signer: AnySigner | null;
  address: string | null;
  usdcBalance: bigint | null;
  ethBalance: bigint | null;
  /** False until the saved wallet session has been restored (or found absent) on page load. */
  ready: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<AnySigner | null>;
  connectDevAccount: (accountId: string) => Promise<AnySigner | null>;
  disconnect: () => void;
  activeDevAccount: DevAccount | null;
  requestFaucet: (targetAddr?: string) => Promise<void>;
  refreshBalance: () => Promise<void>;
}

const Ctx = createContext<WalletCtx | null>(null);

export function useWallet() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used inside WalletProvider");
  return c;
}

const DEV_KEY = "trust.activeDevAccount";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [signer, setSigner] = useState<AnySigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [activeDevAccount, setActiveDevAccount] = useState<DevAccount | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<bigint | null>(null);
  const [ethBalance, setEthBalance] = useState<bigint | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!signer) return;
    try {
      const addr = await signer.getAddress();
      setUsdcBalance(await getUsdcBalance(signer));
      const provider = (signer as any).provider;
      if (provider) {
        setEthBalance(await provider.getBalance(addr));
      }
    } catch {
      setUsdcBalance(null);
      setEthBalance(null);
    }
  }, [signer]);

  const requestFaucet = useCallback(
    async (targetAddr?: string) => {
      const target = targetAddr || address;
      if (!target) return;
      try {
        const res = await fetch("/api/dev/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: target }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Faucet failed");
        await refreshBalance();
      } catch (e) {
        setError(errMessage(e));
      }
    },
    [address, refreshBalance]
  );

  const connectDevAccount = useCallback(
    async (accountId: string) => {
      setConnecting(true);
      setError(null);
      try {
        const dev = LOCAL_DEV_ACCOUNTS.find((a) => a.id === accountId);
        if (!dev) throw new Error("Dev account not found");
        const s = getDevSigner(dev.privateKey);
        const addr = dev.address;
        setSigner(s);
        setAddress(addr);
        setActiveDevAccount(dev);
        if (typeof window !== "undefined") localStorage.setItem(DEV_KEY, accountId);
        await requestTestFunds(s).catch(() => {});
        return s;
      } catch (e) {
        setError(errMessage(e));
        return null;
      } finally {
        setConnecting(false);
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    setSigner(null);
    setAddress(null);
    setActiveDevAccount(null);
    setUsdcBalance(null);
    setEthBalance(null);
    if (typeof window !== "undefined") localStorage.removeItem(DEV_KEY);
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      // First try browser wallet / MetaMask
      const s = await connectWallet();
      const addr = await s.getAddress();
      setActiveDevAccount(null);
      if (typeof window !== "undefined") localStorage.removeItem(DEV_KEY);
      await requestTestFunds(s).catch((e) => setError(errMessage(e)));
      setSigner(s);
      setAddress(addr);
      return s;
    } catch (e) {
      // If no wallet extension found and on localhost, auto-connect to Dev Account #0
      if (CHAIN.chainId === 31337 && /No wallet found/i.test(errMessage(e))) {
        return await connectDevAccount("account-0");
      }
      setError(errMessage(e));
      return null;
    } finally {
      setConnecting(false);
    }
  }, [connectDevAccount]);

  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  // Restore session: check saved dev account first, then MetaMask
  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined") {
        const savedDev = localStorage.getItem(DEV_KEY);
        if (savedDev && CHAIN.chainId === 31337) {
          const found = LOCAL_DEV_ACCOUNTS.find((a) => a.id === savedDev);
          if (found) {
            const s = getDevSigner(found.privateKey);
            setSigner(s);
            setAddress(found.address);
            setActiveDevAccount(found);
            setReady(true);
            return;
          }
        }
      }

      let eth: any;
      try {
        eth = getEthereum();
      } catch {
        // If on localhost and no MetaMask, default to Dev Account #0 so everything works out of the box
        if (CHAIN.chainId === 31337) {
          const defaultDev = LOCAL_DEV_ACCOUNTS[0];
          const s = getDevSigner(defaultDev.privateKey);
          setSigner(s);
          setAddress(defaultDev.address);
          setActiveDevAccount(defaultDev);
        }
        setReady(true);
        return;
      }

      try {
        const s = await restoreWallet();
        const addr = s ? await s.getAddress() : null;
        if (s && CHAIN.chainId === 31337) await requestTestFunds(s).catch((e) => setError(errMessage(e)));
        setSigner(s);
        setAddress(addr);
        if (!s && CHAIN.chainId === 31337) {
          // If no accounts authorized yet in MetaMask on localhost, fallback to default dev account
          const defaultDev = LOCAL_DEV_ACCOUNTS[0];
          const ds = getDevSigner(defaultDev.privateKey);
          setSigner(ds);
          setAddress(defaultDev.address);
          setActiveDevAccount(defaultDev);
        }
      } catch {
        if (CHAIN.chainId === 31337) {
          const defaultDev = LOCAL_DEV_ACCOUNTS[0];
          const ds = getDevSigner(defaultDev.privateKey);
          setSigner(ds);
          setAddress(defaultDev.address);
          setActiveDevAccount(defaultDev);
        }
      }
      setReady(true);
    };

    init();

    let eth: any;
    try {
      eth = getEthereum();
    } catch {
      return;
    }
    const sync = async () => {
      try {
        const s = await restoreWallet();
        const addr = s ? await s.getAddress() : null;
        if (s) {
          setActiveDevAccount(null);
          if (typeof window !== "undefined") localStorage.removeItem(DEV_KEY);
        }
        setSigner(s);
        setAddress(addr);
      } catch {}
    };
    if (eth?.on) {
      eth.on("accountsChanged", sync);
      eth.on("chainChanged", sync);
    }
    return () => {
      eth?.removeListener?.("accountsChanged", sync);
      eth?.removeListener?.("chainChanged", sync);
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        signer,
        address,
        usdcBalance,
        ethBalance,
        ready,
        connecting,
        error,
        connect,
        connectDevAccount,
        disconnect,
        activeDevAccount,
        requestFaucet,
        refreshBalance,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
