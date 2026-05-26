import type { ItemsByCategory } from "../types";
import { FOOD_CATEGORIES } from "./foods";
import { REGIONS_WITHIN_1H_FROM_SNU } from "./regions";

export const SEED_VERSION = 3;

export const SEED_ITEMS: ItemsByCategory = {
  region: [...REGIONS_WITHIN_1H_FROM_SNU],
  food: [...FOOD_CATEGORIES],
  dateSpot: ["영화관", "한강 산책", "전시회", "방탈출", "카페 투어", "볼링"],
};
