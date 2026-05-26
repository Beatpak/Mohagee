import { SEED_ITEMS, SEED_VERSION } from "../data/seed";
import { FOOD_CATEGORIES } from "../data/foods";
import { REGIONS_WITHIN_1H_FROM_SNU } from "../data/regions";
import type { DrawSession, HistoryEntry, ItemsByCategory } from "../types";

const KEYS = {
  items: "random-date-items",
  activeSession: "random-date-active-session",
  history: "random-date-history",
  seeded: "random-date-seeded",
  seedVersion: "random-date-seed-version",
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

function applySeedVersion(items: ItemsByCategory): ItemsByCategory {
  const storedVersion = Number(localStorage.getItem(KEYS.seedVersion) ?? "0");
  if (storedVersion >= SEED_VERSION) {
    return items;
  }

  let next = items;

  if (storedVersion < 2) {
    const customRegions = items.region.filter(
      (name) => !REGIONS_WITHIN_1H_FROM_SNU.includes(name),
    );
    next = {
      ...items,
      region: [...REGIONS_WITHIN_1H_FROM_SNU, ...customRegions],
    };
  }

  if (storedVersion < 3) {
    const customFoods = next.food.filter((name) => !FOOD_CATEGORIES.includes(name));
    next = {
      ...next,
      food: [...FOOD_CATEGORIES, ...customFoods],
    };
  }

  localStorage.setItem(KEYS.seedVersion, String(SEED_VERSION));
  writeJson(KEYS.items, next);
  return next;
}

export function loadItems(): ItemsByCategory {
  const seeded = localStorage.getItem(KEYS.seeded);
  if (!seeded) {
    writeJson(KEYS.items, SEED_ITEMS);
    localStorage.setItem(KEYS.seeded, "1");
    localStorage.setItem(KEYS.seedVersion, String(SEED_VERSION));
    return { ...SEED_ITEMS };
  }

  const items = readJson<ItemsByCategory>(KEYS.items, { ...SEED_ITEMS });
  return applySeedVersion(items);
}

export function saveItems(items: ItemsByCategory): void {
  writeJson(KEYS.items, items);
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
