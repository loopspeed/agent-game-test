"use client";
import { type FC, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorldStore } from "../stores/worldStore";
import {
  type RapierRigidBody,
  BallCollider,
  RigidBody,
} from "@react-three/rapier";

interface ObstacleData {
  x: number;
  y: number;
  z: number;
  active: boolean;
}

const Obstacles: FC = () => {
  const lanesX = useWorldStore((state) => state.laneX || [-1, 0, 1]);
  const lanesY = useWorldStore((state) => state.laneY || [-1, 0, 1]);
  const maxObstacles = useWorldStore((state) => state.maxObstacles);
  const speed = useWorldStore((state) => state.speed);
  const spawnZ = useWorldStore((state) => state.spawnZ);
  const spawnInterval = useWorldStore((state) => state.spawnInterval);
  const killZ = useWorldStore((state) => state.killZ);
  const isPlaying = useWorldStore((state) => state.isPlaying);

  // Pre-create obstacle slots. They start inactive.
  const obstaclesRef = useRef<ObstacleData[]>(
    Array.from({ length: maxObstacles }, () => ({
      x: 0,
      y: 0,
      z: spawnZ,
      active: false,
    }))
  );

  // Mesh refs for each obstacle slot, timer to control spawning
  // No need for meshRefs if we render meshes conditionally
  const rigidRefs = useRef<(RapierRigidBody | null)[]>(
    Array.from({ length: maxObstacles }, () => null)
  );

  const timeSinceSpawn = useRef(0);

  const { camera } = useThree();

  useFrame((_, delta) => {
    const obstacles = obstaclesRef.current;
    const cameraZ = camera.position.z;

    // Pause everything if the game is not playing
    if (!isPlaying) {
      timeSinceSpawn.current = 0; // reset timer
      return;
    }

    timeSinceSpawn.current += delta;

    // Only spawn when all refs ready
    if (timeSinceSpawn.current >= spawnInterval) {
      // inactive grid position
      const idx = obstacles.findIndex(
        (o, i) => !o.active && rigidRefs.current[i]
      );

      if (idx !== -1) {
        const ix = Math.floor(Math.random() * lanesX.length);
        const iy = Math.floor(Math.random() * lanesY.length);
        const ob = obstacles[idx];
        ob.x = lanesX[ix];
        ob.y = lanesY[iy];
        ob.z = spawnZ;
        ob.active = true;

        // place immediately so it starts moving next tick
        const body = rigidRefs.current[idx];
        body?.setNextKinematicTranslation({ x: ob.x, y: ob.y, z: ob.z });

        timeSinceSpawn.current = 0;
      }
    }

    // Update active obstacles
    obstacles.forEach((ob, i) => {
      if (!ob.active) return;
      ob.z += speed * delta;
      const body = rigidRefs.current[i]!;
      body.setNextKinematicTranslation({ x: ob.x, y: ob.y, z: ob.z });

      // Check if out of bounds for recycling
      if (ob.z > cameraZ + killZ) {
        ob.active = false;
      }
    });
  });

  return (
    <>
      {obstaclesRef.current.map((obstacle, i) => (
        <RigidBody
          key={i}
          type="dynamic"
          gravityScale={0}
          canSleep={false}
          colliders={false}
          position={[obstacle.x, obstacle.y, obstacle.z]}
          userData={{ kind: "obstacle" }}
          ref={(body) => {
            rigidRefs.current[i] = body;
          }}
        >
          {obstacle.active && (
            <mesh>
              {/* half size relative to the player */}
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#2e6f46" />
            </mesh>
          )}
          {/* Sensor collider: triggers intersections but doesn’t push the player */}
          <BallCollider args={[0.5]} name="obstacle" />
        </RigidBody>
      ))}
    </>
  );
};

export default Obstacles;
