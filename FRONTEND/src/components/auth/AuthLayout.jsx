/**
 * @fileoverview Shared chrome for login / signup pages
 *
 * Keeps typography and layout consistent; individual pages pass `title`, `subtitle`, and `children`.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import '../../styles/auth.css';

/**
 * @param {{
 *   title: string;
 *   subtitle?: string;
 *   children: React.ReactNode;
 *   footer?: React.ReactNode;
 * }} props
 */
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-brand">
          ← Back to home
        </Link>
        <h1 className="auth-title">{title}</h1>
        {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        {children}
        {footer ? <div className="auth-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
