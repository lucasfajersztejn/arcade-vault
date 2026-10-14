/**
 * Paletas de color de Snake. Solo cambian colores (tablero, borde, baldosa de
 * fruta, degradado de la serpiente y ojos); nunca formas, tamaños ni física.
 * `clasico` reproduce los literales originales del render pixel a pixel.
 *
 * La lightness por segmento sigue siendo derivada de la posición en la cola;
 * la paleta solo expone `snakeHue` + `snakeSat`, de modo que en `clasico` el
 * degradado rinde `hsl(150 100% L%)` idéntico al original.
 */
import type { SkinId } from "@/lib/games/skins";
export type SnakePalette = {
  /** Celda del tablero en posición (row+col) par. */
  tileDark: string;
  /** Celda del tablero en posición (row+col) impar. */
  tileLight: string;
  /** Borde interior del tablero (recordatorio de que las paredes matan). */
  border: string;
  /** Baldosa bajo la fruta para que no se pierda contra la serpiente. */
  fruitTile: string;
  /** Trazo tenue alrededor de la baldosa de fruta. */
  fruitTileEdge: string;
  /** Matiz base del degradado de la serpiente. */
  snakeHue: number;
  /** Saturación base del degradado de la serpiente (0–100). */
  snakeSat: number;
  /** Color de los dos ojos de la cabeza. */
  eye: string;
};
export const SKINS: Record<SkinId, SnakePalette> = {
  clasico: {
    tileDark: "#05070d",
    tileLight: "#080c16",
    border: "rgba(0, 255, 136, 0.8)",
    fruitTile: "#12172a",
    fruitTileEdge: "rgba(255, 255, 255, 0.18)",
    snakeHue: 150,
    snakeSat: 100,
    eye: "#05070d",
  },
  neon: {
    tileDark: "#05080f",
    tileLight: "#0a1120",
    border: "rgba(0, 245, 255, 0.9)",
    fruitTile: "#140726",
    fruitTileEdge: "rgba(255, 0, 110, 0.35)",
    snakeHue: 187,
    snakeSat: 100,
    eye: "#05070d",
  },
  retro: {
    tileDark: "#0d0b08",
    tileLight: "#141009",
    border: "rgba(255, 176, 0, 0.75)",
    fruitTile: "#1a1308",
    fruitTileEdge: "rgba(255, 220, 160, 0.18)",
    snakeHue: 120,
    snakeSat: 55,
    eye: "#0d0b08",
  },
};
