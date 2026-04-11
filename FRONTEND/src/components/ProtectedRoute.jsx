/**
 * @fileoverview Gate for routes that require a signed-in user
 *
 * - While auth is hydrating, shows a minimal loader (avoids flash of login form)
 * - If unauthenticated, redirects to `/account` (optional `state.from` for post-login return)
 *
 * Usage in `App.jsx`:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/auth.css';

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-page" role="status" aria-live="polite">
        <div className="auth-card auth-card--narrow">
          <p className="auth-muted">Checking session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/account" replace state={{ from: location }} />;
  }

  return children;
}
