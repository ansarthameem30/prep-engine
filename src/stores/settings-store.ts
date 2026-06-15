import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { STORAGE_KEYS } from '@/lib/storage-keys'
import { DEFAULT_ACCENT, type AccentColor } from '@/lib/theme'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ReaderMode = 'default' | 'focus' | 'fullscreen'
export type ReadingFont = 'sans' | 'serif'

interface SettingsState {
  theme: ThemeMode
  accent: AccentColor
  fontSize: number
  lineSpacing: number
  contentWidth: 'narrow' | 'medium' | 'wide'
  readingFont: ReadingFont
  readerMode: ReaderMode
  sidebarOpen: boolean
  /** Mobile slide-over drawer (not persisted). */
  mobileNavOpen: boolean
  setTheme: (theme: ThemeMode) => void
  setAccent: (accent: AccentColor) => void
  setFontSize: (size: number) => void
  setLineSpacing: (spacing: number) => void
  setContentWidth: (width: 'narrow' | 'medium' | 'wide') => void
  setReadingFont: (font: ReadingFont) => void
  setReaderMode: (mode: ReaderMode) => void
  setSidebarOpen: (open: boolean) => void
  setMobileNavOpen: (open: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      accent: DEFAULT_ACCENT,
      fontSize: 16,
      lineSpacing: 1.8,
      contentWidth: 'medium',
      readingFont: 'sans',
      readerMode: 'default',
      sidebarOpen: true,
      mobileNavOpen: false,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setFontSize: (fontSize) => set({ fontSize }),
      setLineSpacing: (lineSpacing) => set({ lineSpacing }),
      setContentWidth: (contentWidth) => set({ contentWidth }),
      setReadingFont: (readingFont) => set({ readingFont }),
      setReaderMode: (readerMode) => set({ readerMode }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
    }),
    {
      name: STORAGE_KEYS.settings,
      // Don't persist the transient mobile drawer state.
      partialize: ({ mobileNavOpen: _mobileNavOpen, ...rest }) => rest,
    },
  ),
)
