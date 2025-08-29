"use client";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { Vector3 } from "three";
import { useMemo } from "react";

interface SlotData {
  id: string;
  label: string;
  isCorrect: boolean;
  position: [number, number, number];
}

interface RingProps {
  questionId: string;
  slots: SlotData[];
  radius: number;
  z: number;
  ringId: string;
}

export default function Ring({ slots, z, ringId }: RingProps) {
  // Precompute slot meshes/colliders
  return (
    <>
      {slots.map((slot) => (
        <RigidBody
          key={slot.id}
          type="kinematicPosition"
          colliders={false}
          position={[slot.position[0], slot.position[1], z]}
          userData={{ slotId: slot.id, ringId, isCorrect: slot.isCorrect }}
        >
          {/* Visual panel */}
          <mesh>
            <boxGeometry args={[1, 0.2, 0.1]} />
            <meshStandardMaterial
              color={slot.isCorrect ? "#609A92" : "#2B403E"}
            />
          </mesh>
          {/* Sensor collider same size as panel */}
          <CuboidCollider
            args={[0.5, 0.1, 0.05]}
            sensor
            onCollisionEnter={() => console.log("Collision detected")}
          />
        </RigidBody>
      ))}
    </>
  );
}
