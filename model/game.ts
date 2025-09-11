export enum RigidBodyType {
  OBSTACLE = 'obstacle',
  OBSTACLE_AVOIDED = 'obstacleAvoided',
  ANSWER_GATE = 'answerGate',
  PLAYER = 'player',
}

export type ObstacleUserData = {
  type: RigidBodyType.OBSTACLE
}

export type ObstacleZoneUserData = {
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

export type RigidBodyUserData = ObstacleUserData | ObstacleZoneUserData | AnswerGateUserData | PlayerUserData
