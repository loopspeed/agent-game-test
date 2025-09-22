// export type ArtifactType = 'odata' // | 'code' | 'graph' etc

// export type CreateArtifactParams = {
//   id: string
//   title: string
//   type: ArtifactType
//   chatId: string
//   userId: number
//   workspaceId: number
//   accessToken?: string
// }

// export interface ArtifactHandler<T = ArtifactType> {
//   type: T
//   onCreateArtifact: (params: CreateArtifactParams) => Promise<void>
// }

// function createArtifactHandler<T extends ArtifactType>(config: {
//   type: T
//   onCreateArtifact: (params: CreateArtifactParams) => Promise<string>
// }): ArtifactHandler<T> {
//   return {
//     type: config.type,
//     onCreateArtifact: async (params: CreateArtifactParams) => {
//       const content = await config.onCreateArtifact(params)

//       const artifactInsertInput: Main_Ai_Artifact_Insert_Input = {
//         id: params.id,
//         title: params.title,
//         type: params.type,
//         content,
//         creator_id: params.userId,
//         chat_id: params.chatId,
//         workspace_id: params.workspaceId,
//       }

//       await fetchGraphQL<Mutation_Root>({
//         query: INSERT_AI_ARTIFACT,
//         variables: { object: artifactInsertInput },
//         accessToken: params.accessToken,
//         isServerSide: true,
//       })
//     },
//   }
// }

// export const odataArtifactHandler = createArtifactHandler<'odata'>({
//   type: 'odata',
//   onCreateArtifact: async ({ title, workspaceId }) => {
//     const { filter } = await generateODataFilter(title, { workspaceId })
//     return filter
//   },
// })

// export const ARTIFACT_HANDLERS: Record<ArtifactType, ArtifactHandler> = {
//   odata: odataArtifactHandler,
// }

// USAGE EXAMPLE

// RAG tools
//   createArtifact: tool({
//     type: 'function',
//     description:
//       'Generate an artifact (structured content) that will be displayed alongside the chat. Use this for odata content.',
//     parameters: z.object({
//       type: z.enum(['odata']).describe('The type of artifact to create'),
//       title: z.string().describe('A descriptive title for the artifact'),
//     }),
//     execute: async ({ type, title }) => {
//       try {
//         const artifactHandler = ARTIFACT_HANDLERS[type]
//         if (!artifactHandler) throw new Error(`No artifact handler found for type: ${type}`)

//         const artifactId = generateUUID()
//         await artifactHandler.onCreateArtifact({
//           id: artifactId,
//           title,
//           type,
//           chatId,
//           userId,
//           workspaceId,
//           accessToken,
//         })

//         return {
//           artifactId,
//           type,
//           title,
//           success: true,
//         }
//       } catch (error) {
//         console.error('Error in `createArtifact` tool:', error)
//         return { success: false, error: 'There was an error generating the artifact. Please try again.' }
//       }
//     },
//   }),
