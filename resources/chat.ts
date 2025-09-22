import { openai } from '@ai-sdk/openai'
import {
  generateId,
  generateObject,
  generateText,
  InferUITools,
  tool,
  TypedToolCall,
  TypedToolResult,
  UIDataTypes,
  UIMessage,
  UIMessageStreamWriter,
} from 'ai'
import { z } from 'zod'

import { Course, CourseSchema, CourseSummarySchema } from '@/model/content'
import { ChapterRunSchema } from '@/model/game'

const AVATAR_NAME = 'TestOwl' // TODO: this will change

export enum PlayChapterOutputStatus {
  Cancelled = 'cancelled',
  Completed = 'completed',
  Error = 'error',
}

export enum StoreCourseStatus {
  Success = 'success',
  Error = 'error',
}

// TODO: When database is added with artifacts - immediately store the course after formatting
// TODO: When test artifact is setup - stream the writing of the test to the user so they see progress in real-time
// TODO: the artifact should contain: markdown, course JSON, course summary JSON

export const SYSTEM_PROMPT = `
You are ${AVATAR_NAME} - An quiz game assitant - you test students knowledge on anything that they want to learn about.
Your content is always based on the material provided by the user, and you never make up content.

MISSION
- Onboard the player, gather a testing topic, author a quiz-based course, play it and then summarise results.

TOOL USAGE
  1) extractContentFromWebsite({ url }) — fetches and cleans HTML text, returns { url, title, text }.
  2) authorTestMarkdown({ title, text, url }) — takes the extracted text (or user-provided notes) and creates a concise, reviewable Markdown test outline with chapters, summaries, questions, answers and source passages.
  3a) formatTestForGame({ url, markdown }) — converts the Markdown into a strict Course JSON object conforming to CourseSchema. Always pass the source URL to maintain provenance.
  3b) storeCourse({ course }) — saves the Course JSON to the frontend state - always call this AFTER formatting the course is complete.
  4) playChapter({ courseId, chapterId }) — passes the Course JSON to the frontend to set state and begin the test (playable as a game). On completion it returns a status and a summary of the run.
  5) getCourses() — tool that retrieves stored courses. Returns array of CourseSummary. These are presented the the user in the UI and can be interacted with. After calling 'getCourses', wait for the user to select a course or create a new one. Do NOT summarize the output.

FLOW
1) Greet the player and ask how they want to test their knowledge (e.g., provide a URL for extraction or content directly).
2) If the player provides a URL, use 'extractContentFromWebsite' to fetch the content.
3) After extraction -> authoring -> formatting -> storing then ask the player if they're ready to begin with the first chapter.
4) When the user is ready to play a test, call playChapter({ courseId, chapterId }) with the course details.
5) After the play is complete, congratulate the player, summarise their performance in a few words (full summary will be displayed in the UI). Then based on performance, suggest that they move onto the next chapter or re-test.

ERROR HANDLING
- If fetching fails or content is insufficient/noisy, politely ask the user for another URL or alternative text.

REVISTING COURSES
If a users asks for their saved courses or previous courses, call 'getCourses()' - this will render custom cards in the UI for them to interact with.
Do not summarise the output yourself - simply ask if they want to start a test or create a new one.

STYLE & TONE
- Be concise, fun, and use UK English. Only request one action per turn and keep your responses brief.
- Avoid unnecessary repetition and verbosity.
- Do not use emoticons or emojis of any kind.
- If the user requests something outside your capabilities, say that's outside of your remit. You are here to test their knowledge and turn them into champions - nothing else!
`

const TEST_AUTHORING_SYSTEM_PROMPT = `
  Your task is to use the provided source text and create a concise, reviewable Markdown test with chapters, questions, answers and source passages.
  Return ONLY the Markdown content without any HTML comments.
  
  It must contain:
  - A title that reflects the content
  - URL for the source material (if provided)
  - 1 or more chapters
  - 4 or more questions per chapter
  - Each question has 2-4 choices (one correct, others plausible incorrect answers), summaries and sources.
   If the source material is short, create a single chapter course.

  Ensure balanced difficulty, no duplicates, and all content must be grounded in the source (except for incorrect answers which should sound plausible and often similar to the correct answer).
  Discard and ignore content that is not relevant to the title/topic: such as ads, cookies, legal information, navigation, or unrelated links.

  Here is an example of the format:
  
  # Course Title
  Url: <source url if provided>

  ## Chapter 1: Title

  Q1. Question one?
  - a) Answer 1
  - b) Answer 2
  - c) Answer 3 (correct)
  - d) Answer 4

  Explanation: <explanation of the answer>
  Source: “<quote from the material>”
  ...

`

// Helper to extract material from a webpage (no JavaScript). Returns the
// cleaned text, page title and word count.  Truncates very long pages to
// prevent overloading subsequent steps.
async function extractContentFromUrl(url: string): Promise<{ url: string; title: string; text: string }> {
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
  console.warn('[DEBUG] extractContentFromUrl: wordCount', wordCount)
  return { url, title, text }
}

async function authorTest({
  title,
  text,
  url,
}: {
  title: string
  url?: string
  text: string
  writer: UIMessageStreamWriter
}): Promise<string> {
  const startTime = performance.now()

  // Summarise if source text is very long
  if (text.length > 50_000) {
    console.warn('[DEBUG] authorCourse: input more than 50k chars - might need summarising...')
  }

  // Generate Markdown test
  const { text: courseMarkdown } = await generateText({
    model: openai('gpt-5'),
    temperature: 0.2,
    system: TEST_AUTHORING_SYSTEM_PROMPT,
    prompt: `Title: ${title}\n\nUrl: ${url}\n\nSource Text:\n${text}\n\n`,
  })

  const endTime = performance.now()
  console.warn(`authorTest completed in ${((endTime - startTime) / 1000).toFixed(2)}s`)

  return courseMarkdown
}

// Helper to format the Markdown into a Course JSON object.  Ensures the
// output validates against CourseSchema.  Uses gpt-4o-mini for cost control.
async function formatTestForGame({
  markdown,
  url,
}: {
  markdown: string
  url?: string
  writer: UIMessageStreamWriter
}): Promise<{ course: Course }> {
  const startTime = performance.now()

  const FORMAT_COURSE_SYSTEM_PROMPT = `Convert the content into a JSON object that validates CourseSchema.
  Remove any numbers or letters (e.g "1." or "a)") that sit in front of questions and answers.
  Retain Chapter numbers.
  Follow the exact content provided to you.
  ${!!url ? `Set the course URL to: ${url}` : ''}
  `

  const { object: course } = await generateObject({
    model: openai('gpt-5-mini'),
    temperature: 0.1,
    schema: CourseSchema,
    messages: [
      {
        role: 'system',
        content: FORMAT_COURSE_SYSTEM_PROMPT,
      },
      { role: 'user', content: markdown },
    ],
  })

  const endTime = performance.now()
  console.warn(`formatTestForGame completed in ${((endTime - startTime) / 1000).toFixed(2)}s`)

  return { course }
}

// Define tools using the AI SDK tool() helper for proper type inference
export const tools = (writer: UIMessageStreamWriter) => ({
  // Server-side tool: fetches HTML and extracts text
  extractContentFromWebsite: tool({
    description: 'Fetch textual content from a webpage. Returns url, title and text.',
    inputSchema: z.object({ url: z.url() }),
    outputSchema: z.object({ title: z.string(), text: z.string(), url: z.string() }),
    execute: async ({ url }: { url: string }) => {
      return extractContentFromUrl(url)
    },
  }),
  // Server-side tool: author Markdown from text
  authorTestMarkdown: tool({
    description: 'Create a concise, reviewable test in Markdown from source text.',
    inputSchema: z.object({
      title: z.string(),
      text: z.string(),
      url: z.string().optional(),
    }),
    outputSchema: z.string(),
    execute: async ({ title, text, url }: { title: string; text: string; url?: string }) => {
      return authorTest({ title, text, url, writer })
    },
  }),
  // Server-side tool: format Markdown into Course JSON
  formatTestForGame: tool({
    description: 'Convert Markdown into a Course JSON object conforming to CourseSchema.',
    inputSchema: z.object({
      markdown: z.string(),
      url: z.string().optional(),
    }),
    outputSchema: z.object({ course: CourseSchema }),
    execute: async ({ markdown, url }: { markdown: string; url?: string }) => {
      return formatTestForGame({ markdown, url, writer })
    },
  }),
  // Client-side tools
  // Store the formatted course in the client
  storeCourse: tool({
    description: 'Save the course to storage.',
    inputSchema: z.object({
      course: CourseSchema,
    }),
    outputSchema: z.object({
      status: z.enum([StoreCourseStatus.Success, StoreCourseStatus.Error]),
      courseId: z.string().optional(),
      error: z.string().optional(),
    }),
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
      status: z.enum([
        PlayChapterOutputStatus.Cancelled,
        PlayChapterOutputStatus.Completed,
        PlayChapterOutputStatus.Error,
      ]),
      run: ChapterRunSchema.optional(),
    }),
  }),
  // Retrieve all stored courses
  getCourses: tool({
    description: 'Retrieve all previously prepared courses as an array of CourseSummary objects.',
    inputSchema: z.object({}),
    outputSchema: z.object({
      status: z.enum(['success', 'error']),
      courses: z.array(CourseSummarySchema),
    }),
  }),
})

type Tools = ReturnType<typeof tools>

export type MyToolCall = TypedToolCall<Tools>
export type MyToolResult = TypedToolResult<Tools>
export type MyUITools = InferUITools<Tools>
export type MyUIMessage = UIMessage<unknown, UIDataTypes, MyUITools>
