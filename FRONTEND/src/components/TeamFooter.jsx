import React from 'react';

const TeamFooter = () => {
  return (
    <footer id="hack-footer" className="team-ft" role="contentinfo">
      <aside className="landing-disclaimer sw" aria-label="Educational disclaimer">
        <p className="landing-disclaimer__text rv">
          This platform is intended solely for <strong>educational and informational purposes</strong>. The content
          provided reflects general market analysis and should <strong>not</strong> be construed as investment advice.
          We are <strong>not registered with SEBI</strong>.
        </p>
      </aside>
      <div className="sw team-ft__inner">
        <p className="team-ft__name">Bandwagons</p>
        <p className="team-ft__members">Akshita · Saksham · Swagat · Pratham</p>
      </div>
    </footer>
  );
};

export default TeamFooter;
