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

import { CourseSchema, CourseSummarySchema } from '@/model/content'
import { ChapterRunSchema } from '@/model/game'

const AVATAR_NAME = 'TestOwl' // TODO: this will change

export enum PlayChapterOutputStatus {
  Cancelled = 'cancelled',
  Completed = 'completed',
  Error = 'error',
}

export const SYSTEM_PROMPT = `
You are ${AVATAR_NAME} - An quiz game assitant - you test students knowledge on anything that they want to learn about.
Your content is always based on the material provided by the user, and you never make up content.

MISSION
- Onboard the player, gather a testing topic, author a quiz-based course, play it and then summarise results.

TOOL USAGE
  1) extractContentFromWebsite(url) — fetches and cleans HTML text, returns { title, text, wordCount }.
  2) authorTestMarkdown({ title, sourceText }) — takes the extracted text (or user-provided notes) and creates a concise, reviewable Markdown test outline with chapters, summaries, questions, answers and source passages.
  3a) formatTestForGame({ markdown }) — converts the Markdown into a strict Course JSON object conforming to CourseSchema.
  3b) storeCourse({ course }) — saves the Course JSON to the frontend state - always call this immediately after formatting the course.
  4) playChapter({ courseId, chapterId }) — passes the Course JSON to the frontend to set state and begin the test (playable as a game). On completion it returns a status and a summary of the run.
  5) getCourses() — tool that retrieves stored courses in an array of CourseSummary. These are already prepared and validated, and are ready to be played. Do NOT summarize the output.

FLOW
1) Greet the player and ask how they want to test their knowledge (e.g., provide a URL for extraction or content directly).
2) If the player provides a URL, confirm the detected topic before authoring. If they provide raw text, confirm the title if known.
3) After extraction/authoring/formatting/storing then ask the player if they're ready to begin.
4) When the user is ready to play a test, call playChapter({ courseId, chapterId }) exactly once with the course details.
5) After the play is complete, congratulate the player, summarise their performance in a few words (full summary will be displayed in the UI). Then based on performance, suggest that they move onto the next chapter or re-test.

ERROR HANDLING
- If fetching fails or content is insufficient/noisy, politely ask the user for another URL or alternative text.

REVISTING COURSES
If a users asks for their saved courses or previous courses, call getCourses() - this will render custom cards in the UI for them to interact with.
Do not summarise the courses yourself - simply ask if they want to create a new one.

STYLE & TONE
- Be concise, fun, and use UK English. Only request one action per turn and keep your responses brief.
- Avoid unnecessary repetition and verbosity.
- Do not use emoticons or emojis of any kind.
- If the user requests something outside your capabilities, say that's outside of your remit. You are here to test their knowledge and turn them into champions - nothing else!
`

const TEST_AUTHORING_SYSTEM_PROMPT = `
  Your task is to use the provided source text and create a concise, reviewable Markdown test with chapters, questions, answers and source passages.
  Return ONLY the Markdown block between <!-- COURSE-MD-START --> and <!-- COURSE-MD-END -->.
  
  COURSE_MD must contain:
  - 1 or more chapters
  - 4 or more questions per chapter
  - Each question has 2-4 choices (one correct, others plausible incorrect answers), summaries and sources.
   If the source material is short, create a single chapter course.

  Ensure balanced difficulty, no duplicates, and all content must be grounded in the source (except for incorrect answers).
  Discard and ignore content that is not relevant to the title/topic: such as ads, cookies, legal information, navigation, or unrelated links.

  Here is an example of the COURSE-MD format:
  <!-- COURSE-MD-START -->
  # Course Title

  ## Chapter 1: Title

  Q1. Question one?
  - a) Answer 1
  - b) Answer 2
  - c) Answer 3 (correct)
  - d) Answer 4

  Explanation: <explanation of the answer>
  Source: “<quote from the material>”
  ...

  </!-- COURSE-MD-END -->
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

async function authorTest({
  title,
  sourceText,
  writer,
}: {
  title: string
  sourceText: string
  writer: UIMessageStreamWriter
}): Promise<string> {
  // Summarise if source text is too long (> 12k chars)
  const reasoningId = generateId()
  writer.write({ type: 'reasoning-start', id: reasoningId })

  writer.write({
    type: 'reasoning-delta',
    delta: 'Understanding the material...',
    id: reasoningId,
  })

  let input = sourceText
  if (input.length > 24_000) {
    writer.write({
      type: 'reasoning-delta',
      delta: '\nShortening long text...',
      id: reasoningId,
    })

    // TODO: REVIEW THIS _ NOT CHECKED
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

  setTimeout(() => {
    writer.write({
      type: 'reasoning-delta',
      delta: '\nProducing chapters and questions...',
      id: reasoningId,
    })
  }, 2000)

  // Generate Markdown following the COURSE-MD spec
  const { text: courseMarkdown } = await generateText({
    model: openai('gpt-5'),
    temperature: 0.2,
    system: TEST_AUTHORING_SYSTEM_PROMPT,
    prompt: `Title: ${title}\n\nSource Text:\n${input}\n\n`,
  })

  writer.write({
    type: 'reasoning-delta',
    delta: '\nPackaging it up...',
    id: reasoningId,
  })
  writer.write({ type: 'reasoning-end', id: reasoningId })

  return courseMarkdown
}

// Helper to format the Markdown into a Course JSON object.  Ensures the
// output validates against CourseSchema.  Uses gpt-4o-mini for cost control.
async function formatTestForGame({ markdown, writer }: { markdown: string; writer: UIMessageStreamWriter }) {
  const reasoningId = generateId()
  writer.write({ type: 'reasoning-start', id: reasoningId })
  writer.write({
    type: 'reasoning-delta',
    delta: 'Converting Markdown into structured JSON for the game...',
    id: reasoningId,
  })
  writer.write({ type: 'reasoning-end', id: reasoningId })

  const FORMAT_COURSE_SYSTEM_PROMPT = `Convert the content into a JSON object that validates CourseSchema.
  Remove any numbers (e.g "1.") or letters (e.g "a.") that sit in front of questions and answers.
  Retain Chapter numbers.
  Follow the exact content provided to you.
  `

  const { object: course } = await generateObject({
    model: openai('gpt-5-mini'),
    temperature: 0.2,
    schema: CourseSchema,
    messages: [
      {
        role: 'system',
        content: FORMAT_COURSE_SYSTEM_PROMPT,
      },
      { role: 'user', content: markdown },
    ],
  })

  return { course }
}

// Define tools using the AI SDK tool() helper for proper type inference
export const tools = (writer: UIMessageStreamWriter) => ({
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
  authorTestMarkdown: tool({
    description: 'Create a concise, reviewable test in Markdown from source text.',
    inputSchema: z.object({
      title: z.string(),
      sourceText: z.string(),
    }),
    outputSchema: z.string(),
    execute: async ({ title, sourceText }: { title: string; sourceText: string }) => {
      return authorTest({ title, sourceText, writer })
    },
  }),
  // Server-side tool: format Markdown into Course JSON
  formatTestForGame: tool({
    description: 'Convert Markdown into a Course JSON object conforming to CourseSchema.',
    inputSchema: z.object({ markdown: z.string() }),
    outputSchema: z.object({ course: CourseSchema }),
    execute: async ({ markdown }: { markdown: string }) => {
      return formatTestForGame({ markdown, writer })
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
