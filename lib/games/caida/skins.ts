import type { SkinId } from "@/lib/games/skins";
/**
 * Paleta de color de Caída. Cada campo es un "slot" del censo de color del
 * render: fondo del canvas, rejilla, brillo superior de cada bloque y los
 * colores por tipo de pieza (índice 1–7: I, O, T, S, Z, J, L; el 0 es celda
 * vacía). Solo cambian colores; nada de formas, tamaños ni física.
 */
export type CaidaPalette = {
  /** Fondo que pinta el motor en el tablero y la vista previa. */
  bg: string;
  /** Líneas de la rejilla del tablero. */
  grid: string;
  /** Brillo superior (gloss) de cada bloque. */
  gloss: string;
  /** Color por tipo de pieza; el índice 0 es `null` (celda vacía). */
  pieceColors: (string | null)[];
};
/**
 * `clasico` reproduce EXACTAMENTE los literales originales del juego
 * (`COLORS`, `GRID_LINE`, el gloss `rgba(255,255,255,0.12)` y el fondo
 * `--caida-canvas: #1a1a25` de `app/globals.css`). `neon` y `retro` reasignan
 * los mismos slots.
 */
export const SKINS: Record<SkinId, CaidaPalette> = {
  clasico: {
    bg: "#1a1a25",
    grid: "#22222e",
    gloss: "rgba(255,255,255,0.12)",
    pieceColors: [
      null,
      "#4dd0e1", // I
      "#ffd54f", // O
      "#ba68c8", // T
      "#81c784", // S
      "#e57373", // Z
      "#90caf9", // J
      "#ffb74d", // L
    ],
  },
  neon: {
    bg: "#0a0a14",
    grid: "#15263a",
    gloss: "rgba(255,255,255,0.22)",
    pieceColors: [
      null,
      "#00f5ff", // I — cian de la plataforma
      "#f5ff00", // O — amarillo
      "#ff006e", // T — magenta
      "#00ff88", // S — verde
      "#ff1744", // Z — rojo neón
      "#2979ff", // J — azul neón
      "#ff9100", // L — naranja neón
    ],
  },
  retro: {
    bg: "#0d0b08",
    grid: "#1f1a12",
    gloss: "rgba(255,240,200,0.10)",
    pieceColors: [
      null,
      "#6fb98f", // I — verde fósforo apagado
      "#d9c27a", // O — crema ámbar
      "#c08457", // T — terracota
      "#8a9a5b", // S — oliva
      "#b5533a", // Z — teja
      "#5f8a8b", // J — verde azulado grisáceo
      "#cf9b5c", // L — ámbar
    ],
  },
};
