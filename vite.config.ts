import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sprintContentPlugin } from './vite-plugin-sprint-content'

const repoRoot = path.resolve(__dirname, '..')

export default defineConfig({
  plugins: [sprintContentPlugin(__dirname), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    fs: {
      allow: [repoRoot, path.join(__dirname, 'content')],
    },
  },
  base: process.env.VITE_BASE_PATH ?? '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) {
              return 'markdown'
            }
            if (id.includes('recharts')) return 'charts'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('react') || id.includes('router')) return 'vendor'
          }
        },
      },
    },
  },
})
