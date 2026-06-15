import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { ChevronRight, FileCode2, FileJson, FileText, Folder, FolderOpen } from 'lucide-react'
import { getContentTree } from '@/lib/content/discovery'
import type { ContentNode } from '@/lib/content/types'
import { cn } from '@/lib/utils'

function FileIcon({ node }: { node: ContentNode }) {
  if (node.fileCategory === 'code')
    return <FileCode2 className="h-3.5 w-3.5 shrink-0 text-violet-400" />
  if (node.fileCategory === 'data')
    return <FileJson className="h-3.5 w-3.5 shrink-0 text-amber-400" />
  return <FileText className="h-3.5 w-3.5 shrink-0 text-primary/80" />
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
      <NavLink
        to={`/read/${node.path}`}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
            isActive
              ? 'bg-primary/12 font-medium text-primary'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          )
        }
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        title={node.path}
      >
        <FileIcon node={node} />
        <span className="truncate">{node.name}</span>
      </NavLink>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-foreground/90 transition-colors hover:bg-accent/60"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        aria-expanded={open}
      >
        <ChevronRight
          className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-90')}
        />
        {open ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {open && hasChildren && (
        <div className="ml-3 border-l border-border/40">
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
