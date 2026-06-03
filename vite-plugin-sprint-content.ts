import fs from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
// @ts-expect-error — Node ESM helper script (no types)
import { buildFileEntry, resolveContentRoot } from './scripts/sprint-manifest-lib.mjs'

export function getManifestPath(projectRoot: string) {
  return path.join(projectRoot, '.generated', 'sprint-manifest.json')
}

function writeManifest(projectRoot: string, contentRoot: string, source: 'content' | 'legacy') {
  const { manifest } = buildFileEntry(contentRoot, source)
  const outFile = getManifestPath(projectRoot)
  fs.mkdirSync(path.dirname(outFile), { recursive: true })
  fs.writeFileSync(outFile, JSON.stringify(manifest, null, 0), 'utf-8')
  console.log(
    `[sprint-content] Indexed ${manifest.fileCount} files (${manifest.markdownCount} md, ${manifest.codeCount} code) from ${contentRoot}`,
  )
  return { manifest, contentRoot }
}

function contentMiddleware(contentRoot: string) {
  return (req: { url?: string }, res: import('http').ServerResponse, next: () => void) => {
    const url = req.url ?? ''
    if (!url.startsWith('/__sprint_content__/')) {
      next()
      return
    }

    const relative = decodeURIComponent(url.replace('/__sprint_content__/', ''))
    const filePath = path.join(contentRoot, relative)

    if (!filePath.startsWith(contentRoot) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.statusCode = 404
      res.end('Not found')
      return
    }

    const ext = path.extname(filePath).toLowerCase()
    const types: Record<string, string> = {
      '.md': 'text/plain; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.jsx': 'text/javascript; charset=utf-8',
      '.ts': 'text/typescript; charset=utf-8',
      '.tsx': 'text/typescript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.py': 'text/plain; charset=utf-8',
    }

    res.setHeader('Content-Type', types[ext] ?? 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.end(fs.readFileSync(filePath))
  }
}

function copyContentToDist(contentRoot: string, outDir: string) {
  const target = path.join(outDir, 'content')
  if (!fs.existsSync(contentRoot)) return

  fs.mkdirSync(target, { recursive: true })

  function copyDir(src: string, dest: string) {
    fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue
      const s = path.join(src, entry.name)
      const d = path.join(dest, entry.name)
      if (entry.isDirectory()) copyDir(s, d)
      else fs.copyFileSync(s, d)
    }
  }

  copyDir(contentRoot, target)
  console.log(`[sprint-content] Copied content to ${target} for production`)
}

export function sprintContentPlugin(projectRoot: string): Plugin {
  let contentRoot = ''
  let source: 'content' | 'legacy' = 'content'

  const sync = () => {
    const resolved = resolveContentRoot(projectRoot)
    contentRoot = resolved.contentRoot
    source = resolved.source
    return writeManifest(projectRoot, contentRoot, source)
  }

  return {
    name: 'vite-plugin-sprint-content',
    enforce: 'pre',
    configResolved() {
      sync()
    },
    buildStart() {
      sync()
    },
    configureServer(server: ViteDevServer) {
      const { contentRoot: root } = sync()
      server.middlewares.use(contentMiddleware(root))
      if (fs.existsSync(root)) {
        server.watcher.add(root)
      }
      const reload = (file: string) => {
        if (!file.startsWith(root)) return
        sync()
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', reload)
      server.watcher.on('change', reload)
      server.watcher.on('unlink', reload)
    },
    closeBundle() {
      const outDir = path.join(projectRoot, 'dist')
      if (contentRoot) copyContentToDist(contentRoot, outDir)
    },
  }
}
