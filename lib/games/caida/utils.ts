import { COLS, PIECES, PIECE_TYPES, ROWS } from "./constants";
import type { Board, Matrix, Piece } from "./types";
export const createBoard = (): Board =>
  Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
/** Sorteo uniforme entre las 7 piezas; nace centrada en la fila 0. */
export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = (PIECES[type] as Matrix).map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}
/** Giro horario: transpuesta con las filas invertidas. */
export function rotateCW(shape: Matrix): Matrix {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Matrix = Array.from({ length: cols }, () =>
    new Array<number>(rows).fill(0),
  );
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}
