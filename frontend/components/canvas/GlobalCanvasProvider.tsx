"use client";

import dynamic from "next/dynamic";

const DynamicBlockchainScene = dynamic(
  () => import("@/components/canvas/BlockchainScene"),
  { ssr: false }
);

export function GlobalCanvasProvider() {
  return <DynamicBlockchainScene />;
}
