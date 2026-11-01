/**
 * MRM GEMINI BRAIN — direct browser → Gemini REST (real AI).
 * 1) testGemini()  : key verify / brain online
 * 2) askGemini()   : Roman Urdu persona chat + natural-language → command routing
 * 3) geminiVision(): screenshot → locate UI element (same contract as Python agent)
 */

import { GEMINI_KEY, GEMINI_MODEL, GEMINI_FALLBACK_MODELS } from "./config";

const API = "https://generativelanguage.googleapis.com/v1beta/models/";
let activeModel = GEMINI_MODEL;
export const currentModel = () => activeModel;

const PERSONA = `You are MRM, a female personal Windows AI assistant created by Muhammad Raza Mughal on 13 August 2026.
Address the user as "boss". Reply in feminine Roman Urdu (kar sakti hoon, bata sakti hoon) if user speaks Roman Urdu/Urdu, English if user speaks English. Keep replies SHORT (1-2 sentences), warm, confident.
If asked who created you: "Mujhe Muhammad Raza Mughal ne 13 August 2026 ko banaya hai, boss."

ACTION ROUTING:
If the user's request maps to one of these actions, reply with ONLY valid JSON {"command": "<canonical command>"} and nothing else:
- Open apps: "chrome kholo", "edge kholo", "notepad kholo", "calculator kholo", "vs code kholo", "task manager kholo", "file explorer kholo", "whatsapp kholo"
- Websites: "youtube kholo", "google kholo", "github kholo"
- YouTube: "youtube par <query> search karo" or "youtube par <query> search karo aur pehla video chalao" (doosra/teesra for 2nd/3rd; add "new tab mein" prefix if new tab requested)
- Google: "google par <query> search karo"
- Tabs: "new tab kholo", "ye tab close karo", "browser band karo", "next tab", "previous tab", "tab 3 kholo", "<name> wala tab close karo", "<name> wala tab select karo"
- WhatsApp: "whatsapp kholo aur <contact> ko message karo: <message>"
- Notepad typing: "notepad kholo aur <text> likho"
- Screen: "screenshot lo", "<x> <y> par click karo", "double click <x> <y>", "mouse <x> <y> par le jao", "upar scroll karo", "neeche scroll karo", "<target> button par click karo"
- Keyboard: "press enter", "ctrl c dabao"
- System: "time kya hai", "screenshot lo", "clap control on karo", "clap control off karo", "pause karo", "shutdown"
Otherwise (questions, conversation, knowledge) answer directly as MRM in plain text — NO JSON.`;

async function callOnce(model: string, body: unknown, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API}${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err: any = new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const parts = data?.candidates?.[0]?.content?.parts || [];
    return parts.map((p: any) => p.text || "").join("").trim();
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(body: unknown, timeoutMs = 30000): Promise<string> {
  const chain = [activeModel, ...GEMINI_FALLBACK_MODELS.filter((m) => m !== activeModel)];
  let lastErr: any = null;
  for (const model of chain) {
    try {
      const out = await callOnce(model, body, timeoutMs);
      activeModel = model;
      return out;
    } catch (e: any) {
      lastErr = e;
      // 404/503/429(quota) par agla model — har model ka quota alag hai
      if (e?.status === 404 || e?.status === 503 || e?.status === 429 || e?.name === "AbortError") continue;
      throw e;
    }
  }
  throw lastErr || new Error("Gemini unreachable");
}

export const isQuotaError = (msg: string) => /quota|RESOURCE_EXHAUSTED|429|rate.?limit/i.test(msg || "");

export async function testGemini(): Promise<{ ok: boolean; error?: string; quota?: boolean; model?: string }> {
  if (!GEMINI_KEY) return { ok: false, error: "API key missing" };
  try {
    await callGemini(
      {
        contents: [{ role: "user", parts: [{ text: "Reply with the single word: online" }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
      },
      20000
    );
    return { ok: true, model: currentModel() };
  } catch (e: any) {
    const msg = e?.message?.slice(0, 160) || "network error";
    return { ok: false, error: msg, quota: e?.status === 429 || isQuotaError(msg) };
  }
}

export interface BrainReply {
  text?: string;
  command?: string;
}

export async function askGemini(
  userText: string,
  history: { role: "user" | "model"; text: string }[]
): Promise<BrainReply> {
  try {
    const out = await callGemini({
      system_instruction: { parts: [{ text: PERSONA }] },
      contents: [
        ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: "user", parts: [{ text: userText }] },
      ],
      generationConfig: { temperature: 0.6, maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } },
    });
    if (!out) return { text: "Boss, Gemini se jawab khali aaya — dobara try karein." };
    const cleaned = out.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.command === "string" && parsed.command.trim()) {
        return { command: parsed.command.trim() };
      }
    } catch {
      /* plain text answer */
    }
    return { text: cleaned };
  } catch (e: any) {
    return { text: `Boss, Gemini brain tak nahi pahunch saki: ${e?.message?.slice(0, 120) || "network error"}` };
  }
}

export interface VisionResult {
  found: boolean;
  x: number | null;
  y: number | null;
  confidence: number;
  reason: string;
}

export async function geminiVision(
  dataUrl: string,
  width: number,
  height: number,
  target: string
): Promise<VisionResult> {
  try {
    const out = await callGemini(
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text:
                  `You are MRM's screen vision. Find this target on the screenshot: ${target}\n` +
                  `Screen resolution: width=${width} height=${height}.\n` +
                  `Rules: only report if visibly present; give CENTER pixel coordinates (absolute); ` +
                  `confidence 0..1; do not guess.\n` +
                  `Return ONLY JSON: {"found":true,"x":123,"y":456,"confidence":0.9,"reason":"..."} ` +
                  `or {"found":false,"x":null,"y":null,"confidence":0,"reason":"target not visible"}.`,
              },
              { inline_data: { mime_type: "image/png", data: dataUrl.split(",")[1] } },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: "application/json",
        },
      },
      40000
    );
    const cleaned = out.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      found: !!parsed.found,
      x: typeof parsed.x === "number" ? parsed.x : null,
      y: typeof parsed.y === "number" ? parsed.y : null,
      confidence: Number(parsed.confidence) || 0,
      reason: String(parsed.reason || ""),
    };
  } catch (e: any) {
    return { found: false, x: null, y: null, confidence: 0, reason: e?.message?.slice(0, 140) || "vision error" };
  }
}