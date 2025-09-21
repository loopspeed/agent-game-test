'use client'

import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import ConfigUI from '@/components/level/ui/ConfigUI'
import OnboardingUI from '@/components/level/ui/OnboardingUI'
import PausedUI from '@/components/level/ui/PausedUI'
import PlayingUI from '@/components/level/ui/PlayingUI'
import { LevelPhase } from '@/model/game'
import { useLevelStore } from '@/stores/LevelProvider'

type Props = {
  transitionStatus: TransitionStatus
  onExit: () => void
}

const LevelUI: FC<Props> = ({ transitionStatus, onExit }) => {
  const container = useRef<HTMLDivElement>(null)
  const phase = useLevelStore((s) => s.phase)
  const isPaused = useLevelStore((s) => s.isPaused)

  const isExiting = transitionStatus === 'exiting'
  const showConfigUI = phase === LevelPhase.CONFIG && !isExiting && !isPaused
  const showOnboardingUI = phase === LevelPhase.ONBOARDING && !isExiting && !isPaused
  const showPausedUI = isPaused && !isExiting
  const showPlayingUI = !showConfigUI && !showOnboardingUI && !showPausedUI && !isExiting

  // TODO: Add isPaused to the switch key.
  const switchKey = `${showConfigUI}-${showOnboardingUI}-${showPausedUI}-${showPlayingUI}-${isExiting}`

  return (
    <SwitchTransition>
      <Transition key={switchKey} timeout={{ enter: 0, exit: 400 }} nodeRef={container} appear>
        {(status) => (
          <div
            className="pointer-events-none fixed top-0 left-0 z-100 flex !h-svh w-full items-center justify-center"
            ref={container}>
            {showConfigUI && <ConfigUI transitionStatus={status} />}
            {showOnboardingUI && <OnboardingUI transitionStatus={status} />}
            {showPausedUI && <PausedUI transitionStatus={status} onExit={onExit} />}
            {showPlayingUI && <PlayingUI transitionStatus={status} />}

            {/* TODO: add paused UI here. */}
          </div>
        )}
      </Transition>
    </SwitchTransition>
  )
}

export default LevelUI
