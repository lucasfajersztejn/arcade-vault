"use client";
import { useCallback, useEffect, useRef } from "react";
import type { TouchSpec, TouchActionId } from "@/lib/games/registry";
type Props = {
  spec: TouchSpec;
  onInput: (action: string, pressed: boolean) => void;
};
type SlotId = "up" | "down" | "left" | "right" | "a" | "b";
const DPAD_SLOT_LABEL: Record<"up" | "down" | "left" | "right", string> = {
  up: "Arriba",
  down: "Abajo",
  left: "Izquierda",
  right: "Derecha",
};
// Traducción de los `action id` del motor a texto humano para los aria-labels.
const ACTION_LABEL: Record<string, string> = {
  up: "arriba",
  down: "abajo",
  left: "izquierda",
  right: "derecha",
  thrust: "propulsión",
  "rot-left": "girar a la izquierda",
  "rot-right": "girar a la derecha",
  shoot: "disparar",
  hyperspace: "hiperespacio",
  rotate: "rotar",
  drop: "soltar",
  launch: "lanzar",
};
function describe(slotName: string, action: TouchActionId): string {
  if (!action) return `${slotName}: inactivo`;
  const human = ACTION_LABEL[action] ?? action;
  return `${slotName}: ${human}`;
}
export function TouchControls({ spec, onInput }: Props) {
  // Cada slot reserva su propio pointerId para no interferir con los demás dedos.
  const pointersRef = useRef<Map<SlotId, number>>(new Map());
  // Acciones todavía en estado "pressed" para poder soltarlas al desmontar.
  const pressedRef = useRef<Set<string>>(new Set());
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
      const slot = el.dataset.slot as SlotId | undefined;
      const action = el.dataset.action;
      if (!slot || !action) return;
      if (pointersRef.current.has(slot)) return;
      pointersRef.current.set(slot, e.pointerId);
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // Algunos navegadores rechazan captures en pointers ya liberados.
      }
      el.dataset.pressed = "true";
      if (!pressedRef.current.has(action)) {
        pressedRef.current.add(action);
        onInput(action, true);
      }
      e.preventDefault();
    },
    [onInput],
  );
  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const el = e.currentTarget;
      const slot = el.dataset.slot as SlotId | undefined;
      const action = el.dataset.action;
      if (!slot || !action) return;
      const current = pointersRef.current.get(slot);
      if (current !== e.pointerId) return;
      pointersRef.current.delete(slot);
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
  const liveProps = { onPointerDown, onPointerUp };
  return (
    <div className="touch-controls" role="group" aria-label="Gamepad">
      <div className="gp">
        <div className="gp-body">
          <div className="gp-col gp-col-left">
            <div className="gp-dpad" aria-label="D-pad">
              <DpadSlot
                dir="up"
                action={spec.dpad.up}
                className="dp dp-up"
                {...liveProps}
              />
              <DpadSlot
                dir="right"
                action={spec.dpad.right}
                className="dp dp-right"
                {...liveProps}
              />
              <DpadSlot
                dir="down"
                action={spec.dpad.down}
                className="dp dp-down"
                {...liveProps}
              />
              <DpadSlot
                dir="left"
                action={spec.dpad.left}
                className="dp dp-left"
                {...liveProps}
              />
              <div className="dp-hub" aria-hidden>
                <span className="dp-hub-gem" />
              </div>
            </div>
          </div>
          <div className="gp-col gp-col-right">
            <div className="gp-actions">
              <AbSlot
                slot="b"
                action={spec.buttons.b}
                letter="B"
                {...liveProps}
              />
              <AbSlot
                slot="a"
                action={spec.buttons.a}
                letter="A"
                {...liveProps}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
type DpadProps = {
  dir: "up" | "down" | "left" | "right";
  action: TouchActionId;
  className: string;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};
function DpadSlot({
  dir,
  action,
  className,
  onPointerDown,
  onPointerUp,
}: DpadProps) {
  const active = action !== null;
  const label = describe(DPAD_SLOT_LABEL[dir], action);
  return (
    <GamepadSlot
      slot={dir}
      action={action}
      active={active}
      className={active ? className : `${className} gp-slot-off`}
      ariaLabel={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <ArrowIcon dir={dir} />
    </GamepadSlot>
  );
}
type AbProps = {
  slot: "a" | "b";
  action: TouchActionId;
  letter: "A" | "B";
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
};
function AbSlot({ slot, action, letter, onPointerDown, onPointerUp }: AbProps) {
  const active = action !== null;
  const base = `ab ${slot}`;
  const className = active ? base : `${base} gp-slot-off`;
  const label = describe(letter, action);
  return (
    <GamepadSlot
      slot={slot}
      action={action}
      active={active}
      className={className}
      ariaLabel={label}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      <span className="ab-ring" aria-hidden />
      <span className="ab-letter">{letter}</span>
    </GamepadSlot>
  );
}
type SlotProps = {
  slot: SlotId;
  action: TouchActionId;
  active: boolean;
  className: string;
  ariaLabel: string;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
};
function GamepadSlot({
  slot,
  action,
  active,
  className,
  ariaLabel,
  onPointerDown,
  onPointerUp,
  children,
}: SlotProps) {
  if (!active) {
    return (
      <button
        type="button"
        className={className}
        aria-label={ariaLabel}
        aria-disabled="true"
        tabIndex={-1}
        data-slot={slot}
        data-inert="true"
        onContextMenu={(e) => e.preventDefault()}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      data-slot={slot}
      data-action={action ?? ""}
      data-pressed="false"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      onClick={(e) => e.currentTarget.blur()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );
}
function ArrowIcon({ dir }: { dir: "up" | "down" | "left" | "right" }) {
  const path =
    dir === "up"
      ? "M12 4 L20 16 L4 16 Z"
      : dir === "right"
        ? "M8 4 L20 12 L8 20 Z"
        : dir === "down"
          ? "M4 8 L20 8 L12 20 Z"
          : "M16 4 L16 20 L4 12 Z";
  return (
    <svg className="dp-arrow" viewBox="0 0 24 24" aria-hidden>
      <path d={path} fill="currentColor" />
    </svg>
  );
}
