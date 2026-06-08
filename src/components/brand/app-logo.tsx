import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/brand'

export function AppLogo({ showName = true, className }: { showName?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 font-semibold tracking-tight', className)}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-md shadow-primary/30 ring-1 ring-white/10">
        <Gauge className="h-4 w-4" strokeWidth={2.5} />
        <span className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/20" />
      </span>
      {showName && (
        <span className="hidden bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent sm:inline">
          {APP_NAME}
        </span>
      )}
    </span>
  )
}
