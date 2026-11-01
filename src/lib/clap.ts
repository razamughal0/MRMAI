/**
 * MRM CLAP SENSOR
 * Same detection physics as the Python agent:
 *   peak >= 0.30, crest factor >= 4.5, rms >= 0.035, 900ms debounce.
 */

export class ClapDetector {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private lastClap = 0;
  running = false;

  async start(
    onClap: () => void,
    onLevel: (level: number) => void
  ): Promise<{ ok: boolean; error?: string }> {
    if (this.running) return { ok: true };
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new Ctx();
      const src = this.ctx.createMediaStreamSource(this.stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      this.running = true;
      let frame = 0;

      const loop = () => {
        if (!this.running || !this.ctx) return;
        analyser.getFloatTimeDomainData(buf);
        let sum = 0;
        let peak = 0;
        let mean = 0;
        for (let i = 0; i < buf.length; i++) mean += buf[i];
        mean /= buf.length;
        for (let i = 0; i < buf.length; i++) {
          const v = buf[i] - mean;
          const a = Math.abs(v);
          if (a > peak) peak = a;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        frame++;
        if (frame % 3 === 0) onLevel(Math.min(1, peak * 1.6));

        const crest = rms > 0 ? peak / rms : 0;
        const now = performance.now();
        if (
          peak >= 0.3 &&
          crest >= 4.5 &&
          rms >= 0.035 &&
          now - this.lastClap > 900
        ) {
          this.lastClap = now;
          onClap();
        }
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      return { ok: true };
    } catch (e: any) {
      this.stop();
      return { ok: false, error: e?.message || "Microphone access denied" };
    }
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}