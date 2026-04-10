import React, { useEffect, useRef } from 'react';

const Hero = ({ onOpenModal }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext("2d");
    let W, H, pts = [];
    let animationFrameId;

    const res = () => {
      const h = document.getElementById("hero");
      if (h) {
        W = c.width = h.offsetWidth;
        H = c.height = h.offsetHeight;
      }
    };

    const mk = () => {
      pts = [];
      const n = Math.min(55, Math.floor((W * H) / 16000));
      for (let i = 0; i < n; i++)
        pts.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.6 + 0.4,
        });
    };

    const draw = () => {
      x.clearRect(0, 0, W, H);
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        x.beginPath();
        x.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        x.fillStyle = "rgba(0,0,0,.13)";
        x.fill();
      });
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x,
            dy = pts[i].y - pts[j].y,
            d = Math.sqrt(dx * dx + dy * dy);
          if (d < 110) {
            x.beginPath();
            x.moveTo(pts[i].x, pts[i].y);
            x.lineTo(pts[j].x, pts[j].y);
            x.strokeStyle = `rgba(0,0,0,${0.075 * (1 - d / 110)})`;
            x.lineWidth = 0.5;
            x.stroke();
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
    <section id="hero" className="parallax-container" aria-labelledby="hero-h">
      {/* Far background layer */}
      <div className="parallax-layer bg-far" id="hero-layer-far"></div>
      {/* Mid background layer */}
      <div className="parallax-layer bg-mid" id="hero-layer-mid"></div>
      {/* Canvas and content */}
      <canvas id="bg" ref={canvasRef}></canvas>
      <p className="hero-tag">Risk Intelligence Platform</p>
      <h1 id="hero-h" className="hh">
        Feel the <span className="dim">risk,</span><br />master the <em style={{ color: 'var(--accent)', textShadow: '0 0 20px rgba(200, 255, 0, 0.3)' }}>outcome</em>
      </h1>
      <p className="hero-sub">
        Real-time risk analysis with probabilistic modeling and automated execution. Join 3,400+ traders who stopped guessing.
      </p>
      <div className="cta-row">
        <button className="btn-p" onClick={() => onOpenModal('m-gs')}><span>Start free trial →</span></button>
        <button className="btn-g" onClick={() => onOpenModal('m-lm')}><span>See how it works</span></button>
      </div>
    </section>
  );
};

export default Hero;
