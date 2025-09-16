import { z } from 'zod'

export enum LevelPhase {
  CONFIG = 'CONFIG', // Pre-level configuration
  INTRO = 'INTRO', // Animate in, show course title
  ONBOARDING = 'ONBOARDING', // How to play
  REST = 'REST', // Rest after question
  OBSTACLES = 'OBSTACLES', // Avoid obstacles
  QUESTION = 'QUESTION', // Answer question
  OUTRO = 'OUTRO', // Level complete, show stats
}

export enum RigidBodyType {
  OBSTACLE = 'obstacle',
  OBSTACLE_AVOIDED = 'obstacleAvoided',
  ANSWER_GATE = 'answerGate',
  PLAYER = 'player',
  ONBOARDING_TARGET = 'onboardingTarget',
}

export type ObstacleUserData = {
  type: RigidBodyType.OBSTACLE
  obstacleId: string
}

export type ObstacleAvoidedUserData = {
  type: RigidBodyType.OBSTACLE_AVOIDED
  obstacleId: string
}

export type AnswerGateUserData = {
  type: RigidBodyType.ANSWER_GATE
  isCorrect: boolean
  answerId: string
  questionId: string
}

export type PlayerUserData = {
  type: RigidBodyType.PLAYER
}

export type OnboardingTargetUserData = {
  type: RigidBodyType.ONBOARDING_TARGET
  cubeId: string
  laneIndex: number
}

export type RigidBodyUserData =
  | ObstacleUserData
  | ObstacleAvoidedUserData
  | AnswerGateUserData
  | PlayerUserData
  | OnboardingTargetUserData

//   id: string
//   courseId: string // identifier for the course
//   chapterId: string // identifier for the chapter
//   timestamp: number
//   points: number
//   answers: AnswerHit[]
//   correctAnswers: number
//   accuracyPercentage: number
//   completionTime: number // in milliseconds

const AnswerHitSchema = z.object({
  questionId: z.string(),
  answerId: z.string().nullable(),
  isCorrect: z.boolean(),
  timestamp: z.number(),
})

export type AnswerHit = z.infer<typeof AnswerHitSchema>

export const LevelSummarySchema = z.object({
  id: z.string(),
  courseId: z.string(),
  chapterId: z.string(),
  points: z.number(),
  answers: z.array(AnswerHitSchema),
  timestamp: z.number(),
  completionTime: z.number(),
})

export type ChapterRun = z.infer<typeof LevelSummarySchema>
