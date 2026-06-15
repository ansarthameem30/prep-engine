import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/brand'

export function AppLogo({ showName = true, className }: { showName?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2.5 font-semibold tracking-tight', className)}>
      {showName && (
        <span className="hidden bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent sm:inline">
          {APP_NAME}
        </span>
      )}
    </span>
  )
}
