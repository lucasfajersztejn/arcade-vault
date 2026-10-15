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
  /** Mejor marca global (MAX de scores); 0 si no hay partidas */
  best: number;
  /** Partidas jugadas (COUNT de scores); se formatea en la UI con `formatPlays` */
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
/** Fila de `public.profiles` (ver SPEC 14). */
export interface Profile {
  user_id: string;
  display_name: string;
  created_at: string;
}
/** Usuario autenticado + su perfil. `null` significa invitado. */
export interface CurrentUser {
  id: string;
  email: string;
  profile: Profile;
}
