import type { MarkdownTask } from './types'

const WORDS_PER_MINUTE = 200

export function parseMarkdownMeta(content: string, relativePath: string) {
  const title = extractTitle(content, relativePath)
  const wordCount = countWords(content)
  const readingMinutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
  const headings = extractHeadings(content)

  return { title, wordCount, readingMinutes, headings }
}

export function extractTitle(content: string, relativePath: string) {
  const h1 = content.match(/^#\s+(.+)$/m)
  if (h1) return h1[1].trim()
  const name = relativePath.split('/').pop()?.replace(/\.md$/i, '') ?? 'Untitled'
  return name.replace(/-/g, ' ')
}

export function extractHeadings(content: string) {
  const matches = content.matchAll(/^(#{1,6})\s+(.+)$/gm)
  return Array.from(matches, (m) => m[2].trim())
}

export function countWords(content: string) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .split(/\s+/)
    .filter(Boolean).length
}

export function extractTasks(content: string, docPath: string): MarkdownTask[] {
  const lines = content.split('\n')
  const tasks: MarkdownTask[] = []

  lines.forEach((line, index) => {
    const match = line.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+(.+)$/)
    if (!match) return
    const checked = match[2].toLowerCase() === 'x'
    tasks.push({
      id: `${docPath}:${index}`,
      line: index,
      text: match[3].trim(),
      checked,
    })
  })

  return tasks
}

export function countTasksInContent(content: string) {
  return (content.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+/gm) ?? []).length
}
