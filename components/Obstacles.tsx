"use client";
import { type FC, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useWorldStore } from "../stores/worldStore";
import * as THREE from "three";

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
  const meshRefs = useRef<(THREE.Mesh | null)[]>([]);
  const timeSinceSpawn = useRef(0);
  const { camera } = useThree();

  useFrame((_, delta) => {
    const obstacles = obstaclesRef.current;
    const cameraZ = camera.position.z;

    // Pause everything if the game is not playing
    if (!isPlaying) {
      obstacles.forEach((ob, i) => {
        ob.active = false;
        const mesh = meshRefs.current[i];
        if (mesh) mesh.visible = false;
      });
      timeSinceSpawn.current = 0;
      return;
    }

    timeSinceSpawn.current += delta;

    // Only spawn when all mesh refs exist
    const ready =
      meshRefs.current.length === maxObstacles &&
      meshRefs.current.every(Boolean);

    if (ready && timeSinceSpawn.current >= spawnInterval) {
      const idx = obstacles.findIndex((o) => !o.active);
      if (idx !== -1) {
        const ix = Math.floor(Math.random() * lanesX.length);
        const iy = Math.floor(Math.random() * lanesY.length);
        obstacles[idx].x = lanesX[ix];
        obstacles[idx].y = lanesY[iy];
        obstacles[idx].z = spawnZ;
        obstacles[idx].active = true;
        timeSinceSpawn.current = 0;
      }
    }

    // Update active obstacles
    obstacles.forEach((ob, i) => {
      if (!ob.active) return;

      ob.z += speed * delta;

      if (ob.z > cameraZ + killZ) {
        ob.active = false;
        const mesh = meshRefs.current[i];
        if (mesh) mesh.visible = false;
        return;
      }

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.visible = true;
        mesh.position.set(ob.x, ob.y, ob.z);
      }
    });
  });

  return (
    <>
      {obstaclesRef.current.map((obstacle, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            meshRefs.current[i] = mesh;
            if (mesh) mesh.visible = false; // invisible to begin with
          }}
          // initial position
          position={[obstacle.x, obstacle.y, obstacle.z]}
        >
          {/* half size relative to the player */}
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#2e6f46" />
        </mesh>
      ))}
    </>
  );
};

export default Obstacles;
