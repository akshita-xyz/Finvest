/**
 * @fileoverview Legacy route — unified account lives at `/account`.
 */

import { Navigate } from 'react-router-dom';

export default function LoginPage() {
  return <Navigate to="/account?mode=signin" replace />;
}
