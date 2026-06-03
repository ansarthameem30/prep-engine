import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Lock, PlayCircle, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { DaySummary } from '@/lib/content/types'
import { cn } from '@/lib/utils'

const statusConfig = {
  locked: { label: 'Locked', variant: 'muted' as const, icon: Lock },
  available: { label: 'Available', variant: 'default' as const, icon: PlayCircle },
  in_progress: { label: 'In Progress', variant: 'warning' as const, icon: PlayCircle },
  completed: { label: 'Completed', variant: 'success' as const, icon: CheckCircle2 },
}

export function DayCard({ day, index }: { day: DaySummary; index: number }) {
  const config = statusConfig[day.status]
  const Icon = config.icon
  const disabled = day.status === 'locked'

  const body = (
    <Card
      className={cn(
        'h-full transition-all hover:shadow-md',
        disabled && 'opacity-60',
        !disabled && 'hover:border-primary/40',
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Day {day.dayNumber}</CardTitle>
          <Badge variant={config.variant}>
            <Icon className="mr-1 h-3 w-3" />
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
