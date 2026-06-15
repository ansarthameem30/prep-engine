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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden">
      <ul className="flex items-center justify-around">
        {items.map(({ to, icon: Icon, label }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'mx-auto flex w-full flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-8 w-12 items-center justify-center rounded-full transition-all',
                      isActive && 'bg-primary/15',
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
