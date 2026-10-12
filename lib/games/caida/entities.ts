import {
  BASE_DROP_INTERVAL,
  BLOCK,
  COLORS,
  COLS,
  DROP_STEP,
  GHOST_ALPHA,
  GRID_LINE,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MIN_DROP_INTERVAL,
  NEXT_GRID,
  NEXT_SIZE,
  ROWS,
  WALL_KICKS,
} from "./constants";
import type { Board, Matrix, Piece } from "./types";
import { rotateCW } from "./utils";
/** ¿Choca la forma, colocada en (ox, oy), con las paredes, el suelo o bloques fijados? */
export function collide(
  board: Board,
  shape: Matrix,
  ox: number,
  oy: number,
): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}
/** Gira la pieza en sentido horario probando los wall kicks; devuelve si giró. */
export function tryRotate(board: Board, piece: Piece): boolean {
  const rotated = rotateCW(piece.shape);
  for (const kick of WALL_KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return true;
    }
  }
  return false;
}
/** Fija la pieza en el tablero. */
export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        board[piece.y + r][piece.x + c] = piece.shape[r][c];
}
/** Elimina las filas completas (de abajo arriba) y devuelve cuántas eran. */
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}
/** Fila donde aterrizaría la pieza si cayera en vertical. */
export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
/** Puntos por líneas limpiadas a la vez, multiplicados por el nivel. */
export const lineScore = (cleared: number, level: number): number =>
  (LINE_SCORES[cleared] || 0) * level;
export const levelForLines = (lines: number): number =>
  Math.floor(lines / LINES_PER_LEVEL) + 1;
/** Milisegundos entre caídas automáticas. */
export const dropIntervalForLevel = (level: number): number =>
  Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL - (level - 1) * DROP_STEP);
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIndex] as string;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)"; // brillo superior
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  ctx.globalAlpha = 1;
}
export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}
export function drawBoard(ctx: CanvasRenderingContext2D, board: Board): void {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);
}
/** Dibuja la pieza con su esquina superior izquierda en la fila `y` (y opacidad opcional). */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  y: number,
  alpha = 1,
): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c])
        drawBlock(ctx, piece.x + c, y + r, piece.shape[r][c], BLOCK, alpha);
}
/** Pieza fantasma: la pieza actual en su fila de aterrizaje, translúcida. */
export function drawGhost(
  ctx: CanvasRenderingContext2D,
  board: Board,
  piece: Piece,
): void {
  drawPiece(ctx, piece, ghostY(board, piece), GHOST_ALPHA);
}
/** Dibuja la pieza centrada en la cuadrícula de 4×4 del canvas NEXT. */
export function drawNext(ctx: CanvasRenderingContext2D, piece: Piece): void {
  ctx.clearRect(0, 0, NEXT_SIZE, NEXT_SIZE);
  const { shape } = piece;
  const offX = Math.floor((NEXT_GRID - shape[0].length) / 2);
  const offY = Math.floor((NEXT_GRID - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(ctx, offX + c, offY + r, shape[r][c], BLOCK);
}
