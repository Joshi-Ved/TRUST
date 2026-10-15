"use client";

import React from "react";

interface ThreeDCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Kept for API compatibility; renders a plain wrapper (no tilt effects). */
export function ThreeDCard({ children, className = "", onClick }: ThreeDCardProps) {
  return (
    <div className={className} onClick={onClick}>
      {children}
    </div>
  );
}
