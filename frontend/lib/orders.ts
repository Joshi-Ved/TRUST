"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { INITIAL_ORDERS, Order } from "./icp-agent";

const KEY = "trust.orders.v1";

/** Orders shared between advertiser and creator portals (same browser) via localStorage. */
export function useOrders() {
  const [orders, setOrdersState] = useState<Order[]>(INITIAL_ORDERS);
  const loaded = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOrdersState(JSON.parse(raw));
    } catch {}
    loaded.current = true;
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) setOrdersState(JSON.parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setOrders = useCallback((update: Order[] | ((prev: Order[]) => Order[])) => {
    setOrdersState((prev) => {
      const next = typeof update === "function" ? update(prev) : update;
      if (loaded.current) {
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  return [orders, setOrders] as const;
}
