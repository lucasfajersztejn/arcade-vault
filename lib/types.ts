export type GameColor = "cyan" | "magenta" | "yellow" | "green";
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  /** Clase CSS de la portada, p.ej. "cover-bricks" */
  cover: string;
  color: GameColor;
  best: number;
  /** Ya formateado, p.ej. "12.4K" */
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  /** Formato DD/MM/2026 */
  date: string;
}

/** Persistido en localStorage["av_user"] */
export interface SessionUser {
  name: string;
}

/** Persistido (array) en localStorage["av_scores"] */
export interface SavedScore {
  game: string;
  score: number;
  name: string;
  at: number;
}
