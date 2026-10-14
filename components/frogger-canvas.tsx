"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { CANVAS_H, CANVAS_W } from "@/lib/games/frogger/constants";
import { createFrogger } from "@/lib/games/frogger/engine";
import { SKINS } from "@/lib/games/frogger/skins";
import type {
  FroggerCallbacks,
  FroggerEngine,
} from "@/lib/games/frogger/types";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export type FroggerHandle = Pick<
  FroggerEngine,
  "pause" | "resume" | "restart" | "end" | "setInput"
>;
type Props = FroggerCallbacks & { ref?: Ref<FroggerHandle>; skin?: SkinId };
export function FroggerCanvas({
  ref,
  skin = DEFAULT_SKIN,
  ...callbacks
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FroggerEngine | null>(null);
  const callbacksRef = useRef<FroggerCallbacks>(callbacks);
  const skinRef = useRef(skin);
  // El motor se crea una sola vez; los callbacks se leen siempre en su última versión.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  // La paleta cambia en vivo sin recrear el motor ni reiniciar la partida.
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setPalette(SKINS[skin]);
  }, [skin]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createFrogger(
      canvas,
      {
        onScore: (v) => callbacksRef.current.onScore(v),
        onLives: (v) => callbacksRef.current.onLives(v),
        onLevel: (v) => callbacksRef.current.onLevel(v),
        onGameOver: (v) => callbacksRef.current.onGameOver(v),
        onPause: (v) => callbacksRef.current.onPause?.(v),
      },
      { palette: SKINS[skinRef.current] },
    );
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);
  useImperativeHandle(
    ref,
    () => ({
      pause: () => engineRef.current?.pause(),
      resume: () => engineRef.current?.resume(),
      restart: () => engineRef.current?.restart(),
      end: () => engineRef.current?.end(),
      setInput: (action, pressed) =>
        engineRef.current?.setInput(action, pressed),
    }),
    [],
  );
  return (
    <canvas
      ref={canvasRef}
      className="frogger-canvas"
      width={CANVAS_W}
      height={CANVAS_H}
    />
  );
}
/** Leyenda de teclas bajo la pantalla (solo informativa; en móvil se usa el overlay táctil). */
export function FroggerControls() {
  return (
    <ul className="controls-legend" aria-label="Controles">
      <li>
        <kbd>←</kbd>
        <kbd>↑</kbd>
        <kbd>→</kbd>
        <kbd>↓</kbd> o <kbd>W</kbd>
        <kbd>A</kbd>
        <kbd>S</kbd>
        <kbd>D</kbd> Saltar
      </li>
      <li>
        <kbd>P</kbd>
        <kbd>Esc</kbd> Pausa
      </li>
    </ul>
  );
}
