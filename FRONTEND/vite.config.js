import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const yahooChartProxy = {
  '/__yahoo': {
    target: 'https://query1.finance.yahoo.com',
    changeOrigin: true,
    rewrite: (p) => p.replace(/^\/__yahoo/, ''),
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; FINVEST/1.0)')
      })
    },
  },
}

/**
 * Optional local fallback: proxy `/api` to BACKEND:3001. Express uses `/chat` (not `/api/chat`) — rewrite only that path.
 * For chat without BACKEND, use `vercel dev` in FRONTEND (runs `/api/chat` serverless locally).
 */
const backendProxy = {
  '/api': {
    target: 'http://127.0.0.1:3001',
    changeOrigin: true,
    rewrite: (path) =>
      path.startsWith('/api/chat') ? '/chat' + path.slice('/api/chat'.length) : path,
  },
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  // Expose legacy non-VITE env names used elsewhere in this repo so hosted and local auth
  // still work even when Supabase/Finnhub vars were entered under the backend-style names.
  envPrefix: ['VITE_', 'FINNHUB_', 'SUPABASE_'],
  plugins: [react()],
  server: {
    proxy: {
      // Yahoo chart JSON has no browser CORS; dev server proxies so 1D/1Y series work without a backend.
      ...yahooChartProxy,
      ...backendProxy,
    },
  },
  // `vite preview` runs production build locally; needs the same proxy as `npm run dev`.
  preview: {
    proxy: { ...yahooChartProxy, ...backendProxy },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Rolldown/Vite 8 can fail to resolve tslib from @supabase/* when hoisting is odd; vendor copy keeps builds reliable.
    alias: {
      tslib: path.resolve(__dirname, 'vendor/tslib/tslib.es6.mjs'),
      '@ml': path.resolve(__dirname, '../ML'),
    },
  },
})
