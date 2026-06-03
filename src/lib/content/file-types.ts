export type SprintFileCategory = 'markdown' | 'code' | 'asset' | 'data' | 'other'

const CODE_EXTENSIONS = new Set([
  'js',
  'jsx',
  'ts',
  'tsx',
  'py',
  'java',
  'go',
  'rs',
  'cpp',
  'c',
  'h',
  'cs',
  'rb',
  'php',
  'swift',
  'kt',
  'sql',
  'sh',
  'bash',
  'zsh',
  'yaml',
  'yml',
  'json',
  'html',
  'css',
  'scss',
  'less',
  'xml',
  'vue',
  'svelte',
])

const ASSET_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'])
const DATA_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'toml'])

const HLJS_LANGUAGE: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  cs: 'csharp',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  json: 'json',
  html: 'xml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  xml: 'xml',
  vue: 'xml',
  md: 'markdown',
}

export function getExtension(filePath: string) {
  const name = filePath.split('/').pop() ?? ''
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : ''
}

export function getFileCategory(filePath: string): SprintFileCategory {
  const ext = getExtension(filePath)
  if (ext === 'md' || ext === 'mdx') return 'markdown'
  if (ASSET_EXTENSIONS.has(ext)) return 'asset'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (DATA_EXTENSIONS.has(ext)) return 'data'
  return 'other'
}

export function getHighlightLanguage(filePath: string) {
  const ext = getExtension(filePath)
  return HLJS_LANGUAGE[ext] || ext || 'plaintext'
}

export function isReadableInApp(filePath: string) {
  const cat = getFileCategory(filePath)
  return cat === 'markdown' || cat === 'code' || cat === 'data'
}

export function shouldSkipInTree(filePath: string) {
  const name = filePath.split('/').pop() ?? ''
  return name === '.gitkeep'
}
