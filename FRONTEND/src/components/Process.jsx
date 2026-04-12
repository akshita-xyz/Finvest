import React from 'react';

const Process = () => {
  return (
    <section id="process" aria-labelledby="proc-h">
      <div className="sw">
        <p className="sl rv">How it works</p>
        <h2 id="proc-h" className="st rv" style={{ transitionDelay: '0.1s' }}>
          From signal to decision.
        </h2>
        <div className="pg">
          <div className="pi rv" style={{ transitionDelay: '0.05s' }}>
            <p className="ps">Step 01</p>
            <p className="pt">Ingest</p>
            <p className="pd">
              Connect market feeds, portfolios, and third-party signals in minutes with zero-config connectors.
            </p>
          </div>
          <div className="pi rv" style={{ transitionDelay: '0.12s' }}>
            <p className="ps">Step 02</p>
            <p className="pt">Analyse</p>
            <p className="pd">
              Our engine processes millions of data points in real time, surfacing patterns and anomalies instantly.
            </p>
          </div>
          <div className="pi rv" style={{ transitionDelay: '0.19s' }}>
            <p className="ps">Step 03</p>
            <p className="pt">Model</p>
            <p className="pd">
              Probabilistic models generate a full distribution of outcomes across your defined risk scenarios.
            </p>
          </div>
          <div className="pi rv" style={{ transitionDelay: '0.26s' }}>
            <p className="ps">Step 04</p>
            <p className="pt">Act</p>
            <p className="pd">
              Receive ranked action recommendations , or let the system execute automatically at machine speed.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
