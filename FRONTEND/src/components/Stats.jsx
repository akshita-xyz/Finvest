import React from 'react';

const Stats = () => {
  return (
    <section id="stats" aria-label="Platform statistics">
      <div className="si">
        <div className="sb rv" style={{ transitionDelay: '0.05s' }}>
          <p className="sn">42</p>
          <p className="sl2">Countries</p>
        </div>
        <div className="sb rv" style={{ transitionDelay: '0.1s' }}>
          <p className="sn">4.2 min</p>
          <p className="sl2">Signal lead time</p>
        </div>
        <div className="sb rv" style={{ transitionDelay: '0.15s' }}>
          <p className="sn">180+</p>
          <p className="sl2">Crisis scenarios</p>
        </div>
        <div className="sb rv" style={{ transitionDelay: '0.2s' }}>
          <p className="sn">SOC 2</p>
          <p className="sl2">Certified</p>
        </div>
      </div>
    </section>
  );
};

export default Stats;
