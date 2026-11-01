import { useEffect, useRef, useState } from "react";
import { Power, AlertTriangle, RotateCcw } from "lucide-react";
import { useMRM, CREATOR } from "../store";

export function ShutdownModal() {
  const { s, confirmShutdown, cancelShutdown } = useMRM();
  const [val, setVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (s.shutdownPrompt) {
      setVal("");
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [s.shutdownPrompt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && s.shutdownPrompt) cancelShutdown();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.shutdownPrompt, cancelShutdown]);

  if (!s.shutdownPrompt) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 backdrop-blur-sm p-4">
      <div className="panel anim-alert border-ember/60 max-w-md w-full p-6 anim-panel-in">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-12 h-12 rounded-full bg-ember/15 border border-ember/60 flex items-center justify-center">
            <Power size={22} className="text-ember anim-blink" />
          </span>
          <div>
            <h2 className="font-display font-bold text-sm tracking-[0.25em] text-ember glow-red">SHUTDOWN PROTOCOL</h2>
            <p className="font-tech text-[9px] text-mist tracking-widest mt-1">SAFETY CONFIRMATION REQUIRED</p>
          </div>
        </div>

        <p className="font-body font-semibold text-base text-fog leading-snug mb-1">
          "PC shutdown karna hai boss? Please say <span className="text-ember font-bold">YES</span> to confirm."
        </p>
        <p className="font-body text-xs text-mist mb-4 flex items-center gap-1.5">
          <AlertTriangle size={11} className="text-gold shrink-0" />
          Sirf exact YES chalega — "haan", "okay", "yes please" cancel kar denge.
        </p>

        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmShutdown(val)}
            placeholder="YES likhein ya bolein…"
            className="flex-1 bg-abyss/80 border border-ember/40 px-3 py-2.5 font-display font-bold tracking-[0.3em] text-ember placeholder:text-mist/40 placeholder:font-body placeholder:tracking-normal placeholder:font-normal text-sm focus:border-ember"
          />
          <button onClick={() => setVal("YES")} className="chip px-3 font-tech text-[10px] text-gold" title="YES autofill">YES</button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => confirmShutdown(val)}
            className="flex-1 py-2.5 font-display text-[11px] tracking-[0.25em] font-bold text-abyss bg-ember/90 hover:bg-ember transition-colors border border-ember"
          >
            CONFIRM SHUTDOWN
          </button>
          <button onClick={cancelShutdown} className="flex-1 hud-btn py-2.5 font-display text-[11px] tracking-[0.25em] text-mint">
            CANCEL (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShutdownScreen() {
  const { reboot, s } = useMRM();
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6">
      <div className="w-full h-[2px] bg-core/80 anim-crt-off absolute top-1/2" />
      <div className="anim-flicker flex flex-col items-center gap-5 text-center px-4" style={{ animationDelay: "0.7s" }}>
        <Power size={40} className="text-ember/70" />
        <h1 className="font-display font-black text-2xl tracking-[0.4em] text-mist pl-4">MRM OFFLINE</h1>
        <p className="font-tech text-[10px] text-mist/60 tracking-widest leading-relaxed max-w-md">
          {s.bridge === "online"
            ? "BRIDGE COMMAND EXECUTED: shutdown /s /t 5"
            : "SIMULATION: Windows agent command bheji gayi → shutdown /s /t 5"}
          <br />SESSION DATABASE SURAKSHIT HAI • {s.messages.length} MESSAGES SAVED
        </p>
        <button
          onClick={reboot}
          className="hud-btn flex items-center gap-2 px-6 py-3 font-display text-[11px] tracking-[0.3em] text-core border-core/50"
        >
          <RotateCcw size={14} /> REBOOT MRM
        </button>
        <p className="font-tech text-[8px] text-mist/40 tracking-[0.3em]">MARK-III • {CREATOR.toUpperCase()}</p>
      </div>
    </div>
  );
}