import { Bookmark, Expand, Focus, Minimize2, Moon, Sun, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSettingsStore, type ReaderMode } from '@/stores/settings-store'
import { useBookmarksStore } from '@/stores/bookmarks-store'
import { parseMarkdownMeta } from '@/lib/content/markdown'
import type { SprintFileCategory } from '@/lib/content/file-types'
import { getManifestFile } from '@/lib/content/loader'

interface ReaderToolbarProps {
  path: string
  content: string
  fileCategory?: SprintFileCategory
}

export function ReaderToolbar({ path, content, fileCategory = 'markdown' }: ReaderToolbarProps) {
  const { theme, setTheme, readerMode, setReaderMode, fontSize, setFontSize } = useSettingsStore()
  const { toggleBookmark, isBookmarked } = useBookmarksStore()
  const entry = getManifestFile(path)
  const title =
    entry?.title ??
    (fileCategory === 'markdown' ? parseMarkdownMeta(content, path).title : path.split('/').pop() ?? path)

  const cycleReaderMode = () => {
    const order: ReaderMode[] = ['default', 'focus', 'fullscreen']
    const next = order[(order.indexOf(readerMode) + 1) % order.length]
    setReaderMode(next)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-2 backdrop-blur-md">
      <Button variant="ghost" size="sm" onClick={cycleReaderMode}>
        {readerMode === 'fullscreen' ? (
          <Minimize2 className="h-4 w-4" />
        ) : readerMode === 'focus' ? (
          <Expand className="h-4 w-4" />
        ) : (
          <Focus className="h-4 w-4" />
        )}
        <span className="ml-1 capitalize">{readerMode} mode</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setFontSize(fontSize + 1)}>
        <Type className="h-4 w-4" />+
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setFontSize(Math.max(14, fontSize - 1))}>
        <Type className="h-4 w-4" />−
      </Button>
      <Button
        variant={isBookmarked(path) ? 'default' : 'ghost'}
        size="sm"
        onClick={() => toggleBookmark(path, title, 'document')}
      >
        <Bookmark className="h-4 w-4" />
        {isBookmarked(path) ? 'Saved' : 'Bookmark'}
      </Button>
    </div>
  )
}
