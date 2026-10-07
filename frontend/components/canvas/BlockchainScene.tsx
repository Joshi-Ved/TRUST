"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// Generate deterministic pseudo-random particle cloud
function generateParticles(count = 2500) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = THREE.MathUtils.randFloatSpread(360);
    const phi = THREE.MathUtils.randFloatSpread(360);
    const distance = 4 + Math.random() * 8;

    positions[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
    positions[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
    positions[i * 3 + 2] = distance * Math.cos(theta);
  }
  return positions;
}

const particlePositions = generateParticles(2500);

function CrystallineEscrowCore({ isPulsing = false }: { isPulsing?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const outerRingRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    meshRef.current.rotation.x += delta * 0.25;
    meshRef.current.rotation.y += delta * 0.35;
    outerRingRef.current.rotation.z -= delta * 0.15;
    outerRingRef.current.rotation.x += delta * 0.1;
  });

  return (
    <group>
      {/* Central Rotating Escrow Core */}
      <Float speed={2} rotationIntensity={1.2} floatIntensity={1.5}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[2.2, 1]} />
          <meshStandardMaterial
            wireframe
            color={isPulsing ? "#34d399" : "#10b981"}
            emissive={isPulsing ? "#10b981" : "#059669"}
            emissiveIntensity={isPulsing ? 2.5 : 1.2}
            roughness={0.2}
            metalness={0.9}
          />
        </mesh>
      </Float>

      {/* Outer Cryptographic Resonance Ring */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[3.8, 0.04, 16, 100]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

function ParticleCloud() {
  const pointsRef = useRef<THREE.Points>(null!);

  useFrame((_, delta) => {
    pointsRef.current.rotation.y += delta * 0.04;
    pointsRef.current.rotation.x += delta * 0.02;
  });

  return (
    <Points ref={pointsRef} positions={particlePositions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#34d399"
        size={0.035}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  );
}

function CameraRig() {
  useFrame((state) => {
    // Subtle mouse parallax tilt
    const targetX = (state.pointer.x * 2);
    const targetY = (state.pointer.y * 1.5) + 0.5;
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.04);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.04);
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function BlockchainScene({ isPulsing = false }: { isPulsing?: boolean }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <Canvas
        camera={{ position: [0, 1, 9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#10b981" />
        <pointLight position={[-10, -10, -5]} intensity={1.2} color="#06b6d4" />
        
        <CrystallineEscrowCore isPulsing={isPulsing} />
        <ParticleCloud />
        <CameraRig />
      </Canvas>
    </div>
  );
}
