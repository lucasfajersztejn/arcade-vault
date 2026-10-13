import type { GameCategory } from "./types";
export const ALL_CATEGORIES = "TODOS" as const;
export const CATS: readonly (typeof ALL_CATEGORIES | GameCategory)[] = [
  ALL_CATEGORIES,
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
];
