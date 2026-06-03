import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  unlockedAt?: string
}

const ACHIEVEMENT_DEFS: Omit<Achievement, 'unlockedAt'>[] = [
  { id: 'first-day', title: 'First Step', description: 'Complete your first day', icon: '🎯' },
  { id: 'streak-7', title: 'Week Warrior', description: 'Maintain a 7-day study streak', icon: '🔥' },
  { id: 'progress-25', title: 'Quarter Master', description: 'Reach 25% overall progress', icon: '⭐' },
  { id: 'progress-50', title: 'Halfway Hero', description: 'Reach 50% overall progress', icon: '🏆' },
  { id: 'progress-100', title: 'Sprint Champion', description: 'Complete the full 60-day sprint', icon: '👑' },
  { id: 'tasks-50', title: 'Task Crusher', description: 'Complete 50 interactive tasks', icon: '✅' },
]

interface GamificationState {
  xp: number
  achievements: Achievement[]
  lastCelebration: string | null
  addXp: (amount: number) => void
  checkAchievements: (ctx: AchievementContext) => string | null
  dismissCelebration: () => void
}

export interface AchievementContext {
  completedDays: number
  streak: number
  overallProgress: number
  tasksCompleted: number
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      xp: 0,
      achievements: ACHIEVEMENT_DEFS.map((a) => ({ ...a })),
      lastCelebration: null,

      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

      checkAchievements: (ctx) => {
        const unlock = (id: string) => {
          const achievements = get().achievements.map((a) =>
            a.id === id && !a.unlockedAt ? { ...a, unlockedAt: new Date().toISOString() } : a,
          )
          const unlocked = achievements.find((a) => a.id === id && a.unlockedAt)
          if (unlocked && !get().achievements.find((a) => a.id === id)?.unlockedAt) {
            set({ achievements, lastCelebration: id })
            get().addXp(100)
            return id
          }
          return null
        }

        if (ctx.completedDays >= 1) unlock('first-day')
        if (ctx.streak >= 7) unlock('streak-7')
        if (ctx.overallProgress >= 25) unlock('progress-25')
        if (ctx.overallProgress >= 50) unlock('progress-50')
        if (ctx.overallProgress >= 100) unlock('progress-100')
        if (ctx.tasksCompleted >= 50) unlock('tasks-50')

        return get().lastCelebration
      },

      dismissCelebration: () => set({ lastCelebration: null }),
    }),
    { name: STORAGE_KEYS.gamification },
  ),
)
