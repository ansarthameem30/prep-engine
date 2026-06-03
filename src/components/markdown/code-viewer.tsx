import { useMemo } from 'react'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import json from 'highlight.js/lib/languages/json'
import css from 'highlight.js/lib/languages/css'
import xml from 'highlight.js/lib/languages/xml'
import bash from 'highlight.js/lib/languages/bash'
import sql from 'highlight.js/lib/languages/sql'
import { getHighlightLanguage } from '@/lib/content/file-types'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'
import 'highlight.js/styles/github.css'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('python', python)
hljs.registerLanguage('json', json)
hljs.registerLanguage('css', css)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sql', sql)

interface CodeViewerProps {
  path: string
  content: string
}

export function CodeViewer({ path, content }: CodeViewerProps) {
  const { fontSize, lineSpacing, contentWidth } = useSettingsStore()
  const language = getHighlightLanguage(path)

  const highlighted = useMemo(() => {
    try {
      return hljs.highlight(content, { language: hljs.getLanguage(language) ? language : 'plaintext' }).value
    } catch {
      return hljs.highlightAuto(content).value
    }
  }, [content, language])

  const widthClass =
    contentWidth === 'narrow' ? 'max-w-2xl' : contentWidth === 'wide' ? 'max-w-5xl' : 'max-w-4xl'

  const lines = content.split('\n').length

  return (
    <div className={cn('mx-auto w-full', widthClass)}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs uppercase">{language}</span>
        <span>{lines} lines</span>
        <span className="truncate font-mono text-xs">{path}</span>
      </div>
      <pre
        className="overflow-x-auto rounded-xl border border-border/60 bg-secondary/70 p-5 shadow-inner"
        style={{ fontSize: `${Math.max(13, fontSize - 1)}px`, lineHeight: lineSpacing }}
      >
        <code
          className="hljs font-mono"
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </pre>
    </div>
  )
}
