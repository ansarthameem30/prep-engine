import { useEffect } from 'react'
import { APP_NAME } from '@/lib/brand'

export function useDocumentTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME
  }, [pageTitle])
}
