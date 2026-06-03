import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage-keys'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ReaderMode = 'default' | 'focus' | 'fullscreen'

interface SettingsState {
  theme: ThemeMode
  fontSize: number
  lineSpacing: number
  contentWidth: 'narrow' | 'medium' | 'wide'
  readerMode: ReaderMode
  sidebarOpen: boolean
  setTheme: (theme: ThemeMode) => void
  setFontSize: (size: number) => void
  setLineSpacing: (spacing: number) => void
  setContentWidth: (width: 'narrow' | 'medium' | 'wide') => void
  setReaderMode: (mode: ReaderMode) => void
  setSidebarOpen: (open: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      fontSize: 16,
      lineSpacing: 1.8,
      contentWidth: 'medium',
      readerMode: 'default',
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineSpacing: (lineSpacing) => set({ lineSpacing }),
      setContentWidth: (contentWidth) => set({ contentWidth }),
      setReaderMode: (readerMode) => set({ readerMode }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    }),
    { name: STORAGE_KEYS.settings },
  ),
)
