import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/account.css';

function displayNameFromUser(user) {
  if (!user) return 'Account';
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
}

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const name = displayNameFromUser(user);
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <nav role="navigation" aria-label="Main navigation">
      <div className="nav-inner flex items-center justify-between w-full">
        <div className="flex items-center gap-6">
          <span className="logo" onClick={scrollToTop}>Risk</span>
        </div>
        <ul className="nav-links" role="list">
          <li><a href="#what">What we do</a></li>
          <li><a href="#gs-section">Get started</a></li>
          <li><a href="#lm-section">Learn more</a></li>
          <li><a href="#ctaband">Contact</a></li>
        </ul>
        <div className="nav-account-slot" ref={accountRef}>
          {user ? (
            <>
              <button
                type="button"
                className="nav-cta nav-account-cta"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {avatar ? (
                  <img src={avatar} alt="" className="nav-account-thumb nav-account-thumb--cta" width={22} height={22} />
                ) : (
                  <span className="nav-account-initial nav-account-initial--cta" aria-hidden>
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="nav-account-cta-label">{name}&apos;s account</span>
              </button>
              {menuOpen ? (
                <div className="nav-account-menu" role="menu">
                  <Link to="/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Dashboard
                  </Link>
                  <Link to="/personalized-portfolio" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Portfolio AI
                  </Link>
                  <Link to="/account" role="menuitem" onClick={() => setMenuOpen(false)}>
                    Account &amp; photo
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      await signOut();
                      setMenuOpen(false);
                      navigate('/', { replace: true });
                    }}
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <Link to="/account" className="nav-cta" aria-label="Log in or sign up">
              Log in / Sign up
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
