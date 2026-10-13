/** Canvas lógico; el CSS lo escala. */
export const W = 800;
export const H = 600;
export const INITIAL_LIVES = 3;
/** Puntos por bloque roto. */
export const BLOCK_POINTS = 10;
/** Límite de dt en segundos para evitar saltos tras perder el foco. */
export const MAX_DT = 0.05;
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;
/** Margen bajo la cara de la pala en el que aún cuenta el rebote. */
export const PADDLE_BOUNCE_TOLERANCE = 8;
export const BALL_SIZE = 16;
/** Velocidad base de la bola; se multiplica por la `speed` del nivel. */
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;
/** Duración de la explosión de un bloque, en milisegundos. */
export const EXPLOSION_DURATION = 150;
export const EXPLOSION_FRAME_COUNT = 4;
