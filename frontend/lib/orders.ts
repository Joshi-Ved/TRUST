"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_ORDERS, Order } from "./icp-agent";

// Pre-server versions kept orders in localStorage; entries found there are moved to the server once.
const LEGACY_KEY = "trust.orders.v1";
const POLL_MS = 5000;

async function postOrders(changed: Order[]): Promise<Order[]> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changed),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Could not save orders");
  return data;
}

/**
 * Orders shared between advertiser and creator portals, persisted on the server
 * (frontend/.data/orders.json) and polled so every open tab sees status changes.
 */
export function useOrders() {
  const [orders, setOrdersState] = useState<Order[]>(INITIAL_ORDERS);
  const current = useRef<Order[]>(INITIAL_ORDERS);

  const apply = useCallback((next: Order[]) => {
    current.current = next;
    setOrdersState(next);
  }, []);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.ok) apply(await res.json());
    } catch {}
  }, [apply]);

  useEffect(() => {
    (async () => {
      let legacy: Order[] = [];
      try {
        legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
      } catch {}
      if (legacy.length) {
        try {
          apply(await postOrders(legacy));
          localStorage.removeItem(LEGACY_KEY);
          return;
        } catch {}
      }
      await reload();
    })();
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), POLL_MS);
    return () => clearInterval(timer);
  }, [apply, reload]);

  const setOrders = useCallback(
    (update: Order[] | ((prev: Order[]) => Order[])) => {
      const prev = current.current;
      const next = typeof update === "function" ? update(prev) : update;
      apply(next);
      const changed = next.filter((o) => !prev.includes(o));
      if (changed.length) postOrders(changed).then(apply).catch(() => reload());
    },
    [apply, reload]
  );

  return [orders, setOrders, reload] as const;
}
