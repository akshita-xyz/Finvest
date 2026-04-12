import React, { useEffect, useRef } from 'react';

const VisualPanel = ({ onOpenModal }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext("2d");
    let W, H, pts = [];
    let animationFrameId;

    const res = () => {
      // Need to find parent width
      if (c.parentElement) {
        W = c.width = c.parentElement.offsetWidth;
        H = c.height = c.parentElement.offsetHeight;
      }
    };

    const mk = () => {
      pts = [];
      const cols = ["#6db4ff", "#ff4d1c", "#ffffff", "#ffffff"];
      for (let i = 0; i < 40; i++)
        pts.push({
          x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.48, vy: (Math.random() - 0.5) * 0.48, r: Math.random() * 2.4 + 0.8, c: cols[Math.floor(Math.random() * cols.length)], op: Math.random() * 0.45 + 0.25, });
    };

    const draw = () => {
      x.fillStyle = "rgba(8,8,8,.16)";
      x.fillRect(0, 0, W, H);
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        x.beginPath();
        x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        x.fillStyle = p.c;
        x.globalAlpha = p.op;
        x.fill();
        x.globalAlpha = 1;
      });
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < 85) {
            x.beginPath();
            x.moveTo(pts[i].x, pts[i].y);
            x.lineTo(pts[j].x, pts[j].y);
            x.strokeStyle = pts[i].c;
            x.globalAlpha = 0.11 * (1 - d / 85);
            x.lineWidth = 0.8;
            x.stroke();
            x.globalAlpha = 1;
          }
        }
      animationFrameId = requestAnimationFrame(draw);
    };

    res();
    mk();
    draw();

    window.addEventListener("resize", () => {
      res();
      mk();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", res);
    };
  }, []);

  return (
    <section id="vp" aria-labelledby="vp-h">
      <div className="vpi sw">
        <div className="vpt rl">
          <p className="sl" style={{ color: '#333' }}>Live risk engine</p>
          <h2 id="vp-h" className="st" style={{ color: 'var(--white)' }}>
            Watch risk move<br />in real time.
          </h2>
          <p>
            Our engine visualises every position, signal, and anomaly as it happens , so nothing hides in the noise.
          </p>
          <p>
            Particle clusters represent market correlations. Proximity encodes live risk exposure across instruments.
          </p>
          <button className="btn-a" onClick={() => onOpenModal('m-demo')} style={{ marginTop: '8px' }}>
            Request live demo
          </button>
        </div>
        <div className="vcw rv" style={{ transitionDelay: '0.15s' }}>
          <canvas id="vc" ref={canvasRef}></canvas>
        </div>
      </div>
    </section>
  );
};

export default VisualPanel;
