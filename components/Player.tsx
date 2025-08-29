"use client";
import { useRef } from "react";
import type { FC, RefObject } from "react";
import { RigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useInputStore } from "../stores/inputStore";
import { useWorldStore } from "../stores/worldStore";
import { Mesh, Object3D } from "three";

const Player: FC = () => {
  const bodyRef = useRef<RefObject<Mesh>>(null);
  const input = useInputStore();
  const lanesX = useWorldStore((state) => state.laneX || [-2, 0, 2]);
  // Use a symmetrical vertical lane array for 3×3 grid
  const lanesY = useWorldStore((state) => state.laneY || [-2, 0, 2]);
  const currentX = useRef(0);
  const currentY = useRef(0);

  // Update kinematic position based on input each frame
  useFrame(() => {
    // Determine target lane based on input flags
    let targetX = currentX.current;
    let targetY = currentY.current;
    if (input.left)
      targetX = lanesX[Math.max(0, lanesX.indexOf(currentX.current) - 1)];
    if (input.right)
      targetX =
        lanesX[
          Math.min(lanesX.length - 1, lanesX.indexOf(currentX.current) + 1)
        ];
    if (input.up)
      targetY =
        lanesY[
          Math.min(lanesY.length - 1, lanesY.indexOf(currentY.current) + 1)
        ];
    if (input.down)
      targetY = lanesY[Math.max(0, lanesY.indexOf(currentY.current) - 1)];
    // Lerp towards target for smooth movement
    currentX.current += (targetX - currentX.current) * 0.2;
    currentY.current += (targetY - currentY.current) * 0.2;
    // Update body translation
    if (bodyRef.current) {
      // The Rapier kinematic body expects a 3D position; z stays 0 for the player
      bodyRef.current.position.set(currentX.current, currentY.current, 0);
    }
  });

  return (
    <RigidBody type="kinematicPosition" colliders="cuboid" position={[0, 0, 0]}>
      <mesh ref={bodyRef} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#E97449" />
      </mesh>
    </RigidBody>
  );
};

export default Player;
