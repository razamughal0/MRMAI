import type { ChatMsg, ActivityRec, CommandRec, Settings } from "./types";

/**
 * MRM LOCAL DATABASE
 * Persistent JSON store (browser localStorage) mirroring the backend schema.
 * Tables: messages, activity, commands, settings, meta.
 */

const KEY = "mrm_database_v1";

export interface MRMDatabase {
  messages: ChatMsg[];
  activity: ActivityRec[];
  commands: CommandRec[];
  settings: Settings;
  meta: {
    boots: number;
    claps: number;
    createdAt: number;
    lastSaved: number;
  };
}

const DEFAULT_DB: MRMDatabase = {
  messages: [],
  activity: [],
  commands: [],
  settings: { voiceOn: true, clapControl: true, alwaysMic: true, voiceLang: "en-IN", sfxOn: true },
  meta: { boots: 0, claps: 0, createdAt: Date.now(), lastSaved: Date.now() },
};

export function loadDB(): MRMDatabase {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_DB, meta: { ...DEFAULT_DB.meta, createdAt: Date.now() } };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_DB,
      ...parsed,
      settings: { ...DEFAULT_DB.settings, ...(parsed.settings || {}) },
      meta: { ...DEFAULT_DB.meta, ...(parsed.meta || {}) },
    };
  } catch {
    return { ...DEFAULT_DB };
  }
}

export function saveDB(db: MRMDatabase): void {
  try {
    const trimmed: MRMDatabase = {
      ...db,
      messages: db.messages.slice(-200),
      activity: db.activity.slice(-300),
      commands: db.commands.slice(-120),
      meta: { ...db.meta, lastSaved: Date.now() },
    };
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full or unavailable — keep running in memory */
  }
}

export function clearDB(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

export function dbSizeBytes(): number {
  try {
    return (localStorage.getItem(KEY) || "").length;
  } catch {
    return 0;
  }
}

export function exportDB(db: MRMDatabase): void {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mrm_database_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}