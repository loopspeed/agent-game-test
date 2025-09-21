import { type FC } from 'react'

import { ToolMessageContainer } from './ToolMessageContainer'

type ToolMessageProps = {
  part: any
}

// Renders a message for any tool, showing its state (input available, output available, error)
export const DebuggingToolMessage: FC<ToolMessageProps> = ({ part }) => {
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
    case 'input-streaming':
      return (
        <ToolMessageContainer
          status="waiting"
          title={`DEBUGGING: ${toolName} started`}
          details={input ? <pre className="whitespace-pre-wrap">{JSON.stringify(input, null, 2)}</pre> : undefined}
        />
      )

    case 'output-available':
      return (
        <ToolMessageContainer
          status="success"
          title={`DEBUGGING: ${toolName} completed`}
          details={
            output ? (
              <pre className="whitespace-pre-wrap">
                {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
              </pre>
            ) : undefined
          }
        />
      )

    case 'output-error':
      return (
        <ToolMessageContainer status="error" title={`DEBUGGING: ${toolName} failed`}>
          <div className="mt-2 text-xs text-red-600">Error: {errorText || 'Unknown error occurred'}</div>
        </ToolMessageContainer>
      )

    default:
      return (
        <div className="my-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm text-gray-600">
            DEBUGGING: Tool: {toolName} (State: {state || 'unknown'}) - ID: {toolCallId}
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
