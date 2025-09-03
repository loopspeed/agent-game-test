import Link from 'next/link'
import { type FC, useState } from 'react'

import type { Question } from '@/data/questions'
import { useGameOverData } from '@/hooks/useGameOverData'
import { useGameStore } from '@/stores/GameProvider'
import { formatAccuracy, formatDate, formatTime } from '@/utils/formatting'

const GameOverUI: FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current')
  const startNewGame = useGameStore((s) => s.restartGame)

  const handlePlayAgain = () => {
    startNewGame()
  }

  return (
    <section className="pointer-events-auto grid size-full grid-cols-1 grid-rows-[auto_1fr_auto] gap-5 bg-black/80 px-24 py-12">
      <header>
        <h2 className="text-center text-2xl font-bold">Course Over</h2>
        {/* Tab Navigation */}
        <div className="flex">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'current' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('current')}>
            This Run
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'history' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('history')}>
            Past Runs
          </button>
        </div>
      </header>

      {/* Current Run Tab */}
      {activeTab === 'current' && <CurrentRun />}
      {/* History Tab */}
      {activeTab === 'history' && <HistoricalRuns />}

      {/* Action Buttons */}
      <footer className="flex gap-4">
        <button
          onClick={handlePlayAgain}
          className="flex-1 rounded bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
          Play Again
        </button>

        <Link href="/">
          <button className="flex-1 rounded bg-gray-600 px-4 py-2 text-white transition-colors hover:bg-gray-700">
            Exit Game
          </button>
        </Link>
      </footer>
    </section>
  )
}

export default GameOverUI

const CurrentRun: FC = () => {
  const { currentRun } = useGameOverData()
  const questions = useGameStore((s) => s.questions)

  return (
    <div className="grid w-full grid-cols-[40%_1fr] gap-4 space-y-6 overflow-hidden">
      {/* Stats Overview */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="rounded p-4">
          <p className="text-lg">
            Completed {currentRun.questionsCompleted} of {currentRun.totalQuestions} questions
          </p>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{
                width: `${(currentRun.questionsCompleted / currentRun.totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Score</h3>
          <p className="text-2xl font-bold text-green-600">
            {currentRun.correctAnswers}/{currentRun.questionsCompleted}
          </p>
          <p className="text-sm text-gray-500">{formatAccuracy(currentRun.accuracyPercentage)} accuracy</p>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Max Streak</h3>
          <p className="text-2xl font-bold text-blue-600">{currentRun.maxStreak}</p>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Time</h3>
          <p className="text-2xl font-bold text-purple-600">{formatTime(currentRun.completionTime)}</p>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Final Health</h3>
          <p className="text-2xl font-bold text-red-600">{currentRun.finalHealth}/5</p>
        </div>
      </div>

      {/* Questions Summary */}
      <div className="h-full overflow-y-auto p-4">
        <h3 className="mb-4 font-semibold text-gray-700">Questions Summary</h3>
        <div className="flex flex-col gap-2">
          {questions.map((question: Question, index: number) => {
            const answerForQuestion = currentRun.answersHit.find((hit) => hit.questionId === question.id)
            const selectedAnswer = answerForQuestion?.answerId
              ? question.answers.find((a) => a.id === answerForQuestion.answerId)
              : null

            return (
              <div key={question.id} className="rounded-lg bg-white p-3 shadow-sm">
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className="mt-1 flex-shrink-0">
                    {!answerForQuestion ? (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-400">
                        <span className="text-xs font-bold text-white">?</span>
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
                    <p className="mb-1 font-medium text-gray-900">
                      {index + 1}. {question.question}
                    </p>

                    <div className="text-sm">
                      {!answerForQuestion ? (
                        <span className="text-gray-500">Not reached</span>
                      ) : answerForQuestion.answerId === null ? (
                        <span className="text-red-600">Miss</span>
                      ) : (
                        <span className={answerForQuestion.isCorrect ? 'text-green-600' : 'text-red-600'}>
                          Your answer: {selectedAnswer?.label}
                          {answerForQuestion.isCorrect ? ' (Correct!)' : ' (Incorrect)'}
                        </span>
                      )}
                    </div>

                    {/* Show correct answer if answered incorrectly */}
                    {/* {answerForQuestion && !answerForQuestion.isCorrect && (
                      <div className="mt-1 text-sm text-gray-600">
                        Correct answer: {question.answers.find((a) => a.isCorrect)?.label}
                      </div>
                    )} */}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const HistoricalRuns: FC = () => {
  const { pastRuns, stats } = useGameOverData()

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Total Runs</h3>
          <p className="text-2xl font-bold">{stats.totalRuns}</p>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Average Accuracy</h3>
          <p className="text-2xl font-bold text-green-600">{formatAccuracy(stats.averageAccuracy)}</p>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Best Streak</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.bestStreak}</p>
        </div>

        <div className="rounded bg-gray-50 p-4">
          <h3 className="font-semibold text-gray-700">Total Correct</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.totalCorrectAnswers}</p>
        </div>
      </div>

      {/* Recent Runs */}
      <div className="rounded bg-gray-50 p-4">
        <h3 className="mb-3 font-semibold text-gray-700">Recent Runs</h3>
        {pastRuns.length === 0 ? (
          <p className="text-gray-500">No previous runs yet.</p>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {pastRuns
              .slice(-5)
              .reverse()
              .map((run) => (
                <div key={run.id} className="flex items-center justify-between rounded bg-white p-2">
                  <div>
                    <p className="font-medium">
                      {run.correctAnswers}/{run.correctAnswers + run.incorrectAnswers} (
                      {formatAccuracy(run.accuracyPercentage)})
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(run.timestamp)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">Streak: {run.maxStreak}</p>
                    <p className="text-sm text-gray-500">{formatTime(run.completionTime)}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}
