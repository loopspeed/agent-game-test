import { type ToolUIPart } from 'ai'
import { type FC, memo } from 'react'

import { ToolMessageContainer } from '@/components/chat/messages/tools/ToolMessageContainer'
import { type MyUITools } from '@/resources/chat'

type FormatTestForGameToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const FormatTestForGameToolMessage: FC<FormatTestForGameToolMessageProps> = memo(({ part }) => {
  if (part.state === 'input-streaming' || part.state === 'input-available')
    return <ToolMessageContainer status="waiting" title="Formatting test for playing..." />

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['formatTestForGame']['output']
    const course = output.course
    return <ToolMessageContainer status="success" title={`"${course.title}" is ready to play!`} />
  }

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title="Failed to format test">
        {part.errorText}
      </ToolMessageContainer>
    )
  }

  return null
})

FormatTestForGameToolMessage.displayName = 'FormatTestForGameToolMessage'
