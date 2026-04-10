import React from 'react';

const CtaBand = ({ onOpenModal }) => {
  return (
    <section id="ctaband" aria-labelledby="cta-h">
      <div className="cbi">
        <h2 id="cta-h" className="cbig rv">
          Ready to<br /><em>master</em><br />the outcome?
        </h2>
        <p className="csub rv" style={{ transitionDelay: '0.1s' }}>
          Join 3,400+ traders who stopped guessing and started winning.
        </p>
        <div className="cbtns rv" style={{ transitionDelay: '0.2s' }}>
          <button className="btn-p" onClick={() => onOpenModal('m-gs')}><span>Start free trial</span></button>
          <button className="btn-g" onClick={() => onOpenModal('m-lm')}><span>See how it works</span></button>
        </div>
      </div>
    </section>
  );
};

export default CtaBand;
