/**
 * Base común de las skins de color de los juegos.
 *
 * Una skin solo cambia colores (relleno, bordes, brillos, fondo del canvas y
 * rejilla); nunca formas, física, reglas ni puntuación. `clasico` es la skin
 * por defecto y reproduce el aspecto original de cada juego. La preferencia se
 * guarda por juego en `localStorage["av_skin_<gameId>"]`.
 */
export type SkinId = "clasico" | "neon" | "retro";
export const SKIN_IDS: SkinId[] = ["clasico", "neon", "retro"];
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "Clásico",
  neon: "Neón",
  retro: "Retro",
};
export const DEFAULT_SKIN: SkinId = "clasico";
const storageKey = (gameId: string) => `av_skin_${gameId}`;
const isSkinId = (value: unknown): value is SkinId =>
  typeof value === "string" && (SKIN_IDS as string[]).includes(value);
/** Lee la skin preferida del juego; cae a `clasico` si no hay o es inválida. */
export function readSkin(gameId: string): SkinId {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (isSkinId(raw)) return raw;
  } catch {
    // localStorage no disponible: se usa la skin por defecto
  }
  return DEFAULT_SKIN;
}
/** Persiste la skin preferida del juego (silencioso si localStorage falla). */
export function writeSkin(gameId: string, skin: SkinId): void {
  try {
    localStorage.setItem(storageKey(gameId), skin);
  } catch {
    // localStorage no disponible: la preferencia simplemente no persiste
  }
}
