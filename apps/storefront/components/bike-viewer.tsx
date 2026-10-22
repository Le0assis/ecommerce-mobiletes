"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";

export function BikeViewer({ color }: { color: string }) {
  return (
    <Canvas camera={{ position: [3.6, 1.45, 3.8], fov: 32 }} dpr={[1, 1.6]}>
      <color attach="background" args={["#101013"]} />
      <ambientLight intensity={0.35} />
      <spotLight position={[5, 6, 4]} intensity={50} angle={0.45} penumbra={0.8} color="#fff4ec" />
      <directionalLight position={[-4, 2, -2]} intensity={1.6} color="#9ec9ff" />
      <LowBike color={color} />
      <OrbitControls autoRotate autoRotateSpeed={0.65} enablePan={false} minDistance={3} maxDistance={7} />
    </Canvas>
  );
}

function LowBike({ color }: { color: string }) {
  return (
    <group position={[0, -0.35, 0]}>
      <Wheel position={[-1.05, 0, 0]} />
      <Wheel position={[1.05, 0, 0]} />
      <mesh position={[0, 0.35, 0]} rotation={[0, 0, -0.15]} castShadow>
        <boxGeometry args={[1.7, 0.28, 0.38]} />
        <meshStandardMaterial color={color} metalness={0.45} roughness={0.35} />
      </mesh>
      <mesh position={[-0.15, 0.52, 0]}>
        <boxGeometry args={[0.7, 0.16, 0.32]} />
        <meshStandardMaterial color="#141416" roughness={0.6} />
      </mesh>
      <mesh position={[0.85, 0.48, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.7, 0.12, 0.28]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.32} />
      </mesh>
      <mesh position={[-0.95, 0.42, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#ff2d2d" emissive="#ff2d2d" emissiveIntensity={0.6} />
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
