'use client'

import { useChat } from '@ai-sdk/react'
import { type FC, useEffect, useRef, useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'
import Markdown from 'markdown-to-jsx'
import { MyToolResult, MyUIMessage, MyUITools } from '@/resources/tools'

type Props = {
  transitionStatus: TransitionStatus
  chat: ReturnType<typeof useChat<MyUIMessage>>
}

const Chat: FC<Props> = ({ chat }) => {
  const [input, setInput] = useState('')
  const { status, messages, sendMessage } = chat

  const messagesContainer = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesContainer.current?.scrollTo({ top: messagesContainer.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const showEmptyState = messages.length === 0 && status === 'ready'

  const onPromptSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion })
  }

  return (
    <div className="grid size-full grid-cols-1 grid-rows-[1fr_auto] justify-items-center overflow-hidden pb-10">
      {/* Messages container */}
      <section ref={messagesContainer} className="h-full w-3xl max-w-full space-y-4 overflow-y-auto px-5 py-12">
        {messages.map((message) => (
          // Message row
          <div key={message.id} className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {/* Message bubble */}
            <div className={twJoin('max-w-4/5')}>
              {message.parts.map((part, i) => {
                if (part.type === 'text')
                  return <TextMessage key={`${message.id}-${i}`} role={message.role} text={part.text} />

                if (part.type === 'dynamic-tool') return null // Skip dynamic-tool parts

                if (part.type === 'tool-playChapter') {
                  return (
                    <PlayChapterToolMessage key={`${message.id}-${i}`} part={part} addToolResult={chat.addToolResult} />
                  )
                }

                if (part.type === 'tool-getCourses')
                  return <GetCoursesToolMessage key={`${message.id}-${i}`} part={part} />

                if (part.type.includes('tool-')) return <DebuggingToolMessage key={`${message.id}-${i}`} part={part} />
              })}
            </div>
          </div>
        ))}
        {status !== 'ready' && <Spinner />}
      </section>

      {/* Input form */}
      <div className="w-lg max-w-full rounded-xl bg-white p-5 text-black shadow-lg">
        {showEmptyState && (
          <div>
            <button className="border p-5" onClick={() => onPromptSuggestionClick('Hi!')}>
              Say Hi!
            </button>
            <button className="border p-5" onClick={() => onPromptSuggestionClick('Show me my courses')}>
              Show me my courses
            </button>
          </div>
        )}
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
            className="flex-1 rounded-lg border px-4 py-3 text-base focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            className="rounded-lg bg-blue-500 px-6 py-3 font-medium text-white transition-colors duration-200 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400">
            {status === 'ready' ? 'Send' : 'Thinking...'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Chat

const Spinner: FC = () => {
  return (
    <div className="p-2">
      <div className="size-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
    </div>
  )
}
type TextMessageProps = {
  role: 'system' | 'user' | 'assistant'
  text: string
}

const TextMessage: FC<TextMessageProps> = ({ role, text }) => {
  return (
    <div
      className={twJoin(
        'prose-sm lg:prose rounded-lg p-4',
        role === 'user' ? 'bg-blue-500 !text-white' : 'bg-white !text-black',
      )}>
      <Markdown>{text}</Markdown>
    </div>
  )
}

type PlayChapterToolMessageProps = {
  part: any
  addToolResult: Props['chat']['addToolResult']
}

const PlayChapterToolMessage: FC<PlayChapterToolMessageProps> = ({ part, addToolResult }) => {
  const onCancelClick = () => {
    addToolResult({
      tool: 'playChapter',
      toolCallId: part.toolCallId,
      output: { status: 'cancelled' },
    })
  }
  if (part.state === 'input-available')
    return (
      <div>
        Playing...
        <button className="text-xl" onClick={onCancelClick}>
          Cancel
        </button>
      </div>
    )

  if (part.state === 'output-available') {
    const output = part.output as MyUITools['playChapter']['output']
    if (output.status === 'completed') {
      return <div>Chapter completed!</div>
    }
  }

  if (part.state === 'output-error') {
    return <div key={part.toolCallId}>Error: {part.errorText}</div>
  }
  return null
}

type GetCoursesToolMessageProps = {
  part: any
}
const GetCoursesToolMessage: FC<GetCoursesToolMessageProps> = ({ part }) => {
  if (part.state === 'input-available') return <div>Loading...</div>
  if (part.state === 'output-available') {
    const output = part.output as MyUITools['getCourses']['output']
    const courses = output.courses

    return (
      <div key={part.toolCallId} className="text-xs text-blue-400">
        {/* TODO: map into interactive cards... */}
        {JSON.stringify(courses, null, 2)}
      </div>
    )
  }
  if (part.state === 'output-error') {
    return <div key={part.toolCallId}>Error: {part.errorText}</div>
  }
  return null
}

type ToolMessageProps = {
  part: any
}

const DebuggingToolMessage: FC<ToolMessageProps> = ({ part }) => {
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
