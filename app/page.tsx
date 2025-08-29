"use client";
import { useRouter } from "next/navigation";
import { useGameStore } from "../stores/gameStore";

export default function HomePage() {
  const router = useRouter();

  const startGame = () => {
    // reset game state before starting
    useGameStore.getState().reset();
    router.push("/game");
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen space-y-6 text-center">
      <h1 className="text-5xl font-bold">Educational Runner</h1>
      <p className="max-w-md text-gray-400">
        Read a snippet, then steer your ship through the gate with the correct
        answer. Use arrow keys or WASD to move.
      </p>
      <button
        onClick={startGame}
        className="px-6 py-3 rounded bg-teal-500 hover:bg-teal-600 text-black font-semibold"
      >
        Start Game
      </button>
    </main>
  );
}
