import React from 'react';

const MarqueeTracker = () => {
  return (
    <section id="mq-wrapper" className="parallax-container">
      <div className="parallax-layer bg-far" id="mq-layer-far"></div>
      <div className="parallax-layer bg-mid" id="mq-layer-mid"></div>
      <div className="ticker" role="marquee" aria-label="Live market data">
        <div className="ticker-track">
          <span>● <b>SIGNAL LEAD TIME</b> 4.2 min ahead</span>
          <span>● <b>STRESS TEST</b> 180+ scenarios in 800ms</span>
          <span>● <b>LATENCY</b> 12ms average</span>
          <span>● <b>COVERAGE</b> 42 countries</span>
          <span>● <b>SIGNAL LEAD TIME</b> 4.2 min ahead</span>
          <span>● <b>STRESS TEST</b> 180+ scenarios in 800ms</span>
          <span>● <b>LATENCY</b> 12ms average</span>
          <span>● <b>COVERAGE</b> 42 countries</span>
        </div>
      </div>
    </section>
  );
};

export default MarqueeTracker;
