import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFileEntry, resolveContentRoot } from './sprint-manifest-lib.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const outFile = path.join(projectRoot, '.generated', 'sprint-manifest.json')

const { contentRoot, source } = resolveContentRoot(projectRoot)
const { manifest } = buildFileEntry(contentRoot, source)

fs.mkdirSync(path.dirname(outFile), { recursive: true })
fs.writeFileSync(outFile, JSON.stringify(manifest), 'utf-8')

console.log(
  `[sprint-content] Manifest: ${manifest.fileCount} files (${manifest.markdownCount} md, ${manifest.codeCount} code)`,
)
console.log(`[sprint-content] Root: ${contentRoot} (${source})`)
