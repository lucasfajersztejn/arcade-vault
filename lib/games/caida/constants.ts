import type { Matrix } from "./types";
/** Tablero del original: 10×20 celdas de 30 px (canvas lógico 300×600). */
export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
/** Vista previa de la siguiente pieza: canvas 120×120, cuadrícula de 4×4 celdas de 30 px. */
export const NEXT_SIZE = 120;
export const NEXT_GRID = 4;
/** Matrices de las 7 piezas. El original añade una 8.ª (N, tuerca) que aquí se omite. */
export const PIECES: (Matrix | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];
export const PIECE_TYPES = 7;
/** Puntos por 0, 1, 2, 3 y 4 líneas a la vez; se multiplican por el nivel. */
export const LINE_SCORES = [0, 100, 300, 500, 800];
/** Desplazamientos que prueba la rotación antes de descartar el giro. */
export const WALL_KICKS = [0, -1, 1, -2, 2];
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;
export const LINES_PER_LEVEL = 10;
/** Intervalo de caída en ms: max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL − (nivel − 1) × DROP_STEP). */
export const BASE_DROP_INTERVAL = 1000;
export const DROP_STEP = 90;
export const MIN_DROP_INTERVAL = 100;
export const GHOST_ALPHA = 0.2;
/** Límite de dt en ms para evitar saltos tras perder el foco (el original no lo limita). */
export const MAX_DT = 50;
/** Tope de la columna `scores.score` en la BD. */
export const MAX_SCORE = 99_999_999;
