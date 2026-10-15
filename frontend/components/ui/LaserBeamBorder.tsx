"use client";

import React from "react";

interface LaserBeamBorderProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "emerald" | "cyan";
}

/** Kept for API compatibility; renders a plain bordered panel. */
export function LaserBeamBorder({ children, className = "" }: LaserBeamBorderProps) {
  return <div className={`rounded-lg border border-gray-300 bg-white shadow-sm ${className}`}>{children}</div>;
}
