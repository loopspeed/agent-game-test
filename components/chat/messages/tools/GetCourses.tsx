import { type ToolUIPart } from 'ai'
import { type FC, memo } from 'react'

import { type CourseSummary } from '@/model/content'
import { type MyUITools } from '@/resources/chat'
import { useCourseStore } from '@/stores/CoursesProvider'

import { ToolMessageContainer } from './ToolMessageContainer'

type GetCoursesToolMessageProps = {
  part: ToolUIPart<MyUITools>
  onStartTestClick: (courseId: string, chapterId: string) => void
}

export const GetCoursesToolMessage: FC<GetCoursesToolMessageProps> = memo(
  ({ part, onStartTestClick }) => {
    const getRunsForCourseChapter = useCourseStore((state) => state.getRunsForCourseChapter)

    if (part.state === 'input-streaming' || part.state === 'input-available')
      return <ToolMessageContainer status="waiting" title="Loading courses..." />

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
        <ToolMessageContainer status="error" title="Error loading courses">
          <div className="mt-2 text-xs text-red-600">{part.errorText}</div>
        </ToolMessageContainer>
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
