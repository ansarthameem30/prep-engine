import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { AppLogo } from '@/components/brand/app-logo'
import { Button } from '@/components/ui/button'
import { useSettingsStore } from '@/stores/settings-store'
import { SidebarContent } from './sidebar'

/**
 * Slide-over navigation drawer for small screens. Gives mobile users access to
 * the full nav and curriculum tree, which the desktop rail hides below `md`.
 */
export function MobileDrawer() {
  const open = useSettingsStore((s) => s.mobileNavOpen)
  const setOpen = useSettingsStore((s) => s.setMobileNavOpen)

  // Lock body scroll and close on Escape while open.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <motion.div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute left-0 top-0 flex h-full w-[84%] max-w-xs flex-col border-r border-border/60 bg-card shadow-2xl"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 px-4">
              <AppLogo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
              <SidebarContent onNavigate={() => setOpen(false)} />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
