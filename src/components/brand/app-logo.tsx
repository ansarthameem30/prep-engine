import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/brand'

export function AppLogo({ showName = true, className }: { showName?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-violet-500/20 text-primary ring-1 ring-primary/20">
        <Gauge className="h-4 w-4" strokeWidth={2.25} />
      </span>
      {showName && <span className="hidden sm:inline">{APP_NAME}</span>}
    </span>
  )
}
