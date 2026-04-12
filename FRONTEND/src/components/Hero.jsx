import React, { useEffect, useRef, useState, useCallback } from 'react';
import heroBgVideo from '../assets/coinvid.mp4';

const Hero = () => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [videoSize, setVideoSize] = useState(/** @type {{ w: number; h: number } | null} */ (null));

  const onVideoMetadata = useCallback((e) => {
    const v = e.currentTarget;
    if (v.videoWidth > 0 && v.videoHeight > 0) {
      setVideoSize({ w: v.videoWidth, h: v.videoHeight });
    }
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const p = v.play?.();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    let W;
    let H;
    let pts = [];
    let animationFrameId;

    const res = () => {
      const h = document.getElementById('hero');
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
        x.fillStyle = 'rgba(0,0,0,.13)';
        x.fill();
      });
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
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

    window.addEventListener('resize', () => {
      res();
      mk();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', res);
    };
  }, [videoSize]);

  const aspectStyle =
    videoSize != null
      ? { aspectRatio: `${videoSize.w} / ${videoSize.h}` }
      : { aspectRatio: '16 / 9' };

  return (
    <section
      id="hero"
      className="parallax-container"
      aria-labelledby="hero-h"
      aria-describedby="hero-sub"
      style={aspectStyle}
    >
      <video
        ref={videoRef}
        className="hero-bg-video"
        src={heroBgVideo}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        onLoadedMetadata={onVideoMetadata}
      />
      <div className="parallax-layer bg-far" id="hero-layer-far"></div>
      <div className="parallax-layer bg-mid" id="hero-layer-mid"></div>
      <canvas id="bg" ref={canvasRef}></canvas>
      <div className="hero-headline">
        <h1 id="hero-h" className="hh">
          FINVEST
        </h1>
        <p id="hero-sub" className="hero-sub">
          Feel the risk, master the outcome—risk simulation, behavioral insights,
          and personalized portfolios to reduce investing fear before you commit
          real capital.
        </p>
      </div>
      <div className="hero-team-credit" role="note">
        <span className="hero-team-name">BANDWAGONS</span>
        <span className="hero-team-divider" aria-hidden>|</span>
        <p className="hero-team-tagline">
          One team, endless curiosity—we build what moves people forward.
        </p>
      </div>
    </section>
  );
};

export default Hero;
