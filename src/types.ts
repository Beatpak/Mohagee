export type Category = "region" | "food" | "dateSpot";

export type DrawSession = {
  id: string;
  startedAt: string;
  region?: string;
  food?: string;
  dateSpot?: string;
  status: "in_progress" | "completed";
};

export type HistoryEntry = DrawSession & {
  completedAt: string;
};

export type ItemsByCategory = Record<Category, string[]>;

export const CATEGORY_ORDER: Category[] = ["region", "food", "dateSpot"];

export const CATEGORY_LABELS: Record<Category, string> = {
  region: "지역",
  food: "음식",
  dateSpot: "데이트거리",
};

export function getNextCategory(session: DrawSession): Category | null {
  if (!session.region) return "region";
  if (!session.food) return "food";
  if (!session.dateSpot) return "dateSpot";
  return null;
}

export function isSessionComplete(session: DrawSession): boolean {
  return Boolean(session.region && session.food && session.dateSpot);
}
