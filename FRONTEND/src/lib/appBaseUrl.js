/**
 * Same-origin paths that respect Vite `base` (subpath deployments).
 * @param {string} path - e.g. `api/chat` or `/api/chat`
 */
export function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '');
  return `${base}${normalized}`;
}
