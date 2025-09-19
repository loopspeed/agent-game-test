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
  const { scoreEvents = [] } = useScoreEvents()
  const playerPosition = useLevelStore((s) => s.playerPosition)

  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([])
  const seenItems = useRef<Set<string>>(new Set())
  const removeTimers = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    if (!scoreEvents.length) return

    const DELAY_BEFORE_REMOVAL_MS = 2400
    const eventsToAdd: DisplayEvent[] = []

    for (const event of scoreEvents) {
      if (seenItems.current.has(event.id)) continue
      seenItems.current.add(event.id)

      const displayEvent: DisplayEvent = {
        ...event,
        key: `${event.id}-${Date.now()}`,
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
      for (const id of timers.values()) {
        clearTimeout(id)
      }
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
      duration: 0.2,
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
      className="pointer-events-none select-none">
      <div className="relative">
        <TransitionGroup component={null}>
          {displayEvents.map((event) => {
            const isPositiveScore = event.points > 0

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
