import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, PlayCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { DaySummary } from '@/lib/content/types'
import { cn } from '@/lib/utils'

const statusConfig = {
  locked: { label: 'Locked', variant: 'muted' as const, icon: Lock, accent: 'bg-border' },
  available: { label: 'Available', variant: 'default' as const, icon: PlayCircle, accent: 'bg-primary' },
  in_progress: { label: 'In Progress', variant: 'warning' as const, icon: PlayCircle, accent: 'bg-amber-500' },
  completed: { label: 'Completed', variant: 'success' as const, icon: CheckCircle2, accent: 'bg-emerald-500' },
}

export function DayCard({ day, index }: { day: DaySummary; index: number }) {
  const config = statusConfig[day.status]
  const Icon = config.icon
  const disabled = day.status === 'locked'

  const body = (
    <Card
      className={cn(
        'group relative h-full overflow-hidden transition-all duration-300',
        disabled && 'opacity-60',
        !disabled && 'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5',
      )}
    >
      {/* status accent strip */}
      <span className={cn('absolute inset-y-0 left-0 w-1', config.accent)} aria-hidden />
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Day {day.dayNumber}</CardTitle>
          <Badge variant={config.variant}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{day.title}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={day.progress} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{day.progress}%</span>
          <span>{day.readingMinutes} min read</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {day.completedTasks}/{day.taskCount} tasks
        </p>
      </CardContent>
    </Card>
  )

  if (disabled) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}>
        {body}
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.02 }}>
      <Link to={`/read/${day.path}/README.md`}>{body}</Link>
    </motion.div>
  )
}
