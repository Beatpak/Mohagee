import { DATE_SPOTS } from "../data/dateSpots";
import { SEED_ITEMS, SEED_VERSION } from "../data/seed";
import { DESSERT_CATEGORIES } from "../data/desserts";
import { FOOD_CATEGORIES } from "../data/foods";
import { REGIONS_WITHIN_1H_FROM_SNU } from "../data/regions";
import { getSupabase } from "../lib/supabase";
import type { ItemsByCategory } from "../types";

type SharedItemsRow = {
  items: ItemsByCategory;
  seed_version: number;
};

function normalizeItems(raw: ItemsByCategory): ItemsByCategory {
  return {
    region: raw.region ?? [],
    food: raw.food ?? [],
    dessert: raw.dessert ?? [],
    dateSpot: raw.dateSpot ?? [],
  };
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

async function saveItemsToDb(items: ItemsByCategory, seedVersion: number): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("shared_items")
    .update({
      items,
      seed_version: seedVersion,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw error;
  }
}

async function insertSeedRow(): Promise<ItemsByCategory> {
  const supabase = getSupabase();
  const items = { ...SEED_ITEMS };
  const { error } = await supabase.from("shared_items").insert({
    id: 1,
    items,
    seed_version: SEED_VERSION,
  });

  if (error) {
    if (error.code === "23505") {
      return fetchItems();
    }
    throw error;
  }

  return items;
}

export async function fetchItems(): Promise<ItemsByCategory> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("shared_items")
    .select("items, seed_version")
    .eq("id", 1)
    .maybeSingle<SharedItemsRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return insertSeedRow();
  }

  const normalized = normalizeItems(data.items);
  const { items, seedVersion } = applySeedVersion(normalized, data.seed_version);

  if (seedVersion !== data.seed_version) {
    await saveItemsToDb(items, seedVersion);
  }

  return items;
}

export async function saveItems(items: ItemsByCategory): Promise<void> {
  const supabase = getSupabase();
  const { data, error: readError } = await supabase
    .from("shared_items")
    .select("seed_version")
    .eq("id", 1)
    .maybeSingle<{ seed_version: number }>();

  if (readError) {
    throw readError;
  }

  const seedVersion = data?.seed_version ?? SEED_VERSION;
  await saveItemsToDb(items, seedVersion);
}

export function subscribeItems(callback: (items: ItemsByCategory) => void): () => void {
  const supabase = getSupabase();
  const channel = supabase
    .channel("shared_items_changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "shared_items" },
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
