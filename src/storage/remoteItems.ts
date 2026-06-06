import { DATE_SPOTS } from "../data/dateSpots";
import { SEED_ITEMS, SEED_VERSION } from "../data/seed";
import { DESSERT_CATEGORIES } from "../data/desserts";
import { FOOD_CATEGORIES } from "../data/foods";
import { REGIONS_WITHIN_1H_FROM_SNU } from "../data/regions";
import { getSupabase } from "../lib/supabase";
import { CATEGORY_ORDER, type Category, type ItemsByCategory } from "../types";

type DateItemRow = {
  id: string;
  category: Category;
  label: string;
  sort_order: number;
};

type DateItemInsert = {
  category: Category;
  label: string;
  sort_order: number;
};

function emptyItems(): ItemsByCategory {
  return {
    region: [],
    food: [],
    dessert: [],
    dateSpot: [],
  };
}

function rowsToItems(rows: Pick<DateItemRow, "category" | "label" | "sort_order">[]): ItemsByCategory {
  const items = emptyItems();

  for (const row of rows) {
    items[row.category].push(row.label);
  }

  for (const category of CATEGORY_ORDER) {
    const order = new Map(
      rows
        .filter((row) => row.category === category)
        .map((row) => [row.label, row.sort_order]),
    );
    items[category].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
  }

  return items;
}

function itemsToRows(items: ItemsByCategory): DateItemInsert[] {
  const rows: DateItemInsert[] = [];

  for (const category of CATEGORY_ORDER) {
    items[category].forEach((label, sortOrder) => {
      rows.push({ category, label, sort_order: sortOrder });
    });
  }

  return rows;
}

function itemKey(category: Category, label: string): string {
  return `${category}:${label}`;
}

function applySeedVersion(
  items: ItemsByCategory,
  storedVersion: number,
): { items: ItemsByCategory; seedVersion: number } {
  if (storedVersion >= SEED_VERSION) {
    return { items, seedVersion: storedVersion };
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

  if (storedVersion < 4) {
    const customFoods = next.food.filter(
      (name) => !FOOD_CATEGORIES.includes(name) && name !== "카페·디저트",
    );
    const customDesserts = (next.dessert ?? []).filter(
      (name) => !DESSERT_CATEGORIES.includes(name),
    );
    next = {
      ...next,
      food: [...FOOD_CATEGORIES, ...customFoods],
      dessert: [...DESSERT_CATEGORIES, ...customDesserts],
    };
  }

  if (storedVersion < 5) {
    const customDateSpots = next.dateSpot.filter((name) => !DATE_SPOTS.includes(name));
    next = {
      ...next,
      dateSpot: [...DATE_SPOTS, ...customDateSpots],
    };
  }

  return { items: next, seedVersion: SEED_VERSION };
}

async function fetchRowsFromDb(): Promise<DateItemRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("date_items")
    .select("id, category, label, sort_order")
    .order("category")
    .order("sort_order");

  if (error) {
    throw error;
  }

  return (data ?? []) as DateItemRow[];
}

async function fetchSeedVersion(): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("app_meta")
    .select("seed_version")
    .eq("id", 1)
    .maybeSingle<{ seed_version: number }>();

  if (error) {
    throw error;
  }

  return data?.seed_version ?? 0;
}

async function updateSeedVersion(seedVersion: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("app_meta").upsert({
    id: 1,
    seed_version: seedVersion,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

async function syncItems(items: ItemsByCategory): Promise<void> {
  const supabase = getSupabase();
  const existing = await fetchRowsFromDb();
  const desired = itemsToRows(items);
  const desiredKeys = new Set(desired.map((row) => itemKey(row.category, row.label)));

  const toDeleteIds = existing
    .filter((row) => !desiredKeys.has(itemKey(row.category, row.label)))
    .map((row) => row.id);

  if (toDeleteIds.length > 0) {
    const { error: deleteError } = await supabase.from("date_items").delete().in("id", toDeleteIds);
    if (deleteError) {
      throw deleteError;
    }
  }

  if (desired.length > 0) {
    const { error: upsertError } = await supabase.from("date_items").upsert(desired, {
      onConflict: "category,label",
    });
    if (upsertError) {
      throw upsertError;
    }
  }
}

async function ensureInitialized(): Promise<void> {
  const supabase = getSupabase();
  const { count, error: countError } = await supabase
    .from("date_items")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) > 0) {
    return;
  }

  await syncItems(SEED_ITEMS);
  await updateSeedVersion(SEED_VERSION);
}

export async function fetchItems(): Promise<ItemsByCategory> {
  await ensureInitialized();

  const rows = await fetchRowsFromDb();
  const items = rowsToItems(rows);
  const seedVersion = await fetchSeedVersion();
  const { items: migrated, seedVersion: nextSeedVersion } = applySeedVersion(items, seedVersion);

  if (
    nextSeedVersion !== seedVersion ||
    JSON.stringify(migrated) !== JSON.stringify(items)
  ) {
    await syncItems(migrated);
    await updateSeedVersion(nextSeedVersion);
    return migrated;
  }

  return items;
}

export async function saveItems(items: ItemsByCategory): Promise<void> {
  await syncItems(items);

  const supabase = getSupabase();
  const seedVersion = await fetchSeedVersion();
  const { error } = await supabase.from("app_meta").upsert({
    id: 1,
    seed_version: seedVersion || SEED_VERSION,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw error;
  }
}

export function subscribeItems(callback: (items: ItemsByCategory) => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel("date_items_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "date_items" },
      () => {
        fetchItems()
          .then(callback)
          .catch(() => {
            // Realtime refetch failure is ignored; user can retry manually.
          });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
