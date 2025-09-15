'use client'
import { useGSAP } from '@gsap/react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useRef, useState } from 'react'
import { Transition, TransitionGroup } from 'react-transition-group'

import { useScoreEvents } from '@/hooks/useScoreEvents'
import type { ScoreEvent } from '@/stores/GameProvider'

type DisplayEvent = ScoreEvent & {
  displayId: string
}

const ScoreIndicator: FC = () => {
  const { scoreEvents } = useScoreEvents()
  const [displayEvents, setDisplayEvents] = useState<DisplayEvent[]>([])
  const processedEventIds = useRef<Set<string>>(new Set())
  const container = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Process new score events
    const newEvents = scoreEvents.filter((event) => !processedEventIds.current.has(event.id))

    if (newEvents.length === 0) return

    newEvents.forEach((event) => {
      processedEventIds.current.add(event.id)

      const displayEvent: DisplayEvent = {
        ...event,
        displayId: `display-${event.id}-${Date.now()}`,
      }

      // Add new event to display list
      setDisplayEvents((prev) => [...prev, displayEvent])

      // Remove event after animation duration
      gsap.delayedCall(3, () => {
        setDisplayEvents((prev) => prev.filter((e) => e.displayId !== displayEvent.displayId))
      })
    })
  }, [scoreEvents])

  if (displayEvents.length === 0) return null

  return (
    <Html
      center
      position={[0, 0.8, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
      <div ref={container} style={{ position: 'relative' }}>
        <TransitionGroup>
          {displayEvents.map((event, index) => (
            <ScoreEventItem key={event.displayId} event={event} index={index} totalEvents={displayEvents.length} />
          ))}
        </TransitionGroup>
      </div>
    </Html>
  )
}

type ScoreEventItemProps = {
  event: DisplayEvent
  index: number
  totalEvents: number
}

const ScoreEventItem: FC<ScoreEventItemProps> = ({ event, index, totalEvents }) => {
  const nodeRef = useRef<HTMLDivElement>(null)
  const isPositive = event.points > 0
  const points = event.points
  const sign = isPositive ? '+' : ''
  const color = isPositive ? '#00ff88' : '#ff4444'

  useGSAP(() => {
    const node = nodeRef.current
    if (!node) return

    // Initial state
    gsap.set(node, {
      opacity: 0,
      scale: 0.5,
      y: 0,
    })

    const tl = gsap.timeline()

    // Animate in
    tl.to(node, {
      opacity: 1,
      scale: 1,
      duration: 0.3,
      ease: 'back.out(1.7)',
    })

    // Move up to make room for newer events
    tl.to(
      node,
      {
        y: -40 * (index + 1), // Stack events 40px apart
        duration: 0.2,
        ease: 'power2.out',
      },
      0.1,
    )

    // Fade out after delay
    tl.to(
      node,
      {
        opacity: 0,
        scale: 0.8,
        y: -60 * (index + 1), // Continue moving up while fading
        duration: 0.4,
        ease: 'power2.in',
      },
      2.2,
    )
  }, [index])

  // Update position when other events are added/removed
  useGSAP(() => {
    const node = nodeRef.current
    if (!node) return

    gsap.to(node, {
      y: -40 * (index + 1),
      duration: 0.3,
      ease: 'power2.out',
    })
  }, [index, totalEvents])

  return (
    <Transition nodeRef={nodeRef} timeout={3000} mountOnEnter unmountOnExit>
      {() => (
        <div
          ref={nodeRef}
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '24px',
            fontWeight: 'bold',
            color,
            textShadow: `0 0 10px ${color}`,
            whiteSpace: 'nowrap',
            zIndex: totalEvents - index, // Newer events on top
          }}>
          {sign}
          {points}
        </div>
      )}
    </Transition>
  )
}

export default ScoreIndicator
