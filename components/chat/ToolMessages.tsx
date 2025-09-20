import { useChat } from '@ai-sdk/react'
import { type ToolUIPart } from 'ai'
import { type FC } from 'react'

import { type CourseSummary } from '@/model/content'
import { ChapterRun } from '@/model/game'
import { type MyUIMessage, type MyUITools, PlayChapterOutputStatus } from '@/resources/chat'

import { MemoizedMarkdown } from './Markdown'

// TODO: Create wrapper components for loading/error/success states for tool messages
// TODO: Create course card component for GetCoursesToolMessage

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
    const run = output.run as ChapterRun // TODO: fix type
    // Handle ERROR status..
    if (output.status === PlayChapterOutputStatus.Error) {
      return <div>There was an error starting the test (retry).</div>
    }
    if (output.status === PlayChapterOutputStatus.Completed) {
      return <div>Chapter completed! {JSON.stringify(run)}</div>
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

export const GetCoursesToolMessage: FC<GetCoursesToolMessageProps> = ({ part, onStartTestClick }) => {
  if (part.state === 'input-streaming' || part.state === 'input-available') return <div>Loading...</div>
  if (part.state === 'output-available') {
    const output = part.output as MyUITools['getCourses']['output']
    const courses = output.courses as CourseSummary[] | null
    if (!courses || courses.length === 0) return null

    return (
      <div className="flex flex-col gap-3 py-6 text-sm text-blue-100">
        {courses.map((c: CourseSummary, index: number) => (
          // TODO: Produce nice course card component - make it expandable to show previous runs.
          <div key={c.id} className="rounded-lg border p-4">
            <div className="text-lg font-bold">{c.title}</div>
            <div className="">{c.description}</div>

            <div className="p-2">
              {c.chapters.map((ch) => (
                <div key={ch.id} className="ml-4 flex items-center gap-3">
                  - {ch.title}
                  <button className="cursor-pointer border px-4 py-1" onClick={() => onStartTestClick(c.id, ch.id)}>
                    START TEST
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (part.state === 'output-error') {
    return <div>Error: {part.errorText}</div>
  }
  return null
}

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
