'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { TimerIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { LevelPhase } from '@/model/game'
import { useLevelStore } from '@/stores/LevelProvider'

type Props = {
  transitionStatus: TransitionStatus
}

// The playing UI is displayed when the level phase is NOT Config or Onboarding

const PlayingUI: FC<Props> = ({ transitionStatus }) => {
  const container = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (transitionStatus === 'entered') {
        gsap.to(container.current, { opacity: 1, duration: 0.3 })
      }
      if (transitionStatus === 'exiting') {
        gsap.to(container.current, { opacity: 0, duration: 0.3 })
      }
    },
    { scope: container, dependencies: [transitionStatus] },
  )

  return (
    <section ref={container} className="contents opacity-0">
      <QuestionIndicators />
      <Question />
      <QuestionTimer />
      <Points />
      {/* <Streak /> */}
    </section>
  )
}

export default PlayingUI

const Points: FC = () => {
  const points = useLevelStore((s) => s.points)

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

// const Streak: FC = () => {
//   const streak = useLevelStore((s) => s.streak)
//   if (streak <= 0) return null

//   return (
//     <div className="absolute right-6 bottom-6 rounded-full bg-black/70 px-3 py-1 text-xl font-semibold">
//       <span>🔥</span>
//       {streak}
//     </div>
//   )
// }

const Question: FC = () => {
  const isQuestionPhase = useLevelStore((s) => s.phase === LevelPhase.QUESTION)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const currentQuestion = useLevelStore((s) => s.question)
  const container = useRef<HTMLDivElement>(null)

  const { contextSafe } = useGSAP({ scope: container })

  const onEnter = contextSafe(() => {
    gsap.fromTo(
      container.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.4, ease: 'power2.out' },
    )
  })

  const onExit = contextSafe(() => {
    gsap.to(container.current, { opacity: 0, duration: 0.3 })
  })

  const switchKey = !isQuestionPhase ? 'no-question' : `question-${questionIndex}`

  return (
    <SwitchTransition>
      <Transition
        key={switchKey}
        timeout={{ enter: 0, exit: 350 }}
        mountOnEnter={true}
        unmountOnExit={true}
        onEnter={onEnter}
        onExit={onExit}
        nodeRef={container}>
        {() => {
          if (switchKey === 'no-question') return <div ref={container} className="hidden" />
          return (
            <div ref={container} className="absolute top-12 right-0 left-0 flex w-full flex-col items-center opacity-0">
              <p className="max-w-xl px-4 py-8 text-center text-2xl leading-snug font-semibold">
                {currentQuestion.question}
              </p>
            </div>
          )
        }}
      </Transition>
    </SwitchTransition>
  )
}

const QuestionIndicators: FC = () => {
  const questions = useLevelStore((s) => s.questions)
  const questionIndex = useLevelStore((s) => s.questionIndex)
  const answersHit = useLevelStore((s) => s.answersHit)

  return (
    <div className="absolute top-6 flex items-center gap-3">
      {questions.map((question, index) => {
        const getIndicatorClass = (): string => {
          const answerHit = answersHit.find((hit) => hit.questionId === question.id)
          const isCurrent = index === questionIndex
          if (!answerHit)
            return isCurrent ? 'bg-white/10 scale-110 ring-2 ring-white text-white' : 'bg-white/10 text-white/50'
          if (answerHit.isCorrect) return 'bg-green-400 text-black'
          if (!answerHit.isCorrect) return 'bg-red-400 text-black'
          return 'bg-white/10 text-white/50'
        }
        return (
          <div
            key={question.id}
            className={twJoin(
              'flex size-8 items-center justify-center rounded-full text-center text-[16px] font-bold',
              getIndicatorClass(),
            )}>
            {index + 1}
          </div>
        )
      })}
    </div>
  )
}

const QuestionTimer: FC = () => {
  const isQuestionPhase = useLevelStore((s) => s.phase === LevelPhase.QUESTION)
  const container = useRef<HTMLDivElement>(null)
  const { contextSafe } = useGSAP({ scope: container })

  return (
    <Transition
      in={isQuestionPhase}
      timeout={{ enter: 0, exit: 250 }}
      nodeRef={container}
      mountOnEnter={true}
      unmountOnExit={true}
      onEnter={contextSafe(() => {
        gsap.fromTo(container.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.3 })
      })}
      onExit={contextSafe(() => {
        gsap.to(container.current, { opacity: 0, y: 12, duration: 0.2 })
      })}>
      <div ref={container} id="timer" className="absolute bottom-12 flex items-center gap-4 opacity-0">
        <TimerIcon size={32} strokeWidth={2} />
        <div className="relative h-2.5 w-64 overflow-hidden rounded-full bg-white/20">
          <div
            id="slow-mo-bar"
            className="absolute h-full w-full origin-left bg-linear-90 from-white/30 to-white to-60% opacity-0"
          />
        </div>
      </div>
    </Transition>
  )
}
