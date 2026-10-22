"use client";

import React from "react";

interface LaserBeamBorderProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "emerald" | "cyan";
}

export function LaserBeamBorder({
  children,
  className = "",
  glowColor = "cyan",
}: LaserBeamBorderProps) {
  const glowStyles =
    glowColor === "emerald"
      ? "from-emerald-500/20 via-emerald-400 to-transparent"
      : "from-cyan-500/25 via-cyan-400 to-transparent";

  return (
    <div className={`relative p-[1px] rounded-xl overflow-hidden group ${className}`}>
      {/* Animated edge beam */}
      <div
        className={`absolute -inset-[100%] rounded-xl opacity-40 group-hover:opacity-100 transition-opacity duration-500 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,transparent_270deg,#06b6d4_360deg)] animate-[spin_6s_linear_infinite] pointer-events-none`}
      />
      <div className="relative rounded-xl bg-[#0c101a] border border-white/10 h-full w-full flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
