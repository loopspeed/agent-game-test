"use client";
import { useFrame } from "@react-three/fiber";
import type { FC } from "react";
import Player from "./Player";
import * as THREE from "three";
import { useWorldStore } from "@/stores/worldStore";

const Scene: FC = () => {
  // Update world motion each frame if needed
  useFrame(() => {
    // Placeholder for world update logic (move rings, check despawn)
  });

  /* GRID LINES */
  const lanesX = useWorldStore((state) => state.laneX || [-1, 0, 1]);
  const lanesY = useWorldStore((state) => state.laneY || [-1, 0, 1]);

  // Assuming symmetrical lanes, the playable width is (last – first)
  const gridSizeX = Math.abs(lanesX[lanesX.length - 1] - lanesX[0]);
  const gridSizeY = Math.abs(lanesY[lanesY.length - 1] - lanesY[0]);

  // Number of divisions is one less than number of lanes
  const divisionsX = lanesX.length - 1;
  const divisionsY = lanesY.length - 1;

  // Use the larger dimension for a square grid; if your grid isn’t square, you can render two helpers or a custom line mesh
  const gridSize = Math.max(gridSizeX, gridSizeY);
  const divisions = Math.max(divisionsX, divisionsY);

  return (
    <>
      {/* Ambient and directional lights for basic illumination */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 7.5]} intensity={1} />
      {/* Player avatar */}
      <Player />
      {/* Rings will be spawned here in the future */}
      <gridHelper
        args={[gridSize, divisions]}
        rotation={[Math.PI / 2, 0, 0]} // rotate from XZ to XY plane
        position={[0, 0, 0]} // centre on the origin; adjust z if needed
        material={new THREE.LineBasicMaterial({ color: 0x555555 })}
      />
    </>
  );
};

export default Scene;
