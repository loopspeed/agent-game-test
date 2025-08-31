import { type Vector3Tuple } from '@react-three/rapier'
import gsap from 'gsap'
import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

import { Answer, Question, SAMPLE_QUESTIONS } from '@/data/questions'

export enum GameStage {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type GameState = {
  stage: GameStage
  setStage: (stage: GameStage) => void

  timeMultiplier: number
  setTimeMultiplier: (value: number) => void
  slowMoTimeRemaining: number
  isSlowMo: boolean
  goSlowMo: () => void

  maxObstacles: number
  setMaxObstacles: (value: number) => void
  spawnInterval: number
  setSpawnInterval: (value: number) => void

  playerPosition: Vector3Tuple
  setPlayerPosition: (pos: Vector3Tuple) => void

  health: number
  streak: number
  resetHealth: () => void
  onObstacleHit: () => void
  onAnswerHit: (isCorrect: boolean) => void

  // Questions
  currentQuestion: Question
  currentQuestionIndex: number
  goToNextQuestion: () => void
  answerGatesMapping: Array<(Answer | null)[]>

  reset: () => void
}

type GameStateStore = StoreApi<GameState>
const GameContext = createContext<GameStateStore>(undefined!)

export const GRID_SQUARE_SIZE_M = 1.6 // Meters
export const LANES_Y_OFFSET = -0.6 // Move them down to avoid question
export const LANES_X = [-1, 0, 1].map((x) => x * GRID_SQUARE_SIZE_M)
export const LANES_Y = [-1, 0, 1].map((y) => y * GRID_SQUARE_SIZE_M + LANES_Y_OFFSET)

export const SPAWN_OBSTACLE_Z = -20 as const
export const KILL_OBSTACLE_Z = 2 as const

export const MAX_HEALTH = 5 as const

const SLOW_MO_DURATION = 2.0

const INITIAL_STATE: Pick<
  GameState,
  | 'stage'
  | 'timeMultiplier'
  | 'slowMoTimeRemaining'
  | 'spawnInterval'
  | 'isSlowMo'
  | 'maxObstacles'
  | 'streak'
  | 'playerPosition'
  | 'health'
  | 'currentQuestionIndex'
> = {
  stage: GameStage.INTRO,
  timeMultiplier: 1,
  slowMoTimeRemaining: SLOW_MO_DURATION,
  isSlowMo: false,
  maxObstacles: 10,
  spawnInterval: 0.8,
  streak: 0,
  playerPosition: [0, 0, 0] as Vector3Tuple,
  health: MAX_HEALTH,
  currentQuestionIndex: 0,
}

const createGameStore = ({ questions }: { questions: Question[] }) => {
  let speedTimeline: GSAPTimeline
  // Create values which can be animated using GSAP (synced with store values which can't be mutated directly)
  const timeTweenTarget = { value: 1 }
  const slowMoTimeRemainingTarget = { value: SLOW_MO_DURATION }

  return createStore<GameState>()((set, get) => ({
    ...INITIAL_STATE,
    currentQuestion: questions[0],
    answerGatesMapping: mapAnswersToGatePositions(questions),

    setStage: (stage: GameStage) => set({ stage }),
    setTimeMultiplier: (timeMultiplier: number) => set({ timeMultiplier }),
    goSlowMo: () => {
      if (get().isSlowMo) return

      set({ isSlowMo: true })
      gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 1 })

      console.log('going slow mo')

      speedTimeline?.kill()
      speedTimeline = gsap
        .timeline({
          onComplete: () => {
            gsap.set('#slow-mo-bar', { scaleX: 1, opacity: 0 })
            set({ isSlowMo: false, slowMoTimeRemaining: SLOW_MO_DURATION })
          },
        })
        // Slow down..
        .to(timeTweenTarget, {
          duration: 0.6,
          ease: 'power3.out',
          value: 0.1,
          onUpdate: () => {
            set({ timeMultiplier: timeTweenTarget.value })
          },
        })
        .to('#slow-mo-bar', {
          scaleX: 0,
          duration: SLOW_MO_DURATION,
          ease: 'none',
          onUpdate: () => {
            set({ slowMoTimeRemaining: slowMoTimeRemainingTarget.value })
          },
        })
        // Speed back up again.
        .to(
          timeTweenTarget,
          {
            duration: 0.4,
            ease: 'power1.in',
            value: 1.0,
            onUpdate: () => {
              set({ timeMultiplier: timeTweenTarget.value })
            },
          },
          SLOW_MO_DURATION + 0.6,
        )
    },
    setMaxObstacles: (maxObstacles: number) => set({ maxObstacles }),
    setSpawnInterval: (spawnInterval: number) => set({ spawnInterval }),
    setPlayerPosition: (pos: [number, number, number]) => set({ playerPosition: pos }),
    resetHealth: () => set({ health: MAX_HEALTH }),
    onObstacleHit: () => {
      const currentHealth = get().health
      const newHealth = Math.max(currentHealth - 1, 0)
      if (newHealth === 0) {
        // Handle game over logic here
      }
      set({ health: newHealth })
    },
    onAnswerHit: (isCorrect: boolean) => {
      const currentHealth = get().health
      if (isCorrect) {
        const newHealth = Math.min(currentHealth + 1, MAX_HEALTH)
        set((s) => ({ streak: s.streak + 1, health: newHealth }))
      } else {
        const newHealth = Math.max(currentHealth - 1, 0)
        if (newHealth === 0) {
          // Handle game over logic here
        }
        set({ streak: 0, health: newHealth })
      }
    },
    goToNextQuestion: () => {
      set((state) => {
        const nextIndex = (state.currentQuestionIndex + 1) % questions.length
        return { currentQuestionIndex: nextIndex, currentQuestion: questions[nextIndex] }
      })
    },

    reset: () => set(INITIAL_STATE),
  }))
}

const GameProvider: FC<PropsWithChildren> = ({ children }) => {
  const gameStore = useRef<GameStateStore>(createGameStore({ questions: SAMPLE_QUESTIONS }))

  return <GameContext.Provider value={gameStore.current}>{children}</GameContext.Provider>
}

export default GameProvider

export function useGameStore<T>(selector: (state: GameState) => T): T {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return useStore(gameStore, selector)
}

export function useGameStoreAPI(): GameStateStore {
  const gameStore = useContext(GameContext)
  if (!gameStore) throw new Error('Missing GameContext.Provider in the tree')
  return gameStore
}

/**
 * Maps answers to random positions in a 3x3 grid for each question.
 * Uses Fisher-Yates shuffle with Math.random() for true randomness each runtime.
 *
 * Grid positions are indexed as:
 * 0 1 2
 * 3 4 5
 * 6 7 8
 */
const mapAnswersToGatePositions = (questions: Question[]): Array<(Answer | null)[]> => {
  const mapping: Array<(Answer | null)[]> = []

  questions.forEach(({ answers }) => {
    const answerMapping = new Array(9).fill(null)

    // Generate all possible positions (0-8) for the 3x3 grid
    const availablePositions = Array.from({ length: 9 }, (_, i) => i)

    // Shuffle the positions using Fisher-Yates algorithm with Math.random()
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]]
    }

    // Take only the number of positions we need for this question's answers
    const selectedPositions = availablePositions.slice(0, answers.length)

    // Assign each answer to a random position
    answers.forEach((answer, index) => {
      answerMapping[selectedPositions[index]] = answer
    })

    mapping.push(answerMapping)
  })

  return mapping
}
