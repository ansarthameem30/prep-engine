import { FolderOpen, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getContentManifestCount } from '@/lib/content/discovery'
import { sprintManifest } from '@/lib/content/loader'

export function ContentEmptyState() {
  const count = getContentManifestCount()

  if (count > 0) return null

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <FolderOpen className="h-5 w-5" />
          No curriculum loaded
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Add curriculum files under <code className="rounded bg-muted px-1">content/</code> inside Prep Engine,
          or keep using the legacy folder next to the repo.
        </p>
        <pre className="overflow-x-auto rounded-lg border border-border/60 bg-muted/50 p-3 text-xs">
          {sprintManifest.contentRoot}
        </pre>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Copy sprint into the app: <code className="rounded bg-muted px-1">npm run sync-content</code>
          </li>
          <li>
            Or place files manually in <strong>sprint-platform/content/</strong>
          </li>
          <li>
            Restart dev — terminal should log indexed file counts
          </li>
        </ol>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" />
          Reload
        </Button>
      </CardContent>
    </Card>
  )
}
