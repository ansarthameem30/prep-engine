import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocumentTitle } from '@/hooks/use-document-title'

export function NotFoundPage() {
  useDocumentTitle('Page not found')

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground/50" />
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        This route does not exist. Open your roadmap or search for a lesson.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild>
          <Link to="/">Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/roadmap">Roadmap</Link>
        </Button>
      </div>
    </div>
  )
}
