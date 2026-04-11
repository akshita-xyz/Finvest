/**
 * @fileoverview Supabase Auth provider — session restore + `onAuthStateChange`.
 *
 * Wrap once inside `BrowserRouter` (see `main.jsx`). Consume with `useAuth` from `../hooks/useAuth`.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import { ensureUserProfile } from '../services/userProfileService';

/** @typedef {import('@supabase/supabase-js').User} User */
/** @typedef {import('@supabase/supabase-js').Session} Session */
/** @typedef {import('@supabase/supabase-js').AuthError} AuthError */

/**
 * @typedef {Object} AuthContextValue
 * @property {User | null} user
 * @property {Session | null} session
 * @property {boolean} loading — true until first `getSession` resolves (skipped when Supabase is not configured)
 * @property {boolean} configured — mirrors `isSupabaseConfigured`
 * @property {(email: string, password: string) => Promise<{ error: AuthError | null }>} signInWithPassword
 * @property {(email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null, needsEmailConfirmation?: boolean }>} signUpWithPassword
 * @property {() => Promise<{ error: AuthError | null }>} signOut
 * @property {(data: Record<string, unknown>) => Promise<{ error: AuthError | null, user: User | null }>} updateUserMetadata
 */

function notConfiguredError() {
  /** @type {AuthError} */
  const synthetic = {
    name: 'ConfigError',
    message:
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to FRONTEND/.env (see .env.example).',
  };
  return synthetic;
}

/**
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(/** @type {User | null} */ (null));
  const [session, setSession] = useState(/** @type {Session | null} */ (null));
  // No Supabase client → nothing to hydrate; avoid synchronous setState in an effect (react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(() => Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (cancelled) return;
      setSession(s ?? null);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Keep `public.user_profiles` in sync with Auth (email, display name). Safe if DB trigger already inserted a row.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    ensureUserProfile(user).then(({ error }) => {
      if (error && !cancelled) {
        console.warn('[AuthProvider] ensureUserProfile:', error.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps -- keyed by id; avoids upsert spam on token refresh

  const signInWithPassword = useCallback(async (email, password) => {
    if (!supabase) {
      return { error: notConfiguredError() };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  const signUpWithPassword = useCallback(
    async (email, password, metadata = {}) => {
      if (!supabase) {
        return { error: notConfiguredError(), needsEmailConfirmation: false };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata },
      });
      if (error) {
        return { error, needsEmailConfirmation: false };
      }
      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return { error: null, needsEmailConfirmation };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) {
      return { error: notConfiguredError() };
    }
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  /** Merges into `user_metadata` (e.g. `avatar_url`, `full_name`). Returns updated user on success. */
  const updateUserMetadata = useCallback(async (/** @type {Record<string, unknown>} */ data) => {
    if (!supabase) {
      return { error: notConfiguredError(), user: null };
    }
    const { data: res, error } = await supabase.auth.updateUser({ data });
    if (error) return { error, user: null };
    const next = res?.user ?? null;
    if (next) setUser(next);
    return { error: null, user: next };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      configured: isSupabaseConfigured,
      signInWithPassword,
      signUpWithPassword,
      signOut,
      updateUserMetadata,
    }),
    [user, session, loading, signInWithPassword, signUpWithPassword, signOut, updateUserMetadata]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
