'use client'

import { createContext, type FC, type PropsWithChildren, useContext, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Chapter, Course } from '@/model/content'
import { SAMPLE_COURSE } from '@/resources/course'

interface CourseState {
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

  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (state: boolean) => void

  // Utility methods
  getCourse: (courseId: string) => Course | null
  getChapter: (courseId: string, chapterId: string) => Chapter | null
  getAllCourses: () => Course[]
}

type CourseStore = StoreApi<CourseState>
const CourseContext = createContext<CourseStore>(undefined!)

const createCourseStore = () => {
  return createStore<CourseState>()(
    persist(
      (set, get) => ({
        // Initial state
        courses: {},
        activeCourseId: null,
        activeChapterId: null,

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
          return state.getChapter(activeCourseId, activeChapterId)
        },

        getCurrentCourse: (): Course | null => {
          const state = get()
          return state.activeCourseId ? state.getCourse(state.activeCourseId) : null
        },

        getCourse: (courseId: string): Course | null => {
          return get().courses[courseId] || null
        },

        getChapter: (courseId: string, chapterId: string): Chapter | null => {
          const course = get().courses[courseId]
          if (!course) return null

          return course.chapters.find((chapter) => chapter.id === chapterId) || null
        },

        getAllCourses: (): Course[] => {
          return Object.values(get().courses)
        },
      }),
      {
        name: 'course-storage', // unique name for localStorage key
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          // Only persist the courses and active IDs, not hydration state
          courses: state.courses,
          activeCourseId: state.activeCourseId,
          activeChapterId: state.activeChapterId,
        }),
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error) {
              console.error('Course store hydration failed:', error)
            } else {
              // Initialize with sample course if no courses exist after hydration
              if (!!state && Object.keys(state.courses).length === 0) {
                state.courses = { [SAMPLE_COURSE.id]: SAMPLE_COURSE }
                state.activeCourseId = SAMPLE_COURSE.id
                state.activeChapterId = SAMPLE_COURSE.chapters[0]?.id || null
              }
              state?.setHasHydrated(true)
            }
          }
        },
      },
    ),
  )
}

export const CourseProvider: FC<PropsWithChildren> = ({ children }) => {
  const courseStore = useRef<CourseStore>(createCourseStore())

  return <CourseContext.Provider value={courseStore.current}>{children}</CourseContext.Provider>
}

export function useCourseStore<T>(selector: (state: CourseState) => T): T {
  const courseStore = useContext(CourseContext)
  if (!courseStore) throw new Error('Missing CourseContext.Provider in the tree')
  return useStore(courseStore, selector)
}

export function useCourseStoreAPI(): CourseStore {
  const courseStore = useContext(CourseContext)
  if (!courseStore) throw new Error('Missing CourseContext.Provider in the tree')
  return courseStore
}
