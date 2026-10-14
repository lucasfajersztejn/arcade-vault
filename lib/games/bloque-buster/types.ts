import type { BloqueBusterPalette } from "./skins";
export type BloqueBusterCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  /** Nivel del juego, de 1 a 5. */
  onLevel: (level: number) => void;
  /** Sin vidas, nivel 5 completado o FIN forzado. */
  onGameOver: (finalScore: number) => void;
  /** Cambios de pausa que origina el motor (pestaña oculta, ventana sin foco o tecla P/Esc). */
  onPause?: (paused: boolean) => void;
};
/** Opciones de arranque del motor. */
export type BloqueBusterOptions = {
  /** Paleta inicial; si falta, se usa la skin por defecto (`clasico`). */
  palette?: BloqueBusterPalette;
};
export type BloqueBusterEngine = {
  pause: () => void;
  resume: () => void;
  /** Estado inicial: nivel 1, 3 vidas, puntuación 0. */
  restart: () => void;
  /** Fuerza el game over (botón FIN). */
  end: () => void;
  /** Cancela el bucle y quita todos los listeners. */
  destroy: () => void;
  /** Cambia la paleta en vivo y repinta sin tocar score, vidas, nivel ni posiciones. */
  setPalette: (palette: BloqueBusterPalette) => void;
  /** Entrada táctil: `left`/`right` son hold (equivalen a mantener la flecha). */
  setInput: (action: string, pressed: boolean) => void;
};
