'use client'

import { useGSAP } from '@gsap/react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { CheckIcon, XIcon } from 'lucide-react'
import { createRef, type FC, ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import { Transition, TransitionGroup } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { type ScoreEvent, useLevelStore } from '@/stores/LevelProvider'

// ScoreIndicator displays colored popups above the player whenever an obstacle event or answer hit modifies the score.
// Newer events appear under & push older ones upward and each fades opacity before being removed.

type DisplayEvent = ScoreEvent & {
  key: string
  nodeRef: RefObject<HTMLDivElement | null>
}

const PlayerScoreIndicator: FC = () => {
  const scoreEvents = useLevelStore((s) => s.scoreEvents)
  const playerPosition = useLevelStore((s) => s.playerPosition)

  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([])
  const seenEventIds = useRef<Set<string>>(new Set())
  const removeTimers = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!scoreEvents.length) return

    const DELAY_BEFORE_REMOVAL_MS = 2200
    const eventsToAdd: DisplayEvent[] = []

    for (const event of scoreEvents) {
      // Create unique ID from event properties
      const eventId = `${event.obstacleId}-${event.timestamp}`
      if (seenEventIds.current.has(eventId)) continue
      seenEventIds.current.add(eventId)

      const displayEvent: DisplayEvent = {
        ...event,
        key: eventId,
        nodeRef: createRef<HTMLDivElement>(),
      }

      eventsToAdd.push(displayEvent)

      const onTimeout = () => {
        removeTimers.current.delete(displayEvent.key)
        setDisplayEvents((previousEvents) => previousEvents.filter((item) => item.key !== displayEvent.key))
      }

      const id = window.setTimeout(onTimeout, DELAY_BEFORE_REMOVAL_MS)
      removeTimers.current.set(displayEvent.key, id)
    }

    if (!eventsToAdd.length) return

    setDisplayEvents((previousEvents) => [...previousEvents, ...eventsToAdd].slice(-3))
  }, [scoreEvents])

  // clear timers on unmount
  useEffect(() => {
    const timers = removeTimers.current
    return () => {
      for (const id of timers.values()) clearTimeout(id)
      timers.clear()
    }
  }, [])

  const { contextSafe } = useGSAP()

  const onEnter = contextSafe((node: HTMLElement | null) => {
    if (!node) return
    gsap.fromTo(
      node,
      { opacity: 0, scale: 0.6 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: 'back.out(1.5)',
      },
    )
  })

  const onExit = contextSafe((node: HTMLElement | null) => {
    if (!node) return
    gsap.killTweensOf(node)
    gsap.to(node, {
      opacity: 0,
      duration: 0.3,
    })
  })

  useGSAP(() => {
    const eventCount = displayEvents.length
    displayEvents.forEach((event, index) => {
      const node = event.nodeRef.current
      if (!node) return

      const indexFromBottom = eventCount - 1 - index
      const yOffset = -24 * indexFromBottom

      let opacity = 1
      let blurAmount = 0
      if (indexFromBottom === 1) {
        opacity = 0.6
        blurAmount = 1
      }
      if (indexFromBottom === 2) {
        opacity = 0.4
        blurAmount = 2
      }

      gsap.killTweensOf(node)
      gsap.to(node, { y: yOffset, opacity: opacity, duration: 0.26, ease: 'power2.out' })
      if (!!blurAmount)
        gsap.set(node, {
          filter: `blur(${blurAmount}px)`,
        })
    })
  }, [displayEvents])

  if (!displayEvents.length) return null

  return (
    <Html
      transform
      sprite
      distanceFactor={4}
      position={[playerPosition[0], playerPosition[1] + 0.8, playerPosition[2]]}
      zIndexRange={[1000, 0]}
      className="pointer-events-none relative select-none">
      <TransitionGroup component={null}>
        {displayEvents.map((event) => {
          const isPositiveScore = event.points > 0
          const pointsSuffix = isPositiveScore ? '+' : ''
          const isCorrectAnswer = event.type === 'correct'
          const isIncorrectAnswer = event.type === 'incorrect'
          const label: ReactNode = isCorrectAnswer ? (
            <CheckIcon strokeWidth={3} size={36} />
          ) : isIncorrectAnswer ? (
            <XIcon strokeWidth={3} size={36} />
          ) : (
            `${pointsSuffix}${event.points}`
          )

          return (
            <Transition
              key={event.key}
              nodeRef={event.nodeRef}
              timeout={{ enter: 0, exit: 300 }}
              mountOnEnter={true}
              unmountOnExit={true}
              onEnter={() => onEnter(event.nodeRef.current)}
              onExit={() => onExit(event.nodeRef.current)}>
              <div
                ref={event.nodeRef}
                className={twJoin(
                  'absolute -bottom-12 text-[24px] font-bold whitespace-nowrap select-none',
                  isPositiveScore
                    ? 'left-4 text-green-400 drop-shadow-lg drop-shadow-green-400/30'
                    : 'right-4 text-red-400 drop-shadow-lg drop-shadow-red-400/30',
                )}>
                {label}
              </div>
            </Transition>
          )
        })}
      </TransitionGroup>
    </Html>
  )
}

export default PlayerScoreIndicator
