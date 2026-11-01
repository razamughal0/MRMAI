import { useEffect, useState } from "react";
import {
  CircleDot, Globe, FileText, Calculator, MessageCircle, Code2, FolderOpen, Gauge,
  MonitorPlay, Search, GitBranch, Camera, Clock3, Play, Pause, Power, Cpu, MemoryStick, Wifi, Music2,
} from "lucide-react";
import { useMRM } from "../store";

function Mod({ icon, label, cmd, danger }: { icon: React.ReactNode; label: string; cmd: string; danger?: boolean }) {
  const { runCommand } = useMRM();
  return (
    <button
      onClick={() => runCommand(cmd, "module")}
      title={`Command: "${cmd}"`}
      className={`hud-btn flex flex-col items-center justify-center gap-1 py-2 px-1 ${danger ? "text-ember border-ember/30" : "text-fog"}`}
    >
      <span className={danger ? "text-ember" : "text-core"}>{icon}</span>
      <span className="font-body font-semibold text-[10px] tracking-wide leading-none">{label}</span>
    </button>
  );
}

function Vitals() {
  const [v, setV] = useState({ cpu: 34, mem: 52, net: 21 });
  const [up, setUp] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      setV((p) => ({
        cpu: Math.max(8, Math.min(96, p.cpu + (Math.random() - 0.5) * 18)),
        mem: Math.max(20, Math.min(92, p.mem + (Math.random() - 0.5) * 8)),
        net: Math.max(4, Math.min(98, p.net + (Math.random() - 0.5) * 26)),
      }));
      setUp((u) => u + 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);
  const rows = [
    { icon: <Cpu size={11} />, label: "CPU", val: v.cpu, color: "from-core-dim to-core" },
    { icon: <MemoryStick size={11} />, label: "MEM", val: v.mem, color: "from-gold/70 to-gold" },
    { icon: <Wifi size={11} />, label: "NET", val: v.net, color: "from-mint/70 to-mint" },
  ];
  return (
    <div className="space-y-1.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="text-core/80">{r.icon}</span>
          <span className="font-tech text-[9px] text-mist w-7">{r.label}</span>
          <div className="flex-1 h-1.5 bg-line/40 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${r.color} transition-all duration-700`} style={{ width: `${r.val}%` }} />
          </div>
          <span className="font-tech text-[9px] text-fog w-8 text-right tabular-nums">{Math.round(r.val)}%</span>
        </div>
      ))}
      <p className="font-tech text-[8px] text-mist/60 tracking-widest pt-0.5">
        UPTIME {String(Math.floor(up / 60)).padStart(2, "0")}:{String(up % 60).padStart(2, "0")} • GEMINI-3.5-FLASH
      </p>
    </div>
  );
}

function NowPlaying() {
  const { s, runCommand } = useMRM();
  return (
    <button
      onClick={() => runCommand("pause karo", "module")}
      title="Play / Pause (clap se bhi hota hai)"
      className="hud-btn w-full flex items-center gap-2.5 px-2.5 py-2"
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${s.media.playing ? "bg-gold/20 text-gold" : "bg-line/40 text-mist"}`}>
        {s.media.playing ? <Pause size={13} /> : <Play size={13} />}
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block font-tech text-[8px] tracking-[0.25em] text-mist">NOW PLAYING</span>
        <span className="block font-body font-semibold text-[11px] text-fog truncate">{s.media.track}</span>
      </span>
      <span className="flex items-end gap-[2px] h-4 shrink-0">
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`w-[3px] rounded-sm ${s.media.playing ? "eq-bar bg-gold" : "bg-mist/30"}`}
            style={{ height: "100%", animationDelay: `${i * 0.13}s`, animationPlayState: s.media.playing ? "running" : "paused", transform: s.media.playing ? undefined : "scaleY(0.2)", transformOrigin: "bottom" }}
          />
        ))}
      </span>
    </button>
  );
}

export default function ModulesPanel() {
  const { runCommand } = useMRM();
  const [q, setQ] = useState("");

  const search = (engine: "youtube" | "google") => {
    if (!q.trim()) return;
    runCommand(
      engine === "youtube" ? `youtube par ${q.trim()} search karo` : `google par ${q.trim()} search karo`,
      "module"
    );
    setQ("");
  };

  return (
    <aside className="panel h-full flex flex-col anim-slide-r overflow-hidden">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between border-b border-line/40">
        <h2 className="panel-title">Command Modules</h2>
        <span className="font-tech text-[8px] text-mist">24 TOOLS</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        <section>
          <p className="font-tech text-[9px] tracking-[0.25em] text-gold mb-1.5">APPLICATIONS</p>
          <div className="grid grid-cols-4 gap-1.5">
            <Mod icon={<CircleDot size={15} />} label="Chrome" cmd="chrome kholo" />
            <Mod icon={<Globe size={15} />} label="Edge" cmd="edge kholo" />
            <Mod icon={<FileText size={15} />} label="Notepad" cmd="notepad kholo" />
            <Mod icon={<Calculator size={15} />} label="Calc" cmd="calculator kholo" />
            <Mod icon={<MessageCircle size={15} />} label="WhatsApp" cmd="whatsapp kholo" />
            <Mod icon={<Code2 size={15} />} label="VS Code" cmd="vs code kholo" />
            <Mod icon={<FolderOpen size={15} />} label="Files" cmd="file explorer kholo" />
            <Mod icon={<Gauge size={15} />} label="Task Mgr" cmd="task manager kholo" />
          </div>
        </section>

        <section>
          <p className="font-tech text-[9px] tracking-[0.25em] text-gold mb-1.5">WEB & SEARCH</p>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <Mod icon={<MonitorPlay size={15} />} label="YouTube" cmd="youtube kholo" />
            <Mod icon={<Search size={15} />} label="Google" cmd="google kholo" />
            <Mod icon={<GitBranch size={15} />} label="GitHub" cmd="github kholo" />
          </div>
          <div className="flex gap-1.5">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search("youtube")}
              placeholder="Quick search… (Enter = YouTube)"
              className="flex-1 min-w-0 bg-deep/80 border border-line/60 px-2 py-1.5 font-body text-xs text-fog placeholder:text-mist/50 focus:border-core/60"
            />
            <button onClick={() => search("youtube")} title="YouTube par search" className="hud-btn px-2 text-ember"><MonitorPlay size={13} /></button>
            <button onClick={() => search("google")} title="Google par search" className="hud-btn px-2 text-core"><Search size={13} /></button>
          </div>
        </section>

        <section>
          <p className="font-tech text-[9px] tracking-[0.25em] text-gold mb-1.5">SYSTEM</p>
          <div className="grid grid-cols-4 gap-1.5">
            <Mod icon={<Camera size={15} />} label="Screenshot" cmd="screenshot lo" />
            <Mod icon={<Clock3 size={15} />} label="Time" cmd="time kya hai" />
            <Mod icon={<Music2 size={15} />} label="Play/Pause" cmd="pause karo" />
            <Mod icon={<Power size={15} />} label="Shutdown" cmd="shutdown" danger />
          </div>
        </section>

        <section>
          <p className="font-tech text-[9px] tracking-[0.25em] text-gold mb-1.5">SYSTEM VITALS</p>
          <Vitals />
        </section>
      </div>

      <div className="p-2.5 border-t border-line/40">
        <NowPlaying />
      </div>
    </aside>
  );
}