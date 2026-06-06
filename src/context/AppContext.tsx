import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CATEGORY_LABELS,
  getNextCategory,
  isSessionComplete,
  type Category,
  type DrawSession,
  type HistoryEntry,
  type ItemsByCategory,
} from "../types";
import { isSupabaseConfigured } from "../lib/supabase";
import { fetchItems, saveItems as saveRemoteItems, subscribeItems } from "../storage/remoteItems";
import {
  loadActiveSession,
  loadHistory,
  saveActiveSession,
  saveHistory,
} from "../storage/storage";
import { pickRandom } from "../utils/random";

const EMPTY_ITEMS: ItemsByCategory = {
  region: [],
  food: [],
  dessert: [],
  dateSpot: [],
};

type AppContextValue = {
  items: ItemsByCategory;
  itemsLoading: boolean;
  itemsError: string | null;
  retryLoadItems: () => void;
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
  const [items, setItems] = useState<ItemsByCategory>(EMPTY_ITEMS);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeSession, setActiveSession] = useState<DrawSession | null>(() =>
    loadActiveSession(),
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [lastCompleted, setLastCompleted] = useState<HistoryEntry | null>(null);

  const retryLoadItems = useCallback(() => {
    setLoadAttempt((attempt) => attempt + 1);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setItemsLoading(false);
      setItemsError("Supabase 환경 변수가 설정되지 않았어요. .env 파일을 확인해 주세요.");
      return;
    }

    let cancelled = false;
    setItemsLoading(true);
    setItemsError(null);

    fetchItems()
      .then((data) => {
        if (!cancelled) {
          setItems(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setItemsError("항목을 불러오지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setItemsLoading(false);
        }
      });

    const unsubscribe = subscribeItems((data) => {
      if (!cancelled) {
        setItems(data);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadAttempt]);

  const persistItems = useCallback((next: ItemsByCategory, previous: ItemsByCategory) => {
    setItems(next);
    saveRemoteItems(next).catch(() => {
      setItems(previous);
      setItemsError("항목 저장에 실패했어요. 다시 시도해 주세요.");
    });
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
    if (itemsLoading) {
      return { ok: false, reason: "항목을 불러오는 중이에요. 잠시 후 다시 시도해 주세요." };
    }
    if (itemsError) {
      return { ok: false, reason: "항목을 불러오지 못했어요. 다시 시도해 주세요." };
    }
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
  }, [activeSession, itemsError, itemsLoading, persistSession]);

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
        reason: `${CATEGORY_LABELS[category]} 항목이 없어요. 항목 관리에서 추가해 주세요.`,
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
      if (itemsLoading) {
        return { ok: false, reason: "항목을 불러오는 중이에요." };
      }
      if (itemsError) {
        return { ok: false, reason: "항목을 불러오지 못했어요. 다시 시도해 주세요." };
      }

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
      persistItems(next, items);
      return { ok: true };
    },
    [items, itemsError, itemsLoading, persistItems],
  );

  const removeItem = useCallback(
    (category: Category, label: string) => {
      if (itemsLoading || itemsError) return;
      const next = {
        ...items,
        [category]: items[category].filter((item) => item !== label),
      };
      persistItems(next, items);
    },
    [items, itemsError, itemsLoading, persistItems],
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
      itemsLoading,
      itemsError,
      retryLoadItems,
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
      itemsLoading,
      itemsError,
      retryLoadItems,
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
