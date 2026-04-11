import React, { useState, useEffect, useCallback } from 'react'
import Cursor from '../components/Cursor'
import Intro from '../components/Intro'
import Navbar from '../components/Navbar'
import Hero from '../components/Hero'
import MarqueeTracker from '../components/MarqueeTracker'
import Marquee from '../components/Marquee'
import WhatWeDo from '../components/WhatWeDo'
import Stats from '../components/Stats'
import Process from '../components/Process'
import VisualPanel from '../components/VisualPanel'
import GetStarted from '../components/GetStarted'
import LearnMore from '../components/LearnMore'
import CtaBand from '../components/CtaBand'
import Footer from '../components/Footer'
import Modals from '../components/Modals'

const INTRO_ONCE_KEY = 'finvest_intro_tagline_seen_v1';
const LANDING_SCROLL_KEY = 'finvest_landing_scroll_y_v1';

function LandingPage() {
  const [introStarted] = useState(true);
  const [introComplete, setIntroComplete] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(INTRO_ONCE_KEY) === '1';
  });
  const [activeModal, setActiveModal] = useState(null);

  const handleIntroDone = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_ONCE_KEY, '1');
    } catch {
      /* ignore quota / private mode */
    }
    setIntroComplete(true);
  }, []);

  useEffect(() => {
    // Parallax logic
    const handleParallax = () => {
      const scrollY = window.scrollY;
      const parallaxSections = [
        {
          container: "#hero",
          layers: [
            { id: "hero-layer-far", speed: 0.3 },
            { id: "hero-layer-mid", speed: 0.6 },
          ],
        },
        {
          container: "#mq",
          layers: [
            { id: "mq-marquee-far", speed: 0.25 },
            { id: "mq-marquee-mid", speed: 0.55 },
          ],
        },
        {
          container: "#mq-wrapper",
          layers: [
            { id: "mq-layer-far", speed: 0.25 },
            { id: "mq-layer-mid", speed: 0.55 },
          ]
        }
      ];

      parallaxSections.forEach((section) => {
        const container = document.querySelector(section.container);
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const containerTop = rect.top + scrollY;
        const containerHeight = rect.height;
        const viewportCenter = scrollY + window.innerHeight / 2;
        const distanceFromCenter = viewportCenter - (containerTop + containerHeight / 2);
        const parallaxFactor = distanceFromCenter / (window.innerHeight * 2);

        section.layers.forEach((layer) => {
          const element = document.getElementById(layer.id);
          if (!element) return;
          const offset = parallaxFactor * layer.speed * 100;
          element.style.transform = `translateY(${offset}px)`;
        });
      });
    };

    let ticking = false;
    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleParallax();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    window.addEventListener("scroll", scrollListener);
    handleParallax(); // Initial call
    
    return () => window.removeEventListener("scroll", scrollListener);
  }, []);

  useEffect(() => {
    if (!introComplete) return;
    let y = 0;
    try {
      y = parseInt(String(window.sessionStorage.getItem(LANDING_SCROLL_KEY) || '0'), 10) || 0;
    } catch {
      y = 0;
    }
    if (y > 0) {
      requestAnimationFrame(() => window.scrollTo({ top: y, left: 0, behavior: 'auto' }));
    }
  }, [introComplete]);

  useEffect(() => {
    if (!introComplete) return;
    let t;
    const onScroll = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(LANDING_SCROLL_KEY, String(window.scrollY));
        } catch {
          /* ignore */
        }
      }, 120);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, [introComplete]);

  useEffect(() => {
    if (!introComplete) return;

    // Scroll Reveal logic
    const ob = new IntersectionObserver(
      (es) => {
        es.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("on");
        });
      },
      { threshold: 0.09 }
    );
    document.querySelectorAll(".rv,.rl").forEach((el) => ob.observe(el));
    
    return () => ob.disconnect();
  }, [introComplete]);

  return (
    <>
      <Cursor />
      
      {introStarted && !introComplete && (
        <Intro onComplete={handleIntroDone} />
      )}

      <div id="site" className={introComplete ? "show" : ""} style={introComplete ? { display: 'block' } : { display: 'none' }}>
        <Navbar />
        <MarqueeTracker />
        <Hero onOpenModal={setActiveModal} />
        <Marquee />
        <WhatWeDo />
        <Stats />
        <Process />
        <VisualPanel onOpenModal={setActiveModal} />
        <GetStarted />
        <LearnMore onOpenModal={setActiveModal} />
        <CtaBand onOpenModal={setActiveModal} />
        <Footer />
      </div>

      <Modals 
        activeModal={activeModal} 
        onClose={() => setActiveModal(null)} 
        onOpenModal={setActiveModal}
      />
    </>
  )
}

export default LandingPage
