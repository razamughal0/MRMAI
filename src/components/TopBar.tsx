import { useEffect, useState } from "react";
import { Hexagon, Zap, Volume2, VolumeX, Hand, Mic, MicOff, Cable, Settings2, BrainCircuit, Headphones, AudioLines } from "lucide-react";
import { useMRM, CREATOR } from "../store";

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hidden md:flex flex-col items-center leading-none">
      <span className="font-display font-bold text-lg text-core glow-cyan tracking-widest tabular-nums">
        {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
      </span>
      <span className="font-tech text-[9px] text-mist tracking-[0.25em] mt-1">
        {now.toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
      </span>
    </div>
  );
}

function Pill({
  icon, label, on, warn, onClick, title,
}: {
  icon: React.ReactNode; label: string; on: boolean; warn?: boolean; onClick: () => void; title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`hud-btn flex items-center gap-1.5 px-2 py-1 font-tech text-[9px] tracking-widest ${on ? "text-core" : warn ? "text-ember" : "text-mist"}`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-mint shadow-[0_0_6px_#3ddc97]" : warn ? "bg-ember" : "bg-mist/40"} ${on ? "anim-blink" : ""}`} />
    </button>
  );
}

export default function TopBar() {
  const { s, toggleVoice, toggleClapControl, toggleMic, retryBridge, setSideTab, testBrain, toggleLiveKit, toggleSfx } = useMRM();
  return (
    <header className="relative z-20 panel mx-3 mt-3 px-3 py-2 flex items-center justify-between gap-3 anim-panel-in">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
          <Hexagon size={36} className="text-core anim-spin-slower" strokeWidth={1} />
          <Zap size={15} className="absolute text-gold" fill="currentColor" />
        </div>
        <div className="leading-none min-w-0">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display font-black text-xl tracking-[0.3em] text-core glow-cyan">MRM</h1>
            <span className="font-tech text-[9px] text-gold tracking-widest hidden sm:inline">MARK-III</span>
          </div>
          <p className="font-tech text-[8px] text-mist tracking-[0.2em] mt-1 truncate">
            PERSONAL WINDOWS AI • BY {CREATOR.toUpperCase()}
          </p>
        </div>
      </div>

      <Clock />

      <div className="flex items-center gap-1.5">
        <Pill
          icon={<BrainCircuit size={12} />}
          label={s.gemini === "quota" ? "QUOTA" : s.gemini === "checking" ? "BRAIN…" : "BRAIN"}
          on={s.gemini === "online"}
          warn={s.gemini === "error" || s.gemini === "nokey" || s.gemini === "quota"}
          onClick={testBrain}
          title={
            s.gemini === "online"
              ? "Gemini brain ONLINE — click to re-test"
              : s.gemini === "quota"
                ? "Free quota khatam (429) — auto-retry har 60s • lite models bhi try hote hain"
                : `Gemini brain: ${s.geminiError || s.gemini} — click to test`
          }
        />
        <Pill
          icon={<AudioLines size={12} />}
          label="SFX" on={s.settings.sfxOn} onClick={toggleSfx}
          title="Premium sound effects on/off (boot, wake, clicks, chimes)"
        />
        <Pill
          icon={<Headphones size={12} />}
          label={s.livekit === "live" ? "LK LIVE" : s.livekit === "waiting" ? "LK WAIT" : "LK"}
          on={s.livekit === "live"}
          warn={s.livekit === "error"}
          onClick={toggleLiveKit}
          title={
            s.livekit === "live"
              ? "LiveKit Gemini voice LIVE — click to disconnect"
              : s.livekit === "waiting"
                ? "Room joined — Urdu agent chalayein (python backend/mrm_agent_urdu.py dev)"
                : `LiveKit voice ${s.livekit}${s.lkError ? ": " + s.lkError : ""} — click to connect`
          }
        />
        <Pill
          icon={s.settings.voiceOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
          label="VOICE" on={s.settings.voiceOn} onClick={toggleVoice}
          title="MRM ki awaz on/off karein"
        />
        <Pill
          icon={<Hand size={12} />}
          label={s.clapSensor === "live" ? "CLAP LIVE" : "CLAP"}
          on={s.settings.clapControl && s.clapSensor === "live"}
          warn={s.clapSensor === "denied"}
          onClick={toggleClapControl}
          title="Clap play/pause control — sensor arm karta hai"
        />
        <Pill
          icon={s.micOn ? <Mic size={12} /> : <MicOff size={12} />}
          label="MIC" on={s.micOn} onClick={toggleMic}
          title="Voice commands sunna shuru/band karein"
        />
        <Pill
          icon={<Cable size={12} />}
          label={s.bridge === "online" ? "BRIDGE" : "SIM"}
          on={s.bridge === "online"} onClick={retryBridge}
          title="Python backend bridge — real Windows control (ws://127.0.0.1:8765)"
        />
        <button
          onClick={() => setSideTab("setup")}
          title="Setup / .env / Backend guide"
          className="hud-btn p-1.5 text-gold"
        >
          <Settings2 size={13} />
        </button>
      </div>
    </header>
  );
}