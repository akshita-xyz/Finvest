import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    // Rolldown/Vite 8 can fail to resolve tslib from @supabase/* when hoisting is odd; vendor copy keeps builds reliable.
    alias: {
      tslib: path.resolve(__dirname, 'vendor/tslib/tslib.es6.mjs'),
    },
  },
})
