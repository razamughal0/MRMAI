/**
 * MRM PREMIUM SFX — synthesized sci-fi HUD sound design (Web Audio).
 * Boot ticks, power-up sweeps, command blips, success chimes, clap ping,
 * shutdown drop. Sab live synthesize hota hai — koi audio file nahi.
 * Pehle user gesture par unlock hota hai (browser autoplay policy).
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = true;

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

export function sfxUnlock(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

function ready(): boolean {
  if (!enabled) return false;
  sfxUnlock();
  return !!ctx && !!master && ctx.state === "running";
}

interface ToneOpts {
  f: number;
  to?: number;
  t?: OscillatorType;
  d: number;
  g?: number;
  at?: number;
  delay?: number;
}

function tone({ f, to, t = "sine", d, g = 0.08, at = 0.008, delay = 0 }: ToneOpts): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = t;
  osc.frequency.setValueAtTime(f, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + d);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(g, t0 + at);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + d + 0.05);
}

function whoosh({ d = 0.6, g = 0.06, from = 400, to = 2400, delay = 0 }: { d?: number; g?: number; from?: number; to?: number; delay?: number }): void {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * d);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = "bandpass";
  filt.Q.value = 1.2;
  filt.frequency.setValueAtTime(from, t0);
  filt.frequency.exponentialRampToValueAtTime(to, t0 + d);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(g, t0 + d * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(filt).connect(gain).connect(master);
  src.start(t0);
}

export const sfx = {
  /** Har button press — halka sci-fi tick */
  tick(): void {
    if (!ready()) return;
    tone({ f: 2300, t: "square", d: 0.035, g: 0.028 });
    tone({ f: 1150, d: 0.05, g: 0.02, delay: 0.005 });
  },
  /** Boot log line */
  bootTick(): void {
    if (!ready()) return;
    tone({ f: 1750 + Math.random() * 350, t: "square", d: 0.025, g: 0.022 });
  },
  /** Boot complete — soft major chord */
  bootDone(): void {
    if (!ready()) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ f, t: "triangle", d: 0.55, g: 0.05, delay: i * 0.09 })
    );
    whoosh({ d: 0.8, g: 0.03, from: 300, to: 3200 });
  },
  /** Wake / power-up — rising sweep + sparkle arp */
  powerUp(): void {
    if (!ready()) return;
    tone({ f: 110, to: 880, t: "sawtooth", d: 0.65, g: 0.05 });
    whoosh({ d: 0.7, g: 0.05, from: 200, to: 2800 });
    [659.25, 880, 1174.66, 1760].forEach((f, i) =>
      tone({ f, t: "sine", d: 0.3, g: 0.045, delay: 0.35 + i * 0.07 })
    );
  },
  /** Command bhejte waqt */
  blip(): void {
    if (!ready()) return;
    tone({ f: 880, to: 1420, d: 0.09, g: 0.05 });
  },
  /** Kaam kamyab */
  success(): void {
    if (!ready()) return;
    tone({ f: 880, t: "triangle", d: 0.12, g: 0.05 });
    tone({ f: 1318.5, t: "triangle", d: 0.22, g: 0.05, delay: 0.09 });
  },
  /** Toast / info pop */
  pop(): void {
    if (!ready()) return;
    tone({ f: 540, to: 760, d: 0.07, g: 0.04 });
  },
  /** Warning */
  warn(): void {
    if (!ready()) return;
    tone({ f: 420, t: "triangle", d: 0.14, g: 0.05 });
    tone({ f: 340, t: "triangle", d: 0.18, g: 0.045, delay: 0.11 });
  },
  /** Error — low double buzz */
  error(): void {
    if (!ready()) return;
    tone({ f: 170, t: "sawtooth", d: 0.16, g: 0.05 });
    tone({ f: 120, t: "sawtooth", d: 0.22, g: 0.05, delay: 0.13 });
  },
  /** Clap detect — sharp ping */
  clap(): void {
    if (!ready()) return;
    tone({ f: 1500, to: 2300, d: 0.1, g: 0.06 });
    whoosh({ d: 0.12, g: 0.04, from: 1500, to: 4500 });
  },
  /** Screenshot shutter */
  shutter(): void {
    if (!ready()) return;
    whoosh({ d: 0.06, g: 0.07, from: 3500, to: 900 });
    tone({ f: 900, to: 300, t: "square", d: 0.06, g: 0.03, delay: 0.05 });
  },
  /** Shutdown — falling power drop */
  powerDown(): void {
    if (!ready()) return;
    tone({ f: 820, to: 70, t: "sawtooth", d: 1.0, g: 0.06 });
    tone({ f: 410, to: 40, t: "sine", d: 1.1, g: 0.05, delay: 0.05 });
    whoosh({ d: 1.0, g: 0.035, from: 2600, to: 120 });
  },
};