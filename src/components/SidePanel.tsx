import { useEffect, useRef, useState } from "react";
import {
  MessagesSquare, SquareTerminal, Database, Settings2, Bot, User, Mic, Keyboard,
  Hand, LayoutGrid, Download, Trash2, Copy, Cable, RefreshCw, HardDrive, Activity,
  Server, BrainCircuit, Headphones, ScanEye, Rocket, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { useMRM, type SideTab } from "../store";
import { dbSizeBytes } from "../lib/db";
import { getBridgeUrl, setBridgeUrl } from "../lib/bridge";

const TABS: { id: SideTab; label: string; icon: React.ReactNode }[] = [
  { id: "comms", label: "COMMS", icon: <MessagesSquare size={11} /> },
  { id: "activity", label: "LOG", icon: <SquareTerminal size={11} /> },
  { id: "database", label: "DB", icon: <Database size={11} /> },
  { id: "setup", label: "SETUP", icon: <Settings2 size={11} /> },
];

function SourceIcon({ src }: { src: string }) {
  if (src === "voice") return <Mic size={9} />;
  if (src === "clap") return <Hand size={9} />;
  if (src === "module") return <LayoutGrid size={9} />;
  return <Keyboard size={9} />;
}

function Comms() {
  const { s } = useMRM();
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [s.messages.length, s.interim]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
      {s.messages.length === 0 && (
        <div className="text-center pt-8">
          <Bot size={26} className="mx-auto text-core/40 mb-2" />
          <p className="font-body text-xs text-mist">MRM se baat karein boss — mic dabayein ya command likhein.</p>
          <p className="font-tech text-[9px] text-mist/50 mt-1">"salam" • "time kya hai" • "kisne banaya"</p>
        </div>
      )}
      {s.messages.map((m) => (
        <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${m.role === "mrm" ? "border-core/50 text-core bg-core/10" : "border-gold/50 text-gold bg-gold/10"}`}>
            {m.role === "mrm" ? <Bot size={12} /> : <User size={12} />}
          </span>
          <div className={`max-w-[82%] ${m.role === "user" ? "text-right" : ""}`}>
            <div className={`inline-block px-2.5 py-1.5 border font-body text-[12px] leading-snug whitespace-pre-line text-left ${m.role === "mrm" ? "border-core/25 bg-core/5 text-fog" : "border-gold/25 bg-gold/5 text-fog"}`}>
              {m.text}
            </div>
            <div className={`flex items-center gap-1 mt-0.5 font-tech text-[8px] text-mist/50 ${m.role === "user" ? "justify-end" : ""}`}>
              <SourceIcon src={m.source} />
              {new Date(m.ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>
      ))}
      {s.micOn && s.interim && (
        <div className="flex gap-2 flex-row-reverse">
          <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border border-mint/50 text-mint bg-mint/10 anim-blink"><Mic size={12} /></span>
          <div className="px-2.5 py-1.5 border border-mint/30 bg-mint/5 font-body text-[12px] text-mist italic">{s.interim}…</div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  ok: "text-mint border-mint/40",
  sim: "text-gold border-gold/40",
  warn: "text-ember border-ember/40",
  error: "text-ember border-ember/60 bg-ember/10",
};

function ActivityLog() {
  const { s } = useMRM();
  const items = [...s.activity].reverse();
  return (
    <div className="flex-1 overflow-y-auto p-2.5 space-y-1">
      {items.length === 0 && <p className="font-tech text-[10px] text-mist/50 p-3">— activity log empty —</p>}
      {items.map((a) => (
        <div key={a.id} className="flex items-start gap-2 px-1.5 py-1 border-b border-line/20">
          <span className="font-tech text-[8px] text-mist/50 pt-0.5 shrink-0 tabular-nums">
            {new Date(a.ts).toLocaleTimeString("en-US", { hour12: false })}
          </span>
          <span className={`font-tech text-[8px] px-1 border rounded-sm shrink-0 ${STATUS_STYLE[a.status]}`}>
            {a.status.toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block font-tech text-[10px] text-core truncate">{a.tool}</span>
            <span className="block font-body text-[10px] text-mist leading-tight break-words">{a.detail}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function DatabasePanel() {
  const { s, exportDatabase, clearDatabase } = useMRM();
  const [confirming, setConfirming] = useState(false);
  const size = dbSizeBytes();
  const stats = [
    { label: "MESSAGES", val: s.messages.length, icon: <MessagesSquare size={12} /> },
    { label: "COMMANDS", val: s.commands.length, icon: <SquareTerminal size={12} /> },
    { label: "ACTIVITY", val: s.activity.length, icon: <Activity size={12} /> },
    { label: "BOOTS", val: s.meta.boots, icon: <RefreshCw size={12} /> },
    { label: "CLAPS", val: s.meta.claps, icon: <Hand size={12} /> },
    { label: "SIZE", val: `${(size / 1024).toFixed(1)}K`, icon: <HardDrive size={12} /> },
  ];
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Database size={13} className="text-gold" />
        <span className="font-display text-[10px] tracking-[0.25em] text-fog">MRM LOCAL DATABASE</span>
        <span className="ml-auto font-tech text-[8px] text-mint anim-blink">● AUTOSAVE</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {stats.map((st) => (
          <div key={st.label} className="hud-btn px-2 py-2 text-center">
            <span className="text-core flex justify-center mb-1">{st.icon}</span>
            <span className="block font-display font-bold text-sm text-fog tabular-nums">{st.val}</span>
            <span className="block font-tech text-[7px] tracking-widest text-mist">{st.label}</span>
          </div>
        ))}
      </div>

      <div>
        <p className="font-tech text-[9px] tracking-[0.25em] text-gold mb-1.5">RECENT COMMANDS</p>
        {[...s.commands].reverse().slice(0, 6).map((c) => (
          <div key={c.id} className="flex items-center gap-2 py-1 border-b border-line/20">
            <span className="font-tech text-[8px] text-core/70 shrink-0 w-20 truncate">{c.intent}</span>
            <span className="font-body text-[10px] text-mist truncate">{c.text}</span>
          </div>
        ))}
        {s.commands.length === 0 && <p className="font-tech text-[9px] text-mist/50">— abhi koi command nahi —</p>}
      </div>

      <div className="flex gap-2">
        <button onClick={exportDatabase} className="hud-btn flex-1 flex items-center justify-center gap-1.5 py-2 font-tech text-[9px] tracking-widest text-mint">
          <Download size={11} /> EXPORT JSON
        </button>
        <button
          onClick={() => { if (confirming) { clearDatabase(); setConfirming(false); } else { setConfirming(true); setTimeout(() => setConfirming(false), 3000); } }}
          className={`hud-btn flex-1 flex items-center justify-center gap-1.5 py-2 font-tech text-[9px] tracking-widest ${confirming ? "text-ember border-ember/60 anim-alert" : "text-ember"}`}
        >
          <Trash2 size={11} /> {confirming ? "PAKKA? CLICK AGAIN" : "WIPE DB"}
        </button>
      </div>
      <p className="font-tech text-[8px] text-mist/50 leading-relaxed">
        STORAGE: localStorage (mrm_database_v1) • Tables: messages, commands, activity, settings, meta •
        Backend bridge connect hone par yehi schema Python SQLite se sync ho sakta hai.
      </p>
    </div>
  );
}

const ENV_TEMPLATE = `# MRM — .env.local (aapki keys already set hain!)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_VISION_MODEL=gemini-3.5-flash

# LiveKit (voice agent ke liye)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# MRM tuning
MRM_GUI_ACTION_DELAY=0.15
MRM_VISION_CONFIDENCE_MIN=0.55
MRM_BRIDGE_PORT=8765`;

const PIP_CMD = "pip install fastapi uvicorn websockets pyautogui pyperclip requests python-dotenv pillow";

function Diagnostics() {
  const { s, retryBridge, testBrain, toggleLiveKit, testVision, enableClapSensor, toggleMic } = useMRM();
  const lkLabel: Record<string, string> = { off: "off", connecting: "connecting…", waiting: "waiting agent", live: "LIVE", error: "error" };
  const rows: {
    icon: React.ReactNode; label: string; value: string; ok: boolean; warn?: boolean;
    action?: () => void; btn?: string; hint?: string;
  }[] = [
    {
      icon: <Server size={12} />, label: "Backend API",
      value: s.bridge === "online" ? "online" : "offline (SIM)", ok: s.bridge === "online",
      action: retryBridge, btn: "RETRY", hint: "Real OS control: python backend/mrm_bridge.py",
    },
    {
      icon: <BrainCircuit size={12} />, label: "Gemini brain",
      value: s.gemini === "online" ? "online" : s.gemini === "checking" ? "testing…" : s.gemini === "nokey" ? "no key" : s.gemini === "quota" ? "quota limit" : "key error",
      ok: s.gemini === "online", warn: s.gemini === "error" || s.gemini === "quota",
      action: testBrain, btn: "TEST",
      hint: s.gemini === "quota"
        ? "Free quota khatam (429) — har model ka quota alag, lite try hota hai • auto-retry 60s"
        : s.geminiError || "Multi-model fallback: 3.5-flash → lite → latest",
    },
    {
      icon: <Headphones size={12} />, label: "LiveKit voice",
      value: lkLabel[s.livekit], ok: s.livekit === "live", warn: s.livekit === "error" || s.livekit === "waiting",
      action: toggleLiveKit, btn: s.livekit === "off" || s.livekit === "error" ? "CONNECT" : "STOP",
      hint: s.lkError || (s.livekit === "waiting" ? "Agent chalayein: python backend/mrm_agent_urdu.py dev" : "mrmbot-lbjir15c.livekit.cloud"),
    },
    {
      icon: <ScanEye size={12} />, label: "Screen vision",
      value: s.vision === "ready" ? (s.gemini === "online" ? "ready" : "needs brain") : s.vision === "nokey" ? "missing" : "unsupported",
      ok: s.vision === "ready" && s.gemini === "online",
      action: testVision, btn: "TEST", hint: "Screen share + Gemini = real vision",
    },
    {
      icon: <Hand size={12} />, label: "Clap sensor",
      value: s.clapSensor === "live" ? "LIVE" : s.clapSensor === "starting" ? "arming…" : s.clapSensor,
      ok: s.clapSensor === "live", warn: s.clapSensor === "denied",
      action: enableClapSensor, btn: "ARM", hint: "peak≥0.30 • crest≥4.5 • rms≥0.035",
    },
    {
      icon: <Mic size={12} />, label: "Voice input",
      value: s.livekit === "live" ? "livekit" : s.micOn ? (s.settings.alwaysMic ? "always-on" : "listening") : "idle",
      ok: s.micOn || s.livekit === "live",
      action: toggleMic, btn: s.micOn ? "OFF" : "ON",
      hint: `Lang: ${s.settings.voiceLang} • Output: Gemini Aoede Urdu TTS`,
    },
    {
      icon: <Bot size={12} />, label: "Assistant",
      value: "ready", ok: true, hint: "MRM Mark-III • Aoede persona",
    },
  ];
  return (
    <div>
      <p className="font-tech text-[9px] tracking-[0.25em] text-gold mb-1.5">SYSTEM DIAGNOSTICS</p>
      <div className="border border-line/50 divide-y divide-line/30">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2 px-2 py-1.5" title={r.hint}>
            <span className={r.ok ? "text-mint" : r.warn ? "text-ember" : "text-mist"}>{r.icon}</span>
            <span className="font-body font-semibold text-[11px] text-fog w-24 shrink-0">{r.label}</span>
            <span className={`font-tech text-[9px] truncate ${r.ok ? "text-mint" : r.warn ? "text-ember" : "text-mist"}`}>
              {r.ok ? "● " : r.warn ? "▲ " : "○ "}
              {r.value}
            </span>
            {r.action && (
              <button onClick={r.action} className="hud-btn ml-auto px-1.5 py-0.5 font-tech text-[8px] tracking-wider text-core shrink-0">
                {r.btn}
              </button>
            )}
          </div>
        ))}
      </div>
      {(s.gemini === "error" || s.livekit === "error") && (
        <p className="font-tech text-[8px] text-ember/90 mt-1.5 leading-relaxed break-words">
          {s.gemini === "error" && `GEMINI: ${s.geminiError}`}
          {s.gemini === "error" && s.livekit === "error" && " • "}
          {s.livekit === "error" && `LIVEKIT: ${s.lkError}`}
        </p>
      )}
    </div>
  );
}

function SetupPanel() {
  const { s, retryBridge, toast } = useMRM();
  const [bridgeUrl, setBridgeUrlInput] = useState(getBridgeUrl());
  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast(`${label} copy ho gaya`, "ok"),
      () => toast("Copy failed — manually select karein", "warn")
    );
  };
  const Block = ({ title, code }: { title: string; code: string }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="font-tech text-[9px] tracking-[0.2em] text-gold">{title}</p>
        <button onClick={() => copy(code, title)} className="hud-btn flex items-center gap-1 px-1.5 py-0.5 font-tech text-[8px] text-core">
          <Copy size={9} /> COPY
        </button>
      </div>
      <pre className="bg-abyss/80 border border-line/50 p-2 font-tech text-[9px] leading-relaxed text-mint/90 overflow-x-auto whitespace-pre-wrap break-all">{code}</pre>
    </div>
  );
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <Diagnostics />

      {/* LOCAL SERVER QUICK START */}
      <div className="border border-gold/30 bg-gold/5 p-2.5 space-y-2">
        <div className="flex items-center gap-2">
          <Rocket size={13} className="text-gold" />
          <span className="font-display text-[10px] tracking-[0.2em] text-gold">LOCAL SERVER — QUICK START</span>
        </div>
        <div className="flex flex-wrap gap-1.5 font-tech text-[8px]">
          <span className="px-1.5 py-0.5 border border-line/60 text-mist">
            PAGE: {location.origin === "null" ? "file://" : location.origin}
          </span>
          <span className={`px-1.5 py-0.5 border ${window.isSecureContext ? "border-mint/50 text-mint" : "border-ember/60 text-ember"}`}>
            {window.isSecureContext ? "✓ SECURE — MIC / VOICE OK" : "✗ NOT SECURE — MIC / VOICE BLOCKED"}
          </span>
        </div>
        {!window.isSecureContext && (
          <p className="font-body text-[10px] text-ember leading-snug flex gap-1.5">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            Aap LAN IP ya file:// par hain — isi PC par http://localhost:8080 kholein. Mic, clap aur LiveKit ko secure context chahiye.
          </p>
        )}
        <Block title="EK CLICK — WINDOWS LAUNCHER" code={"start_mrm.bat   (project folder mein double-click)\n# pip install + bridge + urdu agent + http://localhost:8080 sab khud"} />
        <Block title="MANUAL — 3 TERMINALS" code={"python backend\\mrm_bridge.py\npython backend\\mrm_agent_urdu.py dev\npython -m http.server 8080 --directory dist"} />
        <div>
          <p className="font-tech text-[9px] tracking-[0.2em] text-gold mb-1">BRIDGE ADDRESS (auto-reconnect har 15s)</p>
          <div className="flex gap-1.5">
            <input
              value={bridgeUrl}
              onChange={(e) => setBridgeUrlInput(e.target.value)}
              placeholder="ws://127.0.0.1:8765"
              className="flex-1 min-w-0 bg-abyss/80 border border-line/60 px-2 py-1 font-tech text-[10px] text-core focus:border-core/60"
            />
            <button
              onClick={() => { setBridgeUrl(bridgeUrl); retryBridge(); toast("Bridge address save — connect ho raha hoon", "info"); }}
              className="hud-btn px-2 py-1 font-tech text-[8px] tracking-wider text-core shrink-0"
            >
              SET + CONNECT
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {[
            "Python check: python --version (3.10+)",
            "Packages: pip install -r backend/requirements.txt",
            "Firewall: pehli run par Python ko Allow karein",
            "Bridge console mein 'Web HUD connected' aana chahiye",
            "HUD hamesha http://localhost par — LAN IP par mic band rehti hai",
            "LK WAIT ho to agent wali terminal window check karein",
          ].map((t) => (
            <p key={t} className="flex items-start gap-1.5 font-body text-[10px] text-mist leading-snug">
              <CheckCircle2 size={10} className="text-mint shrink-0 mt-0.5" /> {t}
            </p>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Cable size={13} className={s.bridge === "online" ? "text-mint" : "text-gold"} />
        <span className="font-display text-[10px] tracking-[0.2em] text-fog">BACKEND BRIDGE</span>
        <span className={`ml-auto font-tech text-[8px] px-1.5 py-0.5 border ${s.bridge === "online" ? "text-mint border-mint/50" : "text-gold border-gold/50"}`}>
          {s.bridge === "online" ? "ONLINE — REAL CONTROL" : "OFFLINE — SIM MODE"}
        </span>
      </div>
      <p className="font-body text-[11px] text-mist leading-snug">
        <span className="text-mint font-semibold">Gemini brain + LiveKit keys configured hain</span> (src/lib/config.ts + .env.local).
        Brain direct browser se chalta hai. <span className="text-gold font-semibold">Backend API</span> offline hai kyunke
        Python bridge aapke PC par chalana hota hai — ye website ke andar nahi chal sakta. Neeche 3 steps se real
        Windows control (mouse, keyboard, apps) online ho jayega.
      </p>
      <Block title="STEP 1 — PACKAGES" code={PIP_CMD} />
      <Block title="STEP 2 — .ENV.LOCAL" code={ENV_TEMPLATE} />
      <Block title="STEP 3 — BRIDGE START" code="python backend/mrm_bridge.py" />
      <button onClick={retryBridge} className="hud-btn w-full flex items-center justify-center gap-2 py-2 font-display text-[10px] tracking-[0.25em] text-core">
        <RefreshCw size={12} /> RECONNECT BRIDGE (ws://127.0.0.1:8765)
      </button>
      <Block title="LIVEKIT URDU/HINDI VOICE AGENT" code={"pip install livekit-agents livekit-plugins-google livekit-plugins-ai-coustics numpy sounddevice\npython backend/mrm_agent_urdu.py dev"} />
      <p className="font-body text-[10px] text-mist/80 leading-snug">
        🎧 HUD khud aapke LiveKit Cloud (<span className="font-tech text-core">mrmbot-lbjir15c</span>) se connect ho kar
        "my-agent" dispatch karta hai. <span className="font-tech text-core">mrm_agent_urdu.py</span> khaas
        Urdu/Hindi ke liye hai — native-audio model + Aoede voice + ur-PK language + khushamdeed greeting.
        Ye chalte hi LK pill <span className="text-mint font-semibold">LIVE</span> ho jayegi. Agent offline ho to
        bhi MRM ki awaaz <span className="text-gold font-semibold">Gemini Urdu TTS (Aoede)</span> se aati hai — chup kabhi nahi hoti.
      </p>
      <p className="font-tech text-[8px] text-mist/50 leading-relaxed">
        SECURITY: bridge sirf 127.0.0.1 par listen karta hai. Shutdown sirf exact "YES" par. WhatsApp ke liye Desktop app logged-in honi chahiye.
      </p>
    </div>
  );
}

export default function SidePanel() {
  const { s, setSideTab } = useMRM();
  return (
    <aside className="panel h-full flex flex-col anim-slide-l overflow-hidden">
      <div className="flex border-b border-line/40 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSideTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 font-display text-[9px] tracking-[0.15em] transition-all border-b-2 ${
              s.sideTab === t.id ? "text-core border-core bg-core/5" : "text-mist border-transparent hover:text-fog"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      {s.sideTab === "comms" && <Comms />}
      {s.sideTab === "activity" && <ActivityLog />}
      {s.sideTab === "database" && <DatabasePanel />}
      {s.sideTab === "setup" && <SetupPanel />}
    </aside>
  );
}