/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs'
import OpenAI, { toFile } from 'openai'
import { type  ImageEditParamsBase } from 'openai/resources/images.mjs'

const client = new OpenAI({
  project: 'proj_9JbYTw0UpPQNmpyOhOgbIEkk',
  // You can add timeout or other config here if needed
})

type EditImageParams = {
  prompt: string
  image: fs.PathLike | Buffer | NodeJS.ReadableStream
  size?: ImageEditParamsBase['size']
  asBase64?: boolean
}

/**
 * Edits an image by applying `prompt` to the supplied `image` using the OpenAI Images API.
 * The function returns either a Buffer (default) or a base64 string representing the edited image.
 */
export async function editImage({
  prompt,
  image,
  size = '1024x1536',
  asBase64 = false,
}: EditImageParams): Promise<Buffer | string | null> {
  try {
    // Convert the incoming image reference into a File object understood by OpenAI.
    // If the caller passed a string path, open a read stream first – otherwise assume it's already a stream or Buffer.
    const imageStream = typeof image === 'string' ? fs.createReadStream(image) : image

    const sourceImage = await toFile(imageStream as any, null, {
      type: 'image/jpeg',
    })

    // https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1&lang=javascript

    const response = await client.images.edit({
      model: 'gpt-image-1',
      image: sourceImage,
      prompt,
      size,
      quality: 'high',
    })

    if (!response.data) throw new Error('No data returned from OpenAI API')
    const imageBase64 = response.data[0].b64_json

    if (!imageBase64) throw new Error('Image base64 data is invalid')

    console.warn('Image edited successfully')

    if (asBase64) return imageBase64

    return Buffer.from(imageBase64, 'base64')
  } catch (error) {
    throw new Error(`Error generating image: ${error}`)
  }
}

type GenerateImageParams = {
  prompt: string
  asBase64?: boolean
  size?: ImageEditParamsBase['size']
}

export async function generateImage({
  prompt,
  asBase64 = false,
  size = '1024x1536',
}: GenerateImageParams): Promise<Buffer | string | null> {
  try {
    // https://platform.openai.com/docs/guides/image-generation?image-generation-model=gpt-image-1&lang=javascript

    const response = await client.images.generate({
      model: 'gpt-image-1',
      prompt,
      size,
      quality: 'medium',
      // quality: process.env.NODE_ENV === "development" ? "low" : "high",
    })

    if (!response.data) throw new Error('No data returned from OpenAI API')

    const imageBase64 = response.data[0].b64_json

    if (!imageBase64) throw new Error('Image base64 data is invalid')

    console.warn('Image generated successfully')

    if (asBase64) return imageBase64

    return Buffer.from(imageBase64, 'base64')
  } catch (error) {
    throw new Error(`Error generating image: ${error}`)
  }
}
