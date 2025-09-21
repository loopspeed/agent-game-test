import { useGSAP } from '@gsap/react'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'

import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import { PlayerColour, PlayerShape } from '@/model/player'

type Props = { transitionStatus: TransitionStatus }

const PlayerSetup: FC<Props> = ({ transitionStatus }) => {
  const { goToStage } = useNavigation()

  useGSAP(() => {}, [transitionStatus])

  return (
    <div className="p-20">
      <h1>Player Setup</h1>

      {Object.values(PlayerShape).map((shape) => (
        <button key={shape} className="p-10">
          {shape}
        </button>
      ))}

      {Object.values(PlayerColour).map((colour) => (
        <button key={colour} className="p-10" style={{ backgroundColor: colour }}>
          {colour}
        </button>
      ))}

      <button className="p-10 text-xl" onClick={() => goToStage(Stage.Chat)}>
        CONTINUE
      </button>
    </div>
  )
}

export default PlayerSetup
