import { useEffect } from "react";
import { MRMProvider, useMRM, CREATOR, CREATED } from "./store";
import { sfx, sfxUnlock } from "./lib/sfx";
import AmbientBackground from "./components/AmbientBackground";
import BootSequence from "./components/BootSequence";
import Standby from "./components/Standby";
import TopBar from "./components/TopBar";
import ModulesPanel from "./components/ModulesPanel";
import Workspace from "./components/Workspace";
import SidePanel from "./components/SidePanel";
import CommandBar from "./components/CommandBar";
import Toasts from "./components/Toasts";
import Reactor, { Waveform } from "./components/Reactor";
import { ShutdownModal, ShutdownScreen } from "./components/Shutdown";

const CORE_LABEL: Record<string, { title: string; sub: string; color: string }> = {
  idle: { title: "CORE STANDBY", sub: "MRM ready hai boss — boliye ya command likhein", color: "text-core" },
  listening: { title: "AUDIO LINK ACTIVE", sub: "Main sun rahi hoon boss… saaf boliye", color: "text-mint" },
  speaking: { title: "VOICE RESPONSE", sub: "MRM jawab de rahi hai…", color: "text-gold" },
  executing: { title: "EXECUTING TASK", sub: "Command process ho rahi hai boss…", color: "text-core" },
};

function CoreStrip() {
  const { s } = useMRM();
  const l = CORE_LABEL[s.core];
  return (
    <section className="panel px-4 py-3 flex items-center gap-4 shrink-0 anim-panel-in">
      <Reactor size={104} state={s.core} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2 className={`font-display font-bold text-lg tracking-[0.2em] ${l.color} glow-cyan`}>{l.title}</h2>
          <span className="font-tech text-[8px] text-gold tracking-[0.25em]">MRM CORE v3.0 • GEMINI-3.5</span>
        </div>
        <p className="font-body font-semibold text-[11px] text-mist mt-0.5 truncate">{l.sub}</p>
        <div className="h-11 mt-1.5">
          <Waveform state={s.core} level={s.micLevel} />
        </div>
      </div>
      <div className="hidden xl:flex flex-col items-end gap-1 shrink-0">
        <span className="font-tech text-[8px] text-mist tracking-[0.2em]">DESIGNED BY</span>
        <span className="font-display text-[10px] font-bold tracking-[0.15em] text-gold glow-gold">{CREATOR.toUpperCase()}</span>
        <span className="font-tech text-[8px] text-mist/60 tracking-[0.2em]">{CREATED.toUpperCase()}</span>
        <span className={`font-tech text-[8px] tracking-[0.2em] mt-1 ${s.gemini === "online" ? "text-mint" : "text-gold"}`}>
          {s.gemini === "online" ? "🧠 GEMINI BRAIN ONLINE" : "🧠 BRAIN " + s.gemini.toUpperCase()}
        </span>
        <span className={`font-tech text-[8px] tracking-[0.2em] ${s.livekit === "live" ? "text-mint" : s.bridge === "online" ? "text-mint" : "text-gold"}`}>
          {s.livekit === "live" ? "🎧 LIVEKIT VOICE LIVE" : s.bridge === "online" ? "◉ REAL WINDOWS LINK" : "◈ SIM CONTROL MODE"}
        </span>
      </div>
    </section>
  );
}

function Shell() {
  const { s } = useMRM();

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      sfxUnlock();
      if ((e.target as HTMLElement)?.closest?.("button")) sfx.tick();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div className="relative h-full font-body overflow-hidden">
      <AmbientBackground />

      {s.phase === "boot" && <BootSequence />}
      {s.phase === "standby" && <Standby />}
      {s.phase === "shutdown" && <ShutdownScreen />}

      {s.phase === "active" && (
        <div className="relative z-10 h-full flex flex-col">
          <TopBar />
          <main className="flex-1 min-h-0 grid gap-3 px-3 py-3 grid-cols-1 lg:grid-cols-[264px_minmax(0,1fr)_330px] overflow-y-auto lg:overflow-hidden">
            <div className="order-2 lg:order-1 h-[430px] lg:h-auto min-h-0">
              <ModulesPanel />
            </div>
            <div className="order-1 lg:order-2 flex flex-col gap-3 min-h-[500px] lg:min-h-0">
              <CoreStrip />
              <Workspace />
            </div>
            <div className="order-3 h-[440px] lg:h-auto min-h-0">
              <SidePanel />
            </div>
          </main>
          <CommandBar />
          <ShutdownModal />
        </div>
      )}

      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <MRMProvider>
      <Shell />
    </MRMProvider>
  );
}