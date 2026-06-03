import type { SprintFileCategory } from './file-types'

export interface SprintFileEntry {
  path: string
  extension: string
  category: SprintFileCategory
  language: string
  title: string
  size: number
  excerpt: string
  headings: string[]
  taskCount: number
  wordCount: number
  readingMinutes: number
}

export interface SprintManifest {
  contentRoot: string
  source: 'content' | 'legacy'
  generatedAt: string
  files: SprintFileEntry[]
  fileCount: number
  markdownCount: number
  codeCount: number
}
