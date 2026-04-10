import React from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

const Navbar = ({ onOpenModal }) => {
  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav role="navigation" aria-label="Main navigation">
      <div className="nav-inner flex items-center justify-between w-full">
        <div className="flex items-center gap-6">
          <span className="logo" onClick={scrollToTop}>Risk</span>
          <Link to="/dashboard" className="dashboard-link" aria-label="Open dashboard preview">
            <LayoutDashboard size={20} />
            <span className="dashboard-link__label">Dashboard Preview</span>
          </Link>
        </div>
        <ul className="nav-links" role="list">
          <li><a href="#what">What we do</a></li>
          <li><a href="#gs-section">Get started</a></li>
          <li><a href="#lm-section">Learn more</a></li>
          <li><a href="#ctaband">Contact</a></li>
        </ul>
        <button className="nav-cta" onClick={() => onOpenModal('m-gs')}>Get started</button>
      </div>
    </nav>
  );
};

export default Navbar;
