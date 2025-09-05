import React, { type FC } from 'react'

import AnswerGates from '@/components/game/world/AnswerGates'
import { BeamObstacles, SphereObstacles } from '@/components/game/world/Obstacles'

const WorldConveyor: FC = () => {
  // TODO: rather than spawn obstacles at random, generate a "course" when the Game Provider is initialized
  // This way we can ensure a fair distribution of obstacles and answers
  // Also, we can make sure that the course is solvable (i.e. there is always a correct answer gate reachable)

  // Potentially use a single useFrame hook to check all obstacles and gates for recycling
  return (
    <>
      <BeamObstacles />
      <SphereObstacles />
      <AnswerGates />
    </>
  )
}

export default WorldConveyor
