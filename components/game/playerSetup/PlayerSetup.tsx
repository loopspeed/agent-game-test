import { useGSAP } from '@gsap/react'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'

import useNavigation, { Stage } from '@/hooks/useGameNavigation'

type Props = { transitionStatus: TransitionStatus }

const PlayerSetup: FC<Props> = ({ transitionStatus }) => {
  const { goToStage } = useNavigation()

  useGSAP(() => {}, [transitionStatus])

  return (
    <div className="p-20">
      <h1>Player Setup</h1>

      <button className="p-10 text-xl" onClick={() => goToStage(Stage.Chat)}>
        CONTINUE
      </button>
    </div>
  )
}

export default PlayerSetup
