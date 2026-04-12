import React, { useState } from 'react';

const GetStarted = () => {
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', companyName: '', role: '', aum: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.firstName.trim().length < 2) {
      alert('Please enter a valid first name');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      alert('Please enter a valid work email');
      return;
    }
    
    // Process form
    console.log("Form Submitted", formData);
    alert('Account setup initiated!');
  };

  return (
    <section id="gs-section" aria-labelledby="gs-h">
      <div className="gs-inner sw">
        <div className="gs-text rv">
          <p className="sl">Ready to begin</p>
          <h2 id="gs-h" className="st">Everything you need to master risk.</h2>
          <p>
            Start with a free account and access the full platform. No credit card. No commitment. Just clarity.
          </p>
          <div className="gs-features">
            <div className="gs-feat rv" style={{ transitionDelay: '0.06s' }}>
              <div className="gs-feat-icon">
                <svg viewBox="0 0 16 16">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 2a5 5 0 110 10A5 5 0 018 3zm-.5 2v3.25l2.5 1.5.5-.86-2-.5V5h-1z" />
                </svg>
              </div>
              <div className="gs-feat-body">
                <p className="ft">Real-time monitoring</p>
                <p className="fd">Live signals across 400+ data sources, updated every 250ms.</p>
              </div>
            </div>
            <div className="gs-feat rv" style={{ transitionDelay: '0.12s' }}>
              <div className="gs-feat-icon">
                <svg viewBox="0 0 16 16">
                  <path d="M2 2h12v9H2zm1 1v7h10V3zm1 9h8v1H4zm2-6h4v1H6zm0 2h6v1H6z" />
                </svg>
              </div>
              <div className="gs-feat-body">
                <p className="ft">Stress test any portfolio</p>
                <p className="fd">180+ historical crisis scenarios run in under 800ms.</p>
              </div>
            </div>
            <div className="gs-feat rv" style={{ transitionDelay: '0.18s' }}>
              <div className="gs-feat-icon">
                <svg viewBox="0 0 16 16">
                  <path d="M13 2H3a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V3a1 1 0 00-1-1zm-1 10H4V4h8v8zm-5-6l2 2-2 2 1 1 3-3-3-3z" />
                </svg>
              </div>
              <div className="gs-feat-body">
                <p className="ft">Automated execution</p>
                <p className="fd">Connect your OMS via REST or FIX. Strategies fire at machine speed.</p>
              </div>
            </div>
            <div className="gs-feat rv" style={{ transitionDelay: '0.24s' }}>
              <div className="gs-feat-icon">
                <svg viewBox="0 0 16 16">
                  <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 1a5 5 0 110 10A5 5 0 018 3zm-.5 3a.5.5 0 011 0v3.5l2 1-.5.87-2.5-1.37z" />
                </svg>
              </div>
              <div className="gs-feat-body">
                <p className="ft">12ms average latency</p>
                <p className="fd">Industry-leading speed from ingestion to recommendation.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="gs-form-wrap rv" style={{ transitionDelay: '0.2s' }}>
          <p className="gf-label">Free account</p>
          <p className="gf-title">Start in 60 seconds.</p>
          <form className="gform" onSubmit={handleSubmit}>
            <div className="gform-row">
              <input type="text" name="firstName" placeholder="First name" aria-label="First name" value={formData.firstName} onChange={handleChange} />
              <input type="text" name="lastName" placeholder="Last name" aria-label="Last name" value={formData.lastName} onChange={handleChange} />
            </div>
            <input type="email" name="email" placeholder="Work email" aria-label="Work email" value={formData.email} onChange={handleChange} />
            <input type="text" name="companyName" placeholder="Company / fund name" aria-label="Company" value={formData.companyName} onChange={handleChange} />
            <select name="role" aria-label="Role" value={formData.role} onChange={handleChange}>
              <option value="" disabled>Your role</option>
              <option value="Portfolio manager">Portfolio manager</option>
              <option value="Risk analyst">Risk analyst</option>
              <option value="Quantitative trader">Quantitative trader</option>
              <option value="Compliance officer">Compliance officer</option>
              <option value="Other">Other</option>
            </select>
            <select name="aum" aria-label="Assets under management" value={formData.aum} onChange={handleChange}>
              <option value="" disabled>Assets under management</option>
              <option value="Under $1M">Under $1M</option>
              <option value="$1M to $10M">$1M to $10M</option>
              <option value="$10M to $100M">$10M to $100M</option>
              <option value="$100M+">$100M+</option>
            </select>
            <button type="submit" className="btn-p gform-submit" style={{ width: '100%', marginTop: '4px' }}>
              <span>Create free account</span>
            </button>
            <p className="gform-note">
              No credit card required · Cancel anytime · SOC 2 certified
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default GetStarted;
