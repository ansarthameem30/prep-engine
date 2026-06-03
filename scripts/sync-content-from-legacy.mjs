/**
 * One-time helper: copies ../60-day-sprint into sprint-platform/content/
 * Does NOT modify the original 60-day-sprint folder.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const source = path.join(projectRoot, '..', '60-day-sprint')
const target = path.join(projectRoot, 'content')

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) copyRecursive(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(source)) {
  console.error('Source not found:', source)
  process.exit(1)
}

copyRecursive(source, target)
console.log(`Copied ${source} -> ${target}`)
console.log('Run: npm run predev')
