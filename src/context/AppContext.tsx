import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getNextCategory,
  isSessionComplete,
  type Category,
  type DrawSession,
  type HistoryEntry,
  type ItemsByCategory,
} from "../types";
import {
  loadActiveSession,
  loadHistory,
  loadItems,
  saveActiveSession,
  saveHistory,
  saveItems,
} from "../storage/storage";
import { pickRandom } from "../utils/random";

type AppContextValue = {
  items: ItemsByCategory;
  activeSession: DrawSession | null;
  history: HistoryEntry[];
  lastCompleted: HistoryEntry | null;
  startNewSession: () => { ok: true } | { ok: false; reason: string };
  cancelSession: () => void;
  drawCurrentStep: () =>
    | { ok: true; value: string; isComplete: boolean }
    | { ok: false; reason: string };
  finishSession: () => void;
  addItem: (category: Category, label: string) => { ok: true } | { ok: false; reason: string };
  removeItem: (category: Category, label: string) => void;
  deleteHistoryEntry: (id: string) => void;
  clearLastCompleted: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

function createSessionId(): string {
  return crypto.randomUUID();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemsByCategory>(() => loadItems());
  const [activeSession, setActiveSession] = useState<DrawSession | null>(() =>
    loadActiveSession(),
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [lastCompleted, setLastCompleted] = useState<HistoryEntry | null>(null);

  const persistItems = useCallback((next: ItemsByCategory) => {
    setItems(next);
    saveItems(next);
  }, []);

  const persistSession = useCallback((next: DrawSession | null) => {
    setActiveSession(next);
    saveActiveSession(next);
  }, []);

  const persistHistory = useCallback((next: HistoryEntry[]) => {
    setHistory(next);
    saveHistory(next);
  }, []);

  const startNewSession = useCallback((): { ok: true } | { ok: false; reason: string } => {
    if (activeSession?.status === "in_progress") {
      return { ok: false, reason: "진행 중인 데이트가 있어요. 이어하기 또는 취소 후 시작해 주세요." };
    }
    const session: DrawSession = {
      id: createSessionId(),
      startedAt: new Date().toISOString(),
      status: "in_progress",
    };
    persistSession(session);
    return { ok: true };
  }, [activeSession, persistSession]);

  const cancelSession = useCallback(() => {
    persistSession(null);
  }, [persistSession]);

  const completeSession = useCallback(
    (session: DrawSession) => {
      const entry: HistoryEntry = {
        ...session,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      const nextHistory = [entry, ...history];
      persistHistory(nextHistory);
      persistSession(null);
      setLastCompleted(entry);
    },
    [history, persistHistory, persistSession],
  );

  const finishSession = useCallback(() => {
    const session = loadActiveSession();
    if (!session || !isSessionComplete(session)) return;
    completeSession({ ...session, status: "completed" });
  }, [completeSession]);

  const drawCurrentStep = useCallback(():
    | { ok: true; value: string; isComplete: boolean }
    | { ok: false; reason: string } => {
    if (!activeSession || activeSession.status !== "in_progress") {
      return { ok: false, reason: "진행 중인 데이트가 없어요." };
    }

    const category = getNextCategory(activeSession);
    if (!category) {
      return { ok: false, reason: "이미 모든 항목을 뽑았어요." };
    }

    const pool = items[category];
    if (pool.length === 0) {
      return {
        ok: false,
        reason: `${category === "region" ? "지역" : category === "food" ? "음식" : "데이트거리"} 항목이 없어요. 항목 관리에서 추가해 주세요.`,
      };
    }

    const picked = pickRandom(pool);
    if (!picked) {
      return { ok: false, reason: "뽑기에 실패했어요." };
    }

    const updated: DrawSession = { ...activeSession, [category]: picked };
    persistSession(updated);

    return { ok: true, value: picked, isComplete: isSessionComplete(updated) };
  }, [activeSession, items, persistSession]);

  const addItem = useCallback(
    (category: Category, label: string): { ok: true } | { ok: false; reason: string } => {
      const trimmed = label.trim();
      if (!trimmed) {
        return { ok: false, reason: "항목 이름을 입력해 주세요." };
      }
      if (items[category].includes(trimmed)) {
        return { ok: false, reason: "이미 있는 항목이에요." };
      }
      const next = {
        ...items,
        [category]: [...items[category], trimmed],
      };
      persistItems(next);
      return { ok: true };
    },
    [items, persistItems],
  );

  const removeItem = useCallback(
    (category: Category, label: string) => {
      const next = {
        ...items,
        [category]: items[category].filter((item) => item !== label),
      };
      persistItems(next);
    },
    [items, persistItems],
  );

  const deleteHistoryEntry = useCallback(
    (id: string) => {
      persistHistory(history.filter((entry) => entry.id !== id));
    },
    [history, persistHistory],
  );

  const clearLastCompleted = useCallback(() => {
    setLastCompleted(null);
  }, []);

  const value = useMemo(
    () => ({
      items,
      activeSession,
      history,
      lastCompleted,
      startNewSession,
      cancelSession,
      drawCurrentStep,
      finishSession,
      addItem,
      removeItem,
      deleteHistoryEntry,
      clearLastCompleted,
    }),
    [
      items,
      activeSession,
      history,
      lastCompleted,
      startNewSession,
      cancelSession,
      drawCurrentStep,
      finishSession,
      addItem,
      removeItem,
      deleteHistoryEntry,
      clearLastCompleted,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
