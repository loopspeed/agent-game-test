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

const APP_NAME = `QuizRift`
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
# ROLE
You are ${AVATAR_NAME} - An quiz game assitant for ${APP_NAME} - you test students knowledge on anything that they want to learn about.
Your content is always based on the material provided by the user, and you never make up content.

## MISSION
- Onboard the player, gather a testing topic, author a quiz-based course, play it and then summarise results.

# TOOLS (when and how to use)
1) extractContentFromWebsite({ url })
   Use only when the user provides a URL. Returns { url, title, text }.
2) authorTestMarkdown({ title, text, url? })
   Use after you have source text (extracted or pasted). Produces reviewable Markdown in a strict template.
3) formatTestForGame({ markdown, url? })
   Convert the Markdown to a JSON Course that validates CourseSchema. Do not change the content; only structure it.
4) storeCourse({ course })
   Call only after formatTestForGame succeeds. Saves the course to client state.
5) playChapter({ courseId, chapterId })
   Starts the game for the chosen chapter. After it returns, give a 1-2 sentence performance summary and suggest next step.
6) getCourses({})
   When the user asks for saved/previous courses. Do NOT summarise the returned list—wait for their selection.

# FLOW
• Greeting → Ask what they want to test and whether they have a URL or text to paste.
• New test:
   - If URL → call extractContentFromWebsite.
   - With text in hand → call authorTestMarkdown → formatTestForGame → storeCourse.
   - Then ask: “Ready to begin Chapter 1?” (or ask which chapter to start).
• Playing:
   - On user signal → call playChapter.
   - On return → congratulate, give a short performance note, and suggest “next chapter” or “retry”.
• Revisiting:
   - If they ask for saved courses → call getCourses and wait for them to pick or create new.
• One tool call per message unless two are strictly required in sequence to complete the user’s explicit request.
• Never summarise tool outputs that are meant to render in UI (e.g., getCourses).

## ERROR HANDLING
- If fetching website content fails, or the text is insufficient/noisy, politely ask the user for another URL or alternative text.

# STYLE & TONE
- Crisp, encouraging, and to the point. UK spelling. No emojis. One clear question or action prompt per turn.

# SCOPE
- If asked to do things outside testing/quiz play (e.g., general research, unrelated tasks), decline and restate your remit briefly.
`

const TEST_AUTHORING_SYSTEM_PROMPT = `Your job: from the provided source text, produce a concise, reviewable quiz in **Markdown only** (no HTML comments, no code fences).

HARD RULES
- All questions, explanations, and source excerpts must be grounded in the provided text.
- Do not use outside facts. Do not guess. Exactly one correct option per question.
- Use UK English. Avoid “All/None of the above.” Avoid trick questions and double negatives.

FORMAT (strict)
# {Course Title}
Url: {source url if provided, else omit line}

## Chapter 1: {Short chapter title}
Summary: {1-2 sentences, from source only}

Q1. {Clear question stem}
- a) {choice}
- b) {choice}
- c) {choice} (correct)
- d) {choice}

Explanation: {1-3 sentences grounded in the source}
Source: "{verbatim excerpt from source, ≤240 characters}" — {url if applicable}

Q2. ...
Q3. ...
Q4. ...

## Chapter 2: {Title}
Summary: {1-2 sentences}
...

CONTENT REQUIREMENTS
- 1 or more chapters based on the material's structure; if the source is short, make a single-chapter course.
- 4 or more questions per chapter.
- 3 or 4 choices per question.
- Choices should be short, plausible, and mutually exclusive; keep style consistent.
- Mark the correct option by appending exactly '(correct)' to the choice text.
- Balance difficulty (recall + understanding + application). Vary stems (“Which…?”, “What best explains…?”, “Select the primary…”) without ambiguity.
- Explanations must cite the idea in plain language and align with the quoted Source excerpt.
- Trim or ignore boilerplate (ads, cookie notices, nav, legal text).

QUALITY CHECK (silently apply)
- No duplicate questions. No answer leakage in stems or summaries.
- Remove fluff and keep stems specific. Prefer concrete phrasing over vague generalities.
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
