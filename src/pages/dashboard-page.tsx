import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Flame,
  ListTodo,
  Target,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatCard } from '@/components/dashboard/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useDaySummaries, useProgressStore } from '@/stores/progress-store'
import { useGamificationStore } from '@/stores/gamification-store'
import { Badge } from '@/components/ui/badge'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { APP_NAME } from '@/lib/brand'

export function DashboardPage() {
  useDocumentTitle('Dashboard')
  const { summaries, stats } = useDaySummaries()
  const streak = useProgressStore((s) => s.streak)
  const studySessions = useProgressStore((s) => s.studySessions)
  const checkAchievements = useGamificationStore((s) => s.checkAchievements)
  const achievements = useGamificationStore((s) => s.achievements)

  useEffect(() => {
    checkAchievements({
      completedDays: stats.completedDays,
      streak,
      overallProgress: stats.overallProgress,
      tasksCompleted: stats.doneTasks,
    })
  }, [stats, streak, checkAchievements])

  const chartData = studySessions.slice(-7).map((s) => ({
    date: s.date.slice(5),
    minutes: s.minutes,
    tasks: s.tasksCompleted,
  }))

  const nextDay = summaries.find((d) => d.status === 'available' || d.status === 'in_progress')

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">{APP_NAME} command center</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Track momentum across all 60 days — lessons, code files, tasks, streaks, and analytics. Your source
          content stays read-only; progress lives in your browser.
        </p>
      </motion.div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="relative flex items-center justify-center">
          <CircularProgress value={stats.overallProgress} size={120} stroke={8} />
          <div className="absolute text-center">
            <div className="text-2xl font-bold">{stats.overallProgress}%</div>
            <div className="text-xs text-muted-foreground">Complete</div>
          </div>
        </div>
        {nextDay && (
          <Card className="flex-1 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle>Continue learning</CardTitle>
              <p className="text-sm text-muted-foreground">{nextDay.title}</p>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to={`/read/${nextDay.path}/README.md`}>
                  Resume Day {nextDay.dayNumber}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Days completed" value={stats.completedDays} subtitle={`${stats.remainingDays} remaining`} icon={CheckCircle2} delay={0} />
        <StatCard title="Current streak" value={streak} subtitle="Study consistency" icon={Flame} delay={1} />
        <StatCard title="Tasks done" value={stats.doneTasks} subtitle={`${stats.pendingTasks} pending`} icon={ListTodo} delay={2} />
        <StatCard title="In progress" value={stats.inProgressDays} subtitle="Active days" icon={Target} delay={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly progress
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" fill="url(#colorMin)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Complete a lesson to start your velocity chart.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievements.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="text-xl">{a.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                {a.unlockedAt ? (
                  <Badge variant="success">✓</Badge>
                ) : (
                  <Badge variant="muted">—</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Learning velocity
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/roadmap">View roadmap</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {stats.doneTasks > 0
              ? `You've completed ${stats.doneTasks} tasks across ${summaries.filter((d) => d.progress > 0).length} active days.`
              : 'Start Day 1 to build your learning velocity.'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
