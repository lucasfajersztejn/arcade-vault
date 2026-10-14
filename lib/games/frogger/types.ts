import type { FroggerPalette } from "@/lib/games/frogger/skins";
export type FroggerOptions = {
  /** Paleta inicial. Si falta, el motor usa la skin `clasico`. */
  palette?: FroggerPalette;
};
export type FroggerCallbacks = {
  onScore: (score: number) => void;
  /** Vidas restantes. Se emite en cada muerte, incluida la que acaba la partida. */
  onLives: (lives: number) => void;
  /** Ronda actual, desde 1. Sube al llenar las cinco bocas. */
  onLevel: (level: number) => void;
  /** Sin vidas o FIN forzado. */
  onGameOver: (finalScore: number) => void;
  /** Pausas que origina el motor (pestaña oculta, ventana sin foco o tecla P/Esc). */
  onPause?: (paused: boolean) => void;
};
export type FroggerEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
  setPalette: (palette: FroggerPalette) => void;
  setInput: (action: string, pressed: boolean) => void;
};
