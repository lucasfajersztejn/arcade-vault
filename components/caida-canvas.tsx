"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import { BLOCK, COLS, NEXT_SIZE, ROWS } from "@/lib/games/caida/constants";
import { createCaida } from "@/lib/games/caida/engine";
import type { CaidaCallbacks, CaidaEngine } from "@/lib/games/caida/types";
export type CaidaHandle = Pick<
  CaidaEngine,
  "pause" | "resume" | "restart" | "end"
>;
/** Las líneas solo se ven en el panel interior: no salen al HUD de la plataforma. */
type Props = Omit<CaidaCallbacks, "onLines"> & { ref?: Ref<CaidaHandle> };
const format = (n: number) => n.toLocaleString("es-ES");
export function CaidaCanvas({ ref, ...callbacks }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CaidaEngine | null>(null);
  const callbacksRef = useRef(callbacks);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  // El motor se crea una sola vez; los callbacks se leen siempre en su última versión.
  useEffect(() => {
    callbacksRef.current = callbacks;
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createCaida(
      canvas,
      {
        onScore: (v) => {
          setScore(v);
          callbacksRef.current.onScore(v);
        },
        onLevel: (v) => {
          setLevel(v);
          callbacksRef.current.onLevel(v);
        },
        onLines: setLines,
        onGameOver: (v) => callbacksRef.current.onGameOver(v),
        onPause: (v) => callbacksRef.current.onPause?.(v),
      },
      { nextCanvas: nextRef.current ?? undefined },
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
    }),
    [],
  );
  return (
    <div className="caida-stage">
      <canvas
        ref={canvasRef}
        className="caida-board"
        width={COLS * BLOCK}
        height={ROWS * BLOCK}
      />
      <aside className="caida-panel" aria-label="Panel de partida">
        <div className="caida-section">
          <span className="caida-label">SCORE</span>
          <span className="caida-value" aria-live="off">
            {format(score)}
          </span>
        </div>
        <div className="caida-section">
          <span className="caida-label">LINES</span>
          <span className="caida-value" aria-live="off">
            {lines}
          </span>
        </div>
        <div className="caida-section">
          <span className="caida-label">LEVEL</span>
          <span className="caida-value" aria-live="off">
            {level}
          </span>
        </div>
        <div className="caida-section caida-section-next">
          <span className="caida-label">NEXT</span>
          <canvas
            ref={nextRef}
            className="caida-next"
            width={NEXT_SIZE}
            height={NEXT_SIZE}
          />
        </div>
        <div className="caida-section caida-section-controls">
          <span className="caida-label">CONTROLS</span>
          <ul>
            <li>
              <kbd>←</kbd>
              <kbd>→</kbd> mover
            </li>
            <li>
              <kbd>↑</kbd> rotar
            </li>
            <li>
              <kbd>↓</kbd> bajar
            </li>
            <li>
              <kbd>Space</kbd> caída
            </li>
            <li>
              <kbd>P</kbd> pausa
            </li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
/** La leyenda de teclas ya va en el panel interior; aquí solo el aviso para dispositivos táctiles. */
export function CaidaControls() {
  return (
    <p className="keys-notice" role="note">
      Este juego necesita teclado.
    </p>
  );
}
