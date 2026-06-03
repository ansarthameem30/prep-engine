import manifest from '../../../.generated/sprint-manifest.json'
import type { SprintManifest } from './manifest-types'

export const sprintManifest = manifest as SprintManifest

const CONTENT_ROUTE = '/__sprint_content__'

/** Dev: Vite middleware. Production: files copied to `dist/content/`. */
export function getContentFetchUrl(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, '/')
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  if (import.meta.env.DEV) {
    return `${CONTENT_ROUTE}/${normalized}`
  }
  return `${base}/content/${normalized}`
}

const contentCache = new Map<string, string>()

export async function loadFileContent(relativePath: string): Promise<string> {
  const normalized = relativePath.replace(/\\/g, '/')

  if (contentCache.has(normalized)) {
    return contentCache.get(normalized)!
  }

  const url = getContentFetchUrl(normalized)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`File not found: ${relativePath}`)
  }

  const text = await response.text()
  contentCache.set(normalized, text)
  return text
}

export function clearContentCache(path?: string) {
  if (path) {
    contentCache.delete(path.replace(/\\/g, '/'))
    return
  }
  contentCache.clear()
}

export function getManifestFile(path: string) {
  const normalized = path.replace(/\\/g, '/')
  return sprintManifest.files.find((f) => f.path === normalized)
}
