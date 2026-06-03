import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { APP_NAME } from '@/lib/brand'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[Prep Engine]', error, info.componentStack)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {APP_NAME} hit an unexpected error. Your study data in localStorage is safe.
            </p>
            {import.meta.env.DEV && this.state.message && (
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{this.state.message}</pre>
            )}
            <div className="flex gap-2">
              <Button onClick={() => window.location.reload()}>Reload app</Button>
              <Button variant="outline" asChild>
                <Link to="/">Go home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
