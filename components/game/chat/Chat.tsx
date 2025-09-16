'use client'

import { useChat } from '@ai-sdk/react'
import { type FC, useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'

type Props = {
  transitionStatus: TransitionStatus
  chat: ReturnType<typeof useChat>
}

const Chat: FC<Props> = ({ chat, transitionStatus }) => {
  const [input, setInput] = useState('')
  const { status, messages, sendMessage } = chat

  return (
    <div className="mx-auto grid h-full w-6xl max-w-full grid-cols-1 grid-rows-[1fr_auto] gap-6 overflow-hidden">
      {/* Messages container */}
      <section className="h-full space-y-4 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-4 shadow-sm ${
                message.role === 'user' ? 'bg-blue-500 text-white' : 'border border-gray-200 bg-white text-gray-800'
              }`}>
              <div
                className={`mb-2 text-xs font-medium ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {message.role === 'user' ? 'You' : 'ChatRunner'}
              </div>
              <div className="whitespace-pre-wrap">
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return <span key={index}>{part.text}</span>
                  }

                  // Handle tool invocations - check for different tool types
                  if (part.type?.startsWith('tool-') || part.type === 'dynamic-tool') {
                    const toolCallId = (part as { toolCallId?: string }).toolCallId || `tool-${index}`
                    return renderToolPart(part, toolCallId)
                  }

                  // Handle step boundaries for multi-step tool calls
                  if (part.type === 'step-start') {
                    return index > 0 ? (
                      <div key={index} className="text-gray-500">
                        <hr className="my-2 border-gray-300" />
                      </div>
                    ) : null
                  }

                  return null
                })}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Input form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-black shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!input.trim()) return
            // Send the user's message to the backend
            sendMessage({ text: input })
            setInput('')
          }}
          className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== 'ready'}
            placeholder="Ask about creating a course or start chatting..."
            className="flex-1 rounded-lg border px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400">
            {status === 'ready' ? 'Send' : 'Thinking...'}
          </button>
        </form>

        {status !== 'ready' && (
          <div className="mt-3 flex items-center text-sm text-gray-500">
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
            ChatRunner is processing your request...
          </div>
        )}
      </div>
    </div>
  )
}

export default Chat

// Helper function to get friendly tool names for display
const getToolDisplayName = (toolName: string): string => {
  const toolNames: Record<string, string> = {
    extractMaterialFromWebsite: 'Extracting Content from Website',
    authorCourseMarkdown: 'Creating Course Structure',
    formatCourseForGame: 'Formatting Course for Game',
    buildCourseFromWebsite: 'Building Course from Website',
    buildCourseFromText: 'Building Course from Text',
  }
  return toolNames[toolName] || toolName
}

// Helper function to render tool parts based on their state
const renderToolPart = (part: unknown, toolCallId: string) => {
  // Type-safe access to tool part properties
  const toolPart = part as {
    toolName?: string
    state?: string
    input?: unknown
    output?: unknown
    errorText?: string
  }

  const toolDisplayName = getToolDisplayName(toolPart.toolName || 'unknown')

  switch (toolPart.state) {
    case 'input-streaming':
      return (
        <div key={toolCallId} className="my-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
            <span className="text-sm font-medium text-blue-700">Preparing {toolDisplayName}...</span>
          </div>
        </div>
      )

    case 'input-available':
      return (
        <div key={toolCallId} className="my-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-yellow-500"></div>
            <span className="text-sm font-medium text-yellow-700">{toolDisplayName}...</span>
          </div>
          {toolPart.input ? (
            <div className="mt-2">
              <details className="text-xs text-yellow-600">
                <summary className="cursor-pointer hover:text-yellow-800">View parameters</summary>
                <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(toolPart.input, null, 2)}</pre>
              </details>
            </div>
          ) : null}
        </div>
      )

    case 'output-available':
      return (
        <div key={toolCallId} className="my-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-700">✓ {toolDisplayName} completed</span>
          </div>
          {toolPart.output ? (
            <div className="mt-2">
              <details className="text-xs text-green-600">
                <summary className="cursor-pointer hover:text-green-800">View results</summary>
                <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {typeof toolPart.output === 'string' ? toolPart.output : JSON.stringify(toolPart.output, null, 2)}
                </pre>
              </details>
            </div>
          ) : null}
        </div>
      )

    case 'output-error':
      return (
        <div key={toolCallId} className="my-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-red-700">✗ {toolDisplayName} failed</span>
          </div>
          <div className="mt-2 text-xs text-red-600">Error: {toolPart.errorText || 'Unknown error occurred'}</div>
        </div>
      )

    default:
      return (
        <div key={toolCallId} className="my-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="text-sm text-gray-600">
            Tool: {toolDisplayName} (State: {toolPart.state || 'unknown'})
          </div>
        </div>
      )
  }
}
