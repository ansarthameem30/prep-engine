import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@/components/error-boundary'
import { AppShell } from '@/components/layout/app-shell'
import { ScrollToTop } from '@/components/layout/scroll-to-top'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

const DashboardPage = lazy(() =>
  import('@/pages/dashboard-page').then((m) => ({ default: m.DashboardPage })),
)
const RoadmapPage = lazy(() =>
  import('@/pages/roadmap-page').then((m) => ({ default: m.RoadmapPage })),
)
const ReaderPage = lazy(() =>
  import('@/pages/reader-page').then((m) => ({ default: m.ReaderPage })),
)
const SearchPage = lazy(() =>
  import('@/pages/search-page').then((m) => ({ default: m.SearchPage })),
)
const AnalyticsPage = lazy(() =>
  import('@/pages/analytics-page').then((m) => ({ default: m.AnalyticsPage })),
)
const BookmarksPage = lazy(() =>
  import('@/pages/bookmarks-page').then((m) => ({ default: m.BookmarksPage })),
)
const NotesPage = lazy(() =>
  import('@/pages/notes-page').then((m) => ({ default: m.NotesPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings-page').then((m) => ({ default: m.SettingsPage })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((m) => ({ default: m.NotFoundPage })),
)

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}

function AppRoutes() {
  useKeyboardShortcuts()

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppShell />}>
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="roadmap"
            element={
              <Suspense fallback={<PageLoader />}>
                <RoadmapPage />
              </Suspense>
            }
          />
          <Route
            path="search"
            element={
              <Suspense fallback={<PageLoader />}>
                <SearchPage />
              </Suspense>
            }
          />
          <Route
            path="analytics"
            element={
              <Suspense fallback={<PageLoader />}>
                <AnalyticsPage />
              </Suspense>
            }
          />
          <Route
            path="bookmarks"
            element={
              <Suspense fallback={<PageLoader />}>
                <BookmarksPage />
              </Suspense>
            }
          />
          <Route
            path="notes"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotesPage />
              </Suspense>
            }
          />
          <Route
            path="settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="read/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <ReaderPage />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Suspense fallback={<PageLoader />}>
                <NotFoundPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
