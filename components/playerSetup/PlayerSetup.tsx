import { useGSAP } from '@gsap/react'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'

import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import { useUserStore } from '@/hooks/useUserStore'
import { PlayerColour, PlayerShape } from '@/model/player'

type Props = { transitionStatus: TransitionStatus }

const PlayerSetup: FC<Props> = ({ transitionStatus }) => {
  const { goToStage } = useNavigation()
  const { colour, shape, setColour, setShape, setHasSetupPlayer } = useUserStore()

  const handleContinue = () => {
    setHasSetupPlayer(true)
    goToStage(Stage.Chat)
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

      <button className="p-10 text-xl" onClick={handleContinue}>
        CONTINUE
      </button>
    </div>
  )
}

export default PlayerSetup
