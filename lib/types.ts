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
/** Juego tal como sale de la BD: `best` y `plays` calculados desde `scores`. Sustituye a `Game` en el paso 6. */
export interface GameWithStats extends Omit<Game, "plays"> {
  plays: number;
}
/** Mejor marca de un jugador en un juego, con su rango. */
export interface PlayerBest {
  rank: number;
  score: number;
  /** Formato DD/MM/AAAA */
  date: string;
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
