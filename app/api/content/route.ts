import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import z from 'zod'

// import { editImage, generateImage } from '@/utils/ai/imageGen'

export const dynamic = 'force-dynamic'
export const maxDuration = 200 // seconds = 3 minutes

const formSchema = z.object({
    url: z.string().url().max(2048),
})

type FormSchema = z.infer<typeof formSchema>

// Utility function to validate form data using Zod
async function validateFormData(formData: FormData): Promise<FormSchema> {
  const parsed = formSchema.safeParse({
    url: formData.get('url'),
  })
  if (!parsed.success) {
    throw new Error(JSON.stringify(parsed.error.flatten()))
  }
  return parsed.data
}



export async function POST(request: NextRequest) {
  const startTime = performance.now() // Start timer
  try {
    const formData = await request.formData()
    const validatedData = await validateFormData(formData)

    const url = validatedData.url
    const randomId = randomUUID()


    try {
      // 
  

    } catch (genError: unknown) {
      console.error('Error generating artwork or signature:', genError)
      throw genError
    }


    return NextResponse.json(
      {
        url,

      },
      { status: 200 },
    )
  } catch (error: unknown) {
    console.error('Error in POST:', error)
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)
    return NextResponse.json({ error: message || 'Internal Server Error' }, { status: 500 })
  }
}
