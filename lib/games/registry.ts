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
/** Layouts del overlay táctil que `TouchControls` sabe pintar. */
export type TouchLayoutId =
  | "dpad4"
  | "dpad-horizontal"
  | "asteroids"
  | "caida"
  | "bloque-buster"
  | "snake";
/** Direcciones del D-pad reconocidas por el framework. */
export type TouchDpadDir = "up" | "down" | "left" | "right";
/** Un botón de acción del overlay. `id` llega a `setInput`, `label` es la etiqueta visible. */
export type TouchActionButton = {
  id: string;
  label: string;
};
/** Qué botones pinta el framework para un juego dado. */
export type TouchSpec = {
  dpad?: ReadonlyArray<TouchDpadDir>;
  buttons?: ReadonlyArray<TouchActionButton>;
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
  /** Si está presente, `GamePlayer` monta el overlay táctil en móvil. */
  touchLayout?: TouchLayoutId;
  /** Botones concretos a renderizar; interpretados por el componente del overlay. */
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
    touchLayout: "asteroids",
    touchActions: {
      dpad: ["up", "left", "right"],
      // El motor no implementa hiperespacio: el botón HIPER queda fuera.
      buttons: [{ id: "shoot", label: "DISPARO" }],
    },
  },
  caida: {
    Canvas: CaidaCanvas,
    Controls: CaidaControls,
    hasLives: false,
    ariaLabel: "Juego Tetris en curso",
    skins: SKIN_IDS,
    touchLayout: "caida",
    touchActions: {
      dpad: ["up", "down", "left", "right"],
      buttons: [{ id: "drop", label: "DROP" }],
    },
  },
  "bloque-buster": {
    Canvas: BloqueBusterCanvas,
    Controls: BloqueBusterControls,
    hasLives: true,
    ariaLabel: "Juego Arkanoid en curso",
    skins: SKIN_IDS,
    touchLayout: "bloque-buster",
    touchActions: {
      // La bola arranca ya en movimiento (en el inicio y al perder una vida):
      // no hay mecánica de pegado + lanzamiento, el botón LANZAR queda fuera.
      dpad: ["left", "right"],
    },
  },
  snake: {
    Canvas: SnakeCanvas,
    Controls: SnakeControls,
    hasLives: false,
    ariaLabel: "Juego Snake en curso",
    skins: SKIN_IDS,
    touchLayout: "snake",
    touchActions: {
      dpad: ["up", "down", "left", "right"],
    },
  },
};
