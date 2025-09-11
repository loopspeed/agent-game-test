'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useEffect, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import useGameControls from '@/hooks/useGameControls'
import { GameStage, useGameStore } from '@/stores/GameProvider'

import GameOverUI from './GameOver'
import PlayingUI from './PlayingUI'

const GameUI: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const container = useRef<HTMLDivElement>(null)

  return (
    <SwitchTransition>
      <Transition key={stage} timeout={{ enter: 300, exit: 400 }} nodeRef={container} appear>
        {(status) => (
          <div
            className="pointer-events-none fixed top-0 z-100 flex !h-svh w-full items-center justify-center"
            ref={container}>
            {stage === GameStage.READY && <ReadyUI transitionStatus={status} />}
            {stage === GameStage.PLAYING && <PlayingUI transitionStatus={status} />}
            {stage === GameStage.COMPLETED && <GameOverUI transitionStatus={status} />}
          </div>
        )}
      </Transition>
    </SwitchTransition>
  )
}

export default GameUI

const ReadyUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
  const container = useRef<HTMLDivElement>(null)

  const { handleStart } = useGameControls()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        handleStart()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleStart])

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.to(container.current, { opacity: 1, duration: 0.3 })
      }
      if (transitionStatus === 'exiting') {
        gsap.to(container.current, { opacity: 0, duration: 0.4 })
      }
    },
    { scope: container, dependencies: [transitionStatus] },
  )

  return (
    <div ref={container} className="absolute inset-0 flex items-center justify-center">
      <span className="text-5xl font-black text-white">PRESS ENTER</span>
    </div>
  )
}
4
