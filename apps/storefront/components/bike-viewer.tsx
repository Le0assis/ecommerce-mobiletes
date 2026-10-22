"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useSyncExternalStore } from "react";

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function BikeViewer({ color }: { color: string }) {
  const reduce = useSyncExternalStore(subscribeMotion, reducedMotion, () => false);

  return (
    <Canvas camera={{ position: [3.6, 1.45, 3.8], fov: 32 }} dpr={[1, 1.6]}>
      <color attach="background" args={["#101013"]} />
      <ambientLight intensity={0.35} />
      <spotLight position={[5, 6, 4]} intensity={50} angle={0.45} penumbra={0.8} color="#fff4ec" />
      <directionalLight position={[-4, 2, -2]} intensity={1.6} color="#9ec9ff" />
      <LowBike color={color} />
      <OrbitControls autoRotate={!reduce} autoRotateSpeed={0.65} enablePan={false} minDistance={3} maxDistance={7} />
    </Canvas>
  );
}

function LowBike({ color }: { color: string }) {
  return (
    <group position={[0, -0.2, 0]}>
      <Wheel position={[-1.15, 0, 0]} />
      <Wheel position={[1.15, 0, 0]} />
      <mesh position={[-0.45, 0.16, 0]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.95, 0.05, 0.1]} />
        <meshStandardMaterial color="#2a2a2e" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0.05, 0.42, 0]} rotation={[0, 0, -0.16]}>
        <boxGeometry args={[1.55, 0.07, 0.08]} />
        <meshStandardMaterial color="#1a1a1e" metalness={0.7} roughness={0.25} />
      </mesh>
      <mesh position={[-0.02, 0.58, 0]}>
        <boxGeometry args={[0.82, 0.26, 0.32]} />
        <meshStandardMaterial color={color} metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[-0.12, 0.76, 0]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[0.62, 0.07, 0.26]} />
        <meshStandardMaterial color="#121214" roughness={0.72} />
      </mesh>
      <mesh position={[-0.82, 0.6, 0]} rotation={[0, 0, 0.32]}>
        <boxGeometry args={[0.5, 0.07, 0.2]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.32} />
      </mesh>
      <mesh position={[0.95, 0.38, 0]} rotation={[0, 0, -0.38]}>
        <boxGeometry args={[0.07, 0.72, 0.07]} />
        <meshStandardMaterial color="#d9d4cc" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.7, 0.78, 0]} rotation={[0, 0, -1.05]}>
        <boxGeometry args={[0.42, 0.035, 0.035]} />
        <meshStandardMaterial color="#111114" metalness={0.5} roughness={0.3} />
      </mesh>
      <mesh position={[-1.02, 0.68, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={0.85} />
      </mesh>
    </group>
  );
}

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.42, 0.07, 16, 40]} />
        <meshStandardMaterial color="#121214" roughness={0.75} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.18, 20]} />
        <meshStandardMaterial color="#e6e2da" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}
