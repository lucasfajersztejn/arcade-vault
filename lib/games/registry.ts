"use client";
import type { ComponentType, Ref } from "react";
import {
  AsteroidsCanvas,
  AsteroidsControls,
} from "@/components/asteroids-canvas";
import {
  BloqueBusterCanvas,
  BloqueBusterControls,
} from "@/components/bloque-buster-canvas";
import { CaidaCanvas, CaidaControls } from "@/components/caida-canvas";
import { SnakeCanvas, SnakeControls } from "@/components/snake-canvas";
import { SKIN_IDS, type SkinId } from "@/lib/games/skins";
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
  /** Skin de color activa. Un motor que aún no la soporte la ignora. */
  skin?: SkinId;
};
export type EngineEntry = {
  Canvas: ComponentType<EngineCanvasProps>;
  /** Leyenda de controles y aviso de teclado bajo la pantalla. */
  Controls: ComponentType;
  /** Si es falso, el HUD de la plataforma no muestra «Vidas». */
  hasLives: boolean;
  ariaLabel: string;
  /** Skins de color que soporta el juego; ausente = solo `clasico` (sin selector). */
  skins?: SkinId[];
};
/** Juegos con motor real, por `id`. Un juego del catálogo que no esté aquí no es jugable: `GamePlayer` muestra «JUEGO NO DISPONIBLE». */
export const ENGINES: Record<string, EngineEntry> = {
  asteroids: {
    Canvas: AsteroidsCanvas,
    Controls: AsteroidsControls,
    hasLives: true,
    ariaLabel: "Juego Asteroids en curso",
  },
  caida: {
    Canvas: CaidaCanvas,
    Controls: CaidaControls,
    hasLives: false,
    ariaLabel: "Juego Tetris en curso",
    skins: SKIN_IDS,
  },
  "bloque-buster": {
    Canvas: BloqueBusterCanvas,
    Controls: BloqueBusterControls,
    hasLives: true,
    ariaLabel: "Juego Arkanoid en curso",
  },
  snake: {
    Canvas: SnakeCanvas,
    Controls: SnakeControls,
    hasLives: false,
    ariaLabel: "Juego Snake en curso",
  },
};
