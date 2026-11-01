/**
 * MRM URDU/HINDI VOICE — real Gemini TTS (Aoede female voice).
 * Verified live: gemini-3.8-flash-tts (WAV, ~2.7s) → 3.1-flash-tts-preview
 * (PCM) → 2.5-flash-preview-tts (PCM) → browser hi-IN/ur-PK voice fallback.
 * Greeting prefetch hoti hai taake khushamdeed foran baje.
 */

import { GEMINI_KEY } from "./config";
import { webSpeak, stopWebSpeak } from "./speech";

const TTS_CHAIN = [
  "gemini-3.8-flash-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.1-flash-tts-preview",
  "gemini-2.5-flash-preview-tts",
];
let activeTts = TTS_CHAIN[0];
const VOICE = "Aoede";
const API = "https://generativelanguage.googleapis.com/v1beta/models/";

let current: HTMLAudioElement | null = null;
let seq = 0;
const cache = new Map<string, string>();

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pcmToWav(bytes: Uint8Array, rate = 24000): Blob {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const writeStr = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF");
  v.setUint32(4, 36 + bytes.length, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  writeStr(36, "data");
  v.setUint32(40, bytes.length, true);
  return new Blob([header, bytes as unknown as BlobPart], { type: "audio/wav" });
}

async function fetchAudio(text: string): Promise<string | null> {
  const prompt =
    `Say in a warm, friendly female voice speaking natural Pakistani Urdu ` +
    `(the text is Roman Urdu / Hindi / English mix — pronounce it like a native Urdu speaker): ${text}`;
  const chain = [activeTts, ...TTS_CHAIN.filter((m) => m !== activeTts)];
  for (const model of chain) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(`${API}${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        }),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 404 || res.status === 503 || res.status === 429) continue;
        return null;
      }
      const part = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData?.data);
      if (!part) continue;
      const mime: string = part.inlineData.mimeType || "";
      const bytes = b64ToBytes(part.inlineData.data);
      const blob = mime.includes("wav") ? new Blob([bytes as unknown as BlobPart], { type: "audio/wav" }) : pcmToWav(bytes, 24000);
      activeTts = model;
      return URL.createObjectURL(blob);
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

function cachePut(key: string, url: string) {
  if (cache.size > 24) {
    const first = cache.keys().next().value as string;
    const old = cache.get(first);
    if (old) URL.revokeObjectURL(old);
    cache.delete(first);
  }
  cache.set(key, url);
}

const cleanText = (t: string) =>
  t.replace(/\(SIM\)/gi, "").replace(/[#*_`•]/g, "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").replace(/\s+/g, " ").trim();

/** Greeting ke liye — audio pehle se cache kar lo. */
export function prefetchSpeech(text: string): void {
  const key = cleanText(text).slice(0, 220);
  if (!GEMINI_KEY || cache.has(key)) return;
  void fetchAudio(key).then((url) => { if (url) cachePut(key, url); });
}

export function stopSpeaking(): void {
  seq++;
  if (current) {
    current.pause();
    current = null;
  }
  stopWebSpeak();
}

export function speak(text: string, onStart?: () => void, onEnd?: () => void): void {
  const id = ++seq;
  if (current) { current.pause(); current = null; }
  stopWebSpeak();
  const clean = cleanText(text);
  if (!clean) { onEnd?.(); return; }
  const key = clean.slice(0, 220);

  const fallback = () => {
    if (id !== seq) return;
    webSpeak(clean, onStart, onEnd);
  };

  const play = (url: string) => {
    if (id !== seq) return;
    const a = new Audio(url);
    current = a;
    let started = false;
    a.onplaying = () => { if (!started) { started = true; onStart?.(); } };
    a.onended = () => { if (id === seq) { current = null; onEnd?.(); } };
    a.onerror = () => fallback();
    a.play().then(() => { if (!started) { started = true; onStart?.(); } }).catch(() => fallback());
  };

  const cached = cache.get(key);
  if (cached) { play(cached); return; }
  if (!GEMINI_KEY) { fallback(); return; }

  void fetchAudio(key).then((url) => {
    if (id !== seq) return;
    if (url) { cachePut(key, url); play(url); }
    else fallback();
  });
}