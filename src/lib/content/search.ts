import { sprintManifest } from './loader'
import type { SearchResult } from './types'

export function searchContent(query: string, limit = 30): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 2) return []

  const results: SearchResult[] = []

  for (const file of sprintManifest.files) {
    const titleLower = file.title.toLowerCase()
    const pathLower = file.path.toLowerCase()
    const excerptLower = file.excerpt.toLowerCase()
    let score = 0

    if (titleLower.includes(q)) score += 10
    if (pathLower.includes(q)) score += 6
    for (const heading of file.headings) {
      if (heading.toLowerCase().includes(q)) score += 5
    }
    if (excerptLower.includes(q)) score += 2

    if (score === 0) continue

    results.push({
      path: file.path,
      title: file.title,
      excerpt: file.excerpt.length > 140 ? `${file.excerpt.slice(0, 140)}…` : file.excerpt,
      score,
    })
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit)
}
