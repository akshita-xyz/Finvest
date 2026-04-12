import React, { useEffect, useRef } from 'react';

const Intro = ({ onComplete }) => {
  const introRef = useRef(null);
  const flashRef = useRef(null);
  const fillRef = useRef(null);
  const fiRef = useRef(null);
  const cTlRef = useRef(null);
  const cTrRef = useRef(null);
  const cBlRef = useRef(null);
  const cBrRef = useRef(null);
  const wordRefs = useRef([]);

  const words = [
    { text: "feel", cls: "iw", delay: 0, gap: 80 }, { text: "the", cls: "iw", delay: 0, gap: 80 }, { text: "risk", cls: "iw accent", delay: 0, gap: 80 }, { text: "master", cls: "iw", delay: 100, gap: 80 }, { text: "the", cls: "iw", delay: 0, gap: 80 }, { text: "outcome", cls: "iw accent", delay: 0, gap: 0 }, ];

  useEffect(() => {
    let unmounted = false;
    const totalDuration = 4200; // ms before exit begins

    // Show corners + frame info
    setTimeout(() => {
      if (unmounted) return;
      [cTlRef, cTrRef, cBlRef, cBrRef].forEach((c) => {
        if (c.current) c.current.style.opacity = 1;
      });
      if (fiRef.current) fiRef.current.style.opacity = 1;
    }, 200);

    // Build timeline - animate words sequentially
    let cursor = 400;
    words.forEach((w, i) => {
      const gap = w.gap || 0;
      cursor += gap;
      const at = cursor;
      setTimeout(() => {
        if (unmounted) return;
        if (wordRefs.current[i]) {
          wordRefs.current[i].classList.add("visible");
        }
        if (fillRef.current) {
          fillRef.current.style.width = ((i + 1) / words.length * 85) + "%";
        }
      }, at);
      cursor += 200 + w.delay; // 200ms per word animation + custom delay
    });

    // Flash + exit
    setTimeout(() => {
      if (unmounted) return;
      if (fillRef.current) {
        fillRef.current.style.width = "100%";
        fillRef.current.style.transition = "width .3s linear";
      }
    }, totalDuration - 300);

    setTimeout(() => {
      if (unmounted) return;
      if (flashRef.current) {
        flashRef.current.style.transition = "opacity .06s";
        flashRef.current.style.opacity = 1;
        setTimeout(() => {
          if (unmounted) return;
          if (flashRef.current) {
            flashRef.current.style.transition = "opacity .4s";
            flashRef.current.style.opacity = 0;
          }
        }, 80);
      }
    }, totalDuration);

    setTimeout(() => {
      if (unmounted) return;
      if (introRef.current) {
        introRef.current.style.transition = "opacity .7s cubic-bezier(.4,0,.2,1)";
        introRef.current.style.opacity = 0;
      }
    }, totalDuration + 200);

    const completeTimeout = setTimeout(() => {
      if (unmounted) return;
      onComplete();
    }, totalDuration + 900);

    return () => {
      unmounted = true;
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  return (
    <div id="intro" role="dialog" aria-label="Intro animation" aria-live="polite" ref={introRef}>
      <div className="corner tl" id="c-tl" ref={cTlRef}></div>
      <div className="corner tr" id="c-tr" ref={cTrRef}></div>
      <div className="corner bl" id="c-bl" ref={cBlRef}></div>
      <div className="corner br" id="c-br" ref={cBrRef}></div>
      <div id="frame-info" ref={fiRef}>RISK / 2025 / EST</div>
      <div id="flash" ref={flashRef}></div>

      <div id="intro-stage" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'clamp(4px, 1.5vw, 14px)', padding: '0 clamp(16px, 5vw, 60px)', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 'clamp(8px, 2vw, 20px)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {words.map((s, i) => (
            <span
              key={i}
              className={s.cls || "iw"}
              ref={el => wordRefs.current[i] = el}
            >
              {s.text}
            </span>
          ))}
        </div>
      </div>

      <div id="ibar"><div id="ibar-fill" ref={fillRef}></div></div>
    </div>
  );
};

export default Intro;
