import { getFileCategory } from '@/lib/content/file-types'
import { MarkdownViewer } from '@/components/markdown/markdown-viewer'
import { CodeViewer } from '@/components/markdown/code-viewer'

interface FileViewerProps {
  path: string
  content: string
}

export function FileViewer({ path, content }: FileViewerProps) {
  const category = getFileCategory(path)

  if (category === 'markdown') {
    return <MarkdownViewer path={path} initialContent={content} />
  }

  if (category === 'code' || category === 'data') {
    return <CodeViewer path={path} content={content} />
  }

  return (
    <pre className="overflow-x-auto rounded-xl border border-border/60 bg-muted/30 p-6 text-sm">
      {content}
    </pre>
  )
}
