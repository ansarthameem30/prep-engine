import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const CODE_EXT = new Set([
  'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'go', 'rs', 'cpp', 'c', 'h', 'cs', 'rb', 'php',
  'swift', 'kt', 'sql', 'sh', 'bash', 'yaml', 'yml', 'json', 'css', 'scss', 'html', 'vue', 'svelte',
])
const ASSET_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'])

const HLJS = {
  js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python',
  json: 'json', css: 'css', html: 'xml', md: 'markdown', sql: 'sql', sh: 'bash', yaml: 'yaml',
}

function extOf(p) {
  const i = p.lastIndexOf('.')
  return i >= 0 ? p.slice(i + 1).toLowerCase() : ''
}

function category(p) {
  const e = extOf(p)
  if (e === 'md' || e === 'mdx') return 'markdown'
  if (ASSET_EXT.has(e)) return 'asset'
  if (CODE_EXT.has(e)) return 'code'
  if (e === 'json' || e === 'yaml' || e === 'yml') return 'data'
  return 'other'
}

function countWords(s) {
  return s.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length
}

function extractTitle(content, filePath) {
  if (extOf(filePath) === 'md' || extOf(filePath) === 'mdx') {
    const h1 = content.match(/^#\s+(.+)$/m)
    if (h1) return h1[1].trim()
  }
  const base = filePath.split('/').pop() ?? 'file'
  return base.replace(/\.[^.]+$/, '').replace(/-/g, ' ')
}

function extractHeadings(content) {
  return [...content.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((m) => m[2].trim())
}

function extractTasks(content) {
  return (content.match(/^(\s*[-*+]\s+)\[([ xX])\]\s+/gm) ?? []).length
}

function walk(dir, rel, files) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const r = rel ? `${rel}/${entry.name}` : entry.name
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, r, files)
    else if (entry.name !== '.gitkeep') files.push({ rel: r.replace(/\\/g, '/'), abs })
  }
}

function countFiles(dir) {
  const files = []
  walk(dir, '', files)
  return files.length
}

export function resolveContentRoot(root = projectRoot) {
  const internal = path.join(root, 'content')
  const legacy = path.join(root, '..', '60-day-sprint')

  const internalCount = fs.existsSync(internal) ? countFiles(internal) : 0
  const legacyCount = fs.existsSync(legacy) ? countFiles(legacy) : 0

  // Prefer content/ when it has real sprint material (not just the placeholder README)
  if (internalCount > 5) {
    return { contentRoot: internal, source: 'content' }
  }
  if (legacyCount > internalCount) {
    return { contentRoot: legacy, source: 'legacy' }
  }
  if (internalCount > 0) {
    return { contentRoot: internal, source: 'content' }
  }
  if (legacyCount > 0) {
    return { contentRoot: legacy, source: 'legacy' }
  }
  return { contentRoot: internal, source: 'content' }
}

export function buildFileEntry(contentRoot, source) {
  const fileList = []
  walk(contentRoot, '', fileList)

  const entries = []
  let markdownCount = 0
  let codeCount = 0

  for (const { rel, abs } of fileList) {
    const cat = category(rel)
    if (cat === 'asset') continue

    const raw = fs.readFileSync(abs, 'utf-8')
    const ext = extOf(rel)
    const words = countWords(raw)
    const excerpt = raw.replace(/\s+/g, ' ').trim().slice(0, 220)

    if (cat === 'markdown') markdownCount++
    if (cat === 'code') codeCount++

    entries.push({
      path: rel,
      extension: ext,
      category: cat,
      language: HLJS[ext] || ext || 'plaintext',
      title: extractTitle(raw, rel),
      size: Buffer.byteLength(raw, 'utf-8'),
      excerpt,
      headings: cat === 'markdown' ? extractHeadings(raw) : [],
      taskCount: cat === 'markdown' ? extractTasks(raw) : 0,
      wordCount: words,
      readingMinutes: Math.max(1, Math.ceil(words / 200)),
    })
  }

  entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true }))

  const manifest = {
    contentRoot,
    source,
    generatedAt: new Date().toISOString(),
    files: entries,
    fileCount: entries.length,
    markdownCount,
    codeCount,
  }

  return { manifest, contentRoot }
}
