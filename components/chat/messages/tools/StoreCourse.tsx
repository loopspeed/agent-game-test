import { type ToolUIPart } from 'ai'
import { type FC, memo } from 'react'

import { ToolMessageContainer } from '@/components/chat/messages/tools/ToolMessageContainer'
import { type MyUITools, StoreCourseStatus } from '@/resources/chat'

type StoreCourseToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const StoreCourseToolMessage: FC<StoreCourseToolMessageProps> = memo(({ part }) => {
  if (part.state === 'input-streaming' || part.state === 'input-available')
    return <ToolMessageContainer status="waiting" title="Saving course..." />

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['storeCourse']['output']
    const isSuccess = output?.status === StoreCourseStatus.Success

    if (isSuccess) {
      return <ToolMessageContainer status="success" title="Course saved" />
    }

    return (
      <ToolMessageContainer status="error" title="Failed to save course">
        {output?.error || 'Unknown error'}
      </ToolMessageContainer>
    )
  }

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title="Failed to save course">
        {part.errorText}
      </ToolMessageContainer>
    )
  }

  return null
})

StoreCourseToolMessage.displayName = 'StoreCourseToolMessage'
