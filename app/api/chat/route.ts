import { openai } from '@ai-sdk/openai'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  hasToolCall,
  stepCountIs,
  streamText,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai'
import z from 'zod'

import { SYSTEM_PROMPT, tools } from '@/resources/chat'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// HOW TO PERSIST BY VERCEL:
// https://github.com/vercel-labs/ai-sdk-persistence-db/blob/main/app/page.tsx

const RequestSchema = z.object({
  messages: z.array(z.any()), // Use z.any() to accept any message structure
})

export async function POST(req: Request) {
  console.warn('[DEBUG] Chat API: POST request received')
  const json = await req.json()

  const body = RequestSchema.parse(json)
  const messages = body.messages as UIMessage[]
  console.warn('[DEBUG] Chat API: Parsed', body.messages.length, 'messages')

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      // test persisting different chunk types
      randomlyWriteChunks(writer)

      const result = streamText({
        model: openai('gpt-4o'),
        system: SYSTEM_PROMPT,
        messages: convertToModelMessages(messages),
        tools: tools(writer), // pass message writer into tools for writing custom data parts
        stopWhen: [stepCountIs(4), hasToolCall('getCourses')], // or when fetched courses (e.g getCourses tool returns results)

        // Log each step of the agentic loop for debugging
        async onStepFinish(event) {
          try {
            console.warn('[DEBUG] Step finished', event)
          } catch (err) {
            console.warn('[DEBUG] onStepFinish error', err)
          }
        },
        // Log when the conversation has finished
        async onFinish(event) {
          try {
            const { finishReason } = event
            console.warn('[DEBUG] Conversation finished', { finishReason })
          } catch (err) {
            console.warn('[DEBUG] onFinish error', err)
          }
        },
      })

      result.consumeStream()
      writer.merge(result.toUIMessageStream({ sendStart: false }))
    },
    onError: (error) => {
      // Error messages are masked by default for security reasons.
      // If you want to expose the error message to the client, you can do so here:
      return error instanceof Error ? error.message : String(error)
    },
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      try {
      } catch (error) {
        console.error(error)
      }
    },
  })
  return createUIMessageStreamResponse({ stream })
}

// Example function to randomly write different chunk types
const randomlyWriteChunks = (writer: UIMessageStreamWriter) => {
  if (Math.random() > 0.5) {
    writer.write({
      type: 'source-url',
      sourceId: 'https://example.com',
      url: 'https://example.com',
    })
  }

  if (Math.random() > 0.5) {
    writer.write({
      type: 'source-document',
      sourceId: 'https://example.com',
      mediaType: 'file',
      title: 'Title',
    })
  }
}
