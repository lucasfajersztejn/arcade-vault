export type SnakeCallbacks = {
  onScore: (score: number) => void;
  /** Nivel del juego: 1 + floor(frutas / 5). */
  onLevel: (level: number) => void;
  /** Choque, tablero lleno o FIN forzado. */
  onGameOver: (finalScore: number) => void;
  /** Cambios de pausa que origina el motor (pestaña oculta, ventana sin foco o tecla P/Esc). */
  onPause?: (paused: boolean) => void;
};
export type SnakeEngine = {
  pause: () => void;
  resume: () => void;
  /** Estado inicial: 3 segmentos, a la derecha, puntuación 0, nivel 1. */
  restart: () => void;
  /** Fuerza el game over (botón FIN). */
  end: () => void;
  /** Cancela el bucle y quita todos los listeners. */
  destroy: () => void;
};
