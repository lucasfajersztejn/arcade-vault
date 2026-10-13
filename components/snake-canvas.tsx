"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createSnake } from "@/lib/games/snake/engine";
import type { SnakeCallbacks, SnakeEngine } from "@/lib/games/snake/types";
import { SIZE } from "@/lib/games/snake/constants";
export type SnakeHandle = Pick<
  SnakeEngine,
  "pause" | "resume" | "restart" | "end"
>;
type Props = SnakeCallbacks & { ref?: Ref<SnakeHandle> };
export function SnakeCanvas({ ref, ...callbacks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SnakeEngine | null>(null);
  const callbacksRef = useRef<SnakeCallbacks>(callbacks);
  // El motor se crea una sola vez; los callbacks se leen siempre en su última versión.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createSnake(canvas, {
      onScore: (v) => callbacksRef.current.onScore(v),
      onLevel: (v) => callbacksRef.current.onLevel(v),
      onGameOver: (v) => callbacksRef.current.onGameOver(v),
      onPause: (v) => callbacksRef.current.onPause?.(v),
    });
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
