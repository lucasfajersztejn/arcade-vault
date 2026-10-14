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
import { FroggerCanvas, FroggerControls } from "@/components/frogger-canvas";
import { SnakeCanvas, SnakeControls } from "@/components/snake-canvas";
import { SKIN_IDS, type SkinId } from "@/lib/games/skins";
/** Lo que `GamePlayer` puede pedirle a cualquier motor montado. */
export type EngineHandle = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  /** Entrada táctil del overlay. */
  setInput: (action: string, pressed: boolean) => void;
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
/**
 * Acción asociada a una posición fija del gamepad MK-II.
 * `null` significa que esa posición se pinta inerte: visible pero sin respuesta.
 */
export type TouchActionId = string | null;
/** Mapeo del D-pad: cada flecha asignada a una acción (o inerte). */
export type TouchDpadMap = {
  up: TouchActionId;
  down: TouchActionId;
  left: TouchActionId;
  right: TouchActionId;
};
/** Botones circulares del gamepad: A (magenta) y B (cyan). */
export type TouchButtons = {
  a: TouchActionId;
  b: TouchActionId;
};
/** Spec del gamepad para un juego. La silueta es fija; solo cambia qué slots están activos. */
export type TouchSpec = {
  dpad: TouchDpadMap;
  buttons: TouchButtons;
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
  /** Si está presente, `GamePlayer` monta el gamepad MK-II en móvil/tablet. */
  touchActions?: TouchSpec;
};
/** Juegos con motor real, por `id`. Un juego del catálogo que no esté aquí no es jugable: `GamePlayer` muestra «JUEGO NO DISPONIBLE». */
export const ENGINES: Record<string, EngineEntry> = {
  asteroids: {
    Canvas: AsteroidsCanvas,
    Controls: AsteroidsControls,
    hasLives: true,
    ariaLabel: "Juego Asteroids en curso",
    skins: SKIN_IDS,
    touchActions: {
      dpad: { up: "thrust", down: null, left: "rot-left", right: "rot-right" },
      buttons: { a: "shoot", b: "hyperspace" },
    },
  },
  caida: {
    Canvas: CaidaCanvas,
    Controls: CaidaControls,
    hasLives: false,
    ariaLabel: "Juego Tetris en curso",
    skins: SKIN_IDS,
    touchActions: {
      dpad: { up: null, down: "down", left: "left", right: "right" },
      buttons: { a: "rotate", b: "drop" },
    },
  },
  "bloque-buster": {
    Canvas: BloqueBusterCanvas,
    Controls: BloqueBusterControls,
    hasLives: true,
    ariaLabel: "Juego Arkanoid en curso",
    skins: SKIN_IDS,
    touchActions: {
      dpad: { up: null, down: null, left: "left", right: "right" },
      buttons: { a: "launch", b: null },
    },
  },
  frogger: {
    Canvas: FroggerCanvas,
    Controls: FroggerControls,
    hasLives: true,
    ariaLabel: "Juego Frogger en curso",
  },
  snake: {
    Canvas: SnakeCanvas,
    Controls: SnakeControls,
    hasLives: false,
    ariaLabel: "Juego Snake en curso",
    skins: SKIN_IDS,
    touchActions: {
      dpad: { up: "up", down: "down", left: "left", right: "right" },
      buttons: { a: null, b: null },
    },
  },
};
