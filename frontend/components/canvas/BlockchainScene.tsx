"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import { usePathname } from "next/navigation";
import * as THREE from "three";

function generateParticlePositions(count = 3500) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = THREE.MathUtils.randFloatSpread(360);
    const phi = THREE.MathUtils.randFloatSpread(360);
    const distance = 4 + Math.random() * 9;

    positions[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = distance * Math.cos(theta);
  }
  return positions;
}

function CrystallineEscrowCore({ mode = "landing" }: { mode: string }) {
  const coreRef = useRef<THREE.Mesh>(null!);
  const outerRingRef = useRef<THREE.Mesh>(null!);
  const secondRingRef = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (coreRef.current) {
      coreRef.current.rotation.x += delta * (mode === "advertiser" ? 0.35 : 0.2);
      coreRef.current.rotation.y += delta * (mode === "influencer" ? 0.45 : 0.25);
    }
    if (outerRingRef.current) {
      outerRingRef.current.rotation.z -= delta * 0.15;
      outerRingRef.current.rotation.x += delta * 0.08;
    }
    if (secondRingRef.current) {
      secondRingRef.current.rotation.y += delta * 0.18;
      secondRingRef.current.rotation.x -= delta * 0.12;
    }
  });

  const coreColor = mode === "influencer" ? "#06b6d4" : "#10b981";
  const emissiveColor = mode === "influencer" ? "#0891b2" : "#059669";

  return (
    <group>
      <Float speed={2.5} rotationIntensity={1.5} floatIntensity={1.8}>
        <mesh ref={coreRef}>
          <icosahedronGeometry args={[2.1, 1]} />
          <meshStandardMaterial
            wireframe
            color={coreColor}
            emissive={emissiveColor}
            emissiveIntensity={1.4}
            roughness={0.15}
            metalness={0.9}
          />
        </mesh>
      </Float>

      {/* Orbiting Satellite Cryptographic Rings */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[3.6, 0.035, 16, 100]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} />
      </mesh>

      <mesh ref={secondRingRef}>
        <torusGeometry args={[4.2, 0.025, 16, 100]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function ParticleField({ positions }: { positions: Float32Array }) {
  const pointsRef = useRef<THREE.Points>(null!);

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.03;
      pointsRef.current.rotation.x += delta * 0.015;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#34d399"
        size={0.032}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.65}
      />
    </Points>
  );
}

function DynamicCameraDirector({ mode }: { mode: string }) {
  useFrame((state) => {
    // Determine route-specific target camera coordinates
    let targetX = state.pointer.x * 1.8;
    let targetY = state.pointer.y * 1.2 + 0.4;
    let targetZ = 8.5;

    if (mode === "advertiser") {
      targetX = state.pointer.x * 2.2 + 2.5;
      targetY = state.pointer.y * 1.5 + 2.0;
      targetZ = 9.8;
    } else if (mode === "influencer") {
      targetX = state.pointer.x * 2.2 - 2.5;
      targetY = state.pointer.y * 1.5 + 1.2;
      targetZ = 9.2;
    }

    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.04);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.04);
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.04);
    state.camera.lookAt(0, 0, 0);
  });

  return null;
}

export default function BlockchainScene() {
  const pathname = usePathname();
  const particleData = useMemo(() => generateParticlePositions(3500), []);

  let currentMode = "landing";
  if (pathname?.includes("advertiser")) currentMode = "advertiser";
  if (pathname?.includes("influencer")) currentMode = "influencer";

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <Canvas
        camera={{ position: [0, 1, 8.5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 12, 10]} intensity={1.8} color="#10b981" />
        <pointLight position={[-10, -10, -5]} intensity={1.4} color="#06b6d4" />

        <CrystallineEscrowCore mode={currentMode} />
        <ParticleField positions={particleData} />
        <DynamicCameraDirector mode={currentMode} />
      </Canvas>
    </div>
  );
}
