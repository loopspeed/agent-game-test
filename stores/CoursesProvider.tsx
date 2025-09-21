'use client'

import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Chapter, ChapterSummary, Course, CourseSummary } from '@/model/content'
import { ChapterRun } from '@/model/game'
import { generateUUID } from '@/utils/helpers'

type State = {
  // Course data
  courses: Record<string, Course>
  activeCourseId: string | null
  activeChapterId: string | null

  // Actions
  storeCourse: (course: Course) => void
  setActiveCourse: ({ courseId, chapterId }: { courseId: string; chapterId?: string }) => {
    success: boolean
    error?: unknown
  }
  getCurrentChapter: () => Chapter | null
  getCurrentCourse: () => Course | null

  // History..
  // courseId -> chapterId -> ChapterRun[]
  runs: Record<string, Record<string, ChapterRun[]>>
  insertRun: (chapterRun: Omit<ChapterRun, 'id'>) => void
  getRunsForCourseChapter: (courseId: string, chapterId: string) => ChapterRun[] | null

  // Utility methods
  getCourseSummaries: () => CourseSummary[]
  getAllCourses: () => Course[]

  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void
}

type CourseStore = StoreApi<State>
const CoursesContext = createContext<CourseStore>(undefined!)

const createCoursesStore = () => {
  return createStore<State>()(
    persist(
      (set, get) => ({
        // Initial state
        courses: {},
        activeCourseId: null,
        activeChapterId: null,
        runs: {},

        // Hydration state
        _hasHydrated: false,
        setHasHydrated: (state: boolean) => {
          set({ _hasHydrated: state })
        },

        // Actions
        storeCourse: async (course: Course) => {
          set((state) => ({
            courses: {
              ...state.courses,
              [course.id]: course,
            },
            activeCourseId: course.id,
            activeChapterId: course.chapters[0].id,
          }))
        },

        setActiveCourse: ({
          courseId,
          chapterId,
        }: {
          courseId: string
          chapterId?: string
        }): { success: boolean; error?: unknown } => {
          const courses = get().courses

          const course = courses[courseId]
          if (!course)
            return {
              success: false,
              error: new Error(`Course with ID '${courseId}' not found. Ensure it is saved before setting active.`),
            }

          let validChapterId: string | null = null
          if (!!chapterId) {
            const chapterExists = course.chapters.some((ch) => ch.id === chapterId)
            if (!chapterExists)
              return {
                success: false,
                error: new Error(`Chapter with ID '${chapterId}' not found in course '${courseId}'.`),
              }
            validChapterId = chapterId
          }

          set({
            activeCourseId: courseId,
            activeChapterId: validChapterId,
          })

          return {
            success: true,
          }
        },

        getCurrentChapter: (): Chapter | null => {
          const state = get()
          const { activeCourseId, activeChapterId } = state
          if (!activeCourseId || !activeChapterId) return null
          return state.courses[activeCourseId]?.chapters.find((ch) => ch.id === activeChapterId) || null
        },

        getCurrentCourse: (): Course | null => {
          const state = get()
          if (!state.activeCourseId) return null
          return state.courses[state.activeCourseId]
        },

        getCourseSummaries: (): CourseSummary[] => {
          const allCourses = get().courses
          return Object.values(allCourses).map((course) => {
            const chapterSummaries: ChapterSummary[] = course.chapters.map((chapter) => ({
              id: chapter.id,
              title: chapter.title,
              questions: chapter.questions.length,
            }))
            const courseSummary: CourseSummary = {
              id: course.id,
              title: course.title,
              description: course.description,
              chapters: chapterSummaries,
            }
            return courseSummary
          })
        },

        getAllCourses: (): Course[] => {
          return Object.values(get().courses)
        },

        // Runs management
        insertRun: (chapterRunData: Omit<ChapterRun, 'id'>) => {
          const chapterRun: ChapterRun = {
            ...chapterRunData,
            id: generateUUID(),
          }

          set((state) => {
            const { courseId, chapterId } = chapterRun
            const newRuns = { ...state.runs }

            // Initialize course runs if not exists
            if (!newRuns[courseId]) {
              newRuns[courseId] = {}
            }

            // Initialize chapter runs if not exists
            if (!newRuns[courseId][chapterId]) {
              newRuns[courseId][chapterId] = []
            }

            // Add the new run
            newRuns[courseId][chapterId] = [...newRuns[courseId][chapterId], chapterRun]

            return {
              ...state,
              runs: newRuns,
            }
          })
        },

        // Return runs for specific course and chapter
        getRunsForCourseChapter: (courseId: string, chapterId: string): ChapterRun[] | null => {
          const allRuns = get().runs
          const courseRuns = allRuns[courseId]
          if (!courseRuns) return null
          return courseRuns[chapterId] ?? null
        },
      }),
      {
        name: 'course-storage', // unique name for localStorage key
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist the courses, runs, and active IDs, not hydration state
          courses: state.courses,
          runs: state.runs,
          activeCourseId: state.activeCourseId,
          activeChapterId: state.activeChapterId,
        }),
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error) {
              console.error('Course store hydration failed:', error)
            } else {
              state?.setHasHydrated(true)
            }
          }
        },
      },
    ),
  )
}

export const CoursesProvider: FC<PropsWithChildren> = ({ children }) => {
  const courseStore = useRef<CourseStore>(createCoursesStore())

  return <CoursesContext.Provider value={courseStore.current}>{children}</CoursesContext.Provider>
}

export function useCourseStore<T>(selector: (state: State) => T): T {
  const courseStore = useContext(CoursesContext)
  if (!courseStore) throw new Error('Missing CoursesContext.Provider in the tree')
  return useStore(courseStore, selector)
}

export function useCourseStoreAPI(): CourseStore {
  const courseStore = useContext(CoursesContext)
  if (!courseStore) throw new Error('Missing CoursesContext.Provider in the tree')
  return courseStore
}
