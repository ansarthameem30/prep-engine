import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useThemeEffect } from '@/hooks/use-theme'
import { migrateLegacyStorage } from '@/lib/storage-migrate'

migrateLegacyStorage()

function Root() {
  useThemeEffect()
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
