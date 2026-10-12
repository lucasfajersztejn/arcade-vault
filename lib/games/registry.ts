"use client";
import type { ComponentType, Ref } from "react";
import {
  AsteroidsCanvas,
  AsteroidsControls,
} from "@/components/asteroids-canvas";
/** Lo que `GamePlayer` puede pedirle a cualquier motor montado. */
export type EngineHandle = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
};
/** Props comunes de los canvas de los motores; un motor sin vidas o sin nivel simplemente las ignora. */
export type EngineCanvasProps = {
  ref?: Ref<EngineHandle>;
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onPause?: (paused: boolean) => void;
};
export type EngineEntry = {
  Canvas: ComponentType<EngineCanvasProps>;
  /** Leyenda de controles y aviso de teclado bajo la pantalla. */
  Controls: ComponentType;
  /** Si es falso, el HUD de la plataforma no muestra «Vidas». */
  hasLives: boolean;
  ariaLabel: string;
};
/** Juegos con motor real, por `id`. Los que no están aquí siguen con la simulación de `GamePlayer`. */
export const ENGINES: Record<string, EngineEntry> = {
  asteroids: {
    Canvas: AsteroidsCanvas,
    Controls: AsteroidsControls,
    hasLives: true,
    ariaLabel: "Juego Asteroids en curso",
  },
};
