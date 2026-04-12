import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the window to the top when the route changes (React Router does not do this by default).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return null;
}
