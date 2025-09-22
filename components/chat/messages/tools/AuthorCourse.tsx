import { type ToolUIPart } from 'ai'
import { type FC } from 'react'

import { MemoizedMarkdown } from '@/components/chat/messages/Markdown'
import { ToolMessageContainer } from '@/components/chat/messages/tools/ToolMessageContainer'
import { type MyUITools } from '@/resources/chat'

type AuthorCourseToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const AuthorCourseToolMessage: FC<AuthorCourseToolMessageProps> = ({ part }) => {
  if (part.state === 'input-streaming' || part.state === 'input-available')
    return <ToolMessageContainer status="waiting" title="Authoring course content..." />

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title="Failed to author course content">
        Error: {part.errorText}
      </ToolMessageContainer>
    )
  }

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['authorTestMarkdown']['output']
    if (!!output)
      return (
        <ToolMessageContainer
          status="success"
          title="Prepared test content!"
          details={
            <div className="prose-sm lg:prose rounded-lg bg-white p-2 !text-black">
              <MemoizedMarkdown id={`${part.toolCallId}`} content={output} />
            </div>
          }
        />
      )
    return null
  }

  return null
}
