"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createAsteroids } from "@/lib/games/asteroids/engine";
import type {
  AsteroidsCallbacks,
  AsteroidsEngine,
} from "@/lib/games/asteroids/types";
export type AsteroidsHandle = Pick<
  AsteroidsEngine,
  "pause" | "resume" | "restart" | "end"
>;
type Props = AsteroidsCallbacks & { ref?: Ref<AsteroidsHandle> };
export function AsteroidsCanvas({ ref, ...callbacks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsEngine | null>(null);
  const callbacksRef = useRef<AsteroidsCallbacks>(callbacks);
  // El motor se crea una sola vez; los callbacks se leen siempre en su última versión.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createAsteroids(canvas, {
      onScore: (v) => callbacksRef.current.onScore(v),
      onLives: (v) => callbacksRef.current.onLives(v),
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
      className="asteroids-canvas"
      width={800}
      height={600}
    />
  );
}
/** Leyenda de teclas bajo la pantalla; en dispositivos táctiles avisa de que hace falta teclado. */
export function AsteroidsControls() {
  return (
    <>
      <ul className="controls-legend" aria-label="Controles">
        <li>
          <kbd>←</kbd>
          <kbd>→</kbd> Rotar
        </li>
        <li>
          <kbd>↑</kbd> Propulsar
        </li>
        <li>
          <kbd>Espacio</kbd> Disparar
        </li>
      </ul>
      <p className="keys-notice" role="note">
        Este juego necesita teclado.
      </p>
    </>
  );
}
