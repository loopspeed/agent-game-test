'use client'

import { useGSAP } from '@gsap/react'
import { Html } from '@react-three/drei'
import gsap from 'gsap'
import { type FC, useEffect, useRef, useState } from 'react'

import { useScoreEvents } from '@/hooks/useScoreEvents'
import { useLevelStore } from '@/stores/LevelProvider'

// ScoreIndicator displays colored popups above the player whenever an obstacle event or answer hit modifies the score.
// Newer events appear under & push older ones upward and each fades to 50% opacity before being removed.

const DISPLAY_DURATION = 3

const ScoreIndicator: FC = () => {
  const { scoreEvents } = useScoreEvents()
  const playerPosition = useLevelStore((s) => s.playerPosition)

  const [displayEvents, setDisplayEvents] = useState<
    (ReturnType<typeof useScoreEvents>['scoreEvents'][number] & { displayId: string })[]
  >([])
  const processedIds = useRef<Set<string>>(new Set())

  // add new events to list
  useEffect(() => {
    const newEntries = scoreEvents
      .filter((event) => !processedIds.current.has(event.id))
      .map((event) => {
        processedIds.current.add(event.id)
        return { ...event, displayId: `${event.id}-${Date.now()}` }
      })
    if (newEntries.length) {
      setDisplayEvents((prev) => [...prev, ...newEntries])
    }
  }, [scoreEvents])

  // remove event after it's faded out
  const removeItem = (displayId: string, id: string) => {
    setDisplayEvents((prev) => {
      const items = prev.filter((event) => event.displayId !== displayId)
      // If no events remain clear processedIds
      if (items.length === 0) {
        processedIds.current.clear()
      }
      return items
    })
    processedIds.current.delete(id)
  }

  // Show at most 3 at once
  const visibleEvents = displayEvents.slice(-3).reverse()
  if (!visibleEvents.length) return null

  return (
    <Html
      transform
      sprite
      distanceFactor={4}
      position={[playerPosition[0], playerPosition[1] + 0.8, playerPosition[2]]}
      zIndexRange={[1000, 0]}
      className="pointer-events-none select-none">
      <div className="relative">
        {visibleEvents.map((event, index) => (
          <ScoreEventItem
            key={event.displayId}
            event={event}
            index={index}
            totalEvents={visibleEvents.length}
            onRemove={removeItem}
          />
        ))}
      </div>
    </Html>
  )
}

type ScoreEventItemProps = {
  event: ReturnType<typeof useScoreEvents>['scoreEvents'][number] & { displayId: string }
  index: number
  totalEvents: number
  onRemove: (displayId: string, id: string) => void
}

const ScoreEventItem: FC<ScoreEventItemProps> = ({ event, index, totalEvents, onRemove }) => {
  const container = useRef<HTMLDivElement>(null)
  const isPositive = event.points > 0
  const sign = isPositive ? '+' : ''
  const color = isPositive ? '#00ff88' : '#ff4444'
  const itemOpacity = index === 0 ? 1 : index === 1 ? 0.6 : 0.3

  useGSAP(() => {
    const item = container.current
    if (!item) return
    const tl = gsap
      .timeline({
        onComplete: () => onRemove(event.displayId, event.id),
      })
      .fromTo(
        item,
        { opacity: 0, scale: 0.6 },
        { opacity: itemOpacity, scale: 1, duration: 0.2, ease: 'back.out(1.5)' },
      )
      .to(item, {
        opacity: 0,
        scale: 0.8,
        duration: 1,
        ease: 'power2.in',
      })
    return () => tl.kill()
  }, [event.displayId])

  // When other events arrive/leave, update this item's vertical offset
  useGSAP(() => {
    const item = container.current
    if (!item) return
    gsap.to(item, { y: -40 * (index + 1), opacity: itemOpacity, duration: 0.3, ease: 'power2.out' })
  }, [index, totalEvents])

  return (
    <div
      ref={container}
      className="absolute top-0 left-1/2 -translate-x-1/2 text-2xl font-bold whitespace-nowrap select-none"
      style={{
        color,
        textShadow: `0 0 10px ${color}`,
      }}>
      {sign}
      {event.points}
    </div>
  )
}

export default ScoreIndicator
