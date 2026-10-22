"use client";

import { useCallback, useEffect, useState } from "react";

export interface SavedAddress {
  address: string; // EIP-55 checksummed
  label: string;
  note?: string;
  addedAt: number;
}

// Pre-server versions kept the book in localStorage; entries found there are moved to the server once.
const LEGACY_KEY = "trust.addressBook.v1";

async function call(method: string, query = "", body?: unknown): Promise<SavedAddress[]> {
  const res = await fetch(`/api/addresses${query}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Address book request failed");
  return data;
}

/** User-labelled addresses, persisted on the server (frontend/.data/addresses.json). */
export function useAddressBook() {
  const [entries, setEntries] = useState<SavedAddress[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let legacy: SavedAddress[] = [];
      try {
        legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
      } catch {}
      if (legacy.length) {
        setEntries(await call("POST", "", legacy));
        try {
          localStorage.removeItem(LEGACY_KEY);
        } catch {}
      } else {
        setEntries(await call("GET"));
      }
    })().catch((e) => setError(e.message));
  }, []);

  const save = useCallback(async (entry: Omit<SavedAddress, "addedAt">) => {
    setError(null);
    try {
      setEntries(await call("POST", "", entry));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const remove = useCallback(async (address: string) => {
    setError(null);
    try {
      setEntries(await call("DELETE", `?address=${encodeURIComponent(address)}`));
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  return { entries, error, save, remove };
}
