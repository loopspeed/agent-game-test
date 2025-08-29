"use client";

import { type FC, useEffect, useRef } from "react";
import { RigidBody, RapierRigidBody } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useInputStore } from "../stores/inputStore";
import { useWorldStore } from "../stores/worldStore";
import * as THREE from "three";

const Player: FC = () => {
  const bodyRef = useRef<RapierRigidBody>(null);
  const input = useInputStore();
  const setPlayerPosition = useWorldStore((state) => state.setPlayerPosition);


  // lane definitions; use larger numbers here to enlarge the grid
  const lanesX = useWorldStore((state) => state.laneX || [-1, 0, 1]);
  const lanesY = useWorldStore((state) => state.laneY || [-1, 0, 1]);

  const laneXIndex = useRef(1);
  const laneYIndex = useRef(1);

  // current interpolated position
  const currentX = useRef(lanesX[laneXIndex.current]);
  const currentY = useRef(lanesY[laneYIndex.current]);

  // remember previous input to detect key presses
  const prevInput = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
  });

  // set the initial position once when the body is created
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.setTranslation(
        { x: currentX.current, y: currentY.current, z: 0 },
        true
      );
    }
  }, []);

  useFrame((_, delta) => {
    // update lane indices on new key press
    if (input.left && !prevInput.current.left && laneXIndex.current > 0) {
      laneXIndex.current--;
    }
    if (
      input.right &&
      !prevInput.current.right &&
      laneXIndex.current < lanesX.length - 1
    ) {
      laneXIndex.current++;
    }
    if (
      input.up &&
      !prevInput.current.up &&
      laneYIndex.current < lanesY.length - 1
    ) {
      laneYIndex.current++;
    }
    if (input.down && !prevInput.current.down && laneYIndex.current > 0) {
      laneYIndex.current--;
    }
    prevInput.current = { ...input };

    // target lane centre
    const targetX = lanesX[laneXIndex.current];
    const targetY = lanesY[laneYIndex.current];

    // use damp to smooth toward the target; 5 is the damping factor
    currentX.current = THREE.MathUtils.damp(
      currentX.current,
      targetX,
      5,
      delta
    );
    currentY.current = THREE.MathUtils.damp(
      currentY.current,
      targetY,
      5,
      delta
    );

    // update the kinematic body’s translation
    bodyRef.current?.setNextKinematicTranslation({
      x: currentX.current,
      y: currentY.current,
      z: 0,
    });

    // Store the current position in the global store
    setPlayerPosition([currentX.current, currentY.current, 0]);
  });

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders="cuboid">
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#E97449" />
      </mesh>
    </RigidBody>
  );
};

export default Player;
