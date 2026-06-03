import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export interface Bookmark {
  id: string
  path: string
  title: string
  type: 'day' | 'section' | 'document'
  createdAt: string
}

interface BookmarksState {
  bookmarks: Bookmark[]
  toggleBookmark: (path: string, title: string, type: Bookmark['type']) => void
  isBookmarked: (path: string) => boolean
  removeBookmark: (id: string) => void
}

export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],
      toggleBookmark: (path, title, type) => {
        const existing = get().bookmarks.find((b) => b.path === path)
        if (existing) {
          set({ bookmarks: get().bookmarks.filter((b) => b.path !== path) })
          return
        }
        set({
          bookmarks: [
            {
              id: crypto.randomUUID(),
              path,
              title,
              type,
              createdAt: new Date().toISOString(),
            },
            ...get().bookmarks,
          ],
        })
      },
      isBookmarked: (path) => get().bookmarks.some((b) => b.path === path),
      removeBookmark: (id) => set({ bookmarks: get().bookmarks.filter((b) => b.id !== id) }),
    }),
    { name: STORAGE_KEYS.bookmarks },
  ),
)
