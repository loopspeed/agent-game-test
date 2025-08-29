import { create } from 'zustand';
import type { Question } from '../data/questions';
import { DEBUG_QUESTIONS } from '../data/questions';

interface QuestionState {
  questions: Question[];
  index: number;
  current: Question;
  next: () => void;
}

export const useQuestionStore = create<QuestionState>((set) => ({
  questions: DEBUG_QUESTIONS,
  index: 0,
  current: DEBUG_QUESTIONS[0],
  next: () =>
    set((state) => {
      const nextIndex = (state.index + 1) % state.questions.length;
      return { index: nextIndex, current: state.questions[nextIndex] };
    }),
}));