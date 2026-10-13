import {
  FRUITS_PER_LEVEL,
  GRID,
  INPUT_QUEUE_MAX,
  START_COL,
  START_LENGTH,
  START_ROW,
  STEP_MS_MIN,
  STEP_MS_PER_LEVEL,
  STEP_MS_START,
} from "./constants";
import { FRUIT_KINDS, type FruitKind } from "./sprites";
export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };
export type Fruit = Cell & { kind: FruitKind };
export const DIR_VECTORS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};
/** Segmentos de la serpiente: el primero es la cabeza. Empieza mirando a la derecha. */
export function createSegments(): Cell[] {
  return Array.from({ length: START_LENGTH }, (_, i) => ({
    col: START_COL - i,
    row: START_ROW,
  }));
}
/**
 * Añade un giro a la cola de entrada. Se valida contra el último giro ya encolado
 * (o la dirección actual si la cola está vacía): se ignoran el mismo sentido, el
 * giro de 180° y los giros que no caben en la cola.
 */
export function queueTurn(queue: Dir[], current: Dir, next: Dir): Dir[] {
  if (queue.length >= INPUT_QUEUE_MAX) return queue;
  const last = queue.length > 0 ? queue[queue.length - 1] : current;
  if (next === last || next === OPPOSITE[last]) return queue;
  return [...queue, next];
}
export function insideBoard(cell: Cell): boolean {
  return cell.col >= 0 && cell.col < GRID && cell.row >= 0 && cell.row < GRID;
}
export type StepResult =
  { status: "dead" } | { status: "moved"; segments: Cell[]; ate: boolean };
/**
 * Avanza un paso. Muere al salir del tablero o al chocar con el cuerpo; la cola
 * cuenta como libre salvo que la serpiente crezca en este paso.
 */
export function stepSnake(
  segments: Cell[],
  dir: Dir,
  fruit: Cell | null,
): StepResult {
  const v = DIR_VECTORS[dir];
  const head = { col: segments[0].col + v.col, row: segments[0].row + v.row };
  if (!insideBoard(head)) return { status: "dead" };
  const ate =
    fruit !== null && fruit.col === head.col && fruit.row === head.row;
  const body = ate ? segments : segments.slice(0, -1);
  if (body.some((s) => s.col === head.col && s.row === head.row)) {
    return { status: "dead" };
  }
  return {
    status: "moved",
    segments: [head, ...(ate ? segments : segments.slice(0, -1))],
    ate,
  };
}
/** Celdas del tablero que no ocupa la serpiente. */
export function freeCells(segments: Cell[]): Cell[] {
  const taken = new Set(segments.map((s) => s.row * GRID + s.col));
  const free: Cell[] = [];
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      if (!taken.has(row * GRID + col)) free.push({ col, row });
    }
  }
  return free;
}
/**
 * Fruta nueva en una celda libre y de un tipo distinto de `previous`.
 * Devuelve `null` si no queda ninguna celda libre (tablero lleno).
 */
export function spawnFruit(
  segments: Cell[],
  previous: FruitKind | null,
  rng: () => number,
): Fruit | null {
  const free = freeCells(segments);
  if (free.length === 0) return null;
  const cell = free[Math.floor(rng() * free.length)];
  const kinds = FRUIT_KINDS.filter((k) => k !== previous);
  return { ...cell, kind: kinds[Math.floor(rng() * kinds.length)] };
}
/** Nivel: 1 + floor(frutas / 5). */
export function levelFor(fruitsEaten: number): number {
  return 1 + Math.floor(fruitsEaten / FRUITS_PER_LEVEL);
}
/** Milisegundos por paso en un nivel: 140 − 5 × (nivel − 1), con mínimo de 70. */
export function stepMsFor(level: number): number {
  return Math.max(STEP_MS_MIN, STEP_MS_START - STEP_MS_PER_LEVEL * (level - 1));
}
