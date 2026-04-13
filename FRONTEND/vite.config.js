import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { finvestLocalApi } from './vite-plugins/finvestLocalApi.js'

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
export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, __dirname, '')
  for (const k of Object.keys(loaded)) {
    if (process.env[k] === undefined) process.env[k] = loaded[k]
  }

  return {
    base: '/',
    // Expose legacy non-VITE env names used elsewhere in this repo so hosted and local auth
    // still work even when Supabase/Finnhub vars were entered under the backend-style names.
    envPrefix: ['VITE_', 'FINNHUB_', 'SUPABASE_'],
    // finvestLocalApi runs POST /api/chat + GET /api/market/* inside Vite (no BACKEND). Must run before react().
    plugins: [finvestLocalApi(), react()],
    server: {
      proxy: {
        ...yahooChartProxy,
      },
    },
    preview: {
      proxy: { ...yahooChartProxy },
    },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        tslib: path.resolve(__dirname, 'vendor/tslib/tslib.es6.mjs'),
      },
    },
  }
})
