import { type ToolUIPart } from 'ai'
import { type FC, memo } from 'react'

import { ToolMessageContainer } from '@/components/chat/messages/tools/ToolMessageContainer'
import { type MyUITools } from '@/resources/chat'

type FormatTestForGameToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const FormatTestForGameToolMessage: FC<FormatTestForGameToolMessageProps> = memo(({ part }) => {
  if (part.state === 'input-streaming' || part.state === 'input-available')
    return <ToolMessageContainer status="waiting" title="Formatting your test for the game..." />

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['formatTestForGame']['output']
    const course = output.course
    const chapterCount = course.chapters.length
    const questionCount = course.chapters.reduce((sum, ch) => sum + ch.questions.length, 0)

    return (
      <ToolMessageContainer
        status="success"
        title={`Formatted test: ${course.title}`}
        details={
          <div className="text-xs text-gray-700">
            <div>Chapters: {chapterCount}</div>
            <div>Questions: {questionCount}</div>
          </div>
        }
      />
    )
  }

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title="Failed to format test">
        <div className="mt-2 text-xs text-red-600">{part.errorText}</div>
      </ToolMessageContainer>
    )
  }

  return null
})

FormatTestForGameToolMessage.displayName = 'FormatTestForGameToolMessage'
