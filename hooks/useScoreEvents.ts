import { useGameStore } from '@/stores/GameProvider'

export const useScoreEvents = () => {
  const scoreEvents = useGameStore((s) => s.scoreEvents)
  
  const latestScore = scoreEvents.length > 0 ? scoreEvents[scoreEvents.length - 1] : null
  
  return {
    scoreEvents,
    latestScore,
  }
}