import React from 'react';

const Navbar = ({ onOpenModal }) => {
  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav role="navigation" aria-label="Main navigation">
      <div className="nav-inner">
        <span className="logo" onClick={scrollToTop}>Risk</span>
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
