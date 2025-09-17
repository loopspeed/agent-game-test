'use client'
import { useChat } from '@ai-sdk/react'
import { useGSAP } from '@gsap/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, tool } from 'ai'
import gsap from 'gsap'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import React, { type FC, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import Chat from '@/components/game/chat/Chat'
import Level from '@/components/game/level/Level'
import PlayerSetup from '@/components/game/playerSetup/PlayerSetup'
import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import { Course, CourseSchema } from '@/model/content'
import { type ChapterRun } from '@/model/game'
import { useCourseStore } from '@/stores/CourseProvider'
import { useHistoryStore } from '@/stores/useHistoryStore'

gsap.registerPlugin(useGSAP)

const Main: FC = () => {
  const { stage, goToStage } = useNavigation()
  const storeCourse = useCourseStore((s) => s.storeCourse)
  const setActiveCourse = useCourseStore((s) => s.setActiveCourse)
  const addChapterRunToHistory = useHistoryStore((s) => s.addChapterRun)

  const container = useRef<HTMLDivElement>(null)
  // Store pending tool call to resolve after level completion
  const pendingToolCall = useRef<{ toolName: string; toolCallId: string; courseId: string; chapterId: string } | null>(
    null,
  )

  const chat = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    // messageMetadataSchema
    // Automatically send messages once all tool results are provided
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Handle client-side tool invocations
    async onToolCall({ toolCall }) {
      // Always check dynamic to avoid TypeScript narrowing issues
      if (toolCall.dynamic) return

      if (toolCall.toolName === 'storeCourse') {
        try {
          const input = toolCall.input as { course: Course }
          console.warn('[DEBUG] storeCourse: input', input)

          // Validate the course object against the schema
          const parsedCourse = CourseSchema.parse(input.course)
          console.log('[DEBUG] storeCourse: parsedCourse', parsedCourse)

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
          const input = toolCall.input as { courseId: string; chapterId: string }
          const { courseId, chapterId } = input
          console.warn('[DEBUG] playChapter: courseId', courseId, 'chapterId', chapterId)
          // Store the pending tool call to resolve after level completion
          pendingToolCall.current = {
            toolName: 'playChapter',
            toolCallId: toolCall.toolCallId,
            courseId,
            chapterId,
          }
          // Set active course and chapter
          const { success, error } = setActiveCourse({ courseId, chapterId })
          if (!success) throw error

          goToStage(Stage.Level)
        } catch (error) {
          chat.addToolResult({
            tool: 'playChapter',
            toolCallId: toolCall.toolCallId,
            output: { status: 'error', error: (error as Error).message },
          })
        }
      }
    },
  })

  const onChapterLevelComplete = (run: ChapterRun) => {
    addChapterRunToHistory(run)
    // If there's a pending playChapter tool call, resolve it now
    if (!pendingToolCall.current) return
    const { toolName, toolCallId, courseId, chapterId } = pendingToolCall.current
    if (toolName !== 'playChapter') return
    chat.addToolResult({
      tool: 'playChapter',
      toolCallId,
      output: {
        status: 'completed',
        courseId,
        chapterId,
        points: run.points,
        answers: run.answers,
        completionTime: run.completionTime,
      },
    })
    pendingToolCall.current = null
    goToStage(Stage.Chat)
  }

  const onLevelExited = () => {
    // If there's a pending playChapter tool call, resolve it now
    if (!pendingToolCall.current) return
    const { toolName, toolCallId, courseId, chapterId } = pendingToolCall.current
    if (toolName !== 'playChapter') return
    chat.addToolResult({
      tool: 'playChapter',
      toolCallId,
      output: {
        status: 'aborted',
        courseId,
        chapterId,
      },
    })
    pendingToolCall.current = null
  }

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
                {stage === Stage.PlayerSetup && <PlayerSetup transitionStatus={transitionStatus} />}
                {stage === Stage.Chat && (
                  <ErrorBoundary errorComponent={Error}>
                    <Chat transitionStatus={transitionStatus} chat={chat} />
                  </ErrorBoundary>
                )}
                {stage === Stage.Level && (
                  <ErrorBoundary errorComponent={Error}>
                    <Level
                      transitionStatus={transitionStatus}
                      onExited={onLevelExited}
                      onChapterLevelComplete={onChapterLevelComplete}
                    />
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
