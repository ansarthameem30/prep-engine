import { Link } from 'react-router-dom'
import { Bookmark, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBookmarksStore } from '@/stores/bookmarks-store'

import { useDocumentTitle } from '@/hooks/use-document-title'

export function BookmarksPage() {
  useDocumentTitle('Bookmarks')
  const { bookmarks, removeBookmark } = useBookmarksStore()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Bookmarks</h1>
      {bookmarks.length === 0 ? (
        <p className="text-muted-foreground">Save days or lessons from the reader toolbar.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bookmarks.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex items-center gap-3 p-4">
                <Bookmark className="h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <Link to={`/read/${b.path}`} className="font-medium hover:underline">
                    {b.title}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{b.path}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeBookmark(b.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
