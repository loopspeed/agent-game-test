import { z } from 'zod'

// Zod schemas for our content types
export const QuestionSourceSchema = z.object({
  url: z.string().url().describe('Canonical source link'),
  passage: z.string().describe('Short paragraph shown before test phase'),
})

export const AnswerSchema = z.object({
  id: z.string().describe('Unique identifier for the answer'),
  label: z.string().describe('What the user sees as the answer option'),
  isCorrect: z.boolean().describe('Whether this answer is correct'),
})

export const QuestionSchema = z.object({
  id: z.string().describe('Unique identifier for the question'),
  question: z.string().describe('The question prompt/text'),
  sources: z.array(QuestionSourceSchema).min(1).max(3).describe('1-3 source links and passages'),
  answers: z.array(AnswerSchema).min(2).max(4).describe('2-4 answer options with one correct'),
})

export const ChapterSchema = z.object({
  id: z.string().describe('Unique identifier for the chapter'),
  title: z.string().describe('Chapter title'),
  description: z.string().describe('Chapter description'),
  questions: z.array(QuestionSchema).describe('Array of questions for this chapter'),
})

export const CourseSchema = z.object({
  id: z.string().describe('Unique identifier for the course'),
  title: z.string().describe('Course title'),
  description: z.string().describe('Course description'),
  chapters: z.array(ChapterSchema).min(1).describe('Array of chapters in the course'),
})

// Inferred TypeScript types from Zod schemas
export type QuestionSource = z.infer<typeof QuestionSourceSchema>
export type Answer = z.infer<typeof AnswerSchema>
export type Question = z.infer<typeof QuestionSchema>
export type Chapter = z.infer<typeof ChapterSchema>
export type Course = z.infer<typeof CourseSchema>
