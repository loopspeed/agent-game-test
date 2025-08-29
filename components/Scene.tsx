"use client";
import { useFrame } from "@react-three/fiber";
import type { FC } from "react";
import Player from "./Player";
// Future imports: Ring, spawn logic, world store, etc.

const Scene: FC = () => {
  // Update world motion each frame if needed
  useFrame(() => {
    // Placeholder for world update logic (move rings, check despawn)
  });

  return (
    <>
      {/* Ambient and directional lights for basic illumination */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />
      {/* Player avatar */}
      <Player />
      {/* Rings will be spawned here in the future */}
    </>
  );
};

export default Scene;
