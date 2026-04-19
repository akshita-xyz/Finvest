/**
 * Dev-only: run FRONTEND/api/*.js handlers inside Vite so `npm run dev` exposes /api/* identically to Vercel.
 * Production uses Vercel serverless; this plugin uses `apply: 'serve'` and is skipped for build.
 */
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = path.resolve(__dirname, '..')

/**
 * Vercel adds Express-like helpers; raw Node ServerResponse does not — patch for local dev.
 * @param {import('http').ServerResponse} res
 */
function patchResponse(res) {
  if (res.__finvestExpress) return
  Object.defineProperty(res, '__finvestExpress', { value: true, enumerable: false })
  res.status = function status(code) {
    this.statusCode = code
    return this
  }
  res.json = function json(obj) {
    if (!this.headersSent) {
      this.setHeader('Content-Type', 'application/json; charset=utf-8')
    }
    this.end(JSON.stringify(obj))
  }
  res.send = function send(body) {
    if (Buffer.isBuffer(body)) {
      this.end(body)
      return
    }
    this.end(typeof body === 'string' ? body : String(body))
  }
}

/** @param {import('http').IncomingMessage} req */
function attachQueryFromUrl(req) {
  const raw = req.url || '/'
  const qIdx = raw.indexOf('?')
  const search = qIdx >= 0 ? raw.slice(qIdx) : ''
  const sp = new URLSearchParams(search)
  /** @type {Record<string, string>} */
  const q = {}
  for (const [k, v] of sp.entries()) q[k] = v
  req.query = q
}

/**
 * Dev-only fresh import: appends the file's mtime to the module URL so Node's
 * ESM loader doesn't hand back a stale cached copy after you edit api/*.js.
 * In production (Vercel) none of this runs — each invocation is cold.
 * @param {string} absFilePath
 * @returns {Promise<any>}
 */
async function freshImport(absFilePath) {
  let version = 't' + Date.now()
  try {
    const stat = fs.statSync(absFilePath)
    version = 'v' + stat.mtimeMs
  } catch {
    // file missing — let the import itself surface the error
  }
  const url = pathToFileURL(absFilePath).href + `?${version}`
  return import(/* @vite-ignore */ url)
}

export function finvestLocalApi() {
  return {
    name: 'finvest-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const pathname = (req.url || '').split('?')[0] || ''

          if (req.method === 'POST' && pathname === '/api/chat') {
            patchResponse(res)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'chat.js')
            )
            await handler(req, res)
            return
          }

          if (req.method === 'POST' && pathname === '/api/voice') {
            patchResponse(res)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'voice.js')
            )
            await handler(req, res)
            return
          }

          if (req.method === 'POST' && pathname === '/api/voice-transcribe') {
            patchResponse(res)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'voice-transcribe.js')
            )
            await handler(req, res)
            return
          }

          if (req.method === 'POST' && pathname === '/api/rag-embed') {
            patchResponse(res)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'rag-embed.js')
            )
            await handler(req, res)
            return
          }

          if (req.method === 'POST' && pathname === '/api/rag-chat') {
            patchResponse(res)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'rag-chat.js')
            )
            await handler(req, res)
            return
          }

          if (req.method === 'POST' && pathname === '/api/cert-issue') {
            patchResponse(res)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'cert-issue.js')
            )
            await handler(req, res)
            return
          }

          if (req.method === 'GET' && pathname.startsWith('/api/market/yahoo-chart')) {
            patchResponse(res)
            attachQueryFromUrl(req)
            const { default: handler } = await freshImport(
              path.join(FRONTEND_ROOT, 'api', 'market', 'yahoo-chart.js')
            )
            await handler(req, res)
            return
          }
        } catch (e) {
          console.error('[finvest-local-api]', e)
        }
        next()
      })
    },
  }
}
