import { useState } from 'react'
import { motion } from 'framer-motion'
import { Grid3X3, GitBranch, List } from 'lucide-react'
import { DayCard } from '@/components/roadmap/day-card'
import { Button } from '@/components/ui/button'
import { useDaySummaries } from '@/stores/progress-store'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { cn } from '@/lib/utils'
import type { DaySummary } from '@/lib/content/types'

type ViewMode = 'grid' | 'timeline' | 'roadmap'

export function RoadmapPage() {
  useDocumentTitle('Roadmap')
  const { summaries } = useDaySummaries()
  const [view, setView] = useState<ViewMode>('grid')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">60-Day Roadmap</h1>
          <p className="text-muted-foreground">Dynamically built from your sprint folder structure.</p>
        </div>
        <div className="flex gap-2 rounded-lg border border-border/60 p-1">
          {(
            [
              { id: 'grid' as const, icon: Grid3X3, label: 'Grid' },
              { id: 'timeline' as const, icon: List, label: 'Timeline' },
              { id: 'roadmap' as const, icon: GitBranch, label: 'Roadmap' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant={view === id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView(id)}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {view === 'grid' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {summaries.map((day, i) => (
            <DayCard key={day.path} day={day} index={i} />
          ))}
        </div>
      )}

      {view === 'timeline' && <TimelineView days={summaries} />}
      {view === 'roadmap' && <RoadmapView days={summaries} />}
    </div>
  )
}

function TimelineView({ days }: { days: DaySummary[] }) {
  return (
    <div className="relative space-y-0 border-l border-border/60 pl-8">
      {days.map((day, i) => (
        <motion.div
          key={day.path}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.02 }}
          className="relative pb-8"
        >
          <span className="absolute -left-[2.35rem] flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary bg-background text-xs font-bold">
            {day.dayNumber}
          </span>
          <DayCard day={day} index={i} />
        </motion.div>
      ))}
    </div>
  )
}

function RoadmapView({ days }: { days: DaySummary[] }) {
  const phases = [
    { label: 'Phase 1: JS', range: [1, 10] },
    { label: 'Phase 2: React', range: [11, 20] },
    { label: 'Phase 3: Backend', range: [21, 30] },
    { label: 'Phase 4: System Design', range: [31, 40] },
    { label: 'Phase 5: GenAI', range: [41, 50] },
    { label: 'Phase 6: Final Sprint', range: [51, 60] },
  ]

  return (
    <div className="space-y-10">
      {phases.map((phase) => {
        const phaseDays = days.filter(
          (d) => d.dayNumber >= phase.range[0] && d.dayNumber <= phase.range[1],
        )
        return (
          <div key={phase.label}>
            <h2 className="mb-4 text-lg font-semibold">{phase.label}</h2>
            <div className="flex flex-wrap gap-2">
              {phaseDays.map((day) => (
                <div
                  key={day.path}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg border text-xs font-medium transition-colors',
                    day.status === 'completed' && 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600',
                    day.status === 'in_progress' && 'border-amber-500/50 bg-amber-500/10',
                    day.status === 'available' && 'border-primary/30 bg-primary/5',
                    day.status === 'locked' && 'opacity-40',
                  )}
                  title={day.title}
                >
                  {day.dayNumber}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
