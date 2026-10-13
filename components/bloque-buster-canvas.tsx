"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createBloqueBuster } from "@/lib/games/bloque-buster/engine";
import type {
  BloqueBusterCallbacks,
  BloqueBusterEngine,
} from "@/lib/games/bloque-buster/types";
export type BloqueBusterHandle = Pick<
  BloqueBusterEngine,
  "pause" | "resume" | "restart" | "end"
>;
type Props = BloqueBusterCallbacks & { ref?: Ref<BloqueBusterHandle> };
export function BloqueBusterCanvas({ ref, ...callbacks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BloqueBusterEngine | null>(null);
  const callbacksRef = useRef<BloqueBusterCallbacks>(callbacks);
  // El motor se crea una sola vez; los callbacks se leen siempre en su última versión.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createBloqueBuster(canvas, {
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
      className="bloque-buster-canvas"
      width={800}
      height={600}
    />
  );
}
/** Leyenda de teclas bajo la pantalla; en dispositivos táctiles avisa de que hace falta teclado. */
export function BloqueBusterControls() {
  return (
    <>
      <ul className="controls-legend" aria-label="Controles">
        <li>
          <kbd>←</kbd>
          <kbd>→</kbd> Mover pala
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
