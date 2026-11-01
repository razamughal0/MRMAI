import { useEffect, useRef } from "react";
import type { CoreState } from "../lib/types";

const COLORS: Record<CoreState, string> = {
  idle: "#38e1ff",
  listening: "#3ddc97",
  speaking: "#f2b632",
  executing: "#8be9ff",
};

export default function Reactor({
  size = 200,
  state = "idle",
}: {
  size?: number;
  state?: CoreState;
}) {
  const c = COLORS[state];
  const ticks = Array.from({ length: 48 }, (_, i) => (i * 360) / 48);
  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      {/* halo */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{ boxShadow: `0 0 ${size * 0.35}px ${c}22, inset 0 0 ${size * 0.25}px ${c}18` }}
      />
      {(state === "listening" || state === "speaking") && (
        <div className="absolute inset-[6%] rounded-full border ring-ping" style={{ borderColor: `${c}66` }} />
      )}
      {/* outer dashed */}
      <div className="absolute inset-0 anim-spin-slower">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="48" fill="none" stroke={`${c}55`} strokeWidth="0.7" strokeDasharray="3 6" />
        </svg>
      </div>
      {/* gold segments */}
      <div className="absolute inset-[7%] anim-spin-rev">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="46" fill="none" stroke="#f2b63266" strokeWidth="1.6" strokeDasharray="34 24" strokeLinecap="round" />
        </svg>
      </div>
      {/* tick ring */}
      <div className="absolute inset-[16%] anim-spin-slow">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {ticks.map((a) => (
            <line
              key={a}
              x1="50" y1="3.5" x2="50" y2={a % 30 === 0 ? "9" : "6.5"}
              stroke={`${c}88`} strokeWidth={a % 30 === 0 ? 1.6 : 0.8}
              transform={`rotate(${a} 50 50)`}
            />
          ))}
        </svg>
      </div>
      {/* inner ring */}
      <div className="absolute inset-[27%] rounded-full border transition-colors duration-500" style={{ borderColor: `${c}44` }} />
      {/* triangular coil hints */}
      <div className="absolute inset-[30%] anim-spin-rev opacity-70">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="46" fill="none" stroke={`${c}aa`} strokeWidth="3" strokeDasharray="10 8" />
        </svg>
      </div>
      {/* core */}
      <div className="absolute inset-[38%] rounded-full anim-core transition-all duration-500"
        style={{
          background: `radial-gradient(circle, #ffffff 0%, ${c} 38%, ${c}33 72%, transparent 100%)`,
          boxShadow: `0 0 ${size * 0.18}px ${c}, 0 0 ${size * 0.4}px ${c}66`,
        }}
      />
    </div>
  );
}

/* ---------------- live waveform ---------------- */

export function Waveform({ state, level }: { state: CoreState; level: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ state, level });
  stateRef.current = { state, level };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const BARS = 52;
    const vals = new Array(BARS).fill(0.05);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * devicePixelRatio;
      canvas.height = rect.height * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (t: number) => {
      const { state: st, level: lv } = stateRef.current;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const bw = w / BARS;
      const color = COLORS[st];
      for (let i = 0; i < BARS; i++) {
        const mid = Math.abs(i - BARS / 2) / (BARS / 2);
        let target = 0.05;
        if (st === "speaking") {
          target = (0.3 + 0.7 * Math.abs(Math.sin(t * 0.011 + i * 0.55)) * Math.abs(Math.sin(t * 0.004 + i))) * (1 - mid * 0.55);
        } else if (st === "listening") {
          target = 0.07 + lv * (1 - mid * 0.5) * (0.6 + 0.4 * Math.sin(t * 0.02 + i));
        } else if (st === "executing") {
          target = 0.12 + 0.3 * Math.abs(Math.sin(t * 0.02 - i * 0.4)) * (1 - mid);
        } else {
          target = 0.05 + 0.045 * Math.abs(Math.sin(t * 0.002 + i * 0.35));
        }
        vals[i] += (target - vals[i]) * 0.25;
        const bh = Math.max(2, vals[i] * h * 0.92);
        const x = i * bw + bw * 0.22;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.28 + vals[i] * 0.72;
        ctx.beginPath();
        ctx.roundRect(x, (h - bh) / 2, bw * 0.56, bh, 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}