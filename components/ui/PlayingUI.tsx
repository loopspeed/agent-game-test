'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/stores/GameProvider'
import { Phase, useLevelStore } from '@/stores/LevelProvider'

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
      <Question />
      <Points />
      <Streak />
    </section>
  )
}

export default PlayingUI

const Points: FC = () => {
  const points = useGameStore((s) => s.points)

  // Determine color based on points value
  const getPointsColor = (): string => {
    if (points > 0) return 'text-green-400' // Positive points
    if (points < 0) return 'text-red-400' // Negative points
    return 'text-white' // Zero points
  }

  return (
    <div className="absolute bottom-6 left-6">
      <div className={`text-4xl font-bold ${getPointsColor()}`}>
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
  const isQuestionPhase = useLevelStore((s) => s.phase === Phase.QUESTION)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const currentQuestion = useLevelStore((s) => s.question)
  const questions = useLevelStore((s) => s.questions)

  const answersHit = useGameStore((s) => s.answersHit)

  const container = useRef<HTMLDivElement>(null)

  const switchKey = isQuestionPhase ? `question-${questionIndex}` : 'no-question'

  // TODO: add onEnter and onExit transitions (simple for now.)

  return (
    <SwitchTransition>
      <Transition key={switchKey} timeout={{ enter: 300, exit: 400 }} nodeRef={container}>
        {() =>
          !isQuestionPhase ? (
            <div ref={container} className="absolute top-8 flex items-center gap-4">
              {/* TODO: Indicators need work */}
              {questions.map((question, index) => {
                const isUpcoming = index > questionIndex

                const getIndicatorClass = (): string => {
                  if (isUpcoming) return 'bg-white/40'

                  // Find the answer hit for this specific question
                  const answerHit = answersHit.find((hit) => hit.questionId === question.id)
                  if (answerHit?.isCorrect) return 'bg-green-400'
                  if (answerHit?.isCorrect === false) return 'bg-red-400'
                  return 'bg-red-400/40'
                }
                return <div key={question.id} className={twJoin('size-5 rounded-full', getIndicatorClass())}></div>
              })}
            </div>
          ) : (
            <section
              ref={container}
              className="absolute top-0 flex max-w-2xl flex-col bg-black/70 text-center text-3xl leading-relaxed font-bold">
              <p className="px-2 py-5">
                {questionIndex + 1}. {currentQuestion.question}
              </p>

              <div className="relative h-2 w-full overflow-hidden bg-white/20">
                <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500 opacity-0" />
              </div>
            </section>
          )
        }
      </Transition>
    </SwitchTransition>
  )
}
