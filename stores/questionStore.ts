import { create } from 'zustand'

import type { Question } from '@/data/questions'
import { SAMPLE_QUESTIONS } from '@/data/questions'

type QuestionState = {
  questions: Question[]
  index: number
  currentQuestion: Question
  goToNextQuestion: () => void
}

export const useQuestionStore = create<QuestionState>((set) => ({
  questions: SAMPLE_QUESTIONS,
  index: 0,
  currentQuestion: SAMPLE_QUESTIONS[0],
  goToNextQuestion: () =>
    set((state) => {
      const nextIndex = (state.index + 1) % state.questions.length
      return { index: nextIndex, currentQuestion: state.questions[nextIndex] }
    }),
}))
