"use client";
import { Suspense, useEffect } from "react";
import { Physics } from "@react-three/rapier";
import Scene from "../../components/Scene";
import { useInputStore } from "../../stores/inputStore";
import WebGPU from "three/examples/jsm/capabilities/WebGPU.js";
import {
  WEBGLEnvironment,
  WebGPUEnvironment,
} from "@/components/Canvas/Environment";
import { useWorldStore } from "@/stores/worldStore";

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

  const Environment = WebGPU.isAvailable()
    ? WebGPUEnvironment
    : WEBGLEnvironment;

  return (
    <main className="relative w-full h-lvh overflow-hidden">
      <Environment>
        <Suspense fallback={null}>
          {/* Physics world with zero gravity (kinematic bodies only) */}
          <Physics gravity={[0, 0, 0]}>
            <Scene />
          </Physics>
        </Suspense>
      </Environment>
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
