import { useEffect, useRef } from "react";

export default function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: 70 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.4,
      vy: -(Math.random() * 0.22 + 0.05),
      vx: (Math.random() - 0.5) * 0.08,
      gold: Math.random() < 0.14,
      tw: Math.random() * Math.PI * 2,
    }));

    const loop = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.y < -6) { d.y = h + 6; d.x = Math.random() * w; }
        if (d.x < -6) d.x = w + 6;
        if (d.x > w + 6) d.x = -6;
        const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.001 + d.tw));
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.gold ? `rgba(242,182,50,${a})` : `rgba(56,225,255,${a})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, #0a1c33 0%, #04070f 62%)" }} />
      <div className="absolute inset-0 bg-grid" />
      <canvas ref={canvasRef} className="absolute inset-0 opacity-80" />
      <div className="absolute inset-x-0 scanline" />
      <div className="absolute inset-0 vignette" />
    </div>
  );
}