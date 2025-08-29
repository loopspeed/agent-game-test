"use client";
import { Suspense, useEffect } from "react";
import { Physics } from "@react-three/rapier";
import Scene from "../../components/Scene";
import { useInputStore } from "../../stores/inputStore";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import { useWorldStore } from "@/stores/worldStore";

import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import React, { type FC, type PropsWithChildren } from "react";
import { type WebGPURendererParameters } from "three/src/renderers/webgpu/WebGPURenderer.js";
import * as THREE from "three/webgpu";

declare module "@react-three/fiber" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
extend(THREE as any);

type Props = PropsWithChildren<{
  isMobile?: boolean;
}>;

export default function GamePage() {
  const { setKey } = useInputStore();
  const isPlaying = useWorldStore((state) => state.isPlaying);
  const setIsPlaying = useWorldStore((state) => state.setIsPlaying);

  // Attach keyboard listeners for 4-way movement
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          setKey("up", true);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setKey("down", true);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          setKey("left", true);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setKey("right", true);
          break;
        default:
          break;
      }
    };
    const up = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          setKey("up", false);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setKey("down", false);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          setKey("left", false);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setKey("right", false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setKey]);

  // Enter key to begin & end
  useEffect(() => {
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        setIsPlaying(!isPlaying);
      }
    };
    window.addEventListener("keydown", handleEnter);
    return () => window.removeEventListener("keydown", handleEnter);
  }, [isPlaying, setIsPlaying]);

  return (
    <main className="relative w-full h-lvh overflow-hidden">
      <Canvas
        className="!fixed inset-0"
        performance={{ min: 0.5, debounce: 300 }}
        camera={{ position: [0, 1, 4], fov: 80 }}
        gl={async (props) => {
          const renderer = new THREE.WebGPURenderer(
            props as WebGPURendererParameters
          );
          await renderer.init();
          return renderer;
        }}
      >
        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]}>
            <Scene />
          </Physics>
        </Suspense>
      </Canvas>
      {/* Heads-up display overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between items-center p-4">
        {/* Future HUD components (score, health, streak, timer) will be inserted here */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="pointer-events-auto border rounded-full px-4 py-1 cursor-pointer hover:bg-green-700"
        >
          PRESS ENTER TO {isPlaying ? "STOP" : "BEGIN"}
        </button>
      </div>
    </main>
  );
}
