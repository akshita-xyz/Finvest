import React from 'react';

const WhatWeDo = () => {
  return (
    <section id="what" aria-labelledby="what-h">
      <div className="sw">
        <p className="sl rv">What we do</p>
        <h2 id="what-h" className="st rv" style={{ transitionDelay: '0.1s' }}>
          Four pillars of risk mastery.
        </h2>
        <div className="grid">
          <div className="card rv" style={{ transitionDelay: '0.05s' }}>
            <p className="cn">Signal Intelligence</p>
            <p className="ct">400+ live feeds</p>
            <p className="cd">
              Pattern recognition trained on 20 years of market history. Anomalies surface before they register.
            </p>
          </div>
          <div className="card rv" style={{ transitionDelay: '0.1s' }}>
            <p className="cn">Stress Testing</p>
            <p className="ct">180+ scenarios</p>
            <p className="cd">
              Historical crisis scenarios run in 800ms. Export for boards and regulators instantly.
            </p>
          </div>
          <div className="card rv" style={{ transitionDelay: '0.15s' }}>
            <p className="cn">Decision Engine</p>
            <p className="ct">Probability scores</p>
            <p className="cd">
              Move ranges, position sizing — aligned to your risk appetite and portfolio constraints.
            </p>
          </div>
          <div className="card rv" style={{ transitionDelay: '0.2s' }}>
            <p className="cn">Volatility Surface</p>
            <p className="ct">Live 3D landscape</p>
            <p className="cd">
              Across equities, crypto, FX, and rates. Updated every 250ms with full market depth.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatWeDo;
