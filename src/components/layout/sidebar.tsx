import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bookmark,
  BookOpen,
  Flame,
  LayoutDashboard,
  Map,
  NotebookPen,
  Search,
  Settings,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings-store'
import { useProgressStore, useDaySummaries } from '@/stores/progress-store'
import { useGamificationStore } from '@/stores/gamification-store'
import { ContentTreeNav } from './content-tree-nav'

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard }

const mainLinks: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

const libraryLinks: NavItem[] = [
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/read/README.md', label: 'Program overview', icon: BookOpen },
]

function NavRow({ to, label, icon: Icon, onNavigate }: NavItem & { onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
          isActive
            ? 'bg-accent/70 text-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary transition-all',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <span
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg transition-all',
              isActive
                ? 'accent-gradient text-white shadow-sm shadow-primary/30'
                : 'bg-muted/50 text-muted-foreground group-hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.2} />
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-1 px-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
      {children}
    </p>
  )
}

/** Compact study-status card pinned to the bottom of the rail. */
function StudyStatusCard() {
  const streak = useProgressStore((s) => s.streak)
  const xp = useGamificationStore((s) => s.xp)
  const { stats } = useDaySummaries()
  const pct = stats.overallProgress

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
      <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">Sprint progress</span>
        <span className="accent-text-gradient text-sm font-bold">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="reading-progress h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[0.7rem] text-muted-foreground">
        {stats.completedDays} of {stats.totalDays} days complete
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-2 py-1.5 text-xs font-medium">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          {streak}d
        </span>
        <span className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          {xp} XP
        </span>
      </div>
    </div>
  )
}

/** Shared nav body used by both the desktop rail and the mobile drawer. */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="flex flex-col gap-0.5">
          <GroupLabel>Workspace</GroupLabel>
          {mainLinks.map((item) => (
            <NavRow key={item.to} {...item} onNavigate={onNavigate} />
          ))}
          <GroupLabel>Library</GroupLabel>
          {libraryLinks.map((item) => (
            <NavRow key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="mt-4 border-t border-border/40 pt-4">
          <GroupLabel>Curriculum</GroupLabel>
          <ContentTreeNav onNavigate={onNavigate} />
        </div>
      </div>

      <div className="space-y-3 border-t border-border/40 p-3">
        <StudyStatusCard />
        <NavRow to="/settings" label="Settings" icon={Settings} onNavigate={onNavigate} />
      </div>
    </>
  )
}

/** Desktop sidebar rail (md and up). */
export function Sidebar() {
  const sidebarOpen = useSettingsStore((s) => s.sidebarOpen)
  const readerMode = useSettingsStore((s) => s.readerMode)

  if (readerMode === 'fullscreen') return null

  return (
    <aside
      className={cn(
        'fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-64 flex-col border-r border-border/60 bg-card/30 backdrop-blur-xl transition-transform md:flex',
        !sidebarOpen && '-translate-x-full',
      )}
    >
      <SidebarContent />
    </aside>
  )
}
