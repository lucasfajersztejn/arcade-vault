export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  /** 3.ª vida perdida o FIN forzado. */
  onGameOver: (finalScore: number) => void;
};
export type AsteroidsEngine = {
  pause: () => void;
  resume: () => void;
  /** Estado inicial: 3 vidas, nivel 1, puntuación 0. */
  restart: () => void;
  /** Fuerza el game over (botón FIN). */
  end: () => void;
  /** Cancela el bucle y quita todos los listeners. */
  destroy: () => void;
};
