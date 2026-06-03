import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export interface UserNote {
  id: string
  path: string
  title: string
  content: string
  updatedAt: string
}

interface NotesState {
  notes: UserNote[]
  addNote: (path: string, title: string, content: string) => void
  updateNote: (id: string, content: string, title?: string) => void
  deleteNote: (id: string) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      addNote: (path, title, content) =>
        set((state) => ({
          notes: [
            {
              id: crypto.randomUUID(),
              path,
              title,
              content,
              updatedAt: new Date().toISOString(),
            },
            ...state.notes,
          ],
        })),
      updateNote: (id, content, title) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id
              ? { ...n, content, title: title ?? n.title, updatedAt: new Date().toISOString() }
              : n,
          ),
        })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((n) => n.id !== id) })),
    }),
    { name: STORAGE_KEYS.notes },
  ),
)
