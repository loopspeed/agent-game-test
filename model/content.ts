// Outermost content (e.g Learn the basics of AI)
export type Course = {
  id: string
  title: string
  description: string
  chapters: Chapter[]
}

// (e.g What is an LLM?)
export type Chapter = {
  id: string
  title: string
  description: string
  questions: Question[]
}

// A single question with possible answers and sources
export type Question = {
  id: string
  question: string // the prompt
  sources: QuestionSource[] // 1–3 links
  answers: Answer[] // length 2 - 4
}

export type Answer = {
  id: string
  label: string // What the user sees
  isCorrect: boolean
}

export type QuestionSource = {
  url: string // canonical source link
  passage: string // short paragraph shown before test phase
}
