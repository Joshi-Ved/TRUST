import { Actor, HttpAgent, ActorSubclass } from "@dfinity/agent";
import { idlFactory } from "./trust_order_engine.did.js";
import type { _SERVICE } from "./trust_order_engine.did.js";

export const CANISTER_ID = process.env.NEXT_PUBLIC_TRUST_CANISTER_ID || "rrkah-fqaaa-aaaaa-aaaaq-cai";

export const createActor = (canisterId = CANISTER_ID, options: { agentOptions?: any } = {}): ActorSubclass<_SERVICE> => {
  const agent = new HttpAgent({
    host: process.env.NEXT_PUBLIC_IC_HOST || "https://icp0.io",
    ...options.agentOptions,
  });

  // Fetch root key for certificate validation during local dev
  if (process.env.NODE_ENV !== "production") {
    agent.fetchRootKey().catch((err) => {
      console.warn("Unable to fetch root key. Check if local replica is running:", err);
    });
  }

  return Actor.createActor<_SERVICE>(idlFactory, {
    agent,
    canisterId,
  });
};
