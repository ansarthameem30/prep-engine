import { NavLink } from 'react-router-dom'
import { BarChart3, Bookmark, LayoutDashboard, Map, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settings-store'

const items = [
  { to: '/', icon: LayoutDashboard, label: 'Home' },
  { to: '/roadmap', icon: Map, label: 'Roadmap' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/analytics', icon: BarChart3, label: 'Stats' },
  { to: '/bookmarks', icon: Bookmark, label: 'Saved' },
]

export function MobileNav() {
  const readerMode = useSettingsStore((s) => s.readerMode)
  if (readerMode === 'fullscreen') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/90 px-2 py-2 backdrop-blur-xl md:hidden">
      <ul className="flex items-center justify-around">
        {items.map(({ to, icon: Icon, label }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
