/** Matriz de celdas: 0 = vacía, 1–7 = índice de color de la pieza. */
export type Matrix = number[][];
export type Board = Matrix;
export type Piece = {
  /** Tipo de pieza (1–7) y, a la vez, índice en `COLORS`. */
  type: number;
  shape: Matrix;
  x: number;
  y: number;
};
export type CaidaCallbacks = {
  onScore: (score: number) => void;
  onLevel: (level: number) => void;
  onLines: (lines: number) => void;
  /** Pieza nueva que colisiona al aparecer, o FIN forzado. */
  onGameOver: (finalScore: number) => void;
  /** Cambios de pausa que origina el motor (pestaña oculta, blur o tecla P). */
  onPause?: (paused: boolean) => void;
};
export type CaidaOptions = {
  /** Canvas de la vista previa de la siguiente pieza (120×120). */
  nextCanvas?: HTMLCanvasElement;
};
export type CaidaEngine = {
  pause: () => void;
  resume: () => void;
  /** Estado inicial: tablero vacío, puntuación 0, líneas 0, nivel 1. */
  restart: () => void;
  /** Fuerza el game over (botón FIN). */
  end: () => void;
  /** Cancela el bucle y quita todos los listeners. */
  destroy: () => void;
};
