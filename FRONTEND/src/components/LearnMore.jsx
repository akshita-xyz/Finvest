import React from 'react';

const LearnMore = ({ onOpenModal }) => {
  return (
    <section id="lm-section" aria-labelledby="lm-h">
      <div className="lm-inner sw">
        <p className="sl rv" style={{ color: '#333' }}>Why Risk</p>
        <h2 id="lm-h" className="st rv" style={{ color: 'var(--white)', transitionDelay: '0.1s' }}>
          Every edge.<br />Every market.
        </h2>
        <div className="lm-grid">
          <button className="lm-card rv" tabIndex="0" onClick={() => onOpenModal('m-ri')} style={{ transitionDelay: '0.05s' }}>
            <p className="lm-num">01</p>
            <p className="lm-title">Signal intelligence</p>
            <p className="lm-desc">
              400+ live feeds. Pattern recognition trained on 20 years of market history.
            </p>
            <div className="lm-arrow">
              <svg viewBox="0 0 10 10">
                <path d="M2 5h6M5 2l3 3-3 3" stroke="#555" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
          <button className="lm-card rv" tabIndex="0" onClick={() => onOpenModal('m-ps')} style={{ transitionDelay: '0.1s' }}>
            <p className="lm-num">02</p>
            <p className="lm-title">Stress testing</p>
            <p className="lm-desc">180+ crisis scenarios. Results in 800ms. Export for boards and regulators.</p>
            <div className="lm-arrow">
              <svg viewBox="0 0 10 10">
                <path d="M2 5h6M5 2l3 3-3 3" stroke="#555" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
          <button className="lm-card rv" tabIndex="0" onClick={() => onOpenModal('m-da')} style={{ transitionDelay: '0.15s' }}>
            <p className="lm-num">03</p>
            <p className="lm-title">Decision engine</p>
            <p className="lm-desc">
              Probability scores, move ranges, position sizing , aligned to your risk appetite.
            </p>
            <div className="lm-arrow">
              <svg viewBox="0 0 10 10">
                <path d="M2 5h6M5 2l3 3-3 3" stroke="#555" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
          <button className="lm-card rv" tabIndex="0" onClick={() => onOpenModal('m-vm')} style={{ transitionDelay: '0.2s' }}>
            <p className="lm-num">04</p>
            <p className="lm-title">Volatility surface</p>
            <p className="lm-desc">
              Live 3D landscape across equities, crypto, FX, and rates. Updated every 250ms.
            </p>
            <div className="lm-arrow">
              <svg viewBox="0 0 10 10">
                <path d="M2 5h6M5 2l3 3-3 3" stroke="#555" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        </div>
        <div className="lm-stat">
          <div className="lm-stat-item rv" style={{ transitionDelay: '0.05s' }}>
            <p className="lm-stat-n">42</p>
            <p className="lm-stat-l">Countries</p>
          </div>
          <div className="lm-stat-item rv" style={{ transitionDelay: '0.1s' }}>
            <p className="lm-stat-n">4.2 min</p>
            <p className="lm-stat-l">Signal lead time</p>
          </div>
          <div className="lm-stat-item rv" style={{ transitionDelay: '0.15s' }}>
            <p className="lm-stat-n">180+</p>
            <p className="lm-stat-l">Crisis scenarios</p>
          </div>
          <div className="lm-stat-item rv" style={{ transitionDelay: '0.2s' }}>
            <p className="lm-stat-n">SOC 2</p>
            <p className="lm-stat-l">Certified</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LearnMore;
