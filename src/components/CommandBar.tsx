import { useEffect, useRef, useState } from "react";
import { Mic, Send, History, Sparkles, X, Languages } from "lucide-react";
import { useMRM } from "../store";

const LANGS = [
  { code: "en-IN", label: "ROM", full: "Roman Urdu — fast direct commands" },
  { code: "ur-PK", label: "اردو", full: "خالص اردو — Gemini brain har lafz samjhega" },
  { code: "hi-IN", label: "हिंदी", full: "शुद्ध हिंदी — Gemini brain हर शब्द समझेगा" },
];

const SUGGESTIONS = [
  "YouTube par poem search karo aur pehla video chalao",
  "Notepad kholo aur Hello MRM likho",
  "WhatsApp kholo aur Ali ko message karo: salam",
  "Google par AI news search karo",
  "screenshot lo",
  "time kya hai",
  "500 300 par click karo",
  "neeche scroll karo",
  "clap control on karo",
  "kisne banaya",
];

const STATE_LABEL: Record<string, { text: string; urdu: string; color: string }> = {
  idle: { text: "STANDBY", urdu: "Hukum ka intezar hai boss", color: "text-core" },
  listening: { text: "LISTENING", urdu: "Sun rahi hoon boss…", color: "text-mint" },
  speaking: { text: "SPEAKING", urdu: "MRM jawab de rahi hai…", color: "text-gold" },
  executing: { text: "EXECUTING", urdu: "Command execute ho rahi hai…", color: "text-core" },
};

export default function CommandBar() {
  const { s, runCommand, toggleMic, setVoiceLang } = useMRM();
  const [text, setText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k")) && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (!text.trim()) return;
    runCommand(text, "text");
    setText("");
    setShowHistory(false);
  };

  const st = STATE_LABEL[s.core];
  const recent = [...s.commands].reverse().slice(0, 8);

  return (
    <div className="relative z-20 px-3 pb-3 anim-panel-in" style={{ animationDelay: "0.15s" }}>
      {/* suggestions */}
      <div className="flex items-center gap-1.5 mb-1.5 overflow-x-auto pb-0.5">
        <span className="font-tech text-[8px] tracking-[0.2em] text-gold flex items-center gap-1 shrink-0">
          <Sparkles size={9} /> TRY:
        </span>
        {SUGGESTIONS.slice(0, 6).map((c) => (
          <button key={c} onClick={() => runCommand(c, "module")} className="chip px-2 py-0.5 font-body font-semibold text-[10px] text-mist whitespace-nowrap shrink-0">
            {c}
          </button>
        ))}
      </div>

      <div className={`panel flex items-center gap-2 px-2.5 py-2 ${s.shutdownPrompt ? "anim-alert border-ember/60" : ""}`}>
        {/* mic */}
        <button
          onClick={toggleMic}
          title={s.micOn ? "Mic ALWAYS ON hai — click karke OFF karein" : "Mic ON karein (phir hamesha sunta rahega)"}
          className={`relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 border transition-all ${
            s.micOn
              ? "bg-ember/20 border-ember text-ember shadow-[0_0_18px_rgba(255,93,71,0.5)]"
              : "hud-btn border-core/40 text-core"
          }`}
        >
          {s.micOn && <span className="absolute inset-0 rounded-full border border-ember ring-ping" />}
          <Mic size={17} />
        </button>

        {/* status + input */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 font-tech text-[8px] tracking-[0.2em]">
            <span className={`${st.color} anim-blink`}>● {st.text}</span>
            <span className="text-mist/60 truncate hidden sm:inline">
              {s.micOn && s.interim ? `"${s.interim}"` : st.urdu}
            </span>
            <button
              onClick={() => {
                const i = LANGS.findIndex((l) => l.code === s.settings.voiceLang);
                setVoiceLang(LANGS[(i + 1) % LANGS.length].code);
              }}
              title={`Voice input language: ${LANGS.find((l) => l.code === s.settings.voiceLang)?.full || s.settings.voiceLang} — click se badlein`}
              className="chip ml-auto flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-gold shrink-0"
            >
              <Languages size={9} />
              {LANGS.find((l) => l.code === s.settings.voiceLang)?.label || "ROM"}
            </button>
            <span className="text-mist/40 hidden md:inline">
              {s.micOn ? "MIC ALWAYS ON • / TO TYPE" : "PRESS / TO TYPE"}
            </span>
          </div>
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={
              s.shutdownPrompt
                ? 'Shutdown confirm karne ke liye exactly "YES" likhein…'
                : 'Command likhein boss… jaise "YouTube par poem search karo aur pehla video chalao"'
            }
            className={`w-full bg-transparent font-body font-semibold text-sm py-1 placeholder:text-mist/40 ${s.shutdownPrompt ? "text-ember placeholder:text-ember/50" : "text-fog"}`}
          />
        </div>

        {/* history */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowHistory((v) => !v)}
            title="Recent commands (history)"
            className={`hud-btn p-2.5 ${showHistory ? "text-gold border-gold/50" : "text-mist"}`}
          >
            <History size={15} />
          </button>
          {showHistory && (
            <div className="absolute bottom-12 right-0 w-72 panel p-2 z-50 anim-panel-in">
              <div className="flex items-center justify-between px-1 pb-1.5 border-b border-line/40 mb-1">
                <span className="font-tech text-[9px] tracking-widest text-gold">RECENT COMMANDS</span>
                <button onClick={() => setShowHistory(false)} className="text-mist hover:text-fog"><X size={11} /></button>
              </div>
              {recent.length === 0 && <p className="font-body text-[11px] text-mist/60 p-2">Abhi koi command nahi — kuch try karein boss.</p>}
              {recent.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { runCommand(c.text, "text"); setShowHistory(false); }}
                  className="w-full text-left px-2 py-1.5 hover:bg-core/10 transition-colors flex items-center gap-2"
                >
                  <span className="font-tech text-[8px] text-core/60 w-16 truncate shrink-0">{c.intent}</span>
                  <span className="font-body text-[11px] text-fog truncate">{c.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* send */}
        <button
          onClick={submit}
          title="Command execute karein (Enter)"
          className="hud-btn w-11 h-11 flex items-center justify-center text-gold border-gold/40 shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}