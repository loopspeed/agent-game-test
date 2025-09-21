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
      return (
        <ToolMessageContainer
          status="success"
          title="Course saved"
          details={
            output?.courseId ? <div className="text-xs text-gray-700">Course ID: {output.courseId}</div> : undefined
          }
        />
      )
    }

    return (
      <ToolMessageContainer status="error" title="Failed to save course">
        <div className="mt-2 text-xs text-red-600">{output?.error || 'Unknown error'}</div>
      </ToolMessageContainer>
    )
  }

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title="Failed to save course">
        <div className="mt-2 text-xs text-red-600">{part.errorText}</div>
      </ToolMessageContainer>
    )
  }

  return null
})

StoreCourseToolMessage.displayName = 'StoreCourseToolMessage'
