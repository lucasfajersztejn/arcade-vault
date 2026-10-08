import type { SavedScore } from "./types";

export const SCORES_KEY = "av_scores";
const SCORES_EVENT = "av-scores-change";

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

/** Interpreta el JSON crudo de localStorage; si está corrupto, devuelve []. */
export function parseScores(raw: string | null): SavedScore[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSavedScore) : [];
  } catch {
    return [];
  }
}

/** Valor crudo de localStorage (string estable, apto para useSyncExternalStore). */
export function readScoresRaw(): string | null {
  try {
    return localStorage.getItem(SCORES_KEY);
  } catch {
    return null;
  }
}

/** Avisa de cambios en otras pestañas y de los guardados de esta pestaña. */
export function subscribeScores(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SCORES_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SCORES_EVENT, callback);
  };
}

/** Devuelve las puntuaciones guardadas; si algo falla o está corrupto, devuelve []. */
export function getScores(): SavedScore[] {
  return parseScores(readScoresRaw());
}

/** Añade una puntuación; devuelve false si no se pudo persistir. */
export function saveScore(entry: Omit<SavedScore, "at">): boolean {
  try {
    const all = getScores();
    all.push({ ...entry, at: Date.now() });
    localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(SCORES_EVENT));
    return true;
  } catch {
    return false;
  }
}
