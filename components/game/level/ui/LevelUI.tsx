'use client'

import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

// import CompletedUI from '@/components/ui/GameOver'
import PlayingUI from '@/components/game/level/ui/PlayingUI'
import { LevelPhase } from '@/model/game'
import { useLevelStore } from '@/stores/LevelProvider'

import ConfigUI from './ConfigUI'
import OnboardingUI from './OnboardingUI'

type Props = {
  transitionStatus: TransitionStatus
}

const LevelUI: FC<Props> = ({ transitionStatus }) => {
  const container = useRef<HTMLDivElement>(null)
  const phase = useLevelStore((s) => s.phase)

  const isExiting = transitionStatus === 'exiting'
  const showConfigUI = phase === LevelPhase.CONFIG && !isExiting
  const showOnboardingUI = phase === LevelPhase.ONBOARDING && !isExiting
  const showPlayingUI = !showConfigUI && !showOnboardingUI && !isExiting

  const switchKey = `${showConfigUI}-${showOnboardingUI}-${showPlayingUI}-${isExiting}`

  console.log('[DEBUG] LevelUI render', { switchKey })

  return (
    <SwitchTransition>
      <Transition key={switchKey} timeout={{ enter: 0, exit: 400 }} nodeRef={container} appear>
        {(status) => (
          <div
            className="pointer-events-none fixed top-0 left-0 z-100 flex !h-svh w-full items-center justify-center"
            ref={container}>
            {showConfigUI && <ConfigUI transitionStatus={status} />}
            {showOnboardingUI && <OnboardingUI transitionStatus={status} />}
            {showPlayingUI && <PlayingUI transitionStatus={status} />}
            {/* {stage === GameStage.COMPLETED && <CompletedUI transitionStatus={status} />} */}
          </div>
        )}
      </Transition>
    </SwitchTransition>
  )
}

export default LevelUI
