/**
 * @fileoverview Reads/writes `public.user_profiles` for the signed-in user.
 *
 * Prerequisites: run `Finvest/supabase/sql/001_user_profiles.sql` in the Supabase SQL Editor.
 * RLS ensures each user only sees/updates their own row (`user_id = auth.uid()`).
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Map fear score to the same investor label used on the dashboard UI.
 * @param {number} score
 */
export function classificationFromFearScore(score) {
  if (score < 30) return 'Risk-Tolerant';
  if (score < 50) return 'Growth-Seeker';
  if (score < 70) return 'Balanced';
  return 'Risk-Averse';
}

/**
 * Load the profile row for a user (0 or 1 row).
 * @param {string} userId - `auth.users.id`
 */
export async function fetchUserProfile(userId) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not configured') };
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return { data, error };
}

/**
 * Upsert a baseline row from the current Auth user (safe if trigger already inserted).
 * Call after login/session restore so `email` / `display_name` stay in sync.
 * @param {import('@supabase/supabase-js').User} user
 */
export async function ensureUserProfile(user) {
  if (!supabase || !user?.id) {
    return { error: null };
  }
  const displayName =
    (user.user_metadata && user.user_metadata.full_name) ||
    (user.user_metadata && user.user_metadata.name) ||
    '';
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: user.id,
      email: user.email ?? '',
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  return { error };
}

/**
 * Partial update for dashboard-driven fields (fear score, prefs, etc.).
 * @param {string} userId
 * @param {Record<string, unknown>} fields - subset of user_profiles columns
 */
export async function updateUserProfileFields(userId, fields) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not configured') };
  }
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .maybeSingle();
  return { data, error };
}

/**
 * Deep-merge `dashboard_prefs` JSONB (keeps unrelated keys; merges `assessment` if present).
 * @param {string} userId
 * @param {Record<string, unknown>} prefsPatch
 */
export async function mergeDashboardPrefs(userId, prefsPatch) {
  const { data: row, error: readErr } = await fetchUserProfile(userId);
  if (readErr) return { data: null, error: readErr };
  const prev =
    row?.dashboard_prefs && typeof row.dashboard_prefs === 'object' && !Array.isArray(row.dashboard_prefs)
      ? row.dashboard_prefs
      : {};
  const next = { ...prev };
  for (const [key, val] of Object.entries(prefsPatch)) {
    if (
      key === 'nft_badges' &&
      val &&
      typeof val === 'object' &&
      !Array.isArray(val)
    ) {
      const prevBadges =
        prev.nft_badges && typeof prev.nft_badges === 'object' && !Array.isArray(prev.nft_badges)
          ? prev.nft_badges
          : {};
      next.nft_badges = { ...prevBadges, ...val };
    } else {
      next[key] = val;
    }
  }
  return updateUserProfileFields(userId, { dashboard_prefs: next });
}
