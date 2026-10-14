import type { SkinId } from "@/lib/games/skins";
import type { BlockColor } from "./levels";
/**
 * Paleta de Arkanoid. El motor renderiza desde un spritesheet PNG, así que la
 * skin se expresa como "tintes" opcionales por sprite:
 *
 * - Un `null` significa "dibuja el sprite original sin modificar". Es el camino
 *   de `clasico`: así el aspecto es idéntico al PNG original pixel a pixel.
 * - Un color CSS tinta el sprite con composición offscreen (`multiply` +
 *   recorte alfa; ver `tint.ts`). Preserva luces/sombras y respeta el alfa.
 *
 * Solo color: no cambia formas, física, puntuación ni el marco CRT.
 */
export type BloqueBusterPalette = {
  /** Fondo del canvas (fillRect previo a los sprites). */
  bg: string;
  /** Tinte por color de bloque; null = sprite original. */
  blockTints: Record<BlockColor, string | null>;
  /** Tinte de los frames de explosión; comparte clave con los bloques. */
  explosionTints: Record<BlockColor, string | null>;
  /** Tinte de la pala; null = sprite original. */
  paddleTint: string | null;
  /** Tinte de la bola; null = sprite original. */
  ballTint: string | null;
};
export const SKINS: Record<SkinId, BloqueBusterPalette> = {
  clasico: {
    bg: "#000",
    blockTints: {
      gray: null,
      red: null,
      yellow: null,
      cyan: null,
      magenta: null,
      hotpink: null,
      green: null,
    },
    explosionTints: {
      gray: null,
      red: null,
      yellow: null,
      cyan: null,
      magenta: null,
      hotpink: null,
      green: null,
    },
    paddleTint: null,
    ballTint: null,
  },
  neon: {
    bg: "#05070f",
    blockTints: {
      gray: "#9aa6c7",
      red: "#ff1744",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#ff006e",
      hotpink: "#ff4bd8",
      green: "#00ff88",
    },
    explosionTints: {
      gray: "#9aa6c7",
      red: "#ff1744",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      magenta: "#ff006e",
      hotpink: "#ff4bd8",
      green: "#00ff88",
    },
    paddleTint: "#00f5ff",
    ballTint: "#f5ff00",
  },
  retro: {
    bg: "#0d0b08",
    blockTints: {
      gray: "#8a7f6a",
      red: "#b5533a",
      yellow: "#d9c27a",
      cyan: "#6fb98f",
      magenta: "#c08457",
      hotpink: "#c9956d",
      green: "#8a9a5b",
    },
    explosionTints: {
      gray: "#8a7f6a",
      red: "#b5533a",
      yellow: "#d9c27a",
      cyan: "#6fb98f",
      magenta: "#c08457",
      hotpink: "#c9956d",
      green: "#8a9a5b",
    },
    paddleTint: "#d9c27a",
    ballTint: "#ffd9a0",
  },
};
