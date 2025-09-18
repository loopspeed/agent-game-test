'use client'

import { useGSAP } from '@gsap/react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { createRef, type FC, type RefObject, useEffect, useRef, useState } from 'react'
import { Transition, TransitionGroup } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useScoreEvents } from '@/hooks/useScoreEvents'
import { useLevelStore } from '@/stores/LevelProvider'

// ScoreIndicator displays colored popups above the player whenever an obstacle event or answer hit modifies the score.
// Newer events appear under & push older ones upward and each fades opacity before being removed.

type DisplayEvent = ReturnType<typeof useScoreEvents>['scoreEvents'][number] & {
  key: string
  nodeRef: RefObject<HTMLDivElement | null>
}

const ScoreIndicator: FC = () => {
  const { scoreEvents } = useScoreEvents()
  const playerPosition = useLevelStore((s) => s.playerPosition)

  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([])
  const seenItems = useRef<Set<string>>(new Set())
  const removeTimers = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!scoreEvents?.length) return

    const eventsToAdd: DisplayEvent[] = []

    for (const event of scoreEvents) {
      if (!seenItems.current.has(event.id)) {
        seenItems.current.add(event.id)

        eventsToAdd.push({
          ...event,
          key: `${event.id}-${Date.now()}`,
          nodeRef: createRef<HTMLDivElement>(),
        })
      }
    }

    if (!eventsToAdd.length) return

    setDisplayEvents((previousEvents) => [...previousEvents, ...eventsToAdd].slice(-3))

    for (const event of eventsToAdd) {
      const id = window.setTimeout(() => {
        setDisplayEvents((previousEvents) => previousEvents.filter((item) => item.key !== event.key))
        removeTimers.current.delete(event.key)
      }, 3000)
      removeTimers.current.set(event.key, id)
    }
  }, [scoreEvents])

  // clear timers on unmount
  useEffect(() => {
    const timers = removeTimers.current
    return () => {
      for (const id of timers.values()) {
        clearTimeout(id)
      }
      timers.clear()
    }
  }, [])

  const { contextSafe } = useGSAP()

  const onEnter = contextSafe((node: HTMLElement | null) => {
    if (!node) return
    gsap.set(node, { opacity: 0, scale: 0.6 })
    gsap.to(node, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: 'back.out(1.5)',
    })
  })

  const onExit = contextSafe((node: HTMLElement | null) => {
    if (!node) return
    gsap.killTweensOf(node)
    gsap.to(node, {
      opacity: 0,
      scale: 0.8,
      duration: 0.3,
      ease: 'power2.in',
    })
  })

  useGSAP(() => {
    const eventCount = displayEvents.length
    displayEvents.forEach((event, index) => {
      const node = event.nodeRef.current
      if (!node) return

      const indexFromBottom = eventCount - 1 - index
      const yOffset = -40 * indexFromBottom

      let scoreOpacity = 1
      if (indexFromBottom === 1) scoreOpacity = 0.6
      if (indexFromBottom === 2) scoreOpacity = 0.3

      gsap.killTweensOf(node)
      gsap.to(node, { y: yOffset, opacity: scoreOpacity, duration: 0.3, ease: 'power2.out' })
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
      className="pointer-events-none select-none">
      <div className="relative">
        <TransitionGroup component={null}>
          {displayEvents.map((event) => {
            const isPositiveScore = event.points > 0

            return (
              <Transition
                key={event.key}
                nodeRef={event.nodeRef}
                timeout={{ enter: 300, exit: 300 }}
                mountOnEnter
                unmountOnExit
                onEnter={() => onEnter(event.nodeRef.current)}
                onExit={() => onExit(event.nodeRef.current)}>
                <div
                  ref={event.nodeRef}
                  className={twJoin(
                    'absolute -bottom-12 text-2xl font-bold whitespace-nowrap select-none',
                    isPositiveScore
                      ? 'left-4 text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.7)]'
                      : 'right-4 text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.7)]',
                  )}>
                  {isPositiveScore ? '+' : ''}
                  {event.points}
                </div>
              </Transition>
            )
          })}
        </TransitionGroup>
      </div>
    </Html>
  )
}

export default ScoreIndicator
