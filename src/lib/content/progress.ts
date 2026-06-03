import { sprintManifest } from './loader'
import type { DayStatus, DaySummary } from './types'

export function computeDayProgress(
  dayPath: string,
  completedTasks: Set<string>,
  readDocs: Set<string>,
): {
  progress: number
  taskCount: number
  completedTasks: number
  fileCount: number
  readingMinutes: number
} {
  const files = sprintManifest.files.filter(
    (f) => f.path === `${dayPath}/README.md` || f.path.startsWith(`${dayPath}/`),
  )

  const taskCount = files.reduce((s, f) => s + f.taskCount, 0)

  let doneTaskTotal = 0
  for (const file of files) {
    if (file.category !== 'markdown') continue
    const prefix = `${file.path}:`
    for (const id of completedTasks) {
      if (id.startsWith(prefix)) doneTaskTotal++
    }
  }

  const fileCount = files.length
  const readCount = files.filter((f) => readDocs.has(f.path)).length
  const readingMinutes = files.reduce((sum, f) => sum + f.readingMinutes, 0)

  const taskRatio = taskCount > 0 ? doneTaskTotal / taskCount : 1
  const readRatio = fileCount > 0 ? readCount / fileCount : 0
  const progress = Math.round((taskRatio * 0.7 + readRatio * 0.3) * 100)

  return {
    progress,
    taskCount,
    completedTasks: doneTaskTotal,
    fileCount,
    readingMinutes,
  }
}

export function getDayStatus(
  dayNumber: number,
  progress: number,
  manuallyCompletedDays: Set<number>,
  previousDayProgress: number,
): DayStatus {
  if (manuallyCompletedDays.has(dayNumber) || progress >= 100) return 'completed'
  if (dayNumber === 1 || previousDayProgress >= 60 || manuallyCompletedDays.has(dayNumber - 1)) {
    if (progress > 0) return 'in_progress'
    return 'available'
  }
  if (progress > 0) return 'in_progress'
  return dayNumber <= 20 ? 'available' : 'locked'
}

export function buildDaySummaries(
  completedTasks: Set<string>,
  readDocs: Set<string>,
  manuallyCompletedDays: Set<number>,
  dayNodes: { dayNumber?: number; path: string }[],
): DaySummary[] {
  let prevProgress = 100

  return dayNodes
    .filter((d) => d.dayNumber !== undefined)
    .map((day) => {
      const dayNumber = day.dayNumber!
      const stats = computeDayProgress(day.path, completedTasks, readDocs)
      const status = getDayStatus(dayNumber, stats.progress, manuallyCompletedDays, prevProgress)
      prevProgress = stats.progress

      const readme = sprintManifest.files.find((f) => f.path === `${day.path}/README.md`)
      const title = readme?.title ?? `Day ${dayNumber}`

      return {
        dayNumber,
        path: day.path,
        title,
        status,
        progress: stats.progress,
        taskCount: stats.taskCount,
        completedTasks: stats.completedTasks,
        readingMinutes: stats.readingMinutes,
        fileCount: stats.fileCount,
      }
    })
}

export function getOverallStats(summaries: DaySummary[]) {
  const totalDays = summaries.length || 60
  const completedDays = summaries.filter((d) => d.status === 'completed').length
  const inProgress = summaries.filter((d) => d.status === 'in_progress').length
  const totalTasks = summaries.reduce((s, d) => s + d.taskCount, 0)
  const doneTasks = summaries.reduce((s, d) => s + d.completedTasks, 0)
  const overallProgress =
    summaries.length > 0
      ? Math.round(summaries.reduce((s, d) => s + d.progress, 0) / summaries.length)
      : 0

  return {
    totalDays,
    completedDays,
    remainingDays: totalDays - completedDays,
    inProgressDays: inProgress,
    totalTasks,
    doneTasks,
    pendingTasks: totalTasks - doneTasks,
    overallProgress,
  }
}
