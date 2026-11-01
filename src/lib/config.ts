
const env: Record<string, string> =
  ((import.meta as any).env || {}) as Record<string, string>;

export const GEMINI_KEY =
  env.VITE_GEMINI_API_KEY || "";

export const GEMINI_MODEL = "gemini-2.5-flash";

export const GEMINI_FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

export const LIVEKIT = {
  url: env.VITE_LIVEKIT_URL || "",
  agentName: "my-agent",
  room: "mrm-command-center",
};

