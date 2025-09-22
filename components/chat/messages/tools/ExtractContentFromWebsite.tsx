import { type ToolUIPart } from 'ai'
import { type FC, memo } from 'react'

import { ToolMessageContainer } from '@/components/chat/messages/tools/ToolMessageContainer'
import { type MyUITools } from '@/resources/chat'

type ExtractContentToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const ExtractContentFromWebsiteToolMessage: FC<ExtractContentToolMessageProps> = memo(({ part }) => {
  if (part.state === 'input-streaming' || part.state === 'input-available')
    return <ToolMessageContainer status="waiting" title="Extracting content from website..." />

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['extractContentFromWebsite']['output']
    const title = output?.title ?? 'Untitled'

    return <ToolMessageContainer status="success" title={`Successfully extracted content for: ${title}`} />
  }

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title="Failed to extract content">
        <div className="mt-2 text-sm text-red-600">{part.errorText}</div>
      </ToolMessageContainer>
    )
  }

  return null
})

ExtractContentFromWebsiteToolMessage.displayName = 'ExtractContentFromWebsiteToolMessage'
