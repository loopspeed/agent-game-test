'use client'
import { useChat } from '@ai-sdk/react'
import { useGSAP } from '@gsap/react'
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai'
import gsap from 'gsap'
import { ErrorBoundary } from 'next/dist/client/components/error-boundary'
import React, { type FC, useRef } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'

import Chat from '@/components/game/chat/Chat'
import Level from '@/components/game/level/Level'
import PlayerSetup from '@/components/game/playerSetup/PlayerSetup'
import useNavigation, { Stage } from '@/hooks/useGameNavigation'
import { CourseSchema } from '@/model/content'
import { type ChapterRun } from '@/model/game'
import { useCourseStore } from '@/stores/CourseProvider'
import { useHistoryStore } from '@/stores/useHistoryStore'

gsap.registerPlugin(useGSAP)

const Main: FC = () => {
  const { stage, goToStage } = useNavigation()
  const addCourse = useCourseStore((s) => s.addCourse)
  const setActiveCourse = useCourseStore((s) => s.setActiveCourse)
  const setActiveChapter = useCourseStore((s) => s.setActiveChapter)
  const addChapterRunToHistory = useHistoryStore((s) => s.addChapterRun)

  const container = useRef<HTMLDivElement>(null)
  // Store pending tool call to resolve after level completion
  const pendingToolCall = useRef<{ toolCallId: string; courseId: string; chapterId: string } | null>(null)

  const chat = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    // messageMetadataSchema
    // Automatically send messages once all tool results are provided
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Handle client-side tool invocations
    async onToolCall({ toolCall }) {
      // Always check dynamic to avoid TypeScript narrowing issues
      if (toolCall.dynamic) return

      if (toolCall.toolName === 'formatCourseForGame') {
        console.warn('[DEBUG] formatCourseForGame tool call received', toolCall)
      }

      // Play chapter: set active course and chapter, store tool call for later completion
      if (toolCall.toolName === 'playChapter') {
        try {
          const input = toolCall.input as { courseId: string; chapterId: string }
          const { courseId, chapterId } = input
          console.warn('[DEBUG] playChapter: courseId', courseId, 'chapterId', chapterId)

          // Store the pending tool call to resolve after level completion
          pendingToolCall.current = {
            toolCallId: toolCall.toolCallId,
            courseId,
            chapterId,
          }

          // Set active course and chapter
          setActiveCourse(courseId)
          setActiveChapter(chapterId)
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
    if (pendingToolCall.current) {
      const { toolCallId, courseId, chapterId } = pendingToolCall.current
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
      // Clear the pending tool call
      pendingToolCall.current = null
    }

    goToStage(Stage.Chat)
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
