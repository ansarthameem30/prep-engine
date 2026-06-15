import { useEffect, useState } from 'react'

/**
 * Thin progress bar that fills as the user scrolls the page. Fixed just under
 * the top bar so it reads as "how far through this lesson am I".
 */
export function ReadingProgress() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const update = () => {
      const el = document.documentElement
      const scrollable = el.scrollHeight - el.clientHeight
      setPct(scrollable > 0 ? Math.min(100, (el.scrollTop / scrollable) * 100) : 0)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div className="fixed inset-x-0 top-14 z-30 h-0.5 bg-transparent" aria-hidden>
      <div
        className="reading-progress h-full origin-left transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
