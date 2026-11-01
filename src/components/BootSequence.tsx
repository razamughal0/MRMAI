import { useEffect, useRef, useState } from "react";
import { SkipForward, FolderOpen } from "lucide-react";
import { useMRM, CREATOR, CREATED } from "../store";
import { sfx } from "../lib/sfx";

const BOOT_LINES = [
  "BIOS MRM MARK-III ................ OK",
  "GEMINI REALTIME CORE ............. ONLINE",
  "SCREEN VISION MODULE ............. ARMED",
  "VOICE ENGINE [AOEDE] ............. READY",
  "CLAP SENSOR ...................... STANDBY",
  "WINDOWS AUTOMATION ............... LOADED",
  "BROWSER / TAB CONTROL ............ LINKED",
  "LOCAL DATABASE ................... MOUNTED",
  "WHATSAPP WORKFLOW ................ READY",
  "SAFETY PROTOCOLS ................. ENGAGED",
];

const FOLDERS = ["SYSTEM32", "VISION", "VOICE", "AUTOMATION", "DATABASE"];

/** The "world being built" boot: a particle globe assembles from chaos. */
export default function BootSequence() {
  const { bootDone } = useMRM();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lines, setLines] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    setTimeout(bootDone, 550);
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    let count = 0;
    const lineTimer = setInterval(() => {
      if (count < BOOT_LINES.length) {
        sfx.bootTick();
        count++;
      }
      setLines(count);
    }, 360);
    const start = performance.now();
    const progTimer = setInterval(() => {
      const p = Math.min(100, ((performance.now() - start) / 6000) * 100);
      setProgress(p);
      if (p >= 100) finishRef.current();
    }, 80);
    return () => { clearInterval(lineTimer); clearInterval(progTimer); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const size = () => {
      const s = Math.min(window.innerWidth * 0.8, window.innerHeight * 0.44, 430);
      canvas.width = s * devicePixelRatio;
      canvas.height = s * devicePixelRatio;
      canvas.style.width = `${s}px`;
      canvas.style.height = `${s}px`;
      return s;
    };
    let s = size();
    const onResize = () => { s = size(); };
    window.addEventListener("resize", onResize);

    // fibonacci sphere
    const N = 460;
    const pts = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      return {
        tx: Math.cos(th) * rad, ty: y, tz: Math.sin(th) * rad,
        sx: (Math.random() - 0.5) * 3.4, sy: (Math.random() - 0.5) * 3.4, sz: (Math.random() - 0.5) * 3.4,
        gold: i % 23 === 0,
      };
    });
    // connection pairs between close neighbours
    const pairs: [number, number][] = [];
    for (let i = 0; i < N && pairs.length < 420; i++) {
      for (let j = i + 1; j < N && pairs.length < 420; j++) {
        const dx = pts[i].tx - pts[j].tx, dy = pts[i].ty - pts[j].ty, dz = pts[i].tz - pts[j].tz;
        if (dx * dx + dy * dy + dz * dz < 0.028) pairs.push([i, j]);
      }
    }

    const t0 = performance.now();
    const proj: { x: number; y: number; z: number; gold: boolean }[] = pts.map(() => ({ x: 0, y: 0, z: 0, gold: false }));

    const loop = (now: number) => {
      const el = now - t0;
      const dpr = devicePixelRatio;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const R = (s * dpr) * 0.38;
      const assemble = Math.min(1, Math.max(0, (el - 250) / 2600));
      const ease = 1 - Math.pow(1 - assemble, 3);
      const ry = el * 0.00028;
      const rx = 0.35 + Math.sin(el * 0.0002) * 0.08;
      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      const cosX = Math.cos(rx), sinX = Math.sin(rx);

      for (let i = 0; i < N; i++) {
        const p = pts[i];
        let x = p.sx + (p.tx - p.sx) * ease;
        let y = p.sy + (p.ty - p.sy) * ease;
        let z = p.sz + (p.tz - p.sz) * ease;
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;
        const y1 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;
        const f = 3.1 / (3.1 + z2);
        proj[i].x = cx + x1 * R * f;
        proj[i].y = cy + y1 * R * f;
        proj[i].z = z2;
        proj[i].gold = p.gold;
      }

      // network lines
      ctx.lineWidth = dpr * 0.6;
      for (const [a, b] of pairs) {
        const za = proj[a].z, zb = proj[b].z;
        const alpha = 0.16 * ease * (1 - (za + zb + 2) / 5);
        if (alpha <= 0.01) continue;
        ctx.strokeStyle = `rgba(56,225,255,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(proj[a].x, proj[a].y);
        ctx.lineTo(proj[b].x, proj[b].y);
        ctx.stroke();
      }
      // dots
      for (const p of proj) {
        const depth = 1 - (p.z + 1.6) / 3.2;
        const alpha = Math.max(0.08, Math.min(1, depth)) * (0.35 + 0.65 * ease);
        const r = (p.gold ? 2.1 : 1.25) * dpr * (0.7 + depth * 0.6);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? `rgba(242,182,50,${alpha})` : `rgba(56,225,255,${alpha})`;
        ctx.fill();
      }
      // equator ring
      ctx.strokeStyle = `rgba(56,225,255,${0.25 * ease})`;
      ctx.lineWidth = dpr;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R * 1.22, R * 0.4, -0.35, 0, Math.PI * 2);
      ctx.stroke();

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      style={{ background: "radial-gradient(ellipse at center, #081527 0%, #03060d 70%)" }}
    >
      <div className="anim-flicker text-center">
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-[0.45em] text-core glow-cyan pl-3">MRM</h1>
        <p className="font-tech text-[11px] tracking-[0.35em] text-mist mt-2">PERSONAL WINDOWS AI ASSISTANT</p>
      </div>

      <div className="relative anim-float">
        <canvas ref={canvasRef} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="font-tech text-[10px] text-core/70 tracking-widest">{progress < 100 ? "BUILDING WORLD…" : "WORLD ONLINE"}</span>
        </div>
      </div>

      {/* folders opening */}
      <div className="flex gap-5 md:gap-8 h-16 items-end" style={{ perspective: "600px" }}>
        {FOLDERS.map((f, i) => (
          <div key={f} className="flex flex-col items-center gap-1.5" style={{ opacity: progress > 18 + i * 9 ? 1 : 0, transition: "opacity 0.4s" }}>
            <div className="relative w-10 h-8">
              <div className="absolute inset-0 rounded-sm bg-[#0d2947] border border-core/30" />
              <div className="absolute -top-1 left-0 w-4 h-2 rounded-t-sm bg-[#0d2947] border border-b-0 border-core/30" />
              {progress > 30 + i * 9 && (
                <div className="folder-paper absolute left-1.5 right-1.5 top-0 h-6 bg-fog/85 rounded-[1px]" style={{ animationDelay: `${0.25 + i * 0.05}s` }}>
                  <div className="mt-1 mx-1 h-[2px] bg-core-dim/60" />
                  <div className="mt-1 mx-1 h-[2px] bg-core-dim/40" />
                  <div className="mt-1 mx-1 h-[2px] bg-gold/50" />
                </div>
              )}
              <div
                className={`${progress > 30 + i * 9 ? "folder-lid" : ""} absolute inset-0 rounded-sm bg-gradient-to-b from-[#1a4a7a] to-[#0e2c50] border border-core/50`}
                style={{ animationDelay: `${i * 0.08}s` }}
              />
            </div>
            <span className="font-tech text-[8px] tracking-widest text-mist flex items-center gap-1">
              <FolderOpen size={8} className="text-gold" />{f}
            </span>
          </div>
        ))}
      </div>

      {/* boot log */}
      <div className="w-[min(92vw,460px)] h-[132px] panel px-4 py-2.5 overflow-hidden">
        {BOOT_LINES.slice(0, lines).map((l, i) => (
          <div key={i} className="font-tech text-[10px] leading-[13px] text-mist flex justify-between">
            <span>{l.split("...")[0]}</span>
            <span className={l.includes("STANDBY") ? "text-gold" : "text-mint"}>{l.includes("STANDBY") ? "STANDBY" : l.trim().split(/\s+/).pop()}</span>
          </div>
        ))}
        {lines < BOOT_LINES.length && <span className="type-caret font-tech text-[10px] text-core" />}
      </div>

      <div className="w-[min(92vw,460px)]">
        <div className="flex justify-between font-tech text-[10px] text-mist mb-1">
          <span>INITIALIZING MRM CORE</span>
          <span className="text-core">{Math.round(progress)}%</span>
        </div>
        <div className="h-1 bg-line/50 overflow-hidden rounded-full">
          <div className="h-full bg-gradient-to-r from-core-dim via-core to-gold transition-all duration-150" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="font-tech text-[9px] tracking-[0.25em] text-mist/70">CREATED BY {CREATOR.toUpperCase()} • {CREATED.toUpperCase()}</p>

      <button
        onClick={finish}
        className="hud-btn absolute top-5 right-5 px-3 py-1.5 font-tech text-[10px] tracking-widest text-mist flex items-center gap-2"
      >
        <SkipForward size={12} /> SKIP BOOT
      </button>
    </div>
  );
}