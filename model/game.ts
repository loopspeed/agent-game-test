export enum LevelPhase {
  INTRO = 'INTRO',
  ONBOARDING = 'ONBOARDING',
  REST = 'REST',
  OBSTACLES = 'OBSTACLES',
  QUESTION = 'QUESTION',
  OUTRO = 'OUTRO',
  FINISHED = 'FINISHED',
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

export type OnboardingTargetUserData = {
  type: RigidBodyType.ONBOARDING_TARGET
  cubeId: string
  laneIndex: number
}

export type RigidBodyUserData =
  | ObstacleUserData
  | ObstacleZoneUserData
  | AnswerGateUserData
  | PlayerUserData
  | OnboardingTargetUserData
