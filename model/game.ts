import { Answer } from '@/data/questions'

export type ObstacleUserData = {
  type: 'obstacle'
}

export type AnswerGateUserData = {
  type: 'answerGate'
  isCorrect: boolean
}

export type PlayerUserData = {
  type: 'player'
}

export type RigidBodyUserData = ObstacleUserData | AnswerGateUserData | PlayerUserData
