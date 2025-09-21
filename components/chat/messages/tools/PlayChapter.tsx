import { useChat } from '@ai-sdk/react'
import { type ToolUIPart } from 'ai'
import { Check, Trophy, X } from 'lucide-react'
import { type FC, memo } from 'react'

import { ChapterRun } from '@/model/game'
import { type MyUIMessage, type MyUITools, PlayChapterOutputStatus } from '@/resources/chat'
import { useCourseStore } from '@/stores/CoursesProvider'

type AddToolResult = ReturnType<typeof useChat<MyUIMessage>>['addToolResult']
type SendMessage = ReturnType<typeof useChat<MyUIMessage>>['sendMessage']

type PlayChapterToolMessageProps = {
  part: ToolUIPart<MyUITools>
  addToolResult: AddToolResult
}

export const PlayChapterToolMessage: FC<PlayChapterToolMessageProps> = ({ part, addToolResult }) => {
  const onCancelClick = () => {
    addToolResult({
      tool: 'playChapter',
      toolCallId: part.toolCallId,
      output: { status: PlayChapterOutputStatus.Cancelled },
    })
  }
  if (part.state === 'input-available')
    return (
      <div>
        Playing the test...
        <button className="text-xl" onClick={onCancelClick}>
          Cancel
        </button>
      </div>
    )

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['playChapter']['output']

    // Handle ERROR status..
    if (output.status === PlayChapterOutputStatus.Error) {
      return <div>There was an error starting the test (retry).</div>
    }

    if (output.status === PlayChapterOutputStatus.Completed) {
      const run = output.run as ChapterRun
      return <ChapterRunSummary run={run} />
    }
    if (output.status === PlayChapterOutputStatus.Cancelled) {
      return <div>Chapter run cancelled.</div>
    }
  }

  if (part.state === 'output-error') {
    return <div key={part.toolCallId}>Error: {part.errorText}</div>
  }
  return null
}

type ChapterRunSummaryProps = {
  run: ChapterRun
}

const ChapterRunSummary: FC<ChapterRunSummaryProps> = memo(
  ({ run }) => {
    const courses = useCourseStore((s) => s.courses)

    // Find the course and chapter for this run
    const course = courses[run.courseId]
    const chapter = course?.chapters.find((ch) => ch.id === run.chapterId)

    if (!course || !chapter) {
      return <div className="text-red-500">Course or chapter not found for this run.</div>
    }

    // Map answers to questions
    const questionResults = run.answers.map((answerHit) => {
      const question = chapter.questions.find((q) => q.id === answerHit.questionId)
      const selectedAnswer = question?.answers.find((a) => a.id === answerHit.answerId)
      const correctAnswer = question?.answers.find((a) => a.isCorrect)

      return {
        question: question?.question || 'Unknown question',
        selectedAnswer: selectedAnswer?.label || 'No answer selected',
        correctAnswer: correctAnswer?.label || 'Unknown',
        isCorrect: answerHit.isCorrect,
        questionId: answerHit.questionId,
      }
    })

    const totalQuestions = questionResults.length
    const correctAnswers = questionResults.filter((r) => r.isCorrect).length
    const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
    const completionTimeMinutes = Math.floor(run.completionTime / 60000)
    const completionTimeSeconds = Math.floor((run.completionTime % 60000) / 1000)

    return (
      <div className="rounded-lg border border-green-200 bg-white p-6 text-green-900">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-xl font-bold text-green-800">
            <Trophy className="size-6" />
            Chapter Completed!
          </h3>
          <p className="text-green-700">
            {course.title} - {chapter.title}
          </p>
        </div>

        {/* Overall Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded bg-white p-2 text-center">
            <div className="text-2xl font-bold text-green-600">{run.points}</div>
            <div className="text-sm text-green-600">Points</div>
          </div>
          <div className="rounded bg-white p-2 text-center">
            <div className="text-2xl font-bold text-green-600">{accuracy}%</div>
            <div className="text-sm text-green-600">Accuracy</div>
          </div>
          <div className="rounded bg-white p-2 text-center">
            <div className="text-2xl font-bold text-green-600">
              {correctAnswers}/{totalQuestions}
            </div>
            <div className="text-sm text-green-600">Correct</div>
          </div>
          <div className="rounded bg-white p-2 text-center">
            <div className="text-2xl font-bold text-green-600">
              {completionTimeMinutes}:{completionTimeSeconds.toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-green-600">Time</div>
          </div>
        </div>

        {/* Question Results */}
        <div className="space-y-2.5">
          {questionResults.map((result, index) => (
            <div
              key={result.questionId}
              className={`rounded-lg border p-4 ${
                result.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
              <div className="mb-2 flex items-start justify-between">
                <span className="font-medium text-gray-800">
                  Q{index + 1}: {result.question}
                </span>
                <div className={`ml-2 ${result.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {result.isCorrect ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
                </div>
              </div>
              <div className="text-sm text-gray-700">
                Your answer: <span className="font-medium">{result.selectedAnswer}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Only re-render if the run.id changes
    return prevProps.run.id === nextProps.run.id
  },
)

ChapterRunSummary.displayName = 'ChapterRunSummary'
