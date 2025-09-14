'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { LevelPhase } from '@/model/game'
import { useGameStore } from '@/stores/GameProvider'
import { useLevelStore } from '@/stores/LevelProvider'

const PlayingUI: FC<{ transitionStatus: TransitionStatus }> = ({ transitionStatus }) => {
  const container = useRef<HTMLDivElement>(null)

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
    <section ref={container} className="contents">
      <Onboarding />
      <Question />
      <Points />
      <Streak />
    </section>
  )
}

export default PlayingUI

const Onboarding: FC = () => {
  const isOnboardingPhase = useLevelStore((s) => s.phase === LevelPhase.ONBOARDING)

  if (!isOnboardingPhase) return null

  return (
    <section className="absolute top-20 right-0 left-0 flex w-full flex-col items-center">
      <p className="max-w-xl px-4 py-8 text-center text-2xl leading-relaxed font-semibold">
        Use the [Arrow Keys] to move your player.
        <br />
        Follow the highlighted path around the lanes!
      </p>
    </section>
  )
}

const Points: FC = () => {
  const points = useGameStore((s) => s.points)

  // Determine color based on points value
  const getPointsColor = (): string => {
    if (points > 0) return 'text-green-400' // Positive points
    if (points < 0) return 'text-red-400' // Negative points
    return 'text-white' // Zero points
  }

  return (
    <div className="absolute bottom-8 left-8">
      <div className={`text-5xl font-bold ${getPointsColor()}`}>
        {points > 0 ? '+' : ''}
        {points}
      </div>
    </div>
  )
}

const Streak: FC = () => {
  const streak = useGameStore((s) => s.streak)

  if (streak <= 0) return null

  return (
    <div className="absolute right-6 bottom-6 rounded-full bg-black/70 px-3 py-1 text-xl font-semibold">
      <span className="mr-1">🔥</span>
      {streak}
    </div>
  )
}

const Question: FC = () => {
  const isQuestionPhase = useLevelStore((s) => s.phase === LevelPhase.QUESTION)
  const questions = useLevelStore((s) => s.questions)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const currentQuestion = useLevelStore((s) => s.question)
  const answersHit = useGameStore((s) => s.answersHit)

  const container = useRef<HTMLDivElement>(null)
  const switchKey = isQuestionPhase ? `question` : 'indicators'

  // TODO: add onEnter and onExit transitions (simple for now.)
  const onEnter = () => {}
  const onExit = () => {}

  return (
    <SwitchTransition>
      <Transition key={switchKey} timeout={{ enter: 0, exit: 500 }} nodeRef={container}>
        {() =>
          // Display indicators when not in the question phase (e.g rest, obstacles)
          !isQuestionPhase ? (
            <div ref={container} className="absolute top-8 flex items-center gap-3">
              {/* TODO: Indicators need work */}
              {questions.map((question, index) => {
                const getIndicatorClass = (): string => {
                  const answerHit = answersHit.find((hit) => hit.questionId === question.id)
                  if (!answerHit) return 'bg-white/10'
                  if (answerHit.isCorrect) return 'bg-green-400'
                  if (!answerHit.isCorrect) return 'bg-red-400'
                  return 'bg-white/10'
                }
                return (
                  <div
                    key={question.id}
                    className={twJoin(
                      'flex size-8 items-center justify-center rounded-full text-center font-bold text-white',
                      getIndicatorClass(),
                    )}>
                    {index + 1}
                  </div>
                )
              })}
            </div>
          ) : (
            // Display the current question when in the question phase
            <section ref={container} className="absolute top-0 right-0 left-0 flex w-full flex-col items-center">
              <div className="relative h-2 w-full overflow-hidden bg-blue-500/10">
                <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500 opacity-0" />
              </div>
              <p className="max-w-4xl px-4 py-8 text-center text-5xl leading-snug font-semibold">
                <span className="opacity-40">{questionIndex + 1}.</span> {currentQuestion.question}
              </p>
            </section>
          )
        }
      </Transition>
    </SwitchTransition>
  )
}
