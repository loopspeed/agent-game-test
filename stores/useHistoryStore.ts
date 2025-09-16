import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { ChapterRun } from '@/model/game'
import { generateUUID } from '@/utils/helpers'

export type HistoryState = {
  chapterRuns: ChapterRun[]
  addChapterRun: (chapterRun: Omit<ChapterRun, 'id'>) => void
  getChapterRuns: (courseId?: string) => ChapterRun[]
  getLastRun: () => ChapterRun | null
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      chapterRuns: [],

      addChapterRun: (courseRunData) => {
        console.warn('[useHistoryStore] Adding course run:', courseRunData)
        const courseRun: ChapterRun = {
          ...courseRunData,
          id: generateUUID(),
        }
        console.warn('[useHistoryStore] Generated course run with ID:', courseRun.id)

        set((state) => {
          const newState = {
            chapterRuns: [...state.chapterRuns, courseRun],
          }
          return newState
        })
      },

      getChapterRuns: (courseId) => {
        const runs = get().chapterRuns
        console.warn(
          `[useHistoryStore] getChapterRuns called with courseId: ${courseId}, found ${runs.length} total runs`,
        )
        if (courseId) {
          const filtered = runs.filter((run) => run.courseId === courseId)
          console.warn(`[useHistoryStore] Filtered to ${filtered.length} runs for courseId: ${courseId}`)
          return filtered
        }
        return runs
      },

      getLastRun: () => {
        const runs = get().chapterRuns
        console.warn(`[useHistoryStore] getLastRun called, found ${runs.length} total runs`)
        if (runs.length === 0) {
          console.warn('[useHistoryStore] No runs found, returning null')
          return null
        }
        const lastRun = runs[runs.length - 1]
        console.warn('[useHistoryStore] Returning last run with ID:', lastRun.id)
        return lastRun
      },

      clearHistory: () => set({ chapterRuns: [] }),
    }),
    {
      name: 'history',
    },
  ),
)
