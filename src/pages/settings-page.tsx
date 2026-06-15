import { useState } from 'react'
import { Download, Trash2, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ModeToggle, AccentSwatches } from '@/components/layout/theme-switcher'
import { useSettingsStore } from '@/stores/settings-store'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE, APP_VERSION } from '@/lib/brand'
import { exportUserData, clearAllUserData } from '@/lib/storage-migrate'
import { sprintManifest } from '@/lib/content/loader'

export function SettingsPage() {
  useDocumentTitle('Settings')
  const {
    fontSize,
    setFontSize,
    lineSpacing,
    setLineSpacing,
    contentWidth,
    setContentWidth,
    readingFont,
    setReadingFont,
  } = useSettingsStore()
  const [confirmReset, setConfirmReset] = useState(false)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(exportUserData(), null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prep-engine-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    clearAllUserData()
    window.location.reload()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">Customize {APP_NAME} and manage your local data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Pick a color mode and an accent that re-tints the whole app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Color mode</p>
            <ModeToggle />
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Accent color</p>
            <AccentSwatches />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reading experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium">Typeface</p>
            <div className="flex flex-wrap gap-2">
              {(['sans', 'serif'] as const).map((f) => (
                <Button
                  key={f}
                  variant={readingFont === f ? 'default' : 'outline'}
                  onClick={() => setReadingFont(f)}
                  className="capitalize"
                >
                  {f === 'sans' ? 'Sans (Inter)' : 'Serif (Newsreader)'}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="font-size" className="text-sm font-medium">
              Font size: {fontSize}px
            </label>
            <input
              id="font-size"
              type="range"
              min={14}
              max={22}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>
          <div>
            <label htmlFor="line-spacing" className="text-sm font-medium">
              Line spacing: {lineSpacing}
            </label>
            <input
              id="line-spacing"
              type="range"
              min={1.4}
              max={2.2}
              step={0.05}
              value={lineSpacing}
              onChange={(e) => setLineSpacing(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['narrow', 'medium', 'wide'] as const).map((w) => (
              <Button
                key={w}
                variant={contentWidth === w ? 'default' : 'outline'}
                onClick={() => setContentWidth(w)}
              >
                {w}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keyboard shortcuts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd> +{' '}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">K</kbd> — Search
          </p>
          <p>
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">Ctrl</kbd> +{' '}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-xs">H</kbd> — Home
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your data</CardTitle>
          <CardDescription>
            Progress, notes, and bookmarks are stored locally in your browser. Lesson files in{' '}
            <code className="rounded bg-muted px-1">content/</code> are never modified.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export backup
          </Button>
          <Button variant={confirmReset ? 'default' : 'outline'} onClick={handleReset}>
            <Trash2 className="h-4 w-4" />
            {confirmReset ? 'Confirm reset' : 'Reset all progress'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About {APP_NAME}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{APP_DESCRIPTION}</p>
          <p>
            <strong>Version:</strong> {APP_VERSION} · <strong>Tagline:</strong> {APP_TAGLINE}
          </p>
          <p>
            <strong>Content root:</strong>{' '}
            <code className="break-all rounded bg-muted px-1 text-xs">{sprintManifest.contentRoot}</code>
          </p>
          <p>
            <strong>Indexed:</strong> {sprintManifest.fileCount} files ({sprintManifest.markdownCount}{' '}
            lessons, {sprintManifest.codeCount} code)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
