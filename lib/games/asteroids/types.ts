import type { AsteroidsPalette } from "./skins";
export type AsteroidsOptions = {
  /** Paleta de color inicial; si falta se usa la de `clasico`. */
  palette?: AsteroidsPalette;
};
export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  /** 3.ª vida perdida o FIN forzado. */
  onGameOver: (finalScore: number) => void;
  /** Cambios de pausa que origina el motor (pestaña oculta o ventana sin foco). */
  onPause?: (paused: boolean) => void;
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
  /** Cambia la paleta de color en vivo (también en pausa / game over). */
  setPalette: (palette: AsteroidsPalette) => void;
  /** Entrada táctil: `rot-left`/`rot-right`/`thrust` son hold, `shoot` es edge. */
  setInput: (action: string, pressed: boolean) => void;
};
