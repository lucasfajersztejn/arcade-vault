/** Rejilla de 20×20 celdas de 30 px; el canvas lógico es de 600×600 y el CSS lo escala. */
export const GRID = 20;
export const CELL = 30;
export const SIZE = GRID * CELL;
/** Inicio: cabeza en (col 10, fila 10) con 3 segmentos y el cuerpo a su izquierda, mirando a la derecha. */
export const START_COL = 10;
export const START_ROW = 10;
export const START_LENGTH = 3;
/** Puntos por fruta comida. */
export const FRUIT_POINTS = 10;
export const FRUITS_PER_LEVEL = 5;
/** Tope de la columna `scores.score` (el máximo real del juego es 3 970). */
export const MAX_SCORE = 99_999_999;
/** Milisegundos por paso en el nivel 1, lo que baja por nivel y el mínimo. */
export const STEP_MS_START = 140;
export const STEP_MS_PER_LEVEL = 5;
export const STEP_MS_MIN = 70;
/** Giros pendientes que se recuerdan entre dos pasos. */
export const INPUT_QUEUE_MAX = 2;
/** Límite de dt en milisegundos para evitar saltos tras perder el foco. */
export const MAX_DT = 50;
/** Margen interior, en px, entre la celda y el sprite de la fruta. */
export const FRUIT_PADDING = 3;
