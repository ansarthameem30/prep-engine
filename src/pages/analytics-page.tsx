import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDaySummaries, useProgressStore } from '@/stores/progress-store'
import { sprintManifest } from '@/lib/content/loader'

import { useDocumentTitle } from '@/hooks/use-document-title'

export function AnalyticsPage() {
  useDocumentTitle('Analytics')
  const { summaries, stats } = useDaySummaries()
  const studySessions = useProgressStore((s) => s.studySessions)
  const totalStudyMinutes = useProgressStore((s) => s.totalStudyMinutes)

  const weekly = studySessions.slice(-7)
  const monthly = studySessions.slice(-30)

  const topicActivity = summaries
    .filter((d) => d.progress > 0)
    .slice(0, 8)
    .map((d) => ({ name: `D${d.dayNumber}`, progress: d.progress }))

  const mostRead = sprintManifest.fileCount

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Study insights from your local progress data.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Completion rate', value: `${stats.overallProgress}%` },
          { label: 'Days completed', value: stats.completedDays },
          { label: 'Total study time', value: `${totalStudyMinutes} min` },
          { label: 'Content files', value: mostRead },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly consistency</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(5)} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly progress</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="date" tickFormatter={(v) => String(v).slice(8)} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="tasksCompleted" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Most active topics</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicActivity} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="name" type="category" width={40} />
              <Tooltip />
              <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
