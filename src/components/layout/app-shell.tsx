import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sidebar } from './sidebar'
import { MobileNav } from './mobile-nav'
import { TopBar } from './top-bar'
import { SkipLink } from './skip-link'
import { CelebrationModal } from '@/components/gamification/celebration-modal'
import { ContentEmptyState } from '@/components/layout/content-empty-state'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'

export function AppShell() {
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen)
  const readerMode = useSettingsStore((s) => s.readerMode)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink />
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <TopBar />
      <div className="flex">
        <Sidebar />
        <motion.main
          id="main-content"
          layout
          className={cn(
            'min-h-[calc(100vh-3.5rem)] flex-1 pb-20 transition-all md:pb-6',
            sidebarOpen ? 'md:ml-64' : 'md:ml-0',
            readerMode === 'fullscreen' && 'md:ml-0',
          )}
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <ContentEmptyState />
            <Outlet />
          </div>
        </motion.main>
      </div>
      <MobileNav />
      <CelebrationModal />
    </div>
  )
}
