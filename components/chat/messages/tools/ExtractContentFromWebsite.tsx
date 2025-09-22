import { type ToolUIPart } from 'ai'
import { type FC, memo } from 'react'

import { ToolMessageContainer } from '@/components/chat/messages/tools/ToolMessageContainer'
import { type MyUITools } from '@/resources/chat'

type ExtractContentToolMessageProps = {
  part: ToolUIPart<MyUITools>
}

export const ExtractContentFromWebsiteToolMessage: FC<ExtractContentToolMessageProps> = memo(({ part }) => {
  const input = part?.input as MyUITools['extractContentFromWebsite']['input']
  const url = input?.url ?? 'website'

  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return <ToolMessageContainer status="waiting" title={`Extracting content from ${url}...`} />
  }

  if (part.state === 'output-available') {
    // const output = part.output as MyUITools['extractContentFromWebsite']['output']
    return <ToolMessageContainer status="success" title={`Successfully extracted content from "${url}"`} />
  }

  if (part.state === 'output-error') {
    return (
      <ToolMessageContainer status="error" title={`Failed to extract content from ${url}`}>
        {part.errorText}
      </ToolMessageContainer>
    )
  }

  return null
})

ExtractContentFromWebsiteToolMessage.displayName = 'ExtractContentFromWebsiteToolMessage'
