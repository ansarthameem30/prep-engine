import { useEffect, useRef, useState } from 'react'
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore, type ThemeMode } from '@/stores/settings-store'
import { ACCENTS } from '@/lib/theme'

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

/** Segmented light/dark/system control. */
export function ModeToggle({ className }: { className?: string }) {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-xl border border-border/60 bg-muted/40 p-1',
        className,
      )}
      role="group"
      aria-label="Color mode"
    >
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setTheme(id)}
          aria-pressed={theme === id}
          title={label}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all',
            theme === id
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  )
}

/** Row of accent color swatches. */
export function AccentSwatches({ className }: { className?: string }) {
  const accent = useSettingsStore((s) => s.accent)
  const setAccent = useSettingsStore((s) => s.setAccent)
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {ACCENTS.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => setAccent(a.id)}
          aria-pressed={accent === a.id}
          aria-label={a.label}
          title={a.label}
          className={cn(
            'relative flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110',
            accent === a.id ? 'ring-foreground/70' : 'ring-transparent',
          )}
          style={{ backgroundColor: a.swatch }}
        >
          {accent === a.id && <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />}
        </button>
      ))}
    </div>
  )
}

/** Palette button that opens a popover with mode + accent controls. */
export function ThemeMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Theme settings"
        aria-expanded={open}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
          open && 'bg-accent text-foreground',
        )}
      >
        <Palette className="h-[1.15rem] w-[1.15rem]" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 origin-top-right rounded-2xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Appearance
          </p>
          <ModeToggle className="w-full justify-between" />
          <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Accent
          </p>
          <AccentSwatches />
        </div>
      )}
    </div>
  )
}
