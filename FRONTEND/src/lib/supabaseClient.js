/**
 * @fileoverview Browser-side Supabase singleton
 *
 * Why a separate file?
 * - Keeps credentials wiring in one place
 * - Avoids creating multiple GoTrue clients (each would fight over session storage)
 *
 * Environment (Vite exposes only variables prefixed with VITE_)
 * @see https://vitejs.dev/guide/env-and-mode.html
 *
 * In the project root (FRONTEND/), create `.env` (gitignored) with:
 *   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your_key_here
 *
 * The second value can be the legacy **anon** JWT (`eyJ...`) or the newer **publishable** key (`sb_publishable_...`).
 *
 * Copy values from Supabase Dashboard → Project Settings → API.
 * Use the anon (public) key in the browser — never the service_role key.
 */

import { createClient } from '@supabase/supabase-js';

/** @type {string | undefined} */
const rawUrl = import.meta.env.VITE_SUPABASE_URL;
/** Trim and strip trailing slash so requests hit `https://ref.supabase.co` consistently (avoids subtle fetch issues). */
const supabaseUrl = rawUrl?.trim().replace(/\/+$/, '');
/** @type {string | undefined} */
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * True when both URL and anon key are present.
 * UI can show a friendly setup message instead of cryptic network errors.
 */
export const isSupabaseConfigured = Boolean(
  supabaseUrl?.trim() && supabaseAnonKey?.trim()
);

if (!isSupabaseConfigured) {
  console.warn(
    '[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Auth requests will fail until you add a `.env` file in FRONTEND/. See `.env.example`.'
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
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true, // handles magic links / OAuth redirects
      },
    })
  : null;
