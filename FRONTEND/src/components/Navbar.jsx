import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, createElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Info, ListOrdered, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import '../styles/account.css';

const NAV_ITEMS = [
  { id: 'hero', href: '#hero', label: 'Home', Icon: Home },
  { id: 'about', href: '#about', label: 'About', Icon: Info },
  { id: 'hack-workflow', href: '#hack-workflow', label: 'Workflow', Icon: ListOrdered },
  { id: 'why-us', href: '#why-us', label: 'Why us', Icon: Sparkles },
];

const NAV_IDS = NAV_ITEMS.map((item) => item.id);

const iconProps = { size: 16, strokeWidth: 1.75, className: 'nav-landing__link-icon', 'aria-hidden': true };

function displayNameFromUser(user) {
  if (!user) return 'Account';
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'Account';
}

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  const [activeSection, setActiveSection] = useState(/** @type {string} */ (NAV_IDS[0]));
  const [hoverSection, setHoverSection] = useState(/** @type {string | null} */ (null));

  const trackRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const pillRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const linkRefs = useRef(/** @type {Record<string, HTMLAnchorElement | null>} */ ({}));

  const pillTarget = hoverSection ?? activeSection;

  const syncPill = useCallback(() => {
    const track = trackRef.current;
    const pill = pillRef.current;
    const id = pillTarget;
    const link = id ? linkRefs.current[id] : null;
    if (!track || !pill) return;

    if (!link || window.matchMedia('(max-width: 580px)').matches) {
      pill.style.opacity = '0';
      pill.style.width = '0px';
      pill.style.transform = 'translate3d(0, -50%, 0)';
      return;
    }

    const tr = track.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    const x = lr.left - tr.left;
    const w = lr.width;

    pill.style.opacity = '1';
    pill.style.width = `${w}px`;
    pill.style.transform = `translate3d(${x}px, -50%, 0)`;
  }, [pillTarget]);

  useLayoutEffect(() => {
    syncPill();
  }, [syncPill]);

  useEffect(() => {
    const onResize = () => syncPill();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [syncPill]);

  const updateActiveFromScroll = useCallback(() => {
    const line = window.scrollY + Math.min(160, window.innerHeight * 0.22);
    let current = NAV_IDS[0];
    for (const id of NAV_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.offsetTop <= line) current = id;
    }
    setActiveSection(current);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => updateActiveFromScroll());
    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', updateActiveFromScroll);
    };
  }, [updateActiveFromScroll]);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const name = displayNameFromUser(user);
  const avatar = user?.user_metadata?.avatar_url;

  return (
    <nav className="nav-landing" role="navigation" aria-label="Main navigation">
      <div className="nav-landing__wrap">
        <div className="nav-landing__glass">
          <div className="nav-landing__inner">
            <button type="button" className="nav-landing__logo nav-landing__logo--text" onClick={scrollToTop} aria-label="Finvest — scroll to top">
              Finvest
            </button>

            <div
              className="nav-landing__track"
              ref={trackRef}
              onMouseLeave={() => setHoverSection(null)}
            >
              <div className="nav-landing__pill" ref={pillRef} aria-hidden />
              <ul className="nav-links nav-landing__links" role="list">
                {NAV_ITEMS.map(({ id, href, label, Icon }) => {
                  const isPill = pillTarget === id;
                  return (
                    <li key={id}>
                      <a
                        href={href}
                        aria-label={label}
                        aria-current={activeSection === id && !hoverSection ? 'location' : undefined}
                        ref={(el) => {
                          linkRefs.current[id] = el;
                        }}
                        className={isPill ? 'is-pill-target' : undefined}
                        data-nav-id={id}
                        onMouseEnter={() => setHoverSection(id)}
                        onFocus={() => setHoverSection(id)}
                        onBlur={() => {
                          requestAnimationFrame(() => {
                            if (!trackRef.current?.contains(document.activeElement)) {
                              setHoverSection(null);
                            }
                          });
                        }}
                      >
                        {createElement(Icon, iconProps)}
                        <span>{label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="nav-account-slot nav-landing__account" ref={accountRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    className="nav-cta nav-account-cta nav-landing__cta nav-landing__cta--account"
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
                    <div className="nav-account-menu nav-landing__account-menu" role="menu">
                      <Link to="/account" role="menuitem" onClick={() => setMenuOpen(false)}>
                        My profile
                      </Link>
                      <Link to="/dashboard" role="menuitem" onClick={() => setMenuOpen(false)}>
                        Dashboard
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
                <Link to="/account" className="nav-cta nav-landing__cta" aria-label="Log in or sign up">
                  Log in / Sign up
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
