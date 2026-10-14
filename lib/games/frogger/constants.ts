/** Rejilla del tablero. 16 columnas × 14 filas de 40 px → 640 × 560 lógicos. */
export const COLS = 16;
export const ROWS = 14;
export const CELL = 40;
export const CANVAS_W = COLS * CELL;
export const CANVAS_H = ROWS * CELL;
/**
 * Mapa vertical, fila 0 arriba.
 * metas · río (6 carriles) · orilla segura · carretera (5 carriles) · base de inicio.
 */
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
/** Bocas destino: 5 huecos de 2 columnas separados por 1 columna de orilla. 5·2 + 6·1 = 16. */
export const GOAL_COUNT = 5;
export const GOAL_WIDTH = 2;
export const GOAL_FIRST_COL = 1;
export const GOAL_STRIDE = GOAL_WIDTH + 1;
/** Columna de salida de la rana: alineada con la boca central (columnas 7-8). */
export const START_COL = 7;
/** Duración de la animación de salto, en ms. Mientras dura, la rana no acepta más input. */
export const JUMP_MS = 120;
export const LIVES_START = 3;
/** Temporizador de ronda, en ms. Se acorta por nivel hasta el mínimo. */
export const ROUND_MS_START = 15_000;
export const ROUND_MS_PER_LEVEL = 1_000;
export const ROUND_MS_MIN = 7_000;
/** Puntuación. */
export const POINTS_FORWARD = 10;
export const POINTS_GOAL = 50;
export const POINTS_ROUND = 200;
export const TIME_BONUS_PER_SEC = 10;
export const MAX_SCORE = 99_999_999;
/** Cada nivel acelera todas las entidades un 15 %. */
export const LEVEL_SPEED_FACTOR = 1.15;
/** Ciclo de inmersión de un grupo de tortugas, en ms. */
export const TURTLE_VISIBLE_MS = 3_000;
export const TURTLE_SUBMERGED_MS = 1_500;
/** Margen de aviso antes de hundirse: la tortuga parpadea sin dejar de dar soporte. */
export const TURTLE_WARN_MS = 900;
/** Clamp de dt en ms, para que una pestaña recuperada no teletransporte el tráfico. */
export const MAX_DT = 50;
/** Barra de tiempo: ocupa el alto de la franja superior de la fila de metas. */
export const TIME_BAR_H = 6;
