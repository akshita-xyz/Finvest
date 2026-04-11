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

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  // Expose FINNHUB_* so Vercel env name `FINNHUB_API_KEY` works (Vite only sends VITE_* to the client by default).
  envPrefix: ['VITE_', 'FINNHUB_'],
  plugins: [react()],
  server: {
    proxy: {
      // Yahoo chart JSON has no browser CORS; dev server proxies so 1D/1Y series work without a backend.
      ...yahooChartProxy,
    },
  },
  // `vite preview` runs production build locally — needs the same proxy as `npm run dev`.
  preview: {
    proxy: { ...yahooChartProxy },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Rolldown/Vite 8 can fail to resolve tslib from @supabase/* when hoisting is odd; vendor copy keeps builds reliable.
    alias: {
      tslib: path.resolve(__dirname, 'vendor/tslib/tslib.es6.mjs'),
    },
  },
})
