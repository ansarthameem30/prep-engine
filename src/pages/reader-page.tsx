import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, FileWarning } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { FileViewer } from '@/components/content/file-viewer'
import { ReaderToolbar } from '@/components/markdown/reader-toolbar'
import { isContentAvailable, loadFileContent } from '@/lib/content/discovery'
import { getFileCategory } from '@/lib/content/file-types'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { getManifestFile } from '@/lib/content/loader'

export function ReaderPage() {
  const { '*': slug } = useParams()
  const path = slug ?? 'README.md'
  const manifestEntry = getManifestFile(path)
  useDocumentTitle(manifestEntry?.title ?? path)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const readerMode = useSettingsStore((s) => s.readerMode)
  const fileCategory = getFileCategory(path)

  useEffect(() => {
    if (!isContentAvailable()) {
      setError('Curriculum not loaded. Run npm run sync-content or add files to Prep Engine content/.')
      setContent('')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    loadFileContent(path)
      .then(setContent)
      .catch((err: Error) => {
        setContent('')
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [path])

  const parentPath = path.split('/').slice(0, -1).join('/')

  return (
    <div
      className={cn(
        readerMode === 'fullscreen' && 'fixed inset-0 z-50 overflow-y-auto bg-background p-6',
        readerMode === 'focus' && 'mx-auto max-w-4xl',
      )}
    >
      {readerMode !== 'fullscreen' && (
        <Link
          to={parentPath ? `/read/${parentPath}` : '/'}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Link>
      )}

      {loading ? (
        <div className="animate-pulse space-y-6 py-8">
          <div className="h-10 w-1/2 rounded-lg bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-64 w-full rounded-xl bg-muted" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex items-start gap-3 p-6">
            <FileWarning className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Could not load this file</p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <ReaderToolbar path={path} content={content} fileCategory={fileCategory} />
          <div className="rounded-2xl border border-border/50 bg-card/30 px-6 py-8 shadow-sm sm:px-10 sm:py-10 md:px-12 md:py-12">
            <FileViewer path={path} content={content} />
          </div>
        </div>
      )}
    </div>
  )
}
