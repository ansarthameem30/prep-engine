/**
 * Accent palettes. Each maps to a `[data-accent]` block in index.css that
 * overrides --primary / --ring / --accent so the entire UI re-tints live.
 * `swatch` is a static color for picker chips (independent of light/dark).
 */
export type AccentColor = 'violet' | 'blue' | 'emerald' | 'amber' | 'rose' | 'cyan'

export interface AccentDef {
  id: AccentColor
  label: string
  /** Representative color for the picker chip. */
  swatch: string
}

export const ACCENTS: AccentDef[] = [
  { id: 'violet', label: 'Violet', swatch: 'hsl(252 88% 62%)' },
  { id: 'blue', label: 'Ocean', swatch: 'hsl(221 83% 56%)' },
  { id: 'emerald', label: 'Emerald', swatch: 'hsl(160 84% 39%)' },
  { id: 'amber', label: 'Sunset', swatch: 'hsl(28 92% 52%)' },
  { id: 'rose', label: 'Rose', swatch: 'hsl(346 80% 58%)' },
  { id: 'cyan', label: 'Cyan', swatch: 'hsl(189 85% 42%)' },
]

export const DEFAULT_ACCENT: AccentColor = 'violet'

export function isAccent(value: unknown): value is AccentColor {
  return typeof value === 'string' && ACCENTS.some((a) => a.id === value)
}
