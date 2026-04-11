/**
 * @fileoverview Legacy route — unified account lives at `/account`.
 */

import { Navigate } from 'react-router-dom';

export default function SignupPage() {
  return <Navigate to="/account?mode=signup" replace />;
}
