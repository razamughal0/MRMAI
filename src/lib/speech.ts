/**
 * MRM VOICE FALLBACK — Web Speech API, Urdu/Hindi female voices FIRST
 * (Uzma ur-PK, Asma, Heera hi-IN, Google हिन्दी), phir English female.
 * Primary voice Gemini TTS hai (tts.ts) — ye sirf fallback hai.
 */

function pickFemaleVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  const prefs = [
    "microsoft uzma",
    "uzma",
    "microsoft asma",
    "google urdu",
    "microsoft heera",
    "heera",
    "google हिन्दी",
    "google hindi",
    "kalpana",
    "swara",
    "lekha",
    "hi-in",
    "ur-pk",
    "ur-in",
    "google uk english female",
    "microsoft zira",
    "microsoft aria",
    "samantha",
    "female",
  ];
  for (const p of prefs) {
    const v = voices.find(
      (v) => v.name.toLowerCase().includes(p) || v.lang.toLowerCase().replace("_", "-") === p
    );
    if (v) return v;
  }
  const en = voices.find((v) => v.lang.startsWith("en"));
  return en || voices[0] || null;
}

export function webSpeak(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  try {
    if (!("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/\(SIM\)/gi, "")
      .replace(/[#*_`•]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const u = new SpeechSynthesisUtterance(clean);
    const voice = pickFemaleVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "hi-IN";
    }
    u.rate = 1.02;
    u.pitch = 1.08;
    u.volume = 1;
    u.onstart = () => onStart?.();
    u.onend = () => onEnd?.();
    u.onerror = () => onEnd?.();
    window.speechSynthesis.speak(u);
  } catch {
    onEnd?.();
  }
}

export function stopWebSpeak(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
}

/* Warm the voice list (Chrome loads it async). */
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

/* ---------------- Speech recognition ---------------- */

type RecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
};

export function recognitionSupported(): boolean {
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function createRecognition(handlers: {
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
  onStopped: () => void;
  shouldRestart: () => boolean;
  lang?: string;
}): { start: () => void; stop: () => void } | null {
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;

  const rec: RecognitionLike = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = handlers.lang || "en-IN";
  let stopped = false;

  rec.onresult = (e: any) => {
    let interim = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) {
        const t = res[0].transcript.trim();
        if (t) handlers.onFinal(t);
      } else {
        interim += res[0].transcript;
      }
    }
    handlers.onInterim(interim);
  };

  rec.onend = () => {
    if (!stopped && handlers.shouldRestart()) {
      try {
        rec.start();
      } catch {
        handlers.onStopped();
      }
    } else {
      handlers.onStopped();
    }
  };

  rec.onerror = (e: any) => {
    if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
      stopped = true;
      handlers.onStopped();
    }
  };

  return {
    start: () => {
      stopped = false;
      try {
        rec.start();
      } catch {
        /* already started */
      }
    },
    stop: () => {
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    },
  };
}