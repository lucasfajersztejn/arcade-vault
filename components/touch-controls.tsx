"use client";
import { useCallback, useEffect, useRef } from "react";
import type {
  TouchDpadDir,
  TouchLayoutId,
  TouchSpec,
} from "@/lib/games/registry";
type Props = {
  layout: TouchLayoutId;
  actions: TouchSpec;
  onInput: (action: string, pressed: boolean) => void;
};
const DPAD_ARIA: Record<TouchDpadDir, string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
const DPAD_ACTION: Record<TouchLayoutId, Record<TouchDpadDir, string>> = {
  dpad4: { up: "up", down: "down", left: "left", right: "right" },
  "dpad-horizontal": { up: "up", down: "down", left: "left", right: "right" },
  snake: { up: "up", down: "down", left: "left", right: "right" },
  caida: { up: "rotate", down: "down", left: "left", right: "right" },
  "bloque-buster": { up: "up", down: "down", left: "left", right: "right" },
  asteroids: {
    up: "thrust",
    down: "down",
    left: "rot-left",
    right: "rot-right",
  },
};
const ARROWS: Record<TouchDpadDir, string> = {
  up: "▲",
  down: "▼",
  left: "◀",
  right: "▶",
};
export function TouchControls({ layout, actions, onInput }: Props) {
  // Cada botón reserva su propio pointerId para no interferir con los demás dedos.
  const pointersRef = useRef<Map<string, number>>(new Map());
  // Acciones todavía en estado "pressed" para poder soltarlas al desmontar.
  const pressedRef = useRef<Set<string>>(new Set());
  // Al desmontar, suelta cualquier botón que haya quedado pulsado para evitar hold permanente.
  useEffect(() => {
    const pressed = pressedRef.current;
    const pointers = pointersRef.current;
    return () => {
      for (const action of pressed) onInput(action, false);
      pressed.clear();
      pointers.clear();
    };
  }, [onInput]);
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      const key = el.dataset.key;
      const action = el.dataset.action;
      if (!key || !action) return;
      if (pointersRef.current.has(key)) return;
      pointersRef.current.set(key, e.pointerId);
      el.setPointerCapture(e.pointerId);
      el.dataset.pressed = "true";
      if (!pressedRef.current.has(action)) {
        pressedRef.current.add(action);
        onInput(action, true);
      }
      // Evita que el navegador interprete el toque como scroll/zoom.
      e.preventDefault();
    },
    [onInput],
  );
  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      const key = el.dataset.key;
      const action = el.dataset.action;
      if (!key || !action) return;
      const current = pointersRef.current.get(key);
      if (current !== e.pointerId) return;
      pointersRef.current.delete(key);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // El pointer ya no está capturado (p. ej. pointercancel previo).
      }
      el.dataset.pressed = "false";
      if (pressedRef.current.has(action)) {
        pressedRef.current.delete(action);
        onInput(action, false);
      }
    },
    [onInput],
  );
  const dpad = actions.dpad ?? [];
  const buttons = actions.buttons ?? [];
  const showUp = dpad.includes("up");
  const showDown = dpad.includes("down");
  const showLeft = dpad.includes("left");
  const showRight = dpad.includes("right");
  const dpadAction = DPAD_ACTION[layout];
  const btnProps = { onPointerDown, onPointerUp };
  return (
    <div className="touch-overlay" data-layout={layout}>
      {dpad.length > 0 && (
        <div
          className="touch-dpad"
          role="group"
          aria-label="Controles de movimiento"
        >
          <div className="touch-dpad-row">
            {showUp ? (
              <TouchButton
                className="touch-dpad-btn up"
                ariaLabel={DPAD_ARIA.up}
                dataKey="dpad-up"
                dataAction={dpadAction.up}
                {...btnProps}
              >
                {ARROWS.up}
              </TouchButton>
            ) : (
              <span className="touch-dpad-spacer" aria-hidden />
            )}
          </div>
          <div className="touch-dpad-row">
            {showLeft ? (
              <TouchButton
                className="touch-dpad-btn left"
                ariaLabel={DPAD_ARIA.left}
                dataKey="dpad-left"
                dataAction={dpadAction.left}
                {...btnProps}
              >
                {ARROWS.left}
              </TouchButton>
            ) : (
              <span className="touch-dpad-spacer" aria-hidden />
            )}
            <span className="touch-dpad-core" aria-hidden />
            {showRight ? (
              <TouchButton
                className="touch-dpad-btn right"
                ariaLabel={DPAD_ARIA.right}
                dataKey="dpad-right"
                dataAction={dpadAction.right}
                {...btnProps}
              >
                {ARROWS.right}
              </TouchButton>
            ) : (
              <span className="touch-dpad-spacer" aria-hidden />
            )}
          </div>
          <div className="touch-dpad-row">
            {showDown ? (
              <TouchButton
                className="touch-dpad-btn down"
                ariaLabel={DPAD_ARIA.down}
                dataKey="dpad-down"
                dataAction={dpadAction.down}
                {...btnProps}
              >
                {ARROWS.down}
              </TouchButton>
            ) : (
              <span className="touch-dpad-spacer" aria-hidden />
            )}
          </div>
        </div>
      )}
      {buttons.length > 0 && (
        <div
          className="touch-actions"
          role="group"
          aria-label="Botones de acción"
        >
          {buttons.map((btn) => (
            <TouchButton
              key={btn.id}
              className={`touch-action-btn ${btn.id === "shoot" ? "primary" : ""}`.trim()}
              ariaLabel={btn.label}
              dataKey={`btn-${btn.id}`}
              dataAction={btn.id}
              {...btnProps}
            >
              <span className="touch-action-label">{btn.label}</span>
            </TouchButton>
          ))}
        </div>
      )}
    </div>
  );
}
type ButtonProps = {
  className: string;
  ariaLabel: string;
  dataKey: string;
  dataAction: string;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
};
function TouchButton({
  className,
  ariaLabel,
  dataKey,
  dataAction,
  onPointerDown,
  onPointerUp,
  children,
}: ButtonProps) {
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      data-key={dataKey}
      data-action={dataAction}
      data-pressed="false"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      // Un clic de ratón accidental no debe retener el foco (compete con el teclado).
      onClick={(e) => e.currentTarget.blur()}
      // Evita menú contextual en long-press en móvil.
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
