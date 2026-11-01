import { useEffect, useRef, useState } from "react";
import {
  Monitor, Globe, Plus, X, ExternalLink, MonitorPlay, Play, FileText,
  MessageCircle, Calculator as CalcIcon, MousePointer2, Send, Download, Delete,
} from "lucide-react";
import { useMRM, WA_CONTACTS } from "../store";
import type { WindowId } from "../lib/types";

const WIN_META: Record<WindowId, { label: string; icon: React.ReactNode }> = {
  browser: { label: "MRM Browser", icon: <Globe size={12} /> },
  notepad: { label: "Notepad", icon: <FileText size={12} /> },
  whatsapp: { label: "WhatsApp", icon: <MessageCircle size={12} /> },
  calculator: { label: "Calculator", icon: <CalcIcon size={12} /> },
};

/* ---------------- Browser ---------------- */
function BrowserWindow() {
  const { s, setActiveTab, uiCloseTab, uiNewTab, toast } = useMRM();
  const tab = s.tabs.find((t) => t.id === s.activeTab) || s.tabs[0];
  const ordinal = ["pehla", "doosra", "teesra", "chautha", "panchwan"];

  return (
    <div className="flex flex-col h-full">
      {/* tab strip */}
      <div className="flex items-end gap-1 px-2 pt-1.5 bg-abyss/60 border-b border-line/40 overflow-x-auto shrink-0">
        {s.tabs.map((t, i) => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`group flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer max-w-[160px] border-t border-x rounded-t-sm font-body text-[11px] font-semibold ${
              t.id === tab?.id
                ? "bg-panel border-core/40 text-core"
                : "bg-deep/60 border-line/30 text-mist hover:text-fog"
            }`}
            title={`Tab ${i + 1}: ${t.title}`}
          >
            {t.kind === "youtube" ? <MonitorPlay size={11} className="text-ember shrink-0" /> : <Globe size={11} className="shrink-0" />}
            <span className="truncate">{t.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); uiCloseTab(t.id); }}
              className="opacity-40 group-hover:opacity-100 hover:text-ember shrink-0"
              title="Tab close karein (Ctrl+W)"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        <button onClick={uiNewTab} title="New tab (Ctrl+T)" className="hud-btn p-1 mb-1 text-core shrink-0"><Plus size={12} /></button>
      </div>

      {/* url bar */}
      {tab && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-deep/70 border-b border-line/40 shrink-0">
          <Globe size={12} className="text-mist shrink-0" />
          <span className="flex-1 font-tech text-[10px] text-mist truncate">{tab.url}</span>
          <button
            onClick={() => { window.open(tab.url, "_blank", "noopener"); toast("Real browser mein khul raha hai", "ok"); }}
            className="hud-btn flex items-center gap-1 px-2 py-0.5 font-tech text-[9px] tracking-wider text-gold"
            title="Ye page asal browser mein kholein"
          >
            <ExternalLink size={10} /> OPEN REAL
          </button>
        </div>
      )}

      {/* page */}
      <div data-mrm-scroll className="flex-1 overflow-y-auto p-3">
        {!tab && <p className="font-tech text-xs text-mist">No tabs open.</p>}

        {tab?.kind === "youtube" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MonitorPlay size={16} className="text-ember" />
              <span className="font-display text-xs tracking-widest text-fog">YOUTUBE RESULTS</span>
              <span className="font-tech text-[9px] text-mist">— "{tab.query}" • SIM PREVIEW</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => window.open(tab.url, "_blank", "noopener")}
                  className={`w-full flex gap-3 p-2 text-left hud-btn ${tab.highlight === n ? "border-gold/70 shadow-[0_0_14px_rgba(242,182,50,0.25)]" : ""}`}
                >
                  <span className={`w-24 h-14 shrink-0 rounded-sm flex items-center justify-center bg-gradient-to-br ${n % 2 ? "from-[#123a5e] to-[#0a1c33]" : "from-[#3a1d12] to-[#160b06]"}`}>
                    <Play size={16} className={tab.highlight === n ? "text-gold" : "text-core"} fill="currentColor" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-body font-bold text-[12px] text-fog truncate">
                      {tab.query} — {tab.highlight === n ? "▶ NOW SELECTED" : `Official Video`} #{n}
                    </span>
                    <span className="block font-tech text-[9px] text-mist mt-0.5">MRM Records • {n * 2 + 3}M views • {n} din pehle</span>
                    <span className="block font-body text-[10px] text-mist/70 truncate mt-0.5">
                      "{tab.query}" ka {ordinal[n - 1]} result — real video ke liye click karein
                    </span>
                  </span>
                  {tab.highlight === n && (
                    <span className="self-center font-tech text-[8px] tracking-widest text-gold border border-gold/50 px-1.5 py-0.5 shrink-0">RESULT #{n}</span>
                  )}
                </button>
              ))}
            </div>
            <p className="font-tech text-[9px] text-mist/60 mt-3">
              TIP: "teesra video chalao" bolein — MRM result #3 select kar degi. Clap 👏 = play/pause.
            </p>
          </div>
        )}

        {tab?.kind === "google" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={15} className="text-core" />
              <span className="font-display text-xs tracking-widest text-fog">GOOGLE — "{tab.query}"</span>
            </div>
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => window.open(tab.url, "_blank", "noopener")} className="block w-full text-left mb-3 group">
                <span className="block font-tech text-[9px] text-mint">https://result-{n}.example.com › {tab.query?.replace(/\s+/g, "-")}</span>
                <span className="block font-body font-bold text-sm text-core group-hover:underline">{tab.query} — {["Complete Guide", "Latest Updates 2026", "Tutorial & Examples", "Expert Analysis"][n - 1]}</span>
                <span className="block font-body text-[11px] text-mist">"{tab.query}" ke baare mein sab kuch — result #{n} ka preview. Asli results OPEN REAL se kholein.</span>
              </button>
            ))}
          </div>
        )}

        {tab?.kind === "site" && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
            <span className="w-16 h-16 rounded-full bg-panel border border-core/30 flex items-center justify-center font-display font-black text-2xl text-core glow-cyan">
              {tab.title.charAt(0).toUpperCase()}
            </span>
            <p className="font-display text-sm tracking-[0.25em] text-fog">{tab.title.toUpperCase()}</p>
            <p className="font-tech text-[10px] text-mist max-w-xs">{tab.url}</p>
            <p className="font-body text-xs text-mist/80 max-w-sm">
              Ye website aapke real browser mein khul chuki hai boss. Yahan MRM ka virtual preview hai — tabs, scroll aur voice control sab kaam karte hain.
            </p>
            <button onClick={() => window.open(tab.url, "_blank", "noopener")} className="hud-btn flex items-center gap-2 px-3 py-1.5 font-tech text-[10px] text-gold tracking-widest">
              <ExternalLink size={11} /> OPEN AGAIN
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Notepad ---------------- */
function NotepadWindow() {
  const { s, setNotepadText, toast } = useMRM();
  const save = () => {
    const blob = new Blob([s.notepadText], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "MRM_Note.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast("MRM_Note.txt download ho gaya", "ok");
  };
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-1 bg-deep/70 border-b border-line/40 font-body text-[10px] text-mist shrink-0">
        <span>File</span><span>Edit</span><span>View</span>
        <span className="ml-auto font-tech text-[9px]">{s.notepadTyping ? "MRM TYPING…" : "READY"}</span>
      </div>
      <div className="relative flex-1">
        <textarea
          data-mrm-scroll
          value={s.notepadText}
          onChange={(e) => setNotepadText(e.target.value)}
          placeholder='Untitled — MRM yahan type karegi…&#10;&#10;Bolein: "Notepad kholo aur Hello MRM likho"'
          className="w-full h-full resize-none bg-[#0a1626] p-3 font-tech text-[12px] leading-relaxed text-fog placeholder:text-mist/40"
          spellCheck={false}
        />
        {s.notepadTyping && <span className="type-caret absolute bottom-3 right-3 font-tech text-xs" />}
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 bg-deep/70 border-t border-line/40 shrink-0">
        <span className="font-tech text-[9px] text-mist">{s.notepadText.length} chars • UTF-8 • SIM notepad.exe</span>
        <button onClick={save} className="hud-btn flex items-center gap-1.5 px-2 py-0.5 font-tech text-[9px] text-gold tracking-wider">
          <Download size={10} /> SAVE .TXT
        </button>
      </div>
    </div>
  );
}

/* ---------------- WhatsApp ---------------- */
function WhatsAppWindow() {
  const { s, setWaContact, setWaDraft, sendWaDraft } = useMRM();
  const contacts = Array.from(new Set([...WA_CONTACTS, ...Object.keys(s.waChats)]));
  const chat = s.waChats[s.waContact] || [];
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, s.waDraft, s.waContact]);

  return (
    <div className="flex h-full">
      <div className="w-32 md:w-40 border-r border-line/40 bg-deep/60 overflow-y-auto shrink-0">
        <p className="px-2.5 py-2 font-tech text-[9px] tracking-widest text-mint border-b border-line/40">CHATS</p>
        {contacts.map((c) => (
          <button
            key={c}
            onClick={() => setWaContact(c)}
            className={`w-full flex items-center gap-2 px-2.5 py-2 text-left border-b border-line/20 ${c === s.waContact ? "bg-panel text-fog" : "text-mist hover:text-fog"}`}
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-mint/40 to-core/30 flex items-center justify-center font-display text-[9px] font-bold text-abyss shrink-0">
              {c.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className="block font-body font-bold text-[11px] truncate">{c}</span>
              <span className="block font-body text-[9px] text-mist/60 truncate">
                {(s.waChats[c] || []).slice(-1)[0]?.text || "Tap to chat"}
              </span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-deep/70 border-b border-line/40 shrink-0">
          <MessageCircle size={13} className="text-mint" />
          <span className="font-body font-bold text-xs text-fog">{s.waContact}</span>
          <span className="font-tech text-[8px] text-mint tracking-widest">● ONLINE (SIM)</span>
        </div>
        <div data-mrm-scroll className="flex-1 overflow-y-auto p-3 space-y-2" style={{ background: "linear-gradient(160deg, rgba(6,20,16,0.5), rgba(6,14,28,0.5))" }}>
          {chat.map((m, i) => (
            <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <span className={`max-w-[75%] px-2.5 py-1.5 rounded-md font-body text-[12px] leading-snug ${m.from === "me" ? "bg-mint/20 text-fog border border-mint/30" : "bg-panel text-fog border border-line/50"}`}>
                {m.text}
              </span>
            </div>
          ))}
          {s.waTyping && (
            <div className="flex justify-end">
              <span className="px-2.5 py-1.5 rounded-md bg-mint/10 border border-mint/20 font-body text-[12px] text-mist">
                {s.waDraft}<span className="type-caret" />
              </span>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="flex items-center gap-2 p-2 bg-deep/70 border-t border-line/40 shrink-0">
          <input
            value={s.waDraft}
            onChange={(e) => setWaDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendWaDraft()}
            placeholder={`Message ${s.waContact}… (voice: "Ali ko message karo: salam")`}
            className="flex-1 min-w-0 bg-abyss/70 border border-line/60 px-2.5 py-1.5 font-body text-xs text-fog placeholder:text-mist/40 focus:border-mint/60 rounded-sm"
          />
          <button onClick={sendWaDraft} title="Send (Enter)" className="hud-btn p-2 text-mint"><Send size={13} /></button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Calculator ---------------- */
function CalculatorWindow() {
  const [expr, setExpr] = useState("");
  const [prev, setPrev] = useState("");
  const press = (k: string) => {
    if (k === "C") { setExpr(""); setPrev(""); return; }
    if (k === "⌫") { setExpr((e) => e.slice(0, -1)); return; }
    if (k === "=") {
      try {
        const clean = expr.replace(/×/g, "*").replace(/÷/g, "/").replace(/[^0-9+\-*/().% ]/g, "");
        if (!clean) return;
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict"; return (${clean})`)();
        setPrev(expr + " =");
        setExpr(String(Math.round(val * 1e10) / 1e10));
      } catch {
        setPrev("Error");
      }
      return;
    }
    setExpr((e) => e + k);
  };
  const keys = ["7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "-", "0", ".", "⌫", "+", "C", "(", ")", "="];
  return (
    <div className="h-full flex flex-col items-center justify-center p-3">
      <div className="w-full max-w-[260px]">
        <div className="bg-abyss/80 border border-line/60 rounded-sm px-3 py-2 mb-2 text-right">
          <div className="font-tech text-[9px] text-mist h-3 truncate">{prev}</div>
          <div className="font-display font-bold text-xl text-core glow-cyan truncate tabular-nums">{expr || "0"}</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {keys.map((k) => (
            <button
              key={k}
              onClick={() => press(k)}
              className={`hud-btn py-2.5 font-display text-sm font-bold ${k === "=" ? "text-abyss bg-gold/80 border-gold hover:bg-gold" : k === "C" ? "text-ember" : ["÷", "×", "-", "+", "(", ")", "⌫"].includes(k) ? "text-gold" : "text-fog"}`}
            >
              {k === "⌫" ? <Delete size={14} className="mx-auto" /> : k}
            </button>
          ))}
        </div>
        <p className="font-tech text-[8px] text-mist/60 tracking-widest mt-2 text-center">CALC.EXE • REAL ENGINE • WINDOWS CALC SIM</p>
      </div>
    </div>
  );
}

/* ---------------- Workspace shell ---------------- */
export default function Workspace() {
  const { s, runCommand, focusWindow, closeWindow } = useMRM();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const amount = (e as CustomEvent).detail as number;
      const el = scrollRef.current?.querySelector("[data-mrm-scroll]") as HTMLElement | null;
      (el || scrollRef.current)?.scrollBy({ top: -amount * 42, behavior: "smooth" });
    };
    window.addEventListener("mrm-scroll", onScroll);
    return () => window.removeEventListener("mrm-scroll", onScroll);
  }, []);

  const focused = s.focused && s.openWindows.includes(s.focused) ? s.focused : s.openWindows[s.openWindows.length - 1] || null;

  return (
    <section className="panel flex-1 min-h-0 flex flex-col overflow-hidden">
      <div className="px-3 py-2 flex items-center justify-between border-b border-line/40 shrink-0">
        <h2 className="panel-title flex items-center gap-2"><Monitor size={11} /> Virtual Desktop</h2>
        <span className="font-tech text-[8px] text-mist tracking-widest">
          1920×1080 SIM • {s.openWindows.length} WINDOW{s.openWindows.length === 1 ? "" : "S"}
          {s.cursor.visible && ` • CURSOR ${Math.round(s.cursor.x * 1920)},${Math.round(s.cursor.y * 1080)}`}
        </span>
      </div>

      <div ref={scrollRef} className="relative flex-1 min-h-0">
        {!focused && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <Monitor size={34} className="text-core/40 anim-float" />
            <p className="font-display text-[11px] tracking-[0.3em] text-mist">DESKTOP IDLE — KOI WINDOW OPEN NAHIN</p>
            <p className="font-body text-xs text-mist/70 max-w-sm">Modules se kuch kholein boss, ya boliye:</p>
            <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
              {["notepad kholo aur Hello MRM likho", "whatsapp kholo", "calculator kholo", "youtube par poem search karo"].map((c) => (
                <button key={c} onClick={() => runCommand(c, "module")} className="chip px-2.5 py-1 font-body text-[10px] text-mist">
                  "{c}"
                </button>
              ))}
            </div>
          </div>
        )}

        {focused && (
          <div className="absolute inset-1.5 flex flex-col bg-[#081627]/95 border border-line/60 anim-panel-in">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-panel/80 border-b border-line/50 shrink-0">
              <span className="text-core">{WIN_META[focused].icon}</span>
              <span className="font-body font-bold text-[11px] text-fog">{WIN_META[focused].label}</span>
              <span className="font-tech text-[8px] text-mist/60">— MRM CONTROLLED</span>
              <button onClick={() => closeWindow(focused)} title="Window close karein" className="ml-auto text-mist hover:text-ember transition-colors">
                <X size={13} />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {focused === "browser" && <BrowserWindow />}
              {focused === "notepad" && <NotepadWindow />}
              {focused === "whatsapp" && <WhatsAppWindow />}
              {focused === "calculator" && <CalculatorWindow />}
            </div>
          </div>
        )}

        {/* virtual cursor */}
        {s.cursor.visible && (
          <div
            className="absolute z-30 pointer-events-none transition-all duration-500 ease-out"
            style={{ left: `${s.cursor.x * 100}%`, top: `${s.cursor.y * 100}%` }}
          >
            {s.cursor.clickAt > 0 && (
              <span key={s.cursor.clickAt} className="absolute -left-3 -top-3 w-8 h-8 rounded-full border-2 border-gold" style={{ animation: "rippleOut 0.7s ease-out both" }} />
            )}
            <MousePointer2 size={17} className="text-gold drop-shadow-[0_0_6px_rgba(242,182,50,0.9)]" fill="#f2b632" />
            <span className="absolute left-4 top-4 font-tech text-[8px] text-gold bg-abyss/80 px-1 py-0.5 whitespace-nowrap border border-gold/30">
              {Math.round(s.cursor.x * 1920)}, {Math.round(s.cursor.y * 1080)}
            </span>
          </div>
        )}

        {/* screenshot flash */}
        {s.flash > 0 && <div key={s.flash} className="absolute inset-0 z-40 bg-white pointer-events-none anim-flash" />}
      </div>

      {/* taskbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-abyss/70 border-t border-line/40 shrink-0 overflow-x-auto">
        <span className="font-tech text-[8px] text-mist/60 tracking-widest mr-1">TASKBAR</span>
        {s.openWindows.length === 0 && <span className="font-tech text-[9px] text-mist/40">— empty —</span>}
        {s.openWindows.map((w) => (
          <button
            key={w}
            onClick={() => focusWindow(w)}
            className={`flex items-center gap-1.5 px-2 py-1 font-body font-semibold text-[10px] border rounded-sm transition-all ${focused === w ? "border-core/60 text-core bg-core/10" : "border-line/50 text-mist hover:text-fog"}`}
          >
            {WIN_META[w].icon} {WIN_META[w].label}
            <span
              onClick={(e) => { e.stopPropagation(); closeWindow(w); }}
              className="hover:text-ember cursor-pointer"
              title={`${WIN_META[w].label} close`}
            >
              <X size={9} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}