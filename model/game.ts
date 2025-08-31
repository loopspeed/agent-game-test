export type ObstacleUserData = {
  type: 'obstacle'
}

export type AnswerGateUserData = {
  type: 'answerGate'
  isCorrect: boolean
  answerId: string
}

export type PlayerUserData = {
  type: 'player'
}

export type RigidBodyUserData = ObstacleUserData | AnswerGateUserData | PlayerUserData
