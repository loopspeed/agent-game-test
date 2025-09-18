'use client'

import { useChat } from '@ai-sdk/react'
import { type FC, useEffect, useRef, useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { MyToolResult, type MyUIMessage, type MyUITools } from '@/resources/chat'

import { MemoizedMarkdown } from './Markdown'
import {
  AuthorCourseToolMessage,
  DebuggingToolMessage,
  GetCoursesToolMessage,
  PlayChapterToolMessage,
} from './ToolMessages'

type Props = {
  transitionStatus: TransitionStatus
  chat: ReturnType<typeof useChat<MyUIMessage>>
  onStartTestClick: (courseId: string, chapterId: string) => void
}

const Chat: FC<Props> = ({ chat, onStartTestClick }) => {
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
                  return (
                    <TextMessage
                      key={`${message.id}-${i}`}
                      messageId={message.id}
                      role={message.role}
                      text={part.text}
                    />
                  )

                if (part.type === 'dynamic-tool') return null // Skip dynamic-tool parts

                // TODO: implement UI for the following tools: 'extractContentFromWebsite', 'formatCourseForGame'

                if (part.type === 'tool-authorCourseMarkdown') {
                  return <AuthorCourseToolMessage key={`${message.id}-${i}`} part={part} />
                }

                if (part.type === 'tool-playChapter') {
                  return (
                    <PlayChapterToolMessage key={`${message.id}-${i}`} part={part} addToolResult={chat.addToolResult} />
                  )
                }

                if (part.type === 'tool-getCourses')
                  return (
                    <GetCoursesToolMessage key={`${message.id}-${i}`} part={part} onStartTestClick={onStartTestClick} />
                  )

                if (part.type.includes('tool-')) return <DebuggingToolMessage key={`${message.id}-${i}`} part={part} />
              })}
            </div>
          </div>
        ))}
        {status !== 'ready' && <Spinner />}
      </section>

      {/* Input form */}
      <div className="w-lg max-w-full rounded-xl bg-white p-5 text-black shadow-lg">
        {/* TODO: better and smarter empty state.. */}
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
  messageId: string
  role: 'system' | 'user' | 'assistant'
  text: string
}

const TextMessage: FC<TextMessageProps> = ({ messageId, role, text }) => {
  return (
    <div
      className={twJoin(
        'prose-sm lg:prose rounded-lg p-4',
        role === 'user' ? 'bg-blue-500 !text-white' : 'bg-white !text-black',
      )}>
      <MemoizedMarkdown content={text} id={messageId} />
    </div>
  )
}
