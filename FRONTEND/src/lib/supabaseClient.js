/**
 * @fileoverview Browser-side Supabase singleton
 *
 * Why a separate file?
 * - Keeps credentials wiring in one place
 * - Avoids creating multiple GoTrue clients (each would fight over session storage)
 *
 * Environment
 * @see https://vitejs.dev/guide/env-and-mode.html
 *
 * In the project root (FRONTEND/), create `.env` (gitignored) with:
 *   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your_key_here
 *
 * Legacy repo setups may instead use:
 *   SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
 *   SUPABASE_ANON_KEY=your_key_here
 *
 * The second value can be the legacy **anon** JWT (`eyJ...`) or the newer **publishable** key (`sb_publishable_...`).
 *
 * Copy values from Supabase Dashboard under Project Settings, API.
 * Use the anon (public) key in the browser. Never the service_role key.
 */

import { createClient } from '@supabase/supabase-js';

/** @type {string | undefined} */
const rawUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL;
/** Trim and strip trailing slash so requests hit `https://ref.supabase.co` consistently (avoids subtle fetch issues). */
const supabaseUrl = rawUrl?.trim().replace(/\/+$/, '');
/** @type {string | undefined} */
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || import.meta.env.SUPABASE_ANON_KEY?.trim();

/**
 * True when both URL and anon key are present.
 * UI can show a friendly setup message instead of cryptic network errors.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() && supabaseAnonKey?.trim()
);

/** @param {string} jwt */
function decodeJwtPayloadUnsafe(jwt) {
  try {
    const mid = jwt.split('.')[1];
    if (!mid) return null;
    let b64 = mid.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

if (import.meta.env.DEV && isSupabaseConfigured && supabaseUrl && supabaseAnonKey?.startsWith('eyJ')) {
  const host = (() => {
    try {
      return new URL(supabaseUrl).hostname.replace(/\.supabase\.co$/i, '');
    } catch {
      return '';
    }
  })();
  const payload = decodeJwtPayloadUnsafe(supabaseAnonKey);
  const ref = typeof payload?.ref === 'string' ? payload.ref : '';
  if (host && ref && ref !== host) {
    console.warn(
      `[supabaseClient] VITE_SUPABASE_URL host "${host}" does not match anon JWT ref "${ref}". ` +
        'Copy both values from the same Supabase project (Settings, API), then restart the dev server.'
    );
  }
}

if (!isSupabaseConfigured) {
  console.warn(
    '[supabaseClient] Missing Supabase browser env vars. ' +
      'Set either VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY or SUPABASE_URL/SUPABASE_ANON_KEY in FRONTEND/.env. ' +
      'See `.env.example`.'
  );
}

/**
 * Shared Supabase client for the SPA.
 * `null` when env vars are missing (see `isSupabaseConfigured`).
 *
 * @type {import('@supabase/supabase-js').SupabaseClient | null}
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl.trim(), supabaseAnonKey.trim(), {
      auth: {
        // Persist session across reloads in the browser
        persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, // handles magic links / OAuth redirects
      }, })
  : null;
