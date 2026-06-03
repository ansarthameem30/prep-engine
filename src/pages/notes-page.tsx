import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNotesStore } from '@/stores/notes-store'

import { useDocumentTitle } from '@/hooks/use-document-title'

export function NotesPage() {
  useDocumentTitle('Notes')
  const { notes, addNote, updateNote, deleteNote } = useNotesStore()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleAdd = () => {
    if (!title.trim()) return
    addNote('general', title.trim(), content.trim())
    setTitle('')
    setContent('')
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Personal notes</h1>
      <Card>
        <CardHeader>
          <CardTitle>New note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-border bg-background/50 p-3 text-sm"
            placeholder="Write your thoughts…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4" />
            Add note
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="text-base">{note.title}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => deleteNote(note.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {editingId === note.id ? (
                <textarea
                  className="min-h-[80px] w-full rounded-lg border border-border p-2 text-sm"
                  defaultValue={note.content}
                  onBlur={(e) => {
                    updateNote(note.id, e.target.value)
                    setEditingId(null)
                  }}
                  autoFocus
                />
              ) : (
                <p
                  className="cursor-text whitespace-pre-wrap text-sm text-muted-foreground"
                  onClick={() => setEditingId(note.id)}
                >
                  {note.content || 'Click to edit…'}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(note.updatedAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
