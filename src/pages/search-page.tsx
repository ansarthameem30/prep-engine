import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { searchContent } from '@/lib/content/search'

import { useDocumentTitle } from '@/hooks/use-document-title'

export function SearchPage() {
  useDocumentTitle('Search')
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchContent(query), [query])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, headings, and content…"
          className="pl-9"
          autoFocus
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {query.length < 2 ? 'Type at least 2 characters' : `${results.length} results`}
      </p>
      <div className="space-y-3">
        {results.map((r) => (
          <Link key={r.path} to={`/read/${r.path}`}>
            <Card className="transition-colors hover:border-primary/40">
              <CardContent className="p-4">
                <h3 className="font-medium">{r.title}</h3>
                <p className="text-xs text-muted-foreground">{r.path}</p>
                <p className="mt-2 text-sm text-muted-foreground">{r.excerpt}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
