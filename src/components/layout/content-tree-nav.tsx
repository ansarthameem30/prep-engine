import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, FileCode2, FileJson, FileText, Folder } from 'lucide-react'
import { getContentTree } from '@/lib/content/discovery'
import type { ContentNode } from '@/lib/content/types'
import { cn } from '@/lib/utils'

function FileIcon({ node }: { node: ContentNode }) {
  if (node.fileCategory === 'code') return <FileCode2 className="h-3 w-3 shrink-0 text-violet-500" />
  if (node.fileCategory === 'data') return <FileJson className="h-3 w-3 shrink-0 text-amber-500" />
  return <FileText className="h-3 w-3 shrink-0 text-primary" />
}

function TreeItem({
  node,
  depth = 0,
  onNavigate,
}: {
  node: ContentNode
  depth?: number
  onNavigate?: () => void
}) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const isFile = node.kind === 'file'

  if (isFile) {
    return (
      <Link
        to={`/read/${node.path}`}
        onClick={onNavigate}
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.path}
      >
        <FileIcon node={node} />
        <span className="truncate">{node.name}</span>
      </Link>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-accent"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <ChevronRight className={cn('h-3 w-3 transition-transform', open && 'rotate-90')} />
        <Folder className="h-3 w-3 text-primary" />
        <span className="truncate">{node.name}</span>
      </button>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.id} node={child} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export function ContentTreeNav({ onNavigate }: { onNavigate?: () => void }) {
  const tree = getContentTree()
  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeItem key={node.id} node={node} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
