import { Link, useNavigate } from 'react-router-dom'
import { Menu, PanelLeftClose, PanelLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppLogo } from '@/components/brand/app-logo'
import { useSettingsStore } from '@/stores/settings-store'
import { useGamificationStore } from '@/stores/gamification-store'
import { useProgressStore } from '@/stores/progress-store'
import { GlobalSearchTrigger } from '@/components/search/global-search-trigger'
import { ThemeMenu } from './theme-switcher'

export function TopBar() {
  const { sidebarOpen, setSidebarOpen, mobileNavOpen, setMobileNavOpen, readerMode } =
    useSettingsStore()
  const xp = useGamificationStore((s) => s.xp)
  const streak = useProgressStore((s) => s.streak)
  const navigate = useNavigate()

  if (readerMode === 'fullscreen') return null

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/60 bg-background/70 px-3 backdrop-blur-xl sm:gap-3 sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
        aria-label="Open navigation menu"
        aria-expanded={mobileNavOpen}
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

      <div className="ml-auto flex items-center gap-1.5 text-sm sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => navigate('/search')}
          aria-label="Search lessons"
        >
          <Search className="h-5 w-5" />
        </Button>
        <span
          className="hidden items-center gap-1 rounded-full border border-border/60 bg-card/50 px-3 py-1 sm:inline-flex"
          title="Study streak"
        >
          🔥 {streak} day{streak === 1 ? '' : 's'}
        </span>
        <span
          className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary sm:px-3"
          title="Experience points"
        >
          {xp} XP
        </span>
        <ThemeMenu />
      </div>
    </header>
  )
}
