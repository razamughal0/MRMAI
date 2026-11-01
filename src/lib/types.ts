export type Phase = "boot" | "standby" | "active" | "shutdown";
export type CoreState = "idle" | "listening" | "speaking" | "executing";
export type MsgSource = "voice" | "text" | "system" | "clap" | "module";

export interface ChatMsg {
  id: string;
  role: "user" | "mrm";
  text: string;
  ts: number;
  source: MsgSource;
}

export type ActivityStatus = "ok" | "sim" | "warn" | "error";

export interface ActivityRec {
  id: string;
  ts: number;
  tool: string;
  detail: string;
  status: ActivityStatus;
}

export interface CommandRec {
  id: string;
  ts: number;
  text: string;
  intent: string;
  source: MsgSource;
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  query?: string;
  kind: "youtube" | "google" | "site";
  highlight?: number;
}

export interface WaMsg {
  from: "me" | "them";
  text: string;
}

export interface Toast {
  id: string;
  text: string;
  kind: "ok" | "info" | "warn" | "error";
}

export type WindowId = "browser" | "notepad" | "whatsapp" | "calculator";

export interface Settings {
  voiceOn: boolean;
  clapControl: boolean;
  alwaysMic: boolean;
  voiceLang: string;
  sfxOn: boolean;
}

export type Intent =
  | { type: "open_app"; app: string }
  | { type: "open_url"; url: string; label: string; newTab: boolean }
  | { type: "youtube_search"; query: string; newTab: boolean }
  | { type: "youtube_play"; query: string; result: number; newTab: boolean }
  | { type: "google_search"; query: string; newTab: boolean }
  | { type: "notepad_open" }
  | { type: "notepad_type"; text: string }
  | { type: "whatsapp"; contact?: string; message?: string; send: boolean }
  | { type: "tab"; action: "new" | "close_current" | "new_window" | "close_window" | "next" | "prev" | "goto" | "select_name" | "close_name"; number?: number; name?: string }
  | { type: "time" }
  | { type: "screenshot" }
  | { type: "scroll"; amount: number; target?: string }
  | { type: "mouse"; action: "click" | "double" | "right" | "move" | "position"; x?: number; y?: number }
  | { type: "vision_click"; target: string }
  | { type: "key"; keys: string[] }
  | { type: "type_text"; text: string }
  | { type: "clap"; on: boolean }
  | { type: "media_toggle" }
  | { type: "shutdown_request" }
  | { type: "creator" }
  | { type: "greeting" }
  | { type: "help" }
  | { type: "open_folder"; folder: string }
  | { type: "unknown"; raw: string };

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);