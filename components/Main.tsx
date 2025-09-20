'use client'
import { useChat } from '@ai-sdk/react'
import { useGSAP } from '@gsap/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import gsap from 'gsap'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import React, { type FC, useEffect, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import Chat from '@/components/chat/Chat'
import Level from '@/components/level/Level'
import PlayerSetup from '@/components/playerSetup/PlayerSetup'
import { useChatStore } from '@/hooks/useChatStore'
import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import { CourseSchema } from '@/model/content'
import { type ChapterRun } from '@/model/game'
import { type MyUIMessage, type MyUITools, PlayChapterOutputStatus } from '@/resources/chat'
import { useCourseStore } from '@/stores/CourseProvider'
import { useHistoryStore } from '@/stores/useHistoryStore'

gsap.registerPlugin(useGSAP)

type Props = {
  initialMessages: MyUIMessage[]
}

const Main: FC<Props> = ({ initialMessages = [] }) => {
  const { stage, goToStage } = useNavigation()

  // Currently all done client side but should be moved to database
  const updateMessages = useChatStore((s) => s.updateMessages)
  const storeCourse = useCourseStore((s) => s.storeCourse)
  const getCourseSummaries = useCourseStore((s) => s.getCourseSummaries)
  const setActiveCourse = useCourseStore((s) => s.setActiveCourse)
  const addChapterRunToHistory = useHistoryStore((s) => s.addChapterRun)

  const container = useRef<HTMLDivElement>(null)

  // Store pending tool call to resolve after level completion
  const pendingPlayTestToolCall = useRef<{
    toolCallId: string
    courseId: string
    chapterId: string
  } | null>(null)

  const chat = useChat<MyUIMessage>({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    messages: initialMessages,

    // messageMetadataSchema
    // Automatically send messages once all tool results are provided
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Handle client-side tool invocations
    async onToolCall({ toolCall }) {
      // Always check dynamic to avoid TypeScript narrowing issues
      if (toolCall.dynamic) return

      if (toolCall.toolName === 'storeCourse') {
        try {
          const input = toolCall.input as MyUITools['storeCourse']['input']
          // Validate the course object against the schema
          const parsedCourse = CourseSchema.parse(input.course)
          console.warn('[DEBUG] storeCourse: parsedCourse', parsedCourse)
          // Store the course and set it as active
          storeCourse(parsedCourse)
          chat.addToolResult({
            tool: 'storeCourse',
            toolCallId: toolCall.toolCallId,
            output: { status: 'ready to play', courseId: parsedCourse.id },
          })
        } catch (error) {
          chat.addToolResult({
            tool: 'storeCourse',
            toolCallId: toolCall.toolCallId,
            output: { status: 'error', error: (error as Error).message },
          })
        }
        return
      }

      // Play chapter: set active course and chapter, store tool call for later completion
      if (toolCall.toolName === 'playChapter') {
        try {
          const input = toolCall.input as MyUITools['playChapter']['input']
          const { courseId, chapterId } = input
          console.warn('[DEBUG] playChapter: courseId', courseId, 'chapterId', chapterId)
          // Store the pending tool call to resolve after level completion
          pendingPlayTestToolCall.current = {
            toolCallId: toolCall.toolCallId,
            courseId,
            chapterId,
          }
          // Set active course and chapter
          const { success, error } = setActiveCourse({ courseId, chapterId })
          if (!success) throw error
          goToStage(Stage.Level)
        } catch (error) {
          console.error('[ERROR] playChapter failed', error)
          chat.addToolResult({
            tool: 'playChapter',
            toolCallId: toolCall.toolCallId,
            output: { status: PlayChapterOutputStatus.Error },
          })
        }
      }

      if (toolCall.toolName === 'getCourses') {
        const courses = getCourseSummaries()
        console.warn('[DEBUG] getCourses: courses', courses)
        chat.addToolResult({
          tool: 'getCourses',
          toolCallId: toolCall.toolCallId,
          output: { status: 'success', courses },
        })
      }
    },
  })

  useEffect(() => {
    if (!chat.messages.length) return
    // Store messages in Zustand store (should be done server side)
    updateMessages(chat.messages)
  }, [chat.messages, updateMessages])

  const onStartTestClick = (courseId: string, chapterId: string) => {
    // Set active course and chapter
    const { success, error } = setActiveCourse({ courseId, chapterId })
    if (!success) throw error
    // Insert tool message to initiate playChapter tool call
    const toolCallId = `play-chapter-${Date.now()}`
    chat.sendMessage({
      role: 'assistant',
      parts: [
        {
          type: 'tool-playChapter',
          toolCallId: toolCallId,
          state: 'input-available',
          input: { courseId, chapterId },
        },
      ],
    })
    pendingPlayTestToolCall.current = { toolCallId, courseId, chapterId }
    goToStage(Stage.Level)
  }

  const onChapterLevelComplete = (run: ChapterRun) => {
    console.warn('[DEBUG] Chapter level complete', run)
    addChapterRunToHistory(run)
    goToStage(Stage.Chat)

    // If there's a pending playChapter tool call, resolve it now
    if (!pendingPlayTestToolCall.current) return
    const { toolCallId } = pendingPlayTestToolCall.current

    chat.addToolResult({
      tool: 'playChapter',
      toolCallId,
      output: {
        status: PlayChapterOutputStatus.Completed,
        run,
      },
    })
    pendingPlayTestToolCall.current = null
  }

  useEffect(() => {
    return () => {
      //  Clear any pending tool call on unmount
      if (!!pendingPlayTestToolCall.current) {
        chat.addToolResult({
          tool: 'playChapter',
          toolCallId: pendingPlayTestToolCall.current.toolCallId,
          output: { status: PlayChapterOutputStatus.Cancelled },
        })
        pendingPlayTestToolCall.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="h-svh w-full overflow-hidden">
      <SwitchTransition>
        <Transition
          key={stage}
          nodeRef={container}
          timeout={{ enter: 0, exit: 400 }}
          appear={true}
          mountOnEnter={true}
          unmountOnExit={true}>
          {(transitionStatus) => {
            return (
              <div ref={container} className="size-full">
                {stage === Stage.PlayerSetup && (
                  <ErrorBoundary errorComponent={Error}>
                    <PlayerSetup transitionStatus={transitionStatus} />
                  </ErrorBoundary>
                )}
                {stage === Stage.Chat && (
                  <ErrorBoundary errorComponent={Error}>
                    <Chat transitionStatus={transitionStatus} chat={chat} onStartTestClick={onStartTestClick} />
                  </ErrorBoundary>
                )}
                {stage === Stage.Level && (
                  <ErrorBoundary errorComponent={Error}>
                    <Level transitionStatus={transitionStatus} onChapterLevelComplete={onChapterLevelComplete} />
                  </ErrorBoundary>
                )}
              </div>
            )
          }}
        </Transition>
      </SwitchTransition>
    </main>
  )
}

export default Main

const Error: FC = () => {
  return <div>Something went wrong FFS</div>
}
