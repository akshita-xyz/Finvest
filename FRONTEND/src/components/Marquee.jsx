import React from 'react';

const Marquee = () => {
  return (
    <section id="mq" className="parallax-container" aria-label="Featured highlights">
      {/* Far background layer */}
      <div className="parallax-layer bg-far" id="mq-marquee-far"></div>
      {/* Mid background layer */}
      <div className="parallax-layer bg-mid" id="mq-marquee-mid"></div>
      {/* Content */}
      <div className="mqr">
        <span>RISK</span>
        <span className="lit">MASTERY</span>
        <span>REAL-TIME</span>
        <span className="lit">INTELLIGENCE</span>
        <span>AUTOMATED</span>
        <span className="lit">EXECUTION</span>
        <span>RISK</span>
        <span className="lit">MASTERY</span>
        <span>REAL-TIME</span>
        <span className="lit">INTELLIGENCE</span>
      </div>
      <div className="mqr rev">
        <span className="lit">SIGNAL EDGE</span>
        <span>STRESS TEST</span>
        <span className="lit">DECISION ENGINE</span>
        <span>VOLATILITY SURFACE</span>
        <span className="lit">SIGNAL EDGE</span>
        <span>STRESS TEST</span>
        <span className="lit">DECISION ENGINE</span>
        <span>VOLATILITY SURFACE</span>
      </div>
    </section>
  );
};

export default Marquee;
