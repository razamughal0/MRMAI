import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type {
  Phase, CoreState, ChatMsg, ActivityRec, CommandRec, BrowserTab,
  WaMsg, Toast, WindowId, Settings, MsgSource, ActivityStatus,
} from "./lib/types";
import { uid } from "./lib/types";
import { loadDB, saveDB, clearDB, exportDB } from "./lib/db";
import { parseCommand } from "./lib/parser";
import { createRecognition, recognitionSupported } from "./lib/speech";
import { speak, stopSpeaking, prefetchSpeech } from "./lib/tts";
import { ClapDetector } from "./lib/clap";
import { connectBridge, bridgeCall, type BridgeStatus } from "./lib/bridge";
import { GEMINI_KEY } from "./lib/config";
import { testGemini, askGemini, geminiVision, isQuotaError } from "./lib/gemini";
import { sfx, setSfxEnabled } from "./lib/sfx";
import { connectVoice, type VoiceStatus } from "./lib/livekit";
import { captureScreen, downloadShot, visionSupported } from "./lib/screen";

export const CREATOR = "Muhammad Raza Mughal";
export const CREATED = "13 August 2026";
export const GREETING = "Assalam o Alaikum! MRM par aapko khushamdeed boss. Main aapki kya madad kar sakti hoon?";

export type SideTab = "comms" | "activity" | "database" | "setup";
export type ClapSensor = "off" | "starting" | "live" | "denied";

export interface StoreState {
  phase: Phase;
  core: CoreState;
  messages: ChatMsg[];
  activity: ActivityRec[];
  commands: CommandRec[];
  settings: Settings;
  meta: { boots: number; claps: number; createdAt: number; lastSaved: number };
  tabs: BrowserTab[];
  activeTab: string | null;
  openWindows: WindowId[];
  focused: WindowId | null;
  notepadText: string;
  notepadTyping: boolean;
  waContact: string;
  waDraft: string;
  waTyping: boolean;
  waChats: Record<string, WaMsg[]>;
  media: { playing: boolean; track: string };
  cursor: { x: number; y: number; visible: boolean; clickAt: number };
  micOn: boolean;
  interim: string;
  clapSensor: ClapSensor;
  micLevel: number;
  bridge: BridgeStatus;
  gemini: "nokey" | "checking" | "online" | "error" | "quota";
  geminiError: string;
  livekit: VoiceStatus;
  lkError: string;
  vision: "ready" | "nokey" | "unsupported";
  shutdownPrompt: boolean;
  flash: number;
  toasts: Toast[];
  sideTab: SideTab;
}

interface StoreApi {
  s: StoreState;
  runCommand: (text: string, source?: MsgSource) => void;
  bootDone: () => void;
  wake: (source?: MsgSource) => void;
  reboot: () => void;
  toggleMic: () => void;
  enableClapSensor: () => void;
  toggleVoice: () => void;
  toggleClapControl: () => void;
  retryBridge: () => void;
  testBrain: () => void;
  toggleLiveKit: () => void;
  testVision: () => void;
  setVoiceLang: (lang: string) => void;
  toggleSfx: () => void;
  confirmShutdown: (text: string) => void;
  cancelShutdown: () => void;
  toast: (text: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: string) => void;
  setSideTab: (t: SideTab) => void;
  focusWindow: (w: WindowId) => void;
  closeWindow: (w: WindowId) => void;
  setActiveTab: (id: string) => void;
  uiCloseTab: (id: string) => void;
  uiNewTab: () => void;
  setNotepadText: (t: string) => void;
  setWaContact: (c: string) => void;
  setWaDraft: (t: string) => void;
  sendWaDraft: () => void;
  clearDatabase: () => void;
  exportDatabase: () => void;
  micSupported: boolean;
}

const Ctx = createContext<StoreApi | null>(null);
export const useMRM = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("MRM store missing");
  return v;
};

const WA_CONTACTS = ["Ali", "Ammi", "Abbu", "Work Group", "Raza"];
export { WA_CONTACTS };

function initState(): StoreState {
  const db = loadDB();
  setSfxEnabled(db.settings.sfxOn);
  return {
    phase: "boot",
    core: "idle",
    messages: db.messages,
    activity: db.activity,
    commands: db.commands,
    settings: db.settings,
    meta: db.meta,
    tabs: [],
    activeTab: null,
    openWindows: [],
    focused: null,
    notepadText: "",
    notepadTyping: false,
    waContact: "Ali",
    waDraft: "",
    waTyping: false,
    waChats: {
      Ali: [{ from: "them", text: "Salam boss! Kya haal hai?" }],
      Ammi: [{ from: "them", text: "Beta khana kha lena time par." }],
      "Work Group": [{ from: "them", text: "Meeting 5 baje confirm hai." }],
    },
    media: { playing: false, track: "No media loaded" },
    cursor: { x: 0.5, y: 0.5, visible: false, clickAt: 0 },
    micOn: false,
    interim: "",
    clapSensor: "off",
    micLevel: 0,
    bridge: "offline",
    gemini: GEMINI_KEY ? "checking" : "nokey",
    geminiError: "",
    livekit: "off",
    lkError: "",
    vision: !GEMINI_KEY ? "nokey" : visionSupported() ? "ready" : "unsupported",
    shutdownPrompt: false,
    flash: 0,
    toasts: [],
    sideTab: "comms",
  };
}

export function MRMProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<StoreState>(initState);
  const ref = useRef(s);
  const detectorRef = useRef<ClapDetector | null>(null);
  const lkRef = useRef<{ disconnect: () => void } | null>(null);
  const recRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const timersRef = useRef<number[]>([]);
  const typeTimerRef = useRef<number>(0);

  const up = (fn: (prev: StoreState) => Partial<StoreState>) => {
    setS((prev) => {
      const next = { ...prev, ...fn(prev) };
      ref.current = next;
      return next;
    });
  };

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  };

  /* ---------- persistence ---------- */
  useEffect(() => {
    saveDB({
      messages: s.messages,
      activity: s.activity,
      commands: s.commands,
      settings: s.settings,
      meta: s.meta,
    });
  }, [s.messages, s.activity, s.commands, s.settings, s.meta]);

  /* ---------- bridge ---------- */
  useEffect(() => {
    connectBridge((st) => up(() => ({ bridge: st })));
    void doTestGemini();
    // Local server: bridge har 15s khud dhoondti hai — bat chalate hi ONLINE
    const recon = window.setInterval(() => {
      const c = ref.current;
      if ((c.phase === "active" || c.phase === "standby") && c.bridge === "offline") {
        connectBridge((st) => {
          up(() => ({ bridge: st }));
          if (st === "online") {
            toast("BRIDGE ONLINE — real Windows control active ho gaya", "ok");
            log("bridge", "Auto-reconnected to local Python bridge", "ok");
          }
        });
      }
    }, 15000);
    return () => {
      clearInterval(recon);
      detectorRef.current?.stop();
      recRef.current?.stop();
      lkRef.current?.disconnect();
      stopSpeaking();
      timersRef.current.forEach(clearTimeout);
      clearInterval(typeTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- helpers ---------- */
  const toast = (text: string, kind: Toast["kind"] = "info") => {
    if (kind === "ok") sfx.success();
    else if (kind === "error") sfx.error();
    else if (kind === "warn") sfx.warn();
    else sfx.pop();
    const id = uid();
    up((p) => ({ toasts: [...p.toasts.slice(-3), { id, text, kind }] }));
    later(() => up((p) => ({ toasts: p.toasts.filter((t) => t.id !== id) })), 4200);
  };

  const log = (tool: string, detail: string, status: ActivityStatus = "ok") => {
    up((p) => ({
      activity: [...p.activity, { id: uid(), ts: Date.now(), tool, detail, status }],
    }));
  };

  const pushMsg = (role: ChatMsg["role"], text: string, source: MsgSource) => {
    up((p) => ({
      messages: [...p.messages, { id: uid(), role, text, ts: Date.now(), source }],
    }));
  };

  const say = (text: string, source: MsgSource = "system", speakIt = true) => {
    pushMsg("mrm", text, source);
    if (speakIt && ref.current.settings.voiceOn) {
      up(() => ({ core: "speaking" }));
      speak(
        text,
        undefined,
        () => up((p) => ({ core: p.micOn ? "listening" : "idle" }))
      );
      later(() => {
        if (ref.current.core === "speaking") up((p) => ({ core: p.micOn ? "listening" : "idle" }));
      }, Math.min(14000, 1200 + text.length * 75));
    } else {
      up((p) => ({ core: p.micOn ? "listening" : "idle" }));
    }
  };

  const openReal = (url: string): boolean => {
    try {
      const w = window.open(url, "_blank");
      if (!w) {
        toast("Popup blocked — virtual tab se 'OPEN REAL' dabayein", "warn");
        return false;
      }
      try { w.opener = null; } catch { /* cross-origin */ }
      return true;
    } catch {
      return false;
    }
  };

  const addTab = (tab: Omit<BrowserTab, "id">, newTab = true) => {
    const id = uid();
    up((p) => {
      let tabs = p.tabs;
      let activeTab = p.activeTab;
      if (!newTab && tabs.length > 0 && activeTab) {
        tabs = tabs.map((t) => (t.id === activeTab ? { ...t, ...tab } : t));
      } else {
        tabs = [...tabs, { ...tab, id }];
        activeTab = id;
      }
      return {
        tabs,
        activeTab,
        openWindows: p.openWindows.includes("browser") ? p.openWindows : [...p.openWindows, "browser"],
        focused: "browser" as WindowId,
      };
    });
  };

  const openWin = (w: WindowId) => {
    up((p) => ({
      openWindows: p.openWindows.includes(w) ? p.openWindows : [...p.openWindows, w],
      focused: w,
    }));
  };

  const typeInto = (field: "notepad" | "wa", text: string, done?: () => void) => {
    clearInterval(typeTimerRef.current);
    let i = 0;
    up(() => field === "notepad" ? { notepadTyping: true } : { waTyping: true });
    typeTimerRef.current = window.setInterval(() => {
      i++;
      const partial = text.slice(0, i);
      if (field === "notepad") {
        up(() => ({ notepadText: partial }));
      } else {
        up(() => ({ waDraft: partial }));
      }
      if (i >= text.length) {
        clearInterval(typeTimerRef.current);
        up(() => field === "notepad" ? { notepadTyping: false } : { waTyping: false });
        done?.();
      }
    }, 34);
  };

  const toggleMedia = (trackName?: string) => {
    up((p) => ({
      media: {
        playing: trackName ? true : !p.media.playing,
        track: trackName || p.media.track,
      },
    }));
  };

  /* ---------- clap sensor ---------- */
  const onClap = () => {
    const cur = ref.current;
    up((p) => ({ meta: { ...p.meta, claps: p.meta.claps + 1 } }));
    sfx.clap();
    if (cur.phase === "standby") {
      wake("clap");
      return;
    }
    if (cur.phase === "active" && cur.settings.clapControl) {
      toggleMedia();
      toast("👏 CLAP DETECTED — PLAY / PAUSE", "ok");
      log("clap_detector", "Clap → media play/pause toggled", "ok");
    }
  };

  const enableClapSensor = async () => {
    if (ref.current.clapSensor === "live" || ref.current.clapSensor === "starting") return;
    up(() => ({ clapSensor: "starting" }));
    if (!detectorRef.current) detectorRef.current = new ClapDetector();
    const res = await detectorRef.current.start(onClap, (lvl) => {
      if (Math.abs(lvl - ref.current.micLevel) > 0.02) up(() => ({ micLevel: lvl }));
    });
    if (res.ok) {
      up(() => ({ clapSensor: "live" }));
      toast("CLAP SENSOR LIVE — ek clap se MRM jaag jayegi", "ok");
      log("clap_sensor", "Microphone clap detector armed (peak≥0.30, crest≥4.5)", "ok");
    } else {
      up(() => ({ clapSensor: "denied" }));
      toast("Mic permission denied — clap sensor offline", "error");
      log("clap_sensor", res.error || "microphone unavailable", "error");
    }
  };

  /* ---------- Gemini brain ---------- */
  const doTestGemini = async () => {
    if (!GEMINI_KEY) {
      up(() => ({ gemini: "nokey" as const }));
      return;
    }
    up(() => ({ gemini: "checking" as const }));
    const res = await testGemini();
    if (res.ok) {
      up(() => ({ gemini: "online" as const, geminiError: "" }));
      log("gemini_brain", `${res.model || "Gemini"} ONLINE — AI brain active`, "ok");
    } else if (res.quota) {
      up(() => ({ gemini: "quota" as const, geminiError: "Free quota khatam (429)" }));
      log("gemini_brain", "Sab models ka quota khatam — 60s mein auto-retry", "warn");
      toast("Gemini free quota khatam — 60s mein khud retry karungi boss", "warn");
      later(() => {
        if (ref.current.gemini === "quota") void doTestGemini();
      }, 60000);
    } else {
      up(() => ({ gemini: "error" as const, geminiError: res.error || "test failed" }));
      log("gemini_brain", res.error || "brain test failed", "error");
    }
  };

  /* ---------- LiveKit realtime voice ---------- */
  const doConnectLiveKit = async () => {
    const st = ref.current.livekit;
    if (st === "connecting" || st === "waiting" || st === "live") return;
    up(() => ({ livekit: "connecting" as const, lkError: "" }));
    log("livekit", "Connecting to LiveKit Cloud (agent: my-agent)…", "ok");
    lkRef.current = await connectVoice({
      onStatus: (status, err) => {
        up(() => ({ livekit: status, lkError: err || "" }));
        if (status === "live") {
          toast("🎧 LIVEKIT VOICE LIVE — Gemini agent se baat karein boss", "ok");
          log("livekit", "Agent joined — realtime Aoede voice active", "ok");
          if (ref.current.micOn) {
            recRef.current?.stop();
            recRef.current = null;
            up(() => ({ micOn: false, interim: "" }));
          }
          up(() => ({ core: "listening" as const }));
        } else if (status === "waiting") {
          toast("LiveKit room joined — agent offline ho to 'python mrm_agent.py dev' chalayein", "info");
          log("livekit", "Room joined — waiting for agent worker", "warn");
        } else if (status === "error") {
          toast(`LiveKit: ${err || "connection failed"} — browser voice fallback active`, "warn");
          log("livekit", err || "connection failed", "error");
        } else if (status === "off") {
          up((p) => ({ core: p.micOn ? ("listening" as const) : ("idle" as const) }));
          later(() => {
            const c = ref.current;
            if (c.phase === "active" && c.settings.alwaysMic && !c.micOn) toggleMic();
          }, 500);
        }
      },
      onTranscript: (text, isFinal, fromAgent) => {
        if (!isFinal || !text.trim()) return;
        pushMsg(fromAgent ? "mrm" : "user", text.trim(), "voice");
      },
      onNote: (msg, ok) => log("livekit", msg, ok ? "ok" : "warn"),
    });
  };

  const toggleLiveKit = () => {
    const st = ref.current.livekit;
    if (st === "off" || st === "error") {
      void doConnectLiveKit();
    } else {
      lkRef.current?.disconnect();
      lkRef.current = null;
      up(() => ({ livekit: "off" as const }));
      toast("LiveKit voice disconnected — browser voice active", "info");
      log("livekit", "Disconnected by user", "warn");
    }
  };

  /* ---------- Screen vision test ---------- */
  const testVisionCapture = async () => {
    if (!GEMINI_KEY) {
      toast("Gemini key missing — vision offline", "warn");
      return;
    }
    if (!visionSupported()) {
      toast("Is browser mein screen capture support nahi", "warn");
      return;
    }
    toast("Screen share allow karein boss — vision test ho raha hai", "info");
    const shot = await captureScreen();
    if (shot) {
      up(() => ({ vision: "ready" as const }));
      toast(`Screen vision READY — ${shot.width}×${shot.height} capture OK`, "ok");
      log("screen_vision", `Real capture ${shot.width}×${shot.height} — Gemini vision armed`, "ok");
    } else {
      toast("Screen capture permission nahi mili — simulation vision", "warn");
      log("screen_vision", "getDisplayMedia denied/blocked", "warn");
    }
  };

  /* ---------- lifecycle ---------- */
  const bootDone = () => {
    up((p) => ({ phase: "standby", meta: { ...p.meta, boots: p.meta.boots + 1 } }));
    log("system", "MRM core boot complete — standing by", "ok");
    sfx.bootDone();
    prefetchSpeech(GREETING);
  };

  const wake = (source: MsgSource = "system") => {
    if (ref.current.phase === "active") return;
    sfx.powerUp();
    up(() => ({ phase: "active" }));
    if (typeof window !== "undefined" && !window.isSecureContext) {
      toast("⚠ LAN IP / non-HTTPS par mic aur voice BLOCK hai — http://localhost se kholein", "warn");
      log("system", "Insecure context — mic/LiveKit/vision limited. Use http://localhost", "warn");
    }
    log("system", source === "clap" ? "WAKE triggered by CLAP 👏" : "WAKE triggered manually", "ok");
    later(() => say(GREETING, "system"), 650);
    later(() => {
      if (ref.current.livekit === "off") void doConnectLiveKit();
    }, 1400);
    later(() => {
      const c = ref.current;
      if (c.settings.alwaysMic && !c.micOn && c.livekit !== "live" && c.livekit !== "connecting") {
        toggleMic();
      }
    }, 900);
  };

  const reboot = () => {
    stopSpeaking();
    timersRef.current.forEach(clearTimeout);
    clearInterval(typeTimerRef.current);
    up(() => ({
      phase: "boot",
      core: "idle",
      tabs: [],
      activeTab: null,
      openWindows: [],
      focused: null,
      notepadText: "",
      notepadTyping: false,
      waDraft: "",
      media: { playing: false, track: "No media loaded" },
      shutdownPrompt: false,
      cursor: { x: 0.5, y: 0.5, visible: false, clickAt: 0 },
    }));
  };

  /* ---------- microphone ---------- */
  const toggleMic = () => {
    const cur = ref.current;
    if (cur.livekit === "live") {
      toast("LiveKit voice LIVE hai — mic wahi use ho raha hai boss", "info");
      return;
    }
    if (cur.micOn) {
      recRef.current?.stop();
      recRef.current = null;
      up((p) => ({ micOn: false, interim: "", core: "idle", settings: { ...p.settings, alwaysMic: false } }));
      toast("Mic OFF kar diya boss — dobara mic button se ON hoga", "info");
      log("voice_input", "Always-on mic disabled by user", "warn");
      return;
    }
    if (!recognitionSupported()) {
      toast("Is browser mein Speech Recognition nahi — Chrome use karein", "warn");
      return;
    }
    const rec = createRecognition({
      onFinal: (text) => {
        if (ref.current.core === "speaking") return;
        up(() => ({ interim: "" }));
        runCommand(text, "voice");
      },
      onInterim: (t) => up(() => ({ interim: t })),
      onStopped: () => up(() => ({ micOn: false, interim: "", core: "idle" })),
      shouldRestart: () => ref.current.micOn,
      lang: cur.settings.voiceLang,
    });
    if (!rec) return;
    recRef.current = rec;
    rec.start();
    up((p) => ({ micOn: true, core: "listening", settings: { ...p.settings, alwaysMic: true } }));
    toast("🎙 Mic ALWAYS ON — MRM har waqt sun rahi hai boss", "ok");
    log("voice_input", `Always-on recognition started (${cur.settings.voiceLang})`, "ok");
  };

  const toggleVoice = () => {
    const on = !ref.current.settings.voiceOn;
    up((p) => ({ settings: { ...p.settings, voiceOn: on } }));
    if (!on) stopSpeaking();
    toast(on ? "MRM voice ON" : "MRM voice muted", "info");
  };

  const toggleSfx = () => {
    const on = !ref.current.settings.sfxOn;
    up((p) => ({ settings: { ...p.settings, sfxOn: on } }));
    setSfxEnabled(on);
    if (on) sfx.success();
    toast(on ? "Premium SFX ON" : "Sound effects muted", "info");
  };

  const toggleClapControl = () => {
    const on = !ref.current.settings.clapControl;
    up((p) => ({ settings: { ...p.settings, clapControl: on } }));
    toast(on ? "Clap play/pause control ON" : "Clap play/pause control OFF", "info");
    log("clap_control", on ? "Clap control ON" : "Clap control OFF", "ok");
    if (on && ref.current.clapSensor !== "live") enableClapSensor();
  };

  const setVoiceLang = (lang: string) => {
    const wasOn = ref.current.micOn;
    up((p) => ({ settings: { ...p.settings, voiceLang: lang } }));
    const label = lang === "ur-PK" ? "اردو (Urdu)" : lang === "hi-IN" ? "हिंदी (Hindi)" : "Roman Urdu (en-IN)";
    toast(
      `Voice input: ${label}${lang !== "en-IN" ? " — har command Gemini brain se samjhi jayegi" : " — fast direct commands"}`,
      "info"
    );
    log("voice_input", `Recognition language → ${lang}`, "ok");
    if (wasOn) {
      recRef.current?.stop();
      recRef.current = null;
      up(() => ({ micOn: false, interim: "" }));
      later(() => toggleMic(), 400);
    }
  };

  const retryBridge = () => {
    toast("Python bridge se connect ho rahi hoon…", "info");
    connectBridge((st) => {
      up(() => ({ bridge: st }));
      if (st === "online") {
        toast("BRIDGE ONLINE — real Windows control active", "ok");
        log("bridge", "Connected to ws://127.0.0.1:8765", "ok");
      }
    });
  };

  /* ---------- shutdown ---------- */
  const cancelShutdown = () => {
    up(() => ({ shutdownPrompt: false }));
    say("Shutdown cancelled boss. System safe hai.", "system");
    log("shutdown", "Shutdown cancelled by user", "warn");
  };

  const confirmShutdown = (text: string) => {
    if (text.trim().toUpperCase() === "YES") {
      sfx.powerDown();
      up(() => ({ shutdownPrompt: false }));
      say("Confirmed boss. Windows 5 second mein shutdown ho raha hai.", "system");
      log("shutdown", "Confirmed YES → shutdown /s /t 5", "error");
      bridgeCall("shutdown", { confirmation: "YES" });
      later(() => {
        stopSpeaking();
        up(() => ({ phase: "shutdown", micOn: false }));
        recRef.current?.stop();
      }, 1800);
    } else {
      up(() => ({ shutdownPrompt: false }));
      say("Shutdown cancelled boss. Sirf exact YES se shutdown hota hai.", "system");
      log("shutdown", `Confirmation '${text}' rejected (needs exact YES)`, "warn");
    }
  };

  /* ---------- COMMAND EXECUTOR ---------- */
  const runCommand = (raw: string, source: MsgSource = "text") => {
    const text = raw.trim();
    if (!text) return;
    sfx.blip();
    const cur = ref.current;

    if (cur.shutdownPrompt) {
      pushMsg("user", text, source);
      confirmShutdown(text);
      return;
    }

    pushMsg("user", text, source);
    const intent = parseCommand(text);
    up((p) => ({
      core: "executing",
      commands: [...p.commands, { id: uid(), ts: Date.now(), text, intent: intent.type, source }],
    }));
    log("parser", `"${text}" → ${intent.type}`, "ok");

    later(() => execute(intent, source), 420);
  };

  const execute = async (intent: ReturnType<typeof parseCommand>, source: MsgSource) => {
    const sim = ref.current.bridge !== "online";
    const simTag = sim ? " (SIM)" : "";

    switch (intent.type) {
      case "greeting":
        say("Walaikum Assalam boss! Hukum karein, main bilkul ready hoon.", source);
        break;

      case "creator":
        say(`Mujhe ${CREATOR} ne ${CREATED} ko banaya hai, boss.`, source);
        break;

      case "help":
        say(
          "Main ye sab kar sakti hoon boss:\n• Apps: \"Chrome kholo\", \"Notepad kholo\", \"Calculator kholo\"\n• YouTube: \"YouTube par poem search karo aur pehla video chalao\"\n• Google: \"Google par AI search karo\"\n• Tabs: \"new tab\", \"YouTube wala tab close karo\"\n• WhatsApp: \"WhatsApp kholo aur Ali ko message karo: salam\"\n• Type: \"Notepad kholo aur Hello MRM likho\"\n• Screen: \"screenshot lo\", \"500 300 par click karo\", \"neeche scroll karo\"\n• System: \"time kya hai\", \"clap control on karo\", \"pause karo\"\n• Shutdown: \"shutdown\" (sirf YES se confirm)",
          source,
          false
        );
        if (ref.current.settings.voiceOn) {
          speak("Poori command list COMMS panel mein hai boss. Jo chahein bol kar ya click kar ke chala lein.");
        }
        up(() => ({ sideTab: "comms" }));
        break;

      case "time": {
        const now = new Date();
        const t = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const d = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        log("current_time", `${t} — ${d}`, "ok");
        say(`Boss, abhi ${t} baj rahe hain. Aaj ${d} hai.`, source);
        break;
      }

      case "screenshot": {
        const fname = `MRM_Screenshot_${new Date().toISOString().slice(0, 19).replace(/[:T-]/g, "").replace(/^(\d{8})(\d{6})$/, "$1_$2")}.png`;
        up((p) => ({ flash: p.flash + 1 }));
        sfx.shutter();
        const real = await bridgeCall("take_screenshot");
        if (real) {
          log("take_screenshot", real, "ok");
          toast(`📸 ${fname}`, "ok");
          say(`Screenshot le liya boss. ${real}`, source);
          break;
        }
        const shot = await captureScreen();
        if (shot) {
          downloadShot(shot.dataUrl, fname);
          log("take_screenshot", `${fname} — REAL screen capture ${shot.width}×${shot.height}`, "ok");
          toast(`📸 ${fname} — real capture saved`, "ok");
          say(`Real screenshot le liya boss — ${fname} download ho gaya hai.`, source);
        } else {
          log("take_screenshot", `${fname} ${simTag} — screen share allow nahi hui`, "sim");
          toast(`📸 ${fname} (SIM)`, "info");
          say(`Screenshot simulation mein liya boss${simTag}. Real capture ke liye screen share allow karein.`, source);
        }
        break;
      }

      case "open_app": {
        const app = intent.app;
        if (app === "calculator") {
          openWin("calculator");
          log("open_application", `calculator → virtual calculator window`, "ok");
          say("Calculator ready boss. Hisaab laga lein.", source);
          break;
        }
        if (app === "notepad") {
          openWin("notepad");
          const real = await bridgeCall("open_application", { application: "notepad" });
          log("open_application", real || `notepad.exe ${simTag}`, real ? "ok" : "sim");
          say(`Notepad khol diya boss${simTag}. Ab jo chahein likhwa dein.`, source);
          break;
        }
        const real = await bridgeCall("open_application", { application: app });
        log("open_application", real || `${app} launch ${simTag} — bridge offline`, real ? "ok" : "sim");
        toast(`${app.toUpperCase()} ${real ? "launched" : "launch (SIM)"}`, real ? "ok" : "info");
        say(
          real
            ? `${app} khol diya boss.`
            : `${app} ki launch command bhej di boss — simulation mode mein hoon, real Windows control ke liye Python bridge connect karein.`,
          source
        );
        break;
      }

      case "open_url": {
        const opened = openReal(intent.url);
        addTab({ title: intent.label, url: intent.url, kind: "site" }, intent.newTab || ref.current.tabs.length === 0);
        log("open_url", `${intent.url} ${opened ? "(real tab)" : "(popup blocked → virtual)"}`, opened ? "ok" : "warn");
        say(`${intent.label} khol diya boss.`, source);
        break;
      }

      case "youtube_search": {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(intent.query)}`;
        const opened = openReal(url);
        addTab({ title: `${intent.query} — YouTube`, url, kind: "youtube", query: intent.query }, intent.newTab || ref.current.tabs.length === 0);
        log("youtube_search", `"${intent.query}" ${opened ? "(real tab)" : "(virtual)"}`, opened ? "ok" : "warn");
        say(`YouTube par "${intent.query}" search khol di boss.`, source);
        break;
      }

      case "youtube_play": {
        const q = intent.query || "trending";
        const real = await bridgeCall("youtube_search_and_play", {
          query: intent.query, result_number: intent.result, new_tab: intent.newTab,
        });
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
        if (!real) openReal(url);
        addTab(
          { title: `${q} #${intent.result} — YouTube`, url, kind: "youtube", query: q, highlight: intent.result },
          intent.newTab || ref.current.tabs.length === 0
        );
        toggleMedia(`${q} • Result #${intent.result}`);
        log("youtube_play", real || `result #${intent.result} for "${q}" ${simTag}`, real ? "ok" : "sim");
        say(
          real || `Boss, "${q}" ke results khol kar result number ${intent.result} highlight kar diya hai. Clap se play pause kar sakte hain.`,
          source
        );
        break;
      }

      case "google_search": {
        const url = `https://www.google.com/search?q=${encodeURIComponent(intent.query)}`;
        const opened = openReal(url);
        addTab({ title: `${intent.query} — Google`, url, kind: "google", query: intent.query }, intent.newTab || ref.current.tabs.length === 0);
        log("google_search", `"${intent.query}" ${opened ? "(real tab)" : "(virtual)"}`, opened ? "ok" : "warn");
        say(`Google par "${intent.query}" search kar diya boss.`, source);
        break;
      }

      case "notepad_open":
        openWin("notepad");
        say(`Notepad ready boss${simTag}.`, source);
        break;

      case "notepad_type": {
        openWin("notepad");
        log("type_in_notepad", `"${intent.text}" ${simTag}`, sim ? "sim" : "ok");
        bridgeCall("type_in_notepad", { text: intent.text });
        up(() => ({ notepadText: "" }));
        later(() => typeInto("notepad", intent.text), 350);
        say(`Notepad mein likh rahi hoon boss: ${intent.text}`, source);
        break;
      }

      case "type_text": {
        openWin("notepad");
        const base = ref.current.notepadText ? ref.current.notepadText + "\n" : "";
        log("type_on_screen", `"${intent.text}" ${simTag}`, sim ? "sim" : "ok");
        later(() => typeInto("notepad", base + intent.text), 250);
        say(`Type kar diya boss: ${intent.text}`, source);
        break;
      }

      case "whatsapp": {
        openWin("whatsapp");
        bridgeCall("open_whatsapp");
        log("open_whatsapp", `WhatsApp Desktop ${simTag}`, sim ? "sim" : "ok");
        let contact = ref.current.waContact;
        if (intent.contact) {
          const found = WA_CONTACTS.find((c) => c.toLowerCase().includes(intent.contact!.toLowerCase()));
          contact = found || intent.contact.replace(/\b\w/g, (c) => c.toUpperCase());
          up(() => ({ waContact: contact }));
          log("vision_click", `chat located: ${contact} ${simTag}`, sim ? "sim" : "ok");
        }
        if (intent.message) {
          const msg = intent.message;
          const send = intent.send;
          up(() => ({ waDraft: "" }));
          later(() => {
            typeInto("wa", msg, () => {
              if (send) {
                later(() => {
                  up((p) => ({
                    waDraft: "",
                    waChats: {
                      ...p.waChats,
                      [contact]: [...(p.waChats[contact] || []), { from: "me" as const, text: msg }],
                    },
                  }));
                  log("press_key", `ENTER → message sent to ${contact} ${simTag}`, sim ? "sim" : "ok");
                  later(() => {
                    const replyText = /salam|hello|hi/i.test(msg)
                      ? "Walaikum Assalam boss! 👋"
                      : "Ji boss, message mil gaya 👍";
                    up((p) => ({
                      waChats: {
                        ...p.waChats,
                        [contact]: [...(p.waChats[contact] || []), { from: "them" as const, text: replyText }],
                      },
                    }));
                  }, 1400);
                }, 400);
              }
            });
          }, 500);
          say(
            send
              ? `WhatsApp par ${contact} ko "${msg}" bhej rahi hoon boss.`
              : `${contact} ki chat mein "${msg}" type kar diya boss — bhejne ke liye "bhejo" bolein.`,
            source
          );
        } else {
          say(`WhatsApp khol diya boss${simTag}. Kisko message karna hai?`, source);
        }
        break;
      }

      case "tab": {
        const p = ref.current;
        const a = intent.action;
        if (a === "new") {
          addTab({ title: "New Tab", url: "https://www.google.com", kind: "site" });
          log("browser_new_tab", `Ctrl+T ${simTag}`, sim ? "sim" : "ok");
          bridgeCall("browser_new_tab");
          say("Naya tab khol diya boss.", source);
        } else if (a === "new_window") {
          addTab({ title: "New Window", url: "https://www.google.com", kind: "site" });
          log("browser_new_window", `Ctrl+N ${simTag}`, sim ? "sim" : "ok");
          say("New window khol di boss.", source);
        } else if (a === "close_window") {
          up((prev) => ({
            openWindows: prev.openWindows.filter((w) => w !== "browser"),
            focused: prev.focused === "browser" ? null : prev.focused,
            tabs: [],
            activeTab: null,
          }));
          log("browser_close_window", `Alt+F4 ${simTag}`, sim ? "sim" : "ok");
          say("Browser window band kar di boss.", source);
        } else if (p.tabs.length === 0) {
          say("Koi browser tab open nahi hai boss. Pehle kuch kholein.", source);
        } else if (a === "close_current") {
          const t = p.tabs.find((x) => x.id === p.activeTab);
          removeTabInternal(p.activeTab!);
          log("browser_close_current_tab", `Ctrl+W → ${t?.title} ${simTag}`, sim ? "sim" : "ok");
          say("Current tab close kar diya boss.", source);
        } else if (a === "next" || a === "prev") {
          const idx = p.tabs.findIndex((x) => x.id === p.activeTab);
          const nx = a === "next" ? (idx + 1) % p.tabs.length : (idx - 1 + p.tabs.length) % p.tabs.length;
          up(() => ({ activeTab: p.tabs[nx].id, focused: "browser" }));
          log(a === "next" ? "browser_next_tab" : "browser_previous_tab", p.tabs[nx].title, "ok");
          say(`Tab switch: ${p.tabs[nx].title}`, source);
        } else if (a === "goto") {
          const i = (intent.number || 1) - 1;
          if (i >= 0 && i < p.tabs.length) {
            up(() => ({ activeTab: p.tabs[i].id, focused: "browser" }));
            say(`Tab ${intent.number} select kar liya boss: ${p.tabs[i].title}`, source);
          } else {
            say(`Boss, tab ${intent.number} exist nahi karta — abhi ${p.tabs.length} tabs hain.`, source);
          }
        } else if (a === "select_name" || a === "close_name") {
          const name = (intent.name || "").toLowerCase();
          const t = p.tabs.find((x) => x.title.toLowerCase().includes(name));
          if (!t) {
            log("vision_locate", `tab "${intent.name}" not found`, "warn");
            say(`"${intent.name}" naam ka tab nazar nahi aaya boss.`, source);
          } else if (a === "select_name") {
            up(() => ({ activeTab: t.id, focused: "browser" }));
            log("browser_select_tab_by_name", `${t.title} ${simTag}`, sim ? "sim" : "ok");
            say(`${t.title} wala tab select kar diya boss.`, source);
          } else {
            removeTabInternal(t.id);
            log("browser_close_tab_by_name", `${t.title} ${simTag}`, sim ? "sim" : "ok");
            say(`${t.title} wala tab close kar diya boss.`, source);
          }
        }
        break;
      }

      case "mouse": {
        if (intent.action === "position") {
          const cx = Math.round(ref.current.cursor.x * 1920);
          const cy = Math.round(ref.current.cursor.y * 1080);
          say(`Virtual mouse position: (${cx}, ${cy}) boss.`, source);
          break;
        }
        const x = Math.min(1920, intent.x || 0);
        const y = Math.min(1080, intent.y || 0);
        up(() => ({
          cursor: {
            x: x / 1920, y: y / 1080, visible: true,
            clickAt: intent.action === "move" ? ref.current.cursor.clickAt : Date.now(),
          },
        }));
        const tool = intent.action === "double" ? "double_click_screen" : intent.action === "right" ? "right_click_screen" : intent.action === "move" ? "move_mouse" : "click_screen";
        const real = await bridgeCall(tool, { x, y });
        log(tool, real || `(${x}, ${y}) ${simTag}`, real ? "ok" : "sim");
        say(
          intent.action === "move"
            ? `Mouse (${x}, ${y}) par le gayi boss${simTag}.`
            : `(${x}, ${y}) par ${intent.action === "double" ? "double click" : intent.action === "right" ? "right click" : "click"} kar diya boss${simTag}.`,
          source
        );
        break;
      }

      case "vision_click": {
        const real = await bridgeCall("click_visible_target", { target: intent.target });
        if (real) {
          log("vision_click", real, "ok");
          say(real, source);
          break;
        }
        if (ref.current.gemini === "online") {
          toast("Screen share allow karein — Gemini vision screen dekh raha hai", "info");
          const shot = await captureScreen();
          if (shot) {
            up(() => ({ core: "executing" as const }));
            const res = await geminiVision(shot.dataUrl, shot.width, shot.height, intent.target);
            if (res.found && res.x != null && res.y != null && res.confidence >= 0.55) {
              up(() => ({
                cursor: { x: res.x! / shot.width, y: res.y! / shot.height, visible: true, clickAt: Date.now() },
              }));
              log("gemini_vision", `"${intent.target}" FOUND at (${res.x}, ${res.y}) conf ${res.confidence.toFixed(2)}`, "ok");
              say(`Gemini vision ne "${intent.target}" dekh liya boss — coordinates (${res.x}, ${res.y}), confidence ${Math.round(res.confidence * 100)} percent. Cursor wahan mark kar diya. Real OS click ke liye Python bridge connect karein.`, source);
            } else {
              log("gemini_vision", `"${intent.target}" — ${res.reason || "not found"}`, "warn");
              say(`Boss, screen par "${intent.target}" nahi mila. ${res.reason || "Target visible nahi tha."}`, source);
            }
            break;
          }
        }
        log("vision_click", `"${intent.target}" — vision unavailable`, "warn");
        toast("Vision offline — Gemini key / screen share check karein", "warn");
        say(`Boss, "${intent.target}" dekhne ke liye Gemini vision chahiye. SETUP mein brain test karein aur screen share allow karein, ya coordinates dein jaise "500 300 par click karo".`, source);
        break;
      }

      case "scroll": {
        if (intent.target) {
          const real = await bridgeCall("scroll_until_target_visible", { target: intent.target });
          log("vision_scroll_to", real || `"${intent.target}" ${simTag}`, real ? "ok" : "sim");
          say(real || `"${intent.target}" tak scroll ki koshish ki boss${simTag}.`, source);
        } else {
          window.dispatchEvent(new CustomEvent("mrm-scroll", { detail: intent.amount }));
          bridgeCall("scroll_screen", { amount: intent.amount });
          const dir = intent.amount > 0 ? "upar" : "neeche";
          log("scroll_screen", `${dir} ${Math.abs(intent.amount)} ${simTag}`, sim ? "sim" : "ok");
          say(`${dir} scroll kar diya boss.`, source);
        }
        break;
      }

      case "key": {
        const combo = intent.keys.join(" + ").toUpperCase();
        const real = intent.keys.length > 1
          ? await bridgeCall("hotkey", { keys: intent.keys })
          : await bridgeCall("press_key", { key: intent.keys[0] });
        log(intent.keys.length > 1 ? "hotkey" : "press_key", real || `${combo} ${simTag}`, real ? "ok" : "sim");
        toast(`⌨ ${combo}${simTag}`, "info");
        say(`${combo} press kar diya boss${simTag}.`, source);
        break;
      }

      case "clap": {
        up((p) => ({ settings: { ...p.settings, clapControl: intent.on } }));
        log("clap_control", intent.on ? "ON" : "OFF", "ok");
        if (intent.on && ref.current.clapSensor !== "live") enableClapSensor();
        say(
          intent.on
            ? "Clap control ON boss. Ek clap se video play pause hogi."
            : "Clap control OFF boss.",
          source
        );
        break;
      }

      case "media_toggle": {
        const playing = !ref.current.media.playing;
        toggleMedia();
        bridgeCall("video_play_pause");
        log("media_play_pause", playing ? "PLAY" : "PAUSE", "ok");
        say(playing ? "Play kar diya boss." : "Pause kar diya boss.", source);
        break;
      }

      case "open_folder": {
        const real = await bridgeCall("open_folder", { folder: intent.folder });
        log("open_folder", real || `${intent.folder} ${simTag}`, real ? "ok" : "sim");
        say(real || `${intent.folder} folder ki command bhej di boss${simTag}.`, source);
        break;
      }

      case "shutdown_request": {
        up(() => ({ shutdownPrompt: true }));
        log("request_shutdown", "Awaiting exact YES confirmation", "warn");
        say("PC shutdown karna hai boss? Please say YES to confirm.", source);
        break;
      }

      default: {
        const rawText = String((intent as any).raw || "");
        if (ref.current.gemini === "online") {
          log("gemini_brain", `AI samajh raha hai: "${rawText}"`, "ok");
          const history = ref.current.messages.slice(-9, -1).map((m) => ({
            role: (m.role === "mrm" ? "model" : "user") as "model" | "user",
            text: m.text,
          }));
          const res = await askGemini(rawText, history);
          if (res.text && isQuotaError(res.text)) {
            up(() => ({ gemini: "quota" as const, geminiError: "Free quota khatam (429)" }));
            log("gemini_brain", "Quota exhausted mid-session — auto-retry 60s", "warn");
            later(() => { if (ref.current.gemini === "quota") void doTestGemini(); }, 60000);
            say("Boss, Gemini ka free quota filhaal khatam ho gaya hai. Local commands chalti rahengi — 60 second mein main khud dobara koshish karungi.", source);
            break;
          }
          if (res.command) {
            const sub = parseCommand(res.command);
            if (sub.type !== "unknown") {
              log("gemini_brain", `Route → "${res.command}" (${sub.type})`, "ok");
              await execute(sub, source);
              return;
            }
          }
          if (res.text) {
            log("gemini_brain", "Conversational reply", "ok");
            say(res.text, source);
            break;
          }
        }
        if (ref.current.gemini === "quota") {
          say("Boss, Gemini ka free quota filhaal khatam hai — main khud retry kar rahi hoon. Apps, tabs, YouTube, time wali commands abhi bhi chalengi.", source);
          break;
        }
        log("parser", `Unknown command: "${rawText}"`, "warn");
        say(
          ref.current.gemini === "online"
            ? "Boss, ye baat samajh nahi aayi — thoda aur clear bolein."
            : "Ye command samajh nahi aayi boss. \"help\" bolein, ya SETUP mein Gemini brain online karein taake main har baat samajh sakoon.",
          source
        );
      }
    }
  };

  const removeTabInternal = (id: string) => {
    up((p) => {
      const tabs = p.tabs.filter((t) => t.id !== id);
      const activeTab = p.activeTab === id ? (tabs[tabs.length - 1]?.id ?? null) : p.activeTab;
      return {
        tabs,
        activeTab,
        openWindows: tabs.length === 0 ? p.openWindows.filter((w) => w !== "browser") : p.openWindows,
        focused: tabs.length === 0 && p.focused === "browser" ? null : p.focused,
      };
    });
  };

  /* ---------- UI api ---------- */
  const api: StoreApi = {
    s,
    runCommand,
    bootDone,
    wake,
    reboot,
    toggleMic,
    enableClapSensor,
    toggleVoice,
    toggleClapControl,
    retryBridge,
    testBrain: () => { void doTestGemini(); },
    toggleLiveKit,
    testVision: () => { void testVisionCapture(); },
    setVoiceLang,
    toggleSfx,
    confirmShutdown,
    cancelShutdown,
    toast,
    dismissToast: (id) => up((p) => ({ toasts: p.toasts.filter((t) => t.id !== id) })),
    setSideTab: (t) => up(() => ({ sideTab: t })),
    focusWindow: (w) => up(() => ({ focused: w })),
    closeWindow: (w) =>
      up((p) => ({
        openWindows: p.openWindows.filter((x) => x !== w),
        focused: p.focused === w ? null : p.focused,
        tabs: w === "browser" ? [] : p.tabs,
        activeTab: w === "browser" ? null : p.activeTab,
      })),
    setActiveTab: (id) => up(() => ({ activeTab: id, focused: "browser" })),
    uiCloseTab: removeTabInternal,
    uiNewTab: () => runCommand("new tab kholo", "module"),
    setNotepadText: (t) => up(() => ({ notepadText: t })),
    setWaContact: (c) => up(() => ({ waContact: c })),
    setWaDraft: (t) => up(() => ({ waDraft: t })),
    sendWaDraft: () => {
      const p = ref.current;
      if (!p.waDraft.trim()) return;
      const msg = p.waDraft.trim();
      const contact = p.waContact;
      up((prev) => ({
        waDraft: "",
        waChats: {
          ...prev.waChats,
          [contact]: [...(prev.waChats[contact] || []), { from: "me" as const, text: msg }],
        },
      }));
      log("whatsapp_send", `→ ${contact}: "${msg}" (SIM)`, "sim");
    },
    clearDatabase: () => {
      clearDB();
      up((p) => ({
        messages: [],
        activity: [],
        commands: [],
        meta: { ...p.meta, boots: 0, claps: 0, createdAt: Date.now() },
      }));
      toast("Database wipe complete", "warn");
    },
    exportDatabase: () => {
      const p = ref.current;
      exportDB({
        messages: p.messages, activity: p.activity, commands: p.commands,
        settings: p.settings, meta: p.meta,
      });
      toast("Database export download ho gaya", "ok");
    },
    micSupported: recognitionSupported(),
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}