import { useEffect, useState } from 'react'
import { useSettingsStore } from '@/stores/settings-store'

/** Returns the effective 'light' | 'dark' mode, resolving 'system' live. */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useSettingsStore((s) => s.theme)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  if (theme === 'system') return systemDark ? 'dark' : 'light'
  return theme
}

export function useThemeEffect() {
  const theme = useSettingsStore((s) => s.theme)
  const accent = useSettingsStore((s) => s.accent)

  useEffect(() => {
    const root = document.documentElement
    const apply = (mode: 'light' | 'dark') => {
      root.classList.toggle('dark', mode === 'dark')
    }

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      apply(mq.matches ? 'dark' : 'light')
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }

    apply(theme)
  }, [theme])

  // Re-tint the whole UI by toggling the accent attribute on <html>.
  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
  }, [accent])
}
