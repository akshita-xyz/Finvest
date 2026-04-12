import React, { useEffect, useRef } from 'react';

const Cursor = () => {
  const curRef = useRef(null);
  const dotRef = useRef(null);
  const requestRef = useRef();

  const updateCursorColor = (y, cur, dot) => {
    const darkSections = [
      '#about', '#hack-approach', '#hack-workflow', '#why-us', '#hack-project', '#hack-footer', ];
    let onDark = false;
    darkSections.forEach((id) => {
      const s = document.querySelector(id);
      if (!s) return;
      const r = s.getBoundingClientRect();
      if (y >= r.top && y <= r.bottom) onDark = true;
    });

    if (cur && dot) {
      cur.style.borderColor = onDark ? 'rgba(255,255,255,.65)' : '';
      dot.style.background = onDark ? '#fff' : '';
    }
  };

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
      updateCursorColor(my, curRef.current, dotRef.current);
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
    updateCursorColor(my, curRef.current, dotRef.current);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  useEffect(() => {
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
    };
  }, []);

  return (
    <>
      <div id="cur" ref={curRef}></div>
      <div id="dot" ref={dotRef}></div>
    </>
  );
};

export default Cursor;
