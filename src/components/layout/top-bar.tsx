import { Link } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/brand/app-logo'
import { useSettingsStore } from '@/stores/settings-store'
import { useGamificationStore } from '@/stores/gamification-store'
import { useProgressStore } from '@/stores/progress-store'
import { GlobalSearchTrigger } from '@/components/search/global-search-trigger'

export function TopBar() {
  const { sidebarOpen, setSidebarOpen, readerMode } = useSettingsStore()
  const xp = useGamificationStore((s) => s.xp)
  const streak = useProgressStore((s) => s.streak)

  if (readerMode === 'fullscreen') return null

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle navigation menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hidden md:inline-flex"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
      >
        {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
      </Button>

      <Link to="/" aria-label="Prep Engine home">
        <AppLogo />
      </Link>

      <div className="mx-auto hidden max-w-md flex-1 md:flex">
        <GlobalSearchTrigger />
      </div>

      <div className="ml-auto flex items-center gap-3 text-sm">
        <span
          className="hidden rounded-full border border-border/60 bg-card/50 px-3 py-1 sm:inline"
          title="Study streak"
        >
          🔥 {streak} day{streak === 1 ? '' : 's'}
        </span>
        <span
          className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary"
          title="Experience points"
        >
          {xp} XP
        </span>
      </div>
    </header>
  )
}
