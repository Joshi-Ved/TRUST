"use client";

import { useCallback, useEffect, useState } from "react";
import { INITIAL_INFLUENCERS, InfluencerProfile } from "./icp-agent";

/** Creator registry, persisted on the server (frontend/.data/influencers.json). */
export function useInfluencers() {
  const [influencers, setInfluencers] = useState<InfluencerProfile[]>(INITIAL_INFLUENCERS);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/influencers", { cache: "no-store" });
      if (res.ok) setInfluencers(await res.json());
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Creator self-registration (see /api/influencers POST). Throws with the server's reason if the profile cannot be verified. */
  const register = useCallback(
    async (input: { platform: "x" | "youtube"; handle: string; evmAddress: string; issuedAt: number; signature: string; niche?: string }): Promise<InfluencerProfile> => {
      const res = await fetch("/api/influencers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not register creator");
      await reload();
      return data;
    },
    [reload]
  );

  const remove = useCallback(async (inf: InfluencerProfile) => {
    const res = await fetch(`/api/influencers?platform=${encodeURIComponent(inf.platform)}&handle=${encodeURIComponent(inf.handle)}`, {
      method: "DELETE",
    });
    if (res.ok) setInfluencers(await res.json());
  }, []);

  return { influencers, loaded, register, remove, reload };
}
