import { openai } from '@ai-sdk/openai'
import {
  generateObject,
  generateText,
  InferUITools,
  tool,
  TypedToolCall,
  TypedToolResult,
  UIDataTypes,
  UIMessage,
} from 'ai'
import { z } from 'zod'

import { CourseSchema, CourseSummarySchema } from '@/model/content'
import { ChapterRunSchema } from '@/model/game'

export const SYSTEM_PROMPT = `
You are ChatRunner — the learning assistant and game manager for Educational Runner.

MISSION
- Onboard the player, confirm a learning topic, author a quiz-based course, play it and then summarise results.

TOOL USAGE
  1) extractContentFromWebsite(url) — fetches and cleans HTML text, returns { title, text, wordCount }.
  2) authorCourseMarkdown({ title, sourceText }) — takes the extracted text (or user-provided notes) and creates a concise, reviewable Markdown course outline with chapters, summaries, questions, answers and source passages.
  3a) formatCourseForGame({ title, courseMarkdown }) — converts the Markdown into a strict Course JSON object conforming to CourseSchema.
  3b) storeCourse({ course }) — saves the Course JSON to the frontend state - always call this immediately after formatting the course.
  4) playChapter({ courseId, chapterId }) — passes the Course JSON to the frontend to set state and begin the game. On completion it returns a status and a summary of the run.
  5) getCourses() — tool that retrieves stored courses in an array of CourseSummary. These are already prepared and validated, and are ready to be played. 

ONBOARDING FLOW
1) Greet the player and ask their name (one line).
2) Ask how they want to test their knowledge (e.g., “Create questions from the web” or provide notes directly).
3) If the player provides a URL, ask to confirm the detected topic before authoring. If they provide raw text, confirm the title if known.
4) After extraction/authoring/formatting/storing, summarise the resulting course by listing each chapter and its question count. Then ask the player if they're ready to begin.
5) When the user is ready to play, call playChapter({ courseId, chapterId }) exactly once with the course details.
6) After the chapter is complete, congratulate the player, summarise their performance and ask if they want to move onto the next chapter.

REVISTING COURSES
If a users asks for their saved courses, call getCourses() and ask them which one they would like to open.
After they have picked a course, list them the available chapters and ask which chapter they want to play next.

DATA CONTRACT
- The Course JSON must match CourseSchema: Course{id, title, description, chapters[]}; Chapter{id, title, description, questions[]}; Question{id, question, sources[], answers[]}. Answers: 2-4 options with exactly one correct; sources: 1-3 items containing url and passage from the provided material.  
Use kebab-case IDs: course-{slug}, ch-01-{slug}, q-01-{slug}, a-01-a. 

STYLE & TONE
- Be concise, supportive, and use UK English. Only request one action per turn.

ERROR HANDLING
- If fetching fails or content is insufficient/noisy, politely ask the user for another URL or alternative text.
`

const COURSE_AUTHORING_SYSTEM_PROMPT = `
  Your task is to use the provided source text and create a concise, reviewable Markdown course with chapters, questions, answers and source passages.
  Return ONLY the Markdown block between <!-- COURSE-MD-START --> and <!-- COURSE-MD-END -->.
  COURSE_MD must contain:
  - 1 or more chapters
  - 4 or more questions per chapter
  - Each question has 2-4 choices (one correct, others plausible incorrect answers), summaries and sources.
   If the source material is short, create a single chapter course.

  Ensure balanced difficulty, no duplicates, and all content must be grounded in the source (except for incorrect answers).
`

// Helper to extract material from a webpage (no JavaScript). Returns the
// cleaned text, page title and word count.  Truncates very long pages to
// prevent overloading subsequent steps.
async function extractContentFromUrl(url: string): Promise<{ title: string; text: string; wordCount: number }> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const html = await res.text()
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
  const withoutStyles = withoutScripts.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
  const text = withoutStyles
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = (titleMatch?.[1] ?? new URL(url).hostname).trim()
  const wordCount = text.split(/\s+/).length
  const MAX_CHARS = 50_000
  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
  return { title, text: trimmed, wordCount }
}

// Helper to author course Markdown.  Summarises the source text if very long
// before generating the Markdown outline.
async function authorCourse(title: string, sourceText: string): Promise<string> {
  // Summarise if source text is too long (> 12k chars)
  let input = sourceText
  if (input.length > 12_000) {
    console.warn('[DEBUG] authorCourse: summarising long text', input.length)
    const { object: summaryObj } = await generateObject({
      model: openai('gpt-4o-mini'),
      temperature: 0.2,
      schema: z.object({ summary: z.string().max(4000) }),
      messages: [
        { role: 'system', content: 'Return JSON with a concise "summary" field (<= 4000 characters). No commentary.' },
        { role: 'user', content: `Summarise the following content for course creation:\n\n${input}` },
      ],
    })
    input = summaryObj.summary
    console.warn('[DEBUG] authorCourse: summarised length', input.length)
  }

  // Generate Markdown following the COURSE-MD spec
  const { text: courseMarkdown } = await generateText({
    model: openai('gpt-5'),
    temperature: 0.2,
    system: COURSE_AUTHORING_SYSTEM_PROMPT,
    prompt: `Title: ${title}\n\nSource Text:\n${input}\n\n`,
  })
  console.warn('[DEBUG] authorCourse: markdown length', courseMarkdown.length)
  return courseMarkdown
}

// Helper to format the Markdown into a Course JSON object.  Ensures the
// output validates against CourseSchema.  Uses gpt-4o-mini for cost control.
async function formatCourse(title: string, courseMarkdown: string) {
  const { object: course } = await generateObject({
    model: openai('gpt-4o-mini'),
    temperature: 0.2,
    schema: CourseSchema,
    messages: [
      { role: 'system', content: 'Return ONLY a JSON object that validates CourseSchema.' },
      { role: 'user', content: `Title: ${title}\n\nMarkdown:\n${courseMarkdown}` },
    ],
  })
  console.warn('[DEBUG] formatCourse: chapters', course.chapters?.length ?? 0)
  return { course }
}

// Define tools using the AI SDK tool() helper for proper type inference
export const tools = {
  // Server-side tool: fetches HTML and extracts text
  extractContentFromWebsite: tool({
    description: 'Fetch textual content from a webpage. Returns title, clean text, and word count.',
    inputSchema: z.object({ url: z.url() }),
    outputSchema: z.object({ title: z.string(), text: z.string(), wordCount: z.number() }),
    execute: async ({ url }: { url: string }) => {
      return extractContentFromUrl(url)
    },
  }),
  // Server-side tool: author Markdown from text
  authorCourseMarkdown: tool({
    description: 'Create a concise, reviewable course in Markdown from source text.',
    inputSchema: z.object({
      title: z.string(),
      sourceText: z.string(),
    }),
    outputSchema: z.string(),
    execute: async ({ title, sourceText }: { title: string; sourceText: string }) => {
      // TODO: add yield for temporary feedback during long generation
      return authorCourse(title, sourceText)
    },
  }),
  // Server-side tool: format Markdown into Course JSON
  formatCourseForGame: tool({
    description: 'Convert course Markdown into a Course JSON object conforming to CourseSchema.',
    inputSchema: z.object({ title: z.string(), courseMarkdown: z.string() }),
    execute: async ({ title, courseMarkdown }: { title: string; courseMarkdown: string }) => {
      // TODO: add yield for temporary feedback during long generation
      return formatCourse(title, courseMarkdown)
    },
  }),
  // Client-side tools
  // Store the formatted course in the client
  storeCourse: tool({
    description: 'Save the course to storage.',
    inputSchema: z.object({
      course: CourseSchema,
    }),
    outputSchema: z.object({ status: z.string(), courseId: z.string().optional(), error: z.string().optional() }),
  }),
  // Play a specific chapter of a course, when finished return a summary of the run
  playChapter: tool({
    description:
      'Play a specific chapter of a course. Sets the active course and chapter, then navigates to the game screen.',
    inputSchema: z.object({
      courseId: z.string(),
      chapterId: z.string(),
    }),
    outputSchema: z.object({
      status: z.string('player stopped').or(z.string('completed')).or(z.string('error')),
      run: ChapterRunSchema.optional(),
    }),
  }),
  // Retrieve all stored courses
  getCourses: tool({
    description: 'Retrieve all previously prepared courses as an array of CourseSummary objects.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      status: z.string('success').or(z.string('error')),
      courses: z.array(CourseSummarySchema),
    }),
  }),
} as const

export const TOOL_NAMES = Object.keys(tools) as Array<keyof typeof tools>

export type MyToolCall = TypedToolCall<typeof tools>
export type MyToolResult = TypedToolResult<typeof tools>
export type MyUITools = InferUITools<typeof tools>
export type MyUIMessage = UIMessage<unknown, UIDataTypes, MyUITools>
