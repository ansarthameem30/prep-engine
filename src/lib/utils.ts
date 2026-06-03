import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

export function slugifyPath(segments: string[]) {
  return segments.map((s) => encodeURIComponent(s)).join('/')
}

export function parseSlugPath(slug: string) {
  return slug.split('/').map((s) => decodeURIComponent(s))
}
