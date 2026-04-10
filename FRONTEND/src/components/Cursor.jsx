import React, { useEffect, useRef } from 'react';

const Cursor = () => {
  const curRef = useRef(null);
  const dotRef = useRef(null);
  const requestRef = useRef();

  useEffect(() => {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    const onMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = mx + 'px';
        dotRef.current.style.top = my + 'px';
      }
      updateCursorColor(my);
    };

    const animateCursor = () => {
      rx += (mx - rx) * 0.22;
      ry += (my - ry) * 0.22;
      if (curRef.current) {
        curRef.current.style.left = Math.round(rx) + 'px';
        curRef.current.style.top = Math.round(ry) + 'px';
      }
      requestRef.current = requestAnimationFrame(animateCursor);
    };

    document.addEventListener('mousemove', onMouseMove);
    requestRef.current = requestAnimationFrame(animateCursor);

    // Initial color check
    updateCursorColor(my);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
    // Add hover effects for interactive elements dynamically
    const handleMouseEnter = (e) => {
      const el = e.target;
      if (el.matches('a, button, .card, .logo, .lm-card, .gs-feat') || el.closest('a, button, .card, .logo, .lm-card, .gs-feat')) {
         const targetEl = el.closest('a, button, .card, .logo, .lm-card, .gs-feat') || el;
         const isButtonP = targetEl.matches('.btn-p, .btn-a, .nav-cta');
         document.body.classList.toggle('cc', isButtonP);
         document.body.classList.toggle('ch', !isButtonP);
      }
    };

    const handleMouseLeave = () => {
      document.body.classList.remove('ch', 'cc');
    };

    document.addEventListener('mouseover', handleMouseEnter);
    document.addEventListener('mouseout', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter);
      document.removeEventListener('mouseout', handleMouseLeave);
    }
  }, []);

  const updateCursorColor = (y) => {
    const darkSections = ['#stats', '#mq', '#vp', '#lm-section', '#ctaband'];
    let onDark = false;
    darkSections.forEach((id) => {
      const s = document.querySelector(id);
      if (!s) return;
      const r = s.getBoundingClientRect();
      const currentScroll = window.scrollY;
      const absoluteTop = r.top + currentScroll;
      const absoluteBottom = r.bottom + currentScroll;
      const absoluteY = y + currentScroll;
      // Alternatively wait, `y` is clientY. `r.top` is relative to client.
      if (y >= r.top && y <= r.bottom) onDark = true;
    });

    if (curRef.current && dotRef.current) {
      curRef.current.style.borderColor = onDark ? 'rgba(255,255,255,.65)' : '';
      dotRef.current.style.background = onDark ? '#fff' : '';
    }
  };

  return (
    <>
      <div id="cur" ref={curRef}></div>
      <div id="dot" ref={dotRef}></div>
    </>
  );
};

export default Cursor;
