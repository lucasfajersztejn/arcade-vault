"use client";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { createBloqueBuster } from "@/lib/games/bloque-buster/engine";
import { SKINS } from "@/lib/games/bloque-buster/skins";
import type {
  BloqueBusterCallbacks,
  BloqueBusterEngine,
} from "@/lib/games/bloque-buster/types";
import { DEFAULT_SKIN, type SkinId } from "@/lib/games/skins";
export type BloqueBusterHandle = Pick<
  BloqueBusterEngine,
  "pause" | "resume" | "restart" | "end" | "setInput"
>;
type Props = BloqueBusterCallbacks & {
  ref?: Ref<BloqueBusterHandle>;
  /** Skin de color activa; cambia en vivo sin recrear el motor. */
  skin?: SkinId;
};
export function BloqueBusterCanvas({
  ref,
  skin = DEFAULT_SKIN,
  ...callbacks
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BloqueBusterEngine | null>(null);
  const callbacksRef = useRef<BloqueBusterCallbacks>(callbacks);
  // El motor se crea una sola vez; la skin inicial se lee del ref para no recrearlo.
  const skinRef = useRef<SkinId>(skin);
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createBloqueBuster(
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
  // Cambio de skin en vivo: no reinicia la partida ni toca el estado.
  useEffect(() => {
    skinRef.current = skin;
    engineRef.current?.setPalette(SKINS[skin]);
  }, [skin]);
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
