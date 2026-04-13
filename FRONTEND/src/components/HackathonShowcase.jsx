import React from 'react';
import { Link } from 'react-router-dom';
import WorkflowZigzag from './WorkflowZigzag';
import InvestingStoriesSlideshow from './InvestingStoriesSlideshow';
import { setGuestMode } from '../lib/guestMode';

const workflowSteps = [
  {
    n: '01', t: 'Profile & goals', d: 'Salary, life goals (car, travel, retirement), and whether you want to play safe, mid, or risky.', }, {
    n: '02', t: 'Signals & fear score', d: 'Response timing and hesitation patterns map to patience vs. reactivity , feeding a 1 to 100 fear score.', }, {
    n: '03', t: 'ML cluster & hints', d: 'Risk-averse, balanced, overconfident, and more , with nudges tuned to how people like you behave.', }, {
    n: '04', t: 'Sandbox & loss meter', d: 'Stress inflation, crashes, and volatility before real capital , with a loss probability readout.', }, {
    n: '05', t: 'Explain & monitor', d: '“Explain like I’m 15” chat, live market context, news, and portfolio tracking via platform APIs.', },
];

const sellingPoints = [
  {
    h: 'Fear-first, not feature-first', p: 'We treat “investing fear” as the problem , not a footnote. Context and simulation come before capital.', }, {
    h: 'Personal, not generic', p: 'Behavioral timing, clustering, goals, and risk stance converge into one AI-shaped portfolio narrative per user.', }, {
    h: 'Practice before exposure', p: 'A risk stimulation sandbox lets loss feel real in pixels first , so real money feels considered, not impulsive.', },
];

const HackathonShowcase = () => {
  return (
    <>
      <section id="about" className="hack-sec" aria-labelledby="about-h">
        <div className="sw">
          <h2 id="about-h" className="hack-h2 rv" style={{ transitionDelay: '0.06s' }}>
            Investing fear , and how we confront it
          </h2>
          <div className="hack-prose hack-columns rv" style={{ transitionDelay: '0.1s' }}>
            <div>
              <h3 className="hack-h3">Problem statement</h3>
              <p>
                Many young people avoid investing because{' '}
                <strong className="hack-strong">the fear of loss</strong> feels abstract until it is too late. If risk
                is contextualized and <strong className="hack-strong">loss is simulated before real exposure</strong>, that fear can shrink , decisions become informed instead of frozen.
              </p>
              <p className="hack-tight">We set out to build:</p>
              <ul className="hack-list">
                <li>a <strong>risk stimulation sandbox</strong>;</li>
                <li>an <strong>AI-based portfolio explainer</strong>;</li>
                <li>a <strong>loss probability meter</strong> tied to scenarios and history , not vibes.</li>
              </ul>
            </div>
            <div>
              <h3 className="hack-h3">About this project</h3>
              <p>
                Finvest (this build) is a hackathon-grade concept that combines <strong className="hack-strong">ML</strong>,{' '}
                <strong className="hack-strong">simulation</strong>, and <strong className="hack-strong">LLM assistance</strong>{' '}
                so users can rehearse markets, understand trade-offs, and carry a personalized story of risk into the real
                world.
              </p>
              <p>
                The product thread runs from <strong className="hack-strong">behavioral onboarding</strong> (timing, patience, fear score) through <strong className="hack-strong">clustered personas</strong>,{' '}
                <strong className="hack-strong">goal-based planning</strong>, and{' '}
                <strong className="hack-strong">“future you” projections</strong> , including inflation and drawdowns , ending in an assistant that can <strong className="hack-strong">explain like you are fifteen</strong>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="hack-approach" className="hack-sec" aria-labelledby="hack-approach-h">
        <div className="sw">
          <p className="hack-sl rv">Our approach</p>
          <h2 id="hack-approach-h" className="hack-h2 rv" style={{ transitionDelay: '0.06s' }}>
            From signals to portfolios , with humility in the math
          </h2>
          <ul className="hack-approach-grid rv" style={{ transitionDelay: '0.1s' }}>
            <li className="hack-card">
              <p className="hack-card-k">Decode Your Finance Self</p>
              <p className="hack-card-d">
                Hesitation and response time become features: quicker patterns suggest higher-tempo strategies; slower, more deliberate behavior maps to longer horizons. A <strong>fear score (1 to 100)</strong> summarizes
                emotional readiness alongside financial inputs.
              </p>
            </li>
            <li className="hack-card">
              <p className="hack-card-k">ML clustering</p>
              <p className="hack-card-d">
                Users land in segments such as <strong>risk-averse</strong>, <strong>balanced</strong>, or{' '}
                <strong>overconfident</strong> , each receives targeted hints (e.g. “people like you often X” or “avoid
                panic selling; median recovery in similar regimes was ~Y months”).
              </p>
            </li>
            <li className="hack-card">
              <p className="hack-card-k">Stance &amp; products</p>
              <p className="hack-card-d">
                Explicit choice among <strong>safe</strong>, <strong>mid</strong>, or <strong>risky</strong> investor
                modes steers recommendations , from conservative bank-linked options and core mutual funds to growth-tilted
                sleeves when appetite allows.
              </p>
            </li>
            <li className="hack-card">
              <p className="hack-card-k">Goals &amp; “future you”</p>
              <p className="hack-card-d">
                Salary and goals (car, travel, retirement, …) anchor suggestions. A <strong>future-you simulator</strong>{' '}
                contrasts paths: e.g. disciplined investing vs. inflation-dragged status quo , in dollars and narrative.
              </p>
            </li>
            <li className="hack-card">
              <p className="hack-card-k">Chat, charts, context</p>
              <p className="hack-card-d">
                A conversational layer answers in plain language (“explain like I’m 15”). Charts and{' '}
                <strong>live platform APIs</strong> (where integrated) plus a <strong>finance news strip</strong> keep
                the story grounded in real markets.
              </p>
            </li>
            <li className="hack-card hack-card--quote">
              <p className="hack-quote-label">Finance</p>
              <blockquote className="hack-quote" cite="Benjamin Graham">
                The investor&apos;s chief problem , and even his worst enemy , is likely to be himself.
              </blockquote>
            </li>
            <li className="hack-card hack-card--quote">
              <p className="hack-quote-label">Technology</p>
              <blockquote className="hack-quote">
                Models do not remove uncertainty; they compress it into something you can stress before capital meets the
                market.
              </blockquote>
            </li>
            <li className="hack-card hack-card--quote">
              <p className="hack-quote-label">Risk</p>
              <blockquote className="hack-quote" cite="Warren Buffett">
                Risk comes from not knowing what you are doing.
              </blockquote>
            </li>
          </ul>
          <p className="hack-note rv" style={{ transitionDelay: '0.14s' }}>
            AI generates a <strong>personalized portfolio narrative and allocation story</strong> for each user; multiple
            branches , <strong>safe</strong>, <strong>moderate</strong>, and <strong>high risk</strong> , surface{' '}
            <strong>probabilistic profit ranges</strong> so choice stays explicit.
          </p>
        </div>
      </section>

      <section id="hack-workflow" className="hack-sec" aria-labelledby="hack-workflow-h">
        <div className="sw">
          <p className="hack-sl rv">Workflow</p>
          <h2 id="hack-workflow-h" className="hack-h2 rv" style={{ transitionDelay: '0.06s' }}>
            How a user moves through the system
          </h2>
          <div className="rv" style={{ transitionDelay: '0.1s' }}>
            <WorkflowZigzag steps={workflowSteps} />
          </div>
        </div>
      </section>

      <InvestingStoriesSlideshow />

      <section id="why-us" className="hack-sec" aria-labelledby="why-us-h">
        <div className="sw">
          <p className="hack-sl rv">Why us</p>
          <h2 id="why-us-h" className="hack-h2 rv" style={{ transitionDelay: '0.06s' }}>
            Why judges , and users should care
          </h2>
          <ul className="hack-sell-grid rv" style={{ transitionDelay: '0.1s' }}>
            {sellingPoints.map((x) => (
              <li key={x.h} className="hack-sell-card">
                <p className="hack-sell-h">{x.h}</p>
                <p className="hack-sell-p">{x.p}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="hack-project" className="hack-sec hack-sec--cta" aria-labelledby="hack-project-h">
        <div className="sw hack-cta-inner">
          <h2 id="hack-project-h" className="hack-h2 hack-h2--solo rv" style={{ transitionDelay: '0.06s' }}>
            View the project
          </h2>
          <p className="hack-cta-lead rv" style={{ transitionDelay: '0.1s' }}>
            Login as Guest to open dashboard, financial goals, and the personalized portfolio with no account. Sign in
            anytime to save progress to your profile.
          </p>
          <div className="hack-cta-actions rv" style={{ transitionDelay: '0.12s' }}>
            <Link
              to="/dashboard"
              className="hack-cta-btn hack-cta-btn--primary"
              onClick={() => setGuestMode(true)}
            >
              Login as Guest
            </Link>
            <Link to="/account" className="hack-cta-btn hack-cta-btn--ghost">
              Log in / Sign up
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default HackathonShowcase;
