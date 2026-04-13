import React, { useCallback, useEffect, useState } from 'react';
/* eslint-disable-next-line no-unused-vars -- motion used as <motion.div /> */
import { AnimatePresence, motion } from 'framer-motion';
import '../styles/investing-stories.css';

const ROTATE_MS = 8000;

const SLIDES = [
  {
    id: 'friends-sip',
    title: 'Two friends start investing',
    body: (
      <>
        <ul>
          <li>One waits to invest ₹1 lakh</li>
          <li>One starts with ₹1,000 monthly</li>
        </ul>
        <p>
          <strong>After 3–5 years, the second one usually wins.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'buffett-age',
    title: 'Time in the market beats timing the market',
    body: (
      <>
        <p>Buffett started investing as a teenager.</p>
        <p>His biggest gains didn’t come early.</p>
        <p>
          <strong>Most of his wealth came after age 50.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'learn-by-starting',
    title: 'You learn by starting',
    body: (
      <>
        <p>A student wanted to invest but kept waiting:</p>
        <p>
          <em>“I’ll start when I understand everything.”</em>
        </p>
        <p>Two years passed. The market went up 40%+.</p>
        <p>
          <strong>You don’t learn before starting — you learn by starting.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'small-loss',
    title: 'The price of staying clueless',
    body: (
      <>
        <p>The first time a student lost ₹1,000, he panicked and stopped investing.</p>
        <p>
          Later he realized: <strong>that ₹1,000 loss was cheaper than staying clueless forever.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'mrf',
    title: '“Too expensive already”',
    body: (
      <>
        <p>Around the early 2000s, MRF was trading near ₹1,000–₹2,000.</p>
        <p>People thought: “Too expensive already.”</p>
        <p>
          Fast forward — it crossed <strong>₹1 lakh+ per share</strong>.
        </p>
        <p>Someone who invested ₹10,000 back then could be sitting on lakhs today.</p>
      </>
    ),
  },
  {
    id: 'apple',
    title: 'When everyone ignores it',
    body: (
      <>
        <p>In the early 2000s, Apple was struggling. The stock was extremely cheap.</p>
        <p>Most people ignored it; few invested and held.</p>
        <p>
          <strong>Result → one of the biggest wealth creators ever.</strong>
        </p>
      </>
    ),
  },
  {
    id: 'bitcoin',
    title: 'Small amounts, long horizons',
    body: (
      <>
        <p>In 2013–14, some students bought small amounts of Bitcoin — even ₹1,000–₹5,000 worth.</p>
        <p>
          <strong>Those who held long-term saw huge returns.</strong> (Past examples are not a promise of future results.)
        </p>
      </>
    ),
  },
];

export default function InvestingStoriesSlideshow() {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const total = SLIDES.length;

  const go = useCallback(
    (dir) => {
      setIndex((i) => (i + dir + total) % total);
    },
    [total]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    if (reduceMotion) return undefined;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, ROTATE_MS);
    return () => window.clearInterval(t);
  }, [reduceMotion, total]);

  const slide = SLIDES[index];

  return (
    <section className="home-stories" aria-labelledby="home-stories-heading">
      <div className="home-stories__inner">
        <p className="home-stories__eyebrow">Perspective</p>
        <h2 id="home-stories-heading" className="home-stories__title">
          Why starting beats waiting
        </h2>

        <div className="home-stories__stage" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide.id}
              className="home-stories__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${total}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="home-stories__deck">
                <h3 className="home-stories__slide-title">{slide.title}</h3>
                <div className="home-stories__slide-body">{slide.body}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="home-stories__controls">
          <div className="home-stories__dots" role="tablist" aria-label="Choose story">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className="home-stories__dot"
                aria-label={`Show story ${i + 1}`}
                aria-current={i === index ? 'true' : 'false'}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
          <div className="home-stories__arrows">
            <button type="button" className="home-stories__arrow" onClick={() => go(-1)} aria-label="Previous story">
              Prev
            </button>
            <button type="button" className="home-stories__arrow" onClick={() => go(1)} aria-label="Next story">
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
