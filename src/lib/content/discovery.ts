import { getFileCategory, shouldSkipInTree } from './file-types'
import { loadFileContent, sprintManifest } from './loader'
import type { SprintFileEntry } from './manifest-types'
import type { ContentNode, MarkdownDocument } from './types'
import { extractTasks, parseMarkdownMeta } from './markdown'

export { loadFileContent, getContentFetchUrl, sprintManifest, getManifestFile, clearContentCache } from './loader'

function parseDayNumber(segment: string): number | undefined {
  const match = /^day-(\d+)$/i.exec(segment)
  return match ? Number.parseInt(match[1], 10) : undefined
}

function insertNode(root: ContentNode[], segments: string[], entry?: SprintFileEntry) {
  let current = root
  let builtPath = ''

  segments.forEach((segment, index) => {
    builtPath = builtPath ? `${builtPath}/${segment}` : segment
    const isFile = index === segments.length - 1
    const existing = current.find((n) => n.name === segment)

    if (existing) {
      if (isFile && entry) {
        existing.extension = entry.extension
        existing.fileCategory = entry.category
        existing.language = entry.language
      }
      current = existing.children
      return
    }

    const dayNumber = parseDayNumber(segment)
    const node: ContentNode = {
      id: builtPath,
      name: segment,
      path: builtPath,
      kind: dayNumber
        ? 'day'
        : isFile
          ? 'file'
          : builtPath.startsWith('day-')
            ? 'section'
            : index === 0
              ? 'root'
              : 'section',
      dayNumber,
      children: [],
      extension: isFile ? segment.split('.').pop() : undefined,
      fileCategory: entry?.category,
      language: entry?.language,
    }

    if (isFile) node.kind = 'file'

    current.push(node)
    current = node.children
  })
}

function sortNodes(nodes: ContentNode[]): ContentNode[] {
  return nodes
    .map((n) => ({ ...n, children: sortNodes(n.children) }))
    .sort((a, b) => {
      const dayA = parseDayNumber(a.name)
      const dayB = parseDayNumber(b.name)
      if (dayA !== undefined && dayB !== undefined) return dayA - dayB
      if (dayA !== undefined) return -1
      if (dayB !== undefined) return 1
      return a.name.localeCompare(b.name, undefined, { numeric: true })
    })
}

let cachedTree: ContentNode[] | null = null

export function getContentManifestCount() {
  return sprintManifest.fileCount
}

export function isContentAvailable() {
  return sprintManifest.fileCount > 0
}

export function getManifestFiles() {
  return sprintManifest.files
}

export function getContentTree(): ContentNode[] {
  if (cachedTree) return cachedTree

  const root: ContentNode[] = []

  for (const file of sprintManifest.files) {
    if (shouldSkipInTree(file.path)) continue
    insertNode(root, file.path.split('/'), file)
  }

  cachedTree = sortNodes(root)
  return cachedTree
}

export function getAllMarkdownPaths(): string[] {
  return sprintManifest.files.filter((f) => f.category === 'markdown').map((f) => f.path)
}

export async function getMarkdownDocuments(): Promise<MarkdownDocument[]> {
  const mdFiles = sprintManifest.files.filter((f) => f.category === 'markdown')
  const docs = await Promise.all(
    mdFiles.map(async (entry) => {
      const raw = await loadFileContent(entry.path)
      const meta = parseMarkdownMeta(raw, entry.path)
      return {
        path: entry.path,
        relativePath: entry.path,
        title: meta.title,
        content: raw,
        wordCount: meta.wordCount,
        readingMinutes: meta.readingMinutes,
        headings: meta.headings,
        tasks: extractTasks(raw, entry.path),
      }
    }),
  )
  return docs
}

/** @deprecated Use loadFileContent */
export async function loadMarkdownContent(relativePath: string) {
  return loadFileContent(relativePath)
}

export function resolveAssetUrl(_relativePath: string, assetHref: string) {
  if (assetHref.startsWith('http://') || assetHref.startsWith('https://')) {
    return assetHref
  }
  return assetHref
}

export function getDayNodes(): ContentNode[] {
  return getContentTree().filter((n) => n.kind === 'day')
}

export function findNodeByPath(filePath: string): ContentNode | undefined {
  const segments = filePath.split('/').filter(Boolean)

  function walk(nodes: ContentNode[], depth: number): ContentNode | undefined {
    if (depth >= segments.length) return undefined
    const match = nodes.find((n) => n.name === segments[depth])
    if (!match) return undefined
    if (depth === segments.length - 1) return match
    return walk(match.children, depth + 1)
  }

  return walk(getContentTree(), 0)
}

export function getFilesForDay(dayPath: string) {
  const prefix = `${dayPath}/`
  return sprintManifest.files.filter((f) => f.path.startsWith(prefix))
}

export function getFileCategoryForPath(filePath: string) {
  return getFileCategory(filePath)
}
