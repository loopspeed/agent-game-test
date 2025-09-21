import { useChat } from '@ai-sdk/react'
import { type ToolUIPart } from 'ai'
import { Check, Trophy, X } from 'lucide-react'
import { type FC, memo } from 'react'

import { type CourseSummary } from '@/model/content'
import { ChapterRun } from '@/model/game'
import { type MyUIMessage, type MyUITools, PlayChapterOutputStatus } from '@/resources/chat'
import { useCourseStore } from '@/stores/CoursesProvider'

import { MemoizedMarkdown } from './Markdown'

// TODO: Create wrapper components for loading/error/success states for tool messages
// TODO: Create course card component for GetCoursesToolMessage

type ChapterRunSummaryProps = {
  run: ChapterRun
}

const ChapterRunSummary: FC<ChapterRunSummaryProps> = memo(
  ({ run }) => {
    const courses = useCourseStore((state) => state.courses)

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

type AddToolResult = ReturnType<typeof useChat<MyUIMessage>>['addToolResult']
type SendMessage = ReturnType<typeof useChat<MyUIMessage>>['sendMessage']

type AuthorCourseToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const AuthorCourseToolMessage: FC<AuthorCourseToolMessageProps> = ({ part }) => {
  console.log('Rendering AuthorCourseToolMessage for part:', part)
  if (part.state === 'input-streaming' || part.state === 'input-available') return null

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['authorTestMarkdown']['output']
    if (!!output)
      return (
        <div className="prose-sm lg:prose rounded-lg bg-white p-4 !text-black">
          <MemoizedMarkdown id={`${part.toolCallId}`} content={output} />
        </div>
      )
    return <div>No content...</div>
  }

  if (part.state === 'output-error') {
    return <div key={part.toolCallId}>Error: {part.errorText}</div>
  }
  return null
}

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
        Running the test...
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

type GetCoursesToolMessageProps = {
  part: ToolUIPart<MyUITools>
  onStartTestClick: (courseId: string, chapterId: string) => void
}

export const GetCoursesToolMessage: FC<GetCoursesToolMessageProps> = memo(
  ({ part, onStartTestClick }) => {
    const getRunsForCourseChapter = useCourseStore((state) => state.getRunsForCourseChapter)

    if (part.state === 'input-streaming' || part.state === 'input-available')
      return (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 text-blue-700">
          <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
          <span>Loading courses...</span>
        </div>
      )

    if (part.state === 'output-available') {
      const output = part.output as MyUITools['getCourses']['output']
      const courses = output.courses as CourseSummary[] | null
      if (!courses || courses.length === 0) return null

      return (
        <div className="space-y-4 py-6">
          {courses.map((course: CourseSummary) => (
            <div key={course.id} className="rounded-lg border border-gray-200 bg-white shadow-sm">
              {/* Course Header */}
              <div className="border-b border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                <p className="mt-2 text-gray-600">{course.description}</p>
              </div>

              {/* Chapters */}
              <div className="p-6">
                <div className="space-y-4">
                  {course.chapters.map((chapter) => {
                    const runs = getRunsForCourseChapter(course.id, chapter.id)
                    const latestRun = runs && runs.length > 0 ? runs[runs.length - 1] : null
                    const bestRun =
                      !!runs && runs.length > 0
                        ? runs.reduce((best, current) => (current.points > best.points ? current : best))
                        : null

                    return (
                      <div key={chapter.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                            <p className="text-sm text-gray-500">{chapter.questions} questions</p>

                            {/* Run Summary */}
                            {runs && runs.length > 0 ? (
                              <div className="mt-2 text-xs text-gray-600">
                                <div className="flex items-center gap-4">
                                  <span>Attempts: {runs.length}</span>
                                  {bestRun && (
                                    <>
                                      <span>Best: {bestRun.points} pts</span>
                                      <span>
                                        Best Accuracy:{' '}
                                        {Math.round(
                                          (bestRun.answers.filter((a) => a.isCorrect).length / bestRun.answers.length) *
                                            100,
                                        )}
                                        %
                                      </span>
                                    </>
                                  )}
                                  {latestRun && <span>Last: {new Date(latestRun.timestamp).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-gray-500">No previous attempts</div>
                            )}
                          </div>

                          <button
                            className="ml-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                            onClick={() => onStartTestClick(course.id, chapter.id)}>
                            START TEST
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (part.state === 'output-error') {
      return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <div className="font-medium">Error loading courses</div>
          <div className="text-sm">{part.errorText}</div>
        </div>
      )
    }

    return null
  },
  (prevProps, nextProps) => {
    // Only re-render if the part.state changes
    return prevProps.part.state === nextProps.part.state
  },
)

GetCoursesToolMessage.displayName = 'GetCoursesToolMessage'

type ToolMessageProps = {
  part: any
}

// Renders a message for any tool, showing its state (input available, output available, error)
export const DebuggingToolMessage: FC<ToolMessageProps> = ({ part }) => {
  console.log('Rendering ToolMessage for part:', part)
  // Safely extract properties from the part
  const toolCallId = part.toolCallId || 'unknown-id'
  const toolName = part.toolName || extractToolNameFromType(part.type)
  const state = part.state
  const input = part.input
  const output = part.output
  const errorText = part.errorText

  // Render different states of tool execution
  switch (state) {
    case 'input-available':
      return (
        <div className="my-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-yellow-500"></div>
            <span className="text-sm font-medium text-yellow-700">{toolName}...</span>
          </div>
          {input ? (
            <details className="text-xs text-yellow-600">
              <summary className="cursor-pointer hover:text-yellow-800">View parameters</summary>
              <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      )

    case 'output-available':
      return (
        <div className="my-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-700">✓ {toolName} completed</span>
          </div>
          {output ? (
            <details className="text-xs text-green-600">
              <summary className="cursor-pointer hover:text-green-800">View results</summary>
              <pre className="mt-1 whitespace-pre-wrap">
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      )

    case 'output-error':
      return (
        <div className="my-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-red-700">✗ {toolName} failed</span>
          </div>
          <div className="mt-2 text-xs text-red-600">Error: {errorText || 'Unknown error occurred'}</div>
        </div>
      )

    default:
      return (
        <div className="my-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm text-gray-600">
            Tool: {toolName} (State: {state || 'unknown'}) - ID: {toolCallId}
          </div>
        </div>
      )
  }
}

// Helper function to extract tool name from type when toolName is not available
function extractToolNameFromType(type: string): string {
  if (type.startsWith('tool-')) {
    return type.replace('tool-', '').replace(/-/g, ' ')
  }
  return type
}
