'use client'

import { type FC, useEffect } from 'react'

import { type Question, SAMPLE_QUESTIONS } from '@/data/questions'
import { GameStage, MAX_HEALTH, useGameStore } from '@/stores/GameProvider'

const HUD: FC = () => {
  const stage = useGameStore((s) => s.stage)

  // TODO:
  // Use a SwitchTransition to mount them
  return (
    <div className="pointer-events-none fixed top-0 z-100 flex !h-svh w-full items-center justify-center">
      {stage === GameStage.INTRO && <IntroUI />}
      {stage === GameStage.PLAYING && <PlayingUI />}
      {stage === GameStage.GAME_OVER && <GameOverUI />}
    </div>
  )
}

export default HUD

const IntroUI: FC = () => {
  const setStage = useGameStore((s) => s.setStage)

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

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <button
        className="pointer-events-auto bg-black p-8 text-xl font-black text-white"
        onClick={() => setStage(GameStage.PLAYING)}>
        READY (ENTER)
      </button>
    </div>
  )
}

const PlayingUI: FC = () => {
  return (
    <>
      <Question />
      <Health />
    </>
  )
}

const Health: FC = () => {
  const health = useGameStore((s) => s.health)

  // Determine health bar color based on current health level
  const getHealthColor = (): string => {
    if (health >= 4) return 'bg-green-500' // High health (4-5)
    if (health === 3) return 'bg-amber-500' // Medium health (3)
    return 'bg-red-700' // Low health (1-2)
  }

  return (
    <div className="absolute bottom-6 flex gap-0.5 overflow-hidden rounded-full">
      {Array.from({ length: MAX_HEALTH }, (_, i) => (
        <div key={i} className={`h-4 w-6 ${i < health ? getHealthColor() : 'bg-white/30'}`} />
      ))}
    </div>
  )
}

const Question: FC = () => {
  const questionIndex = useGameStore((s) => s.currentQuestionIndex)
  const currentQuestion = useGameStore((s) => s.currentQuestion)

  return (
    // TODO: SwitchTransition on the question text
    <div className="absolute top-0 flex max-w-2xl flex-col bg-black/70 text-center text-3xl leading-relaxed font-bold">
      <p className="px-2 py-5">
        {questionIndex + 1}. {currentQuestion.question}
      </p>

      <div className="relative h-2 w-full overflow-hidden bg-white/20">
        <div id="slow-mo-bar" className="absolute h-full w-full origin-left bg-blue-500 opacity-0" />
      </div>
    </div>
  )
}

// MF: this is all AI trollop not reviewed or tested....
const GameOverUI: FC = () => {
  const answersHit = useGameStore((s) => s.answersHit)
  const questions = SAMPLE_QUESTIONS

  return (
    <div className="flex max-w-4xl flex-col bg-black/90 text-center leading-relaxed">
      <div className="px-6 py-8">
        <h1 className="mb-8 text-4xl font-bold text-white">Game Over</h1>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-white">Question Summary</h2>

          <div className="max-h-96 space-y-4 overflow-y-auto">
            {questions.map((question: Question, index: number) => {
              const answerForQuestion = answersHit.find((hit) => hit.questionId === question.id)
              const selectedAnswer = answerForQuestion?.answerId
                ? question.answers.find((a) => a.id === answerForQuestion.answerId)
                : null

              return (
                <div key={question.id} className="rounded-lg bg-white/10 p-4 text-left">
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div className="mt-1 flex-shrink-0">
                      {!answerForQuestion ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-500">
                          <span className="text-xs font-bold text-white">?</span>
                        </div>
                      ) : answerForQuestion.answerId === null ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500">
                          <span className="text-xs font-bold text-white">M</span>
                        </div>
                      ) : answerForQuestion.isCorrect ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                          <span className="text-xs font-bold text-white">✓</span>
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500">
                          <span className="text-xs font-bold text-white">✗</span>
                        </div>
                      )}
                    </div>

                    {/* Question content */}
                    <div className="flex-1">
                      <p className="mb-2 font-medium text-white">
                        {index + 1}. {question.question}
                      </p>

                      <div className="text-sm">
                        {!answerForQuestion ? (
                          <span className="text-gray-400">Not answered</span>
                        ) : answerForQuestion.answerId === null ? (
                          <span className="text-yellow-400">Miss - hit empty gate</span>
                        ) : (
                          <span className={answerForQuestion.isCorrect ? 'text-green-400' : 'text-red-400'}>
                            Your answer: {selectedAnswer?.label}
                            {answerForQuestion.isCorrect ? ' (Correct!)' : ' (Incorrect)'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-white/20 pt-4">
            <p className="text-lg text-white">
              Score: {answersHit.filter((hit) => hit.isCorrect).length} / {questions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
