import React from 'react';

const Modals = ({ activeModal, onClose, onOpenModal }) => {
  React.useEffect(() => {
    if (!activeModal) return;

    const handleKeyPress = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = '';
    };
  }, [activeModal, onClose]);

  if (!activeModal) return null;

  const handleClose = (e) => {
    if (e.target.classList.contains('mo')) {
      onClose();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Details submitted successfully!");
    onClose();
  };

  return (
    <>
      <div className={`mo ${activeModal === 'm-gs' ? 'open' : ''}`} id="m-gs" role="dialog" aria-modal="true" aria-labelledby="mgs-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="mgs-t">Get started</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              Create your free account and access the full Risk platform from day one. No credit card required.
            </p>
            <form className="gform" style={{ marginTop: 0 }} onSubmit={handleSubmit}>
              <input type="text" placeholder="Full name" aria-label="Full name" required />
              <input type="email" placeholder="Work email" aria-label="Work email" required />
              <select aria-label="Company size" required defaultValue="">
                <option value="" disabled>Company size</option>
                <option value="1-10">1–10</option>
                <option value="11-50">11–50</option>
                <option value="51-200">51–200</option>
                <option value="200+">200+</option>
              </select>
              <div className="mf" style={{ padding: '20px 0 0 0' }}>
                <button type="button" className="btn-g mc" onClick={onClose}><span>Cancel</span></button>
                <button type="submit" className="btn-p"><span>Create account →</span></button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className={`mo ${activeModal === 'm-lm' ? 'open' : ''}`} id="m-lm" role="dialog" aria-modal="true" aria-labelledby="mlm-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="mlm-t">Learn more</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              Risk is a real-time platform that turns market complexity into clear, executable decisions — live data ingestion, probabilistic modelling, and automated execution in one layer.
            </p>
            <p>
              Used by hedge funds, prop desks, and institutional traders across 42 countries. Every signal visible and ranked within 12ms.
            </p>
            <p>
              Average signal lead time: 4.2 minutes ahead of price movement. 180+ historical crisis scenarios available instantly.
            </p>
          </div>
          <div className="mf">
            <button className="btn-g mc" onClick={onClose}><span>Close</span></button>
            <button className="btn-p" onClick={() => { onClose(); onOpenModal('m-gs'); }}><span>Get started →</span></button>
          </div>
        </div>
      </div>

      <div className={`mo ${activeModal === 'm-demo' ? 'open' : ''}`} id="m-demo" role="dialog" aria-modal="true" aria-labelledby="md-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="md-t">Request a demo</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              A 30-minute live walkthrough tailored to your portfolio and risk profile. A specialist will walk you through real scenarios on live data.
            </p>
            <form className="gform" style={{ marginTop: 0 }} onSubmit={handleSubmit}>
              <input type="text" placeholder="Full name" aria-label="Full name" required />
              <input type="email" placeholder="Work email" aria-label="Work email" required />
              <input type="text" placeholder="Biggest risk challenge" aria-label="Challenge" required />
              <div className="mf" style={{ padding: '20px 0 0 0' }}>
                <button type="button" className="btn-g mc" onClick={onClose}><span>Cancel</span></button>
                <button type="submit" className="btn-p"><span>Book demo →</span></button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div className={`mo ${activeModal === 'm-ri' ? 'open' : ''}`} id="m-ri" role="dialog" aria-modal="true" aria-labelledby="mri-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="mri-t">Risk intelligence</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              Our proprietary signal engine monitors 400+ live data sources — options flow, dark pool prints, macro releases, sentiment — simultaneously. Pattern recognition models trained on two decades of market history surface anomalies before they register on traditional indicators.
            </p>
            <p>Average signal lead time: 4.2 minutes ahead of price movement.</p>
          </div>
          <div className="mf">
            <button className="btn-g mc" onClick={onClose}><span>Close</span></button>
            <button className="btn-p" onClick={() => { onClose(); onOpenModal('m-gs'); }}><span>Get started →</span></button>
          </div>
        </div>
      </div>

      <div className={`mo ${activeModal === 'm-ps' ? 'open' : ''}`} id="m-ps" role="dialog" aria-modal="true" aria-labelledby="mps-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="mps-t">Portfolio stress testing</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              Upload any portfolio. Run it through 180+ historical crisis scenarios in under 800ms. See how your positions would have performed in 2008, 2020, and every major drawdown since 1995.
            </p>
            <p>Export stress test results as PDF for board presentations and regulatory filings.</p>
          </div>
          <div className="mf">
            <button className="btn-g mc" onClick={onClose}><span>Close</span></button>
            <button className="btn-p" onClick={() => { onClose(); onOpenModal('m-gs'); }}><span>Get started →</span></button>
          </div>
        </div>
      </div>

      <div className={`mo ${activeModal === 'm-da' ? 'open' : ''}`} id="m-da" role="dialog" aria-modal="true" aria-labelledby="mda-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="mda-t">Decision engine</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              Probability-weighted recommendations ranked by expected value. Position sizing aligned to your risk appetite. Move ranges and exit signals for every trade.
            </p>
            <p>
              Integrate with your OMS via REST API or FIX protocol. Strategies can execute automatically at machine speed.
            </p>
          </div>
          <div className="mf">
            <button className="btn-g mc" onClick={onClose}><span>Close</span></button>
            <button className="btn-p" onClick={() => { onClose(); onOpenModal('m-gs'); }}><span>Get started →</span></button>
          </div>
        </div>
      </div>

      <div className={`mo ${activeModal === 'm-vm' ? 'open' : ''}`} id="m-vm" role="dialog" aria-modal="true" aria-labelledby="mvm-t" onClick={handleClose}>
        <div className="md">
          <div className="mh">
            <h3 id="mvm-t">Volatility surface</h3>
            <button className="mx" aria-label="Close" onClick={onClose}>✕</button>
          </div>
          <div className="mb">
            <p>
              Live 3D volatility landscape across equities, crypto, FX, and rates. Updated every 250ms with full market depth. Identify skew anomalies, term structure shifts, and correlation breaks instantly.
            </p>
            <p>Export surface snapshots for risk committee meetings and strategy reviews.</p>
          </div>
          <div className="mf">
            <button className="btn-g mc" onClick={onClose}><span>Close</span></button>
            <button className="btn-p" onClick={() => { onClose(); onOpenModal('m-gs'); }}><span>Get started →</span></button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modals;
