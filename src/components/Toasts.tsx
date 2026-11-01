import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";
import { useMRM } from "../store";

const STYLE = {
  ok: { border: "border-mint/50", text: "text-mint", icon: <CheckCircle2 size={13} /> },
  info: { border: "border-core/50", text: "text-core", icon: <Info size={13} /> },
  warn: { border: "border-gold/60", text: "text-gold", icon: <AlertTriangle size={13} /> },
  error: { border: "border-ember/60", text: "text-ember", icon: <XCircle size={13} /> },
};

export default function Toasts() {
  const { s, dismissToast } = useMRM();
  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {s.toasts.map((t) => {
        const st = STYLE[t.kind];
        return (
          <div key={t.id} className={`panel anim-toast pointer-events-auto flex items-center gap-2 px-3 py-2 max-w-xs border ${st.border}`}>
            <span className={st.text}>{st.icon}</span>
            <span className="font-body font-semibold text-[11px] text-fog leading-tight">{t.text}</span>
            <button onClick={() => dismissToast(t.id)} className="text-mist hover:text-fog shrink-0"><X size={11} /></button>
          </div>
        );
      })}
    </div>
  );
}