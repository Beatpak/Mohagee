import type { DrawSession, HistoryEntry } from "../types";

const KEYS = {
  activeSession: "random-date-active-session",
  history: "random-date-history",
} as const;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadActiveSession(): DrawSession | null {
  return readJson<DrawSession | null>(KEYS.activeSession, null);
}

export function saveActiveSession(session: DrawSession | null): void {
  if (session) {
    writeJson(KEYS.activeSession, session);
  } else {
    localStorage.removeItem(KEYS.activeSession);
  }
}

export function loadHistory(): HistoryEntry[] {
  return readJson<HistoryEntry[]>(KEYS.history, []);
}

export function saveHistory(history: HistoryEntry[]): void {
  writeJson(KEYS.history, history);
}
