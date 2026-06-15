import {
  Bookmark,
  Expand,
  Focus,
  Minimize2,
  Minus,
  Plus,
  StretchHorizontal,
  Type,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeMenu } from '@/components/layout/theme-switcher'
import { useSettingsStore, type ReaderMode } from '@/stores/settings-store'
import { useBookmarksStore } from '@/stores/bookmarks-store'
import { parseMarkdownMeta } from '@/lib/content/markdown'
import type { SprintFileCategory } from '@/lib/content/file-types'
import { getManifestFile } from '@/lib/content/loader'
import { cn } from '@/lib/utils'

interface ReaderToolbarProps {
  path: string
  content: string
  fileCategory?: SprintFileCategory
}

export function ReaderToolbar({ path, content, fileCategory = 'markdown' }: ReaderToolbarProps) {
  const {
    readerMode,
    setReaderMode,
    fontSize,
    setFontSize,
    contentWidth,
    setContentWidth,
    readingFont,
    setReadingFont,
  } = useSettingsStore()
  const { toggleBookmark, isBookmarked } = useBookmarksStore()
  const entry = getManifestFile(path)
  const isMarkdown = fileCategory === 'markdown'
  const title =
    entry?.title ??
    (isMarkdown ? parseMarkdownMeta(content, path).title : path.split('/').pop() ?? path)
  const saved = isBookmarked(path)

  const cycleReaderMode = () => {
    const order: ReaderMode[] = ['default', 'focus', 'fullscreen']
    setReaderMode(order[(order.indexOf(readerMode) + 1) % order.length])
  }

  const cycleWidth = () => {
    const order = ['narrow', 'medium', 'wide'] as const
    setContentWidth(order[(order.indexOf(contentWidth) + 1) % order.length])
  }

  const ReaderIcon = readerMode === 'fullscreen' ? Minimize2 : readerMode === 'focus' ? Expand : Focus

  return (
    <div className="sticky top-14 z-20 -mx-1 mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/60 bg-card/70 p-1.5 shadow-sm backdrop-blur-xl">
      <Button variant="ghost" size="sm" onClick={cycleReaderMode} className="gap-1.5">
        <ReaderIcon className="h-4 w-4" />
        <span className="hidden capitalize sm:inline">{readerMode}</span>
      </Button>

      <div className="mx-0.5 h-5 w-px bg-border/70" />

      {/* Font size stepper */}
      <div className="flex items-center rounded-lg bg-muted/50">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setFontSize(Math.max(14, fontSize - 1))}
          aria-label="Decrease font size"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center text-xs font-medium tabular-nums text-muted-foreground">
          {fontSize}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setFontSize(Math.min(24, fontSize + 1))}
          aria-label="Increase font size"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {isMarkdown && (
        <>
          <Button
            variant={readingFont === 'serif' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setReadingFont(readingFont === 'serif' ? 'sans' : 'serif')}
            className="gap-1.5"
            title="Toggle reading typeface"
          >
            <Type className="h-4 w-4" />
            <span className="hidden sm:inline">{readingFont === 'serif' ? 'Serif' : 'Sans'}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cycleWidth}
            className="gap-1.5"
            title="Cycle content width"
          >
            <StretchHorizontal className="h-4 w-4" />
            <span className="hidden capitalize sm:inline">{contentWidth}</span>
          </Button>
        </>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeMenu />
        <Button
          variant={saved ? 'default' : 'outline'}
          size="sm"
          onClick={() => toggleBookmark(path, title, 'document')}
          className="gap-1.5"
        >
          <Bookmark className={cn('h-4 w-4', saved && 'fill-current')} />
          <span className="hidden sm:inline">{saved ? 'Saved' : 'Save'}</span>
        </Button>
      </div>
    </div>
  )
}
