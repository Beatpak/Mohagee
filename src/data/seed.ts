import type { ItemsByCategory } from "../types";
import { DATE_SPOTS } from "./dateSpots";
import { DESSERT_CATEGORIES } from "./desserts";
import { FOOD_CATEGORIES } from "./foods";
import { REGIONS_WITHIN_1H_FROM_SNU } from "./regions";

export const SEED_VERSION = 5;

export const SEED_ITEMS: ItemsByCategory = {
  region: [...REGIONS_WITHIN_1H_FROM_SNU],
  food: [...FOOD_CATEGORIES],
  dessert: [...DESSERT_CATEGORIES],
  dateSpot: [...DATE_SPOTS],
};
