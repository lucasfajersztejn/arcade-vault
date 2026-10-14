"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { submitScore } from "@/lib/db/scores";
import { ENGINES, type EngineHandle } from "@/lib/games/registry";
import { TouchControls } from "@/components/touch-controls";
import {
  DEFAULT_SKIN,
  readSkin,
  SKIN_LABELS,
  writeSkin,
  type SkinId,
} from "@/lib/games/skins";
import { useSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import type { Game } from "@/lib/types";
const LIVES = 3;
type SaveState = "idle" | "saving" | "saved" | "error";
/** Evento local para que el selector de skin revalide el valor leído de localStorage. */
const SKIN_CHANGE_EVENT = "av-skin-change";
function subscribeSkin(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SKIN_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SKIN_CHANGE_EVENT, callback);
  };
}
/** `true` cuando el navegador tiene puntero coarse (táctil) o viewport ≤ 768 px. */
function useTouchViewport() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse), (max-width: 768px)");
    const update = () => setIsTouch(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isTouch;
}
export function GamePlayer({ game }: { game: Game }) {
  const { user } = useSession();
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [nameInput, setNameInput] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lives, setLives] = useState(LIVES);
  const [engineLevel, setEngineLevel] = useState(1);
  // En el servidor (y durante la hidratación) el snapshot es la skin por
  // defecto; tras hidratar React relee localStorage sin provocar mismatch.
  const skin = useSyncExternalStore(
    subscribeSkin,
    () => readSkin(game.id),
    () => DEFAULT_SKIN,
  );
  const modalRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle>(null);
  const isTouch = useTouchViewport();
  // Los juegos jugables son los del registro de motores.
  const engine = ENGINES[game.id];
  const handleTouchInput = useCallback((action: string, pressed: boolean) => {
    engineRef.current?.setInput(action, pressed);
  }, []);
  const changeSkin = (next: SkinId) => {
    // Persistir y notificar: no reinicia la partida ni toca la puntuación.
    writeSkin(game.id, next);
    window.dispatchEvent(new Event(SKIN_CHANGE_EVENT));
  };
  const name = nameInput ?? user?.name ?? "INVITADO";
  const restart = () => {
    setScore(0);
    setPaused(false);
    setOver(false);
    setSaveState("idle");
    setLives(LIVES);
    setEngineLevel(1);
    engineRef.current?.restart();
  };
  const togglePause = (e: MouseEvent<HTMLButtonElement>) => {
    const next = !paused;
    setPaused(next);
    if (next) engineRef.current?.pause();
    else engineRef.current?.resume();
    // Tras un clic de ratón el botón no debe retener el foco: Espacio dispararía en vez de activarlo.
    if (e.detail > 0) e.currentTarget.blur();
  };
  const finish = () => {
    engineRef.current?.end();
  };
  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setPaused(false);
    setOver(true);
  };
  const save = async () => {
    if (saveState === "saving") return;
    setSaveState("saving");
    const ok = await submitScore(createClient(), {
      gameId: game.id,
      playerName: name,
      score,
    });
    setSaveState(ok ? "saved" : "error");
  };
  // Mantiene el foco dentro del modal mientras está abierto.
  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !modalRef.current) return;
    const items = modalRef.current.querySelectorAll<HTMLElement>(
      "button, a[href], input",
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  // Un juego del catálogo sin motor registrado no es jugable.
  if (!engine) {
    return (
      <div className="av-player fade-in" role="status">
        <p className="pixel neon-yellow">JUEGO NO DISPONIBLE</p>
        <Link href="/games" className="btn magenta">
          VOLVER AL VAULT
        </Link>
      </div>
    );
  }
  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v" aria-live="off">
              {score.toLocaleString("es-ES")}
            </div>
          </div>
          {engine.hasLives && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v" aria-label={`${lives} vidas`}>
                {lives > 0 ? "♥ ".repeat(lives).trim() : "—"}
              </div>
            </div>
          )}
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(engineLevel).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          {engine.skins && engine.skins.length > 1 && (
            <select
              className="btn hud-skin"
              value={skin}
              onChange={(e) => changeSkin(e.target.value as SkinId)}
              aria-label="Skin de color"
            >
              {engine.skins.map((id) => (
                <option key={id} value={id}>
                  {SKIN_LABELS[id]}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            className="btn yellow"
            onClick={togglePause}
            aria-pressed={paused}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button type="button" className="btn magenta" onClick={finish}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>
      <div className="crt">
        <div className="crt-screen" role="img" aria-label={engine.ariaLabel}>
          <engine.Canvas
            ref={engineRef}
            onScore={setScore}
            onLives={setLives}
            onLevel={setEngineLevel}
            onGameOver={handleGameOver}
            onPause={setPaused}
            skin={engine.skins ? skin : DEFAULT_SKIN}
          />
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
              role="status"
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
          {isTouch && engine.touchLayout && engine.touchActions && !over && (
            <TouchControls
              layout={engine.touchLayout}
              actions={engine.touchActions}
              onInput={handleTouchInput}
            />
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
      <engine.Controls />
      {over && (
        <div className="modal-bd">
          <div
            ref={modalRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameover-title"
            onKeyDown={trapFocus}
          >
            <h2 id="gameover-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {saveState === "saved" ? (
              <div className="toast-saved" role="status">
                ▸ PUNTUACIÓN GUARDADA_
              </div>
            ) : (
              <>
                <div className="input-row">
                  <input
                    value={name}
                    onChange={(e) =>
                      setNameInput(e.target.value.toUpperCase().slice(0, 10))
                    }
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn yellow"
                    onClick={save}
                    disabled={saveState === "saving"}
                  >
                    {saveState === "saving"
                      ? "GUARDANDO…"
                      : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveState === "error" && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 10,
                      color: "var(--magenta)",
                      fontSize: 12,
                    }}
                  >
                    No se pudo guardar la puntuación. Comprueba tu conexión e
                    inténtalo de nuevo.
                  </div>
                )}
              </>
            )}
            <div className="actions">
              <button type="button" className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <Link href="/games" className="btn magenta">
                VOLVER AL VAULT
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
