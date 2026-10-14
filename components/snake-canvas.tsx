"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { SIZE } from "@/lib/games/snake/constants";
import { createSnake } from "@/lib/games/snake/engine";
import { SKINS } from "@/lib/games/snake/skins";
import type { SnakeCallbacks, SnakeEngine } from "@/lib/games/snake/types";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export type SnakeHandle = Pick<
  SnakeEngine,
  "pause" | "resume" | "restart" | "end" | "setInput"
>;
type Props = SnakeCallbacks & { ref?: Ref<SnakeHandle>; skin?: SkinId };
export function SnakeCanvas({ ref, skin = DEFAULT_SKIN, ...callbacks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const callbacksRef = useRef<SnakeCallbacks>(callbacks);
  const skinRef = useRef(skin);
  // El motor se crea una sola vez; los callbacks se leen siempre en su última versión.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    skinRef.current = skin;
  });
  // La paleta cambia en vivo sin recrear el motor (igual que los callbacks).
  useEffect(() => {
    engineRef.current?.setPalette(SKINS[skin]);
  }, [skin]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSnake(
      canvas,
      {
        onScore: (v) => callbacksRef.current.onScore(v),
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
      className="snake-canvas"
      width={SIZE}
      height={SIZE}
    />
  );
}
/** Leyenda de teclas bajo la pantalla; en dispositivos táctiles avisa de que hace falta teclado. */
export function SnakeControls() {
  return (
    <>
      <ul className="controls-legend" aria-label="Controles">
        <li>
          <kbd>←</kbd>
          <kbd>↑</kbd>
          <kbd>→</kbd>
          <kbd>↓</kbd> o <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> Girar
        </li>
        <li>
          <kbd>P</kbd>
          <kbd>Esc</kbd> Pausa
        </li>
      </ul>
      <p className="keys-notice" role="note">
        Este juego necesita teclado.
      </p>
    </>
  );
}
