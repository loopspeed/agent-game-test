'use client'

import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useEffect, useRef } from 'react'

import { GameStage, useGameStore } from '@/stores/GameProvider'
import { type TransitionStatus, Transition, SwitchTransition } from 'react-transition-group'

import GameOverUI from './GameOver'
import PlayingUI from './PlayingUI'

const GameUI: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const container = useRef<HTMLDivElement>(null)

  return (
    <SwitchTransition>
      <Transition key={stage} timeout={{ enter: 300, exit: 400 }} nodeRef={container} appear>
        {(status) => (
          <div className="pointer-events-none fixed top-0 z-100 flex !h-svh w-full items-center justify-center" 
          ref={container}
          >
            {stage === GameStage.INTRO && <IntroUI transitionStatus={status} />}
            {stage === GameStage.PLAYING && <PlayingUI transitionStatus={status} />}
            {stage === GameStage.GAME_OVER && <GameOverUI transitionStatus={status}  />}
          </div>
        )}
      </Transition>
    </SwitchTransition>
  )
}

export default GameUI

const IntroUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
  const setStage = useGameStore((s) => s.setStage)
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        setStage(GameStage.PLAYING)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setStage])

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
      <button
        className="pointer-events-auto bg-black p-8 text-xl font-black text-white"
        onClick={() => setStage(GameStage.PLAYING)}>
        READY (ENTER)
      </button>
    </div>
  )
}
