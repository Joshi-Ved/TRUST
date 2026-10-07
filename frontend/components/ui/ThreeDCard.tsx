"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface ThreeDCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ThreeDCard({ children, className = "", onClick }: ThreeDCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Raw mouse coordinates
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth physics springs
  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 20 });

  // 3D rotation transforms
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["14deg", "-14deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-14deg", "14deg"]);

  // Dynamic glare coordinates
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      style={{ perspective: 1200 }}
      className="w-full flex items-center justify-center"
      onClick={onClick}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={`relative rounded-2xl transition-shadow duration-300 ${className} ${
          isHovered ? "shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(16,185,129,0.2)]" : ""
        }`}
      >
        {/* Dynamic Specular Glare Reflection */}
        {isHovered && (
          <motion.div
            style={{
              background: `radial-gradient(circle 220px at ${glareX} ${glareY}, rgba(255,255,255,0.08), transparent 70%)`,
            }}
            className="pointer-events-none absolute inset-0 rounded-2xl z-20"
          />
        )}

        {/* Content with Depth Preservation */}
        <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}
