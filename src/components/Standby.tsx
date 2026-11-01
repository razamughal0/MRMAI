import { useEffect } from "react";
import { Hand, Mic, Power, Volume2 } from "lucide-react";
import { useMRM, CREATOR, CREATED } from "../store";
import Reactor from "./Reactor";

export default function Standby() {
  const { s, wake, enableClapSensor } = useMRM();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") wake("system");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wake]);

  return (
    <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 anim-panel-in px-4">
      <p className="font-tech text-[10px] tracking-[0.4em] text-mist">SYSTEM READY • STANDBY MODE</p>

      <button onClick={() => wake("system")} className="relative cursor-pointer group" title="Click to wake MRM">
        <Reactor size={250} state={s.clapSensor === "live" ? "listening" : "idle"} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display font-black text-xl tracking-[0.3em] text-abyss/0 group-hover:text-core transition-all duration-300 group-hover:drop-shadow-[0_0_10px_#38e1ff] pl-2">WAKE</span>
        </div>
      </button>

      <div className="text-center">
        <h1 className="font-display text-5xl md:text-6xl font-black tracking-[0.4em] text-core glow-cyan pl-4">MRM</h1>
        <p className="font-body font-semibold text-mist tracking-[0.2em] mt-2 text-sm">PERSONAL WINDOWS AI ASSISTANT</p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3 anim-blink">
          <Hand size={18} className="text-gold" />
          <span className="font-display text-sm tracking-[0.35em] text-gold glow-gold">CLAP TO WAKE</span>
          <Hand size={18} className="text-gold -scale-x-100" />
        </div>

        {s.clapSensor === "live" ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 font-tech text-[10px] text-mint tracking-widest">
              <Mic size={12} className="anim-blink" /> CLAP SENSOR LIVE — LISTENING
            </div>
            <div className="w-56 h-1.5 bg-line/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-mint to-gold transition-all duration-75" style={{ width: `${Math.round(s.micLevel * 100)}%` }} />
            </div>
            <p className="font-body text-xs text-mist">Ek zor ka clap karein boss 👏 — ya orb par click karein</p>
          </div>
        ) : (
          <button
            onClick={enableClapSensor}
            disabled={s.clapSensor === "starting"}
            className="hud-btn px-5 py-2.5 flex items-center gap-2 font-display text-[11px] tracking-[0.25em] text-core"
          >
            <Mic size={14} />
            {s.clapSensor === "starting" ? "REQUESTING MIC…" : s.clapSensor === "denied" ? "MIC BLOCKED — RETRY" : "ENABLE CLAP SENSOR"}
          </button>
        )}

        <button
          onClick={() => wake("system")}
          className="hud-btn px-5 py-2 flex items-center gap-2 font-tech text-[10px] tracking-[0.25em] text-mist"
        >
          <Power size={12} className="text-gold" /> ENTER MANUALLY
        </button>
      </div>

      <div className="absolute bottom-5 inset-x-0 flex flex-col items-center gap-1">
        <p className="font-tech text-[9px] tracking-[0.3em] text-mist/70 flex items-center gap-2">
          <Volume2 size={10} className="text-core" /> VOICE REPLIES {s.settings.voiceOn ? "ON" : "OFF"} • BRIDGE {s.bridge.toUpperCase()}
        </p>
        <p className="font-tech text-[9px] tracking-[0.25em] text-mist/50">CREATED BY {CREATOR.toUpperCase()} • {CREATED.toUpperCase()}</p>
      </div>
    </div>
  );
}