export type ObstacleUserData = {
  type: 'obstacle'
}

export type ObstacleZoneUserData = {
  type: 'obstacle_zone'
  obstacleId: string
}

export type AnswerGateUserData = {
  type: 'answerGate'
  isCorrect: boolean
  answerId: string
}

export type PlayerUserData = {
  type: 'player'
}

export type RigidBodyUserData = ObstacleUserData | ObstacleZoneUserData | AnswerGateUserData | PlayerUserData
