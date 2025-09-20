'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { TimerIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

type Props = {
  transitionStatus: TransitionStatus
}

const OnboardingUI: FC<Props> = ({ transitionStatus }) => {
  return (
    <section className="absolute top-20 right-0 left-0 flex w-full flex-col items-center">
      <p className="max-w-xl px-4 py-8 text-center text-2xl leading-relaxed font-semibold">
        Use the [Arrow Keys] to move your player.
        <br />
        Follow the highlighted path around the lanes!
      </p>
    </section>
  )
}

export default OnboardingUI
