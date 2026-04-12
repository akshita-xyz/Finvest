import React, { useEffect, useRef, useState } from 'react';

export default function WorkflowZigzag({ steps }) {
  const wrapRef = useRef(null);
  const itemRefs = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const update = () => {
      const wrap = wrapRef.current;
      if (!wrap) return;

      const wRect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      if (wRect.bottom < 0 || wRect.top > vh) {
        setActive((p) => (p === -1 ? p : -1));
        return;
      }

      const midY = vh * 0.48;
      let best = 0;
      let bestDist = Infinity;

      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const cy = r.top + r.height * 0.5;
        const d = Math.abs(cy - midY);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });

      setActive((p) => (p !== best ? best : p));
    };

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          update();
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [steps.length]);

  return (
    <ol ref={wrapRef} className="hack-flow hack-flow--zigzag" aria-label="Product workflow steps">
      {steps.map((s, i) => {
        const side = i % 2 === 0 ? 'l' : 'r';
        const isActive = active === i;
        return (
          <li
            key={s.n}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            className={`hack-flow__step hack-flow__step--zig-${side} ${isActive ? 'hack-flow__step--active' : ''}`}
            aria-current={isActive ? 'step' : undefined}
          >
            <span className="hack-flow__n" aria-hidden>
              {s.n}
            </span>
            <div className="hack-flow__body">
              <p className="hack-flow__t">{s.t}</p>
              <p className="hack-flow__d">{s.d}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
