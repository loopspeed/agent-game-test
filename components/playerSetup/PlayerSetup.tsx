import { useGSAP } from '@gsap/react'
import { type FC } from 'react'
import { useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'

import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import type { User, UserUpdate } from '@/lib/db/schema'
import { PlayerColour, PlayerShape } from '@/lib/types/player'

type Props = {
  transitionStatus: TransitionStatus
  updateUser: (updates: UserUpdate) => Promise<void>
  user: User
}

const PlayerSetup: FC<Props> = ({ transitionStatus, updateUser, user }) => {
  const { goToStage } = useNavigation()
  const [colour, setColour] = useState<PlayerColour>(user.colour)
  const [shape, setShape] = useState<PlayerShape>(user.shape)

  const onContinueClick = async () => {
    try {
      await updateUser({ colour, shape, hasSetupPlayer: true })
      goToStage(Stage.Chat)
    } catch (e) {
      console.error('Failed to save player setup', e)
    }
  }

  useGSAP(() => {}, [transitionStatus])

  // Needs design...

  return (
    <div className="p-20">
      <h1>Player Setup</h1>

      <div className="mb-8">
        <h2 className="mb-4 text-lg">Shape:</h2>
        <div className="flex gap-4">
          {Object.values(PlayerShape).map((shapeOption) => (
            <button
              key={shapeOption}
              className={`rounded border-4 p-4 transition-all ${
                shape === shapeOption ? 'border-white' : 'border-transparent'
              }`}
              onClick={() => setShape(shapeOption)}>
              {shapeOption}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-lg">Colour:</h2>
        <div className="flex gap-4">
          {Object.values(PlayerColour).map((colourOption) => (
            <button
              key={colourOption}
              className={`rounded border-4 p-4 transition-all ${
                colour === colourOption ? 'border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: colourOption }}
              onClick={() => setColour(colourOption)}>
              {colourOption}
            </button>
          ))}
        </div>
      </div>

      <button className="p-10 text-xl" onClick={onContinueClick}>
        CONTINUE
      </button>
    </div>
  )
}

export default PlayerSetup
