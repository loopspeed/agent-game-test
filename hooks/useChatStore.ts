// Create a Zustand store for chat state management

// Store the Chats, Store the messages...
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { MyUIMessage } from '@/resources/chat'

type Store = {
  messages: MyUIMessage[]
  updateMessages: (messages: MyUIMessage[]) => void
  getInitialMessages: () => MyUIMessage[]

  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

// chatId passed into the POST request to /api/chat
export const useChatStore = create<Store>()(
  persist(
    (set, get) => ({
      messages: [],
      getInitialMessages: () => {
        return get().messages
      },
      updateMessages: (messages) => {
        // If the message doesn't have a tool output result, remove it.
        const sanitizedMessages = messages.filter((message) => {
          if (!message.parts) return true
          message.parts.forEach((part) => {
            if (part.type === 'tool-playChapter' && !part.output) {
              console.warn('Removing message part without tool output', part)
              return false
            }
          })
          return true
        })
        console.warn('useChatStore.updateMessages', { sanitizedMessages })
        set({ messages: sanitizedMessages })
      },
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state })
      },
    }),
    {
      name: 'chat-storage', // unique name for localStorage key
      partialize: (state) => ({
        // Only persist the messages, not hydration state
        messages: state.messages,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error('Chat store hydration failed:', error)
          } else {
            console.log('Chat store hydrated successfully', state)
            state?.setHasHydrated(true)
          }
        }
      },
    },
  ),
)
