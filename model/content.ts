export type Answer = {
  id: string
  label: string // What the user sees
  isCorrect: boolean
}

export type Source = {
  url: string // canonical source link
  passage: string // short paragraph shown before test phase
}

export type Question = {
  id: string
  question: string // the prompt
  sources: Source[] // 1–3 links
  answers: Answer[] // length 2 - 4
}
