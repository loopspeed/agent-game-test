import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, generateObject, generateText, stepCountIs, streamText, UIMessage } from 'ai'
import { z } from 'zod'

import { CourseSchema } from '@/model/content'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const SYSTEM_PROMPT = `
You are ChatRunner — the learning assistant and game manager for Educational Runner.

MISSION
- Onboard the player, confirm a learning topic, author a quiz-based course, play it and then summarise results.

TOOL USAGE
  1) extractMaterialFromWebsite(url) — fetches and cleans HTML text, returns { title, text, wordCount }.
  2) authorCourseMarkdown({ title, sourceText }) — takes the extracted text (or user-provided notes) and creates a concise, reviewable Markdown course outline with chapters, summaries, questions, answers and source passages.
  3a) formatCourseForGame({ title, courseMarkdown }) — converts the Markdown into a strict Course JSON object conforming to CourseSchema.
  3b) storeCourse({ course }) — client tool that saves the Course JSON to the frontend state - Always call this immediately after formatting the course.
  4) playChapter({ courseId, chapterId }) — client tool that passes the Course JSON to the frontend to set state and navigate to the game.
- For convenience, composite tools buildCourseFromWebsite(url) and buildCourseFromText({ title, text }) run steps 1-3 in one call. Use them if no intermediate review is needed.

CONVERSATION FLOW
1) Greet the player and ask their name (one line).
2) Ask how they want to test their knowledge (e.g., “Create questions from the web” or provide notes directly).
3) If the player provides a URL, ask to confirm the detected topic before authoring. If they provide raw text, confirm the title if known.
4) After extraction/authoring/formatting/storing, summarise the resulting course by listing each chapter and its question count. Then ask the player if they're ready to begin.
5) When the user is ready to play, call playChapter({ courseId, chapterId }) exactly once with the course details.

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
  - 1-4 chapters
  - 4-10 questions per chapter
  - Each question has 2-4 choices (one correct, others plausible incorrect answers), summaries and sources.
  Balanced difficulty, no duplicates, and all content must be grounded in the source (except for incorrect answers).
`

// Helper to extract material from a webpage (no JavaScript). Returns the
// cleaned text, page title and word count.  Truncates very long pages to
// prevent overloading subsequent steps.
async function extractMaterial(url: string) {
  console.warn('[DEBUG] extractMaterial: Fetching URL:', url)
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
  const MAX_CHARS = 40_000
  const trimmed = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) : text
  console.warn('[DEBUG] extractMaterial: title', title, 'wordCount', wordCount, 'trimmedLength', trimmed.length)
  return { title, text: trimmed, wordCount }
}

// Helper to author course Markdown.  Summarises the source text if very long
// before generating the Markdown outline.
async function authorCourse(title: string, sourceText: string) {
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
  const { text: markdown } = await generateText({
    model: openai('gpt-5'),
    temperature: 0.2,
    system: COURSE_AUTHORING_SYSTEM_PROMPT,
    prompt: `Title: ${title}\n\nSource Text:\n${input}\n\n`,
  })
  console.warn('[DEBUG] authorCourse: markdown length', markdown.length)
  return { markdown }
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

export async function POST(req: Request) {
  console.warn('[DEBUG] Chat API: POST request received')
  const { messages }: { messages: UIMessage[] } = await req.json()
  console.warn('[DEBUG] Chat API: Parsed', messages.length, 'messages')

  // Define server-side and client-side tools.  Client tools omit the execute field
  // so that tool calls are forwarded to the client via the AI SDK.
  const tools = {
    // Server-side tool: fetches HTML and extracts text
    extractMaterialFromWebsite: {
      description: 'Fetch textual content from a webpage (no JavaScript). Returns cleaned text, title and word count.',
      inputSchema: z.object({ url: z.string().url() }),
      async execute({ url }: { url: string }) {
        return extractMaterial(url)
      },
    },
    // Server-side tool: author Markdown from text
    authorCourseMarkdown: {
      description: 'Create a concise, reviewable course outline in Markdown from source text.',
      inputSchema: z.object({
        title: z.string(),
        sourceText: z.string(),
      }),
      async execute({ title, sourceText }: { title: string; sourceText: string }) {
        return authorCourse(title, sourceText)
      },
    },
    // Server-side tool: format Markdown into Course JSON
    formatCourseForGame: {
      description: 'Convert course Markdown into a Course JSON object conforming to CourseSchema.',
      inputSchema: z.object({ title: z.string(), courseMarkdown: z.string() }),
      async execute({ title, courseMarkdown }: { title: string; courseMarkdown: string }) {
        return formatCourse(title, courseMarkdown)
      },
    },
    // Client-side tool: store the formatted course in the client
    storeCourse: {
      description: 'Save the course to storage.',
      inputSchema: z.object({
        course: CourseSchema,
      }),
    },
    // Client-side tool: play a specific chapter of a course
    playChapter: {
      description:
        'Play a specific chapter of a course. Sets the active course and chapter, then navigates to the game screen.',
      inputSchema: z.object({
        courseId: z.string(),
        chapterId: z.string(),
      }),
    },
  } as const

  const result = streamText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools,
    stopWhen: [stepCountIs(6)],
    // Log each step of the agentic loop for debugging
    async onStepFinish(event) {
      try {
        console.warn('[DEBUG] Step finished', event)
      } catch (err) {
        console.warn('[DEBUG] onStepFinish error', err)
      }
    },
    // Log when the conversation has finished
    async onFinish(event: { finishReason: any; messages?: any[] }) {
      try {
        const { finishReason, messages: finalMessages } = event
        console.warn('[DEBUG] Conversation finished', { finishReason, messageCount: finalMessages?.length ?? 0 })
      } catch (err) {
        console.warn('[DEBUG] onFinish error', err)
      }
    },
  })

  console.warn('[DEBUG] Chat API: Returning streaming response')
  return result.toUIMessageStreamResponse()
}
