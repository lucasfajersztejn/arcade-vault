import type { SavedScore } from "./types";

export const SCORES_KEY = "av_scores";

function isSavedScore(v: unknown): v is SavedScore {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.game === "string" &&
    typeof s.score === "number" &&
    typeof s.name === "string" &&
    typeof s.at === "number"
  );
}

/** Devuelve las puntuaciones guardadas; si algo falla o está corrupto, devuelve []. */
export function getScores(): SavedScore[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSavedScore) : [];
  } catch {
    return [];
  }
}

/** Añade una puntuación; devuelve false si no se pudo persistir. */
export function saveScore(entry: Omit<SavedScore, "at">): boolean {
  try {
    const all = getScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    return true;
  } catch {
    return false;
  }
}
