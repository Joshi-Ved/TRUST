import { keccak256, toUtf8Bytes } from "ethers";

// Shared by Creator Studio (signs) and /api/influencers (verifies), so both build the exact same message.

export type CreatorPlatform = "x" | "youtube";

/** Max age of a signed registration, so an old signature cannot be replayed later. */
export const REGISTRATION_TTL_MS = 15 * 60 * 1000;

export const normHandle = (h: string) => h.trim().replace(/^@/, "").replace(/^https?:\/\/[^/]+\/@?/, "").split(/[/?#]/)[0];

/**
 * Code the creator puts in their bio or a post. It is tied to the payout wallet, so only the real
 * account owner can link that account to their wallet.
 */
export const ownershipCode = (wallet: string) => `TRUST-${keccak256(toUtf8Bytes(wallet.toLowerCase())).slice(2, 10).toUpperCase()}`;

export const registrationMessage = (platform: CreatorPlatform, handle: string, wallet: string, issuedAt: number) =>
  [
    "TRUST creator registration",
    `Platform: ${platform === "x" ? "X / Twitter" : "YouTube"}`,
    `Handle: @${normHandle(handle)}`,
    `Payout wallet: ${wallet}`,
    `Code: ${ownershipCode(wallet)}`,
    `Issued: ${new Date(issuedAt).toISOString()}`,
  ].join("\n");
