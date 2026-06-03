import type { SprintFileCategory } from './file-types'

export type ContentKind = 'root' | 'day' | 'section' | 'file'

export interface ContentNode {
  id: string
  name: string
  path: string
  kind: ContentKind
  dayNumber?: number
  children: ContentNode[]
  extension?: string
  fileCategory?: SprintFileCategory
  language?: string
}

export interface MarkdownDocument {
  path: string
  relativePath: string
  title: string
  content: string
  wordCount: number
  readingMinutes: number
  headings: string[]
  tasks: MarkdownTask[]
}

export interface MarkdownTask {
  id: string
  line: number
  text: string
  checked: boolean
}

export interface SearchResult {
  path: string
  title: string
  excerpt: string
  score: number
  heading?: string
}

export type DayStatus = 'locked' | 'available' | 'in_progress' | 'completed'

export interface DaySummary {
  dayNumber: number
  path: string
  title: string
  status: DayStatus
  progress: number
  taskCount: number
  completedTasks: number
  readingMinutes: number
  fileCount: number
}
