import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import { getDayNodes } from '@/lib/content/discovery'
import { buildDaySummaries, getOverallStats } from '@/lib/content/progress'

interface StudySession {
  date: string
  minutes: number
  tasksCompleted: number
}

interface ProgressState {
  completedTasks: Record<string, boolean>
  readDocuments: Record<string, boolean>
  completedDays: Record<number, boolean>
  studySessions: StudySession[]
  lastStudyDate: string | null
  streak: number
  totalStudyMinutes: number
  toggleTask: (taskId: string) => void
  setTaskComplete: (taskId: string, complete: boolean) => void
  markDocumentRead: (path: string) => void
  markDayComplete: (dayNumber: number) => void
  recordStudySession: (minutes?: number, tasks?: number) => void
  getCompletedTaskSet: () => Set<string>
  getReadDocSet: () => Set<string>
  getCompletedDaySet: () => Set<number>
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function updateStreak(lastDate: string | null, currentStreak: number): { streak: number; lastStudyDate: string } {
  const today = todayKey()
  if (lastDate === today) return { streak: currentStreak, lastStudyDate: today }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  const streak = lastDate === yesterdayKey ? currentStreak + 1 : 1
  return { streak, lastStudyDate: today }
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      completedTasks: {},
      readDocuments: {},
      completedDays: {},
      studySessions: [],
      lastStudyDate: null,
      streak: 0,
      totalStudyMinutes: 0,

      toggleTask: (taskId) => {
        const current = get().completedTasks[taskId] ?? false
        get().setTaskComplete(taskId, !current)
      },

      setTaskComplete: (taskId, complete) => {
        set((state) => {
          const completedTasks = { ...state.completedTasks, [taskId]: complete }
          const { streak, lastStudyDate } = updateStreak(state.lastStudyDate, state.streak)
          return { completedTasks, streak, lastStudyDate }
        })
        get().recordStudySession(2, complete ? 1 : 0)
      },

      markDocumentRead: (path) => {
        set((state) => {
          const readDocuments = { ...state.readDocuments, [path]: true }
          const { streak, lastStudyDate } = updateStreak(state.lastStudyDate, state.streak)
          return { readDocuments, streak, lastStudyDate }
        })
        get().recordStudySession(5, 0)
      },

      markDayComplete: (dayNumber) => {
        set((state) => ({
          completedDays: { ...state.completedDays, [dayNumber]: true },
          ...updateStreak(state.lastStudyDate, state.streak),
        }))
        get().recordStudySession(30, 0)
      },

      recordStudySession: (minutes = 5, tasks = 0) => {
        const date = todayKey()
        set((state) => {
          const existing = state.studySessions.find((s) => s.date === date)
          const studySessions = existing
            ? state.studySessions.map((s) =>
                s.date === date
                  ? { ...s, minutes: s.minutes + minutes, tasksCompleted: s.tasksCompleted + tasks }
                  : s,
              )
            : [...state.studySessions, { date, minutes, tasksCompleted: tasks }].slice(-90)

          return {
            studySessions,
            totalStudyMinutes: state.totalStudyMinutes + minutes,
            ...updateStreak(state.lastStudyDate, state.streak),
          }
        })
      },

      getCompletedTaskSet: () => new Set(Object.keys(get().completedTasks).filter((k) => get().completedTasks[k])),
      getReadDocSet: () => new Set(Object.keys(get().readDocuments).filter((k) => get().readDocuments[k])),
      getCompletedDaySet: () =>
        new Set(
          Object.keys(get().completedDays)
            .map(Number)
            .filter((k) => get().completedDays[k]),
        ),
    }),
    { name: STORAGE_KEYS.progress },
  ),
)

export function useDaySummaries() {
  const completedTasks = useProgressStore((s) => s.completedTasks)
  const readDocuments = useProgressStore((s) => s.readDocuments)
  const completedDays = useProgressStore((s) => s.completedDays)

  const taskSet = new Set(Object.keys(completedTasks).filter((k) => completedTasks[k]))
  const readSet = new Set(Object.keys(readDocuments).filter((k) => readDocuments[k]))
  const daySet = new Set(
    Object.keys(completedDays)
      .map(Number)
      .filter((k) => completedDays[k]),
  )

  const summaries = buildDaySummaries(taskSet, readSet, daySet, getDayNodes())
  const stats = getOverallStats(summaries)
  return { summaries, stats }
}
