export type Answer = {
  id: string;
  label: string;
  isCorrect: boolean;
};

export type Question = {
  id: string;
  question: string;
  answers: Answer[];
};

export const DEBUG_QUESTIONS: Question[] = [
  {
    id: 'q-001',
    question: 'Pick the correct answer.',
    answers: [
      { id: 'a-001-1', label: 'correct', isCorrect: true },
      { id: 'a-001-2', label: 'wrong', isCorrect: false },
    ],
  },
  {
    id: 'q-002',
    question: 'Pick the wrong answer.',
    answers: [
      { id: 'a-002-1', label: 'correct', isCorrect: false },
      { id: 'a-002-2', label: 'wrong', isCorrect: true },
    ],
  },
  {
    id: 'q-003',
    question: 'Four-slot ring: choose correct.',
    answers: [
      { id: 'a-003-1', label: 'correct', isCorrect: true },
      { id: 'a-003-2', label: 'wrong', isCorrect: false },
      { id: 'a-003-3', label: 'wrong', isCorrect: false },
      { id: 'a-003-4', label: 'wrong', isCorrect: false },
    ],
  },
  {
    id: 'q-004',
    question: 'Four-slot ring: choose wrong.',
    answers: [
      { id: 'a-004-1', label: 'correct', isCorrect: false },
      { id: 'a-004-2', label: 'wrong', isCorrect: true },
      { id: 'a-004-3', label: 'wrong', isCorrect: false },
      { id: 'a-004-4', label: 'wrong', isCorrect: false },
    ],
  },
];