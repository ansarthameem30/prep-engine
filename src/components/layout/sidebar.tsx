import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Bookmark,
  BookOpen,
  LayoutDashboard,
  Map,
  NotebookPen,
  Search,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings-store'
import { ContentTreeNav } from './content-tree-nav'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/roadmap', label: 'Roadmap', icon: Map },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/notes', label: 'Notes', icon: NotebookPen },
  { to: '/settings', label: 'Settings', icon: Settings },
]

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
      <nav className="flex flex-col gap-1 p-3">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-2 flex-1 overflow-y-auto border-t border-border/40 px-2 py-3">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Curriculum
        </p>
        <ContentTreeNav />
      </div>
      <div className="border-t border-border/40 p-3">
        <NavLink
          to="/read/README.md"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
        >
          <BookOpen className="h-4 w-4" />
          Program overview
        </NavLink>
      </div>
    </aside>
  )
}
