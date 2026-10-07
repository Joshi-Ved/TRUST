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
  glowColor = "emerald",
}: LaserBeamBorderProps) {
  const isEmerald = glowColor === "emerald";

  return (
    <div className={`relative p-[1.5px] overflow-hidden rounded-2xl group ${className}`}>
      {/* Racing Laser Border Beam */}
      <div
        className={`absolute inset-[-100%] animate-[spin_4s_linear_infinite] opacity-80 ${
          isEmerald
            ? "bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#10b981_50%,#06b6d4_100%)]"
            : "bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#06b6d4_50%,#10b981_100%)]"
        }`}
      />

      {/* Surface Shell */}
      <div className="relative rounded-2xl bg-[#080c16]/95 backdrop-blur-2xl h-full w-full">
        {children}
      </div>
    </div>
  );
}
