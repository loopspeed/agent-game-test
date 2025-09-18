import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, hasToolCall, stepCountIs, streamText, type UIMessage } from 'ai'
import z from 'zod'

import { SYSTEM_PROMPT, tools } from '@/resources/tools'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const RequestSchema = z.object({
  messages: z.array(z.any()), // Use z.any() to accept any message structure
})

export async function POST(req: Request) {
  console.warn('[DEBUG] Chat API: POST request received')
  const json = await req.json()

  const body = RequestSchema.parse(json)
  const messages = body.messages as UIMessage[]
  console.warn('[DEBUG] Chat API: Parsed', body.messages.length, 'messages')

  const result = streamText({
    model: openai('gpt-4o'),
    system: SYSTEM_PROMPT,
    messages: convertToModelMessages(messages),
    tools: tools,
    stopWhen: [stepCountIs(7), hasToolCall('getCourses')], // or when fetched courses (e.g getCourses tool returns results)

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

  console.warn('[DEBUG] Chat API: Returning streaming response')
  return result.toUIMessageStreamResponse()
}
