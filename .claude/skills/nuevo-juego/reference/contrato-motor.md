# Contrato motor ↔ plataforma

Patrón fijado por SPEC 05 y ya implementado para Asteroids. Todo juego real lo sigue.

## Estructura de archivos

```
lib/games/<id>/
  types.ts       # callbacks y engine
  constants.ts   # dimensiones y valores del original, copiados tal cual
  utils.ts       # helpers puros
  entities.ts    # clases/estructuras; reciben ctx o input por parámetro, sin globales
  engine.ts      # create<Juego>(canvas, callbacks): estado, input, update, draw, bucle
components/<id>-canvas.tsx   # componente cliente + leyenda de controles
```

## Tipos

Se parte de `lib/games/asteroids/types.ts`:

```ts
export type <Juego>Callbacks = {
  onScore: (score: number) => void;
  onLives?: (lives: number) => void;   // omitir si el juego no tiene vidas
  onLevel?: (level: number) => void;   // omitir si no hay niveles
  onGameOver: (finalScore: number) => void;
  onPause?: (paused: boolean) => void; // pausas que origina el motor (pestaña oculta, blur)
};

export type <Juego>Engine = {
  pause: () => void;
  resume: () => void;
  restart: () => void; // estado inicial
  end: () => void;     // fuerza game over (botón FIN)
  destroy: () => void; // cancela rAF y quita todos los listeners
};

export function create<Juego>(canvas: HTMLCanvasElement, cb: <Juego>Callbacks): <Juego>Engine;
```

## Reglas del motor

- Sin `document.getElementById`, sin variables globales de módulo mutables, sin React.
- Canvas lógico fijo (p. ej. 800×600) escalado por CSS dentro de `.crt-screen`; no se usa `devicePixelRatio`.
- `dt` limitado a 50 ms. Al reanudar se reinicia `lastTime`.
- Pausa automática en `visibilitychange` y `blur` (avisa con `onPause(true)`).
- Teclado por listeners en `window`. `preventDefault` en las teclas del juego **solo** si el motor está activo y el foco no está en un `input`/`textarea`.
- El HUD (puntos, vidas, nivel) y el «FIN DEL JUEGO» los pinta la plataforma. En el canvas solo quedan efectos propios del juego (p. ej. la cuenta atrás del power-up).
- `onGameOver` detiene el bucle. Sin reinicio con tecla desde el canvas.
- `restart()` no duplica el bucle ni los listeners.
- `destroy()` es idempotente. Strict Mode monta el efecto dos veces.

## Componente canvas

Modelo: `components/asteroids-canvas.tsx`.

- `useEffect(..., [])` crea el motor una sola vez y devuelve `destroy`.
- `callbacksRef` se actualiza en otro `useEffect` para que el motor siempre llame a la última versión.
- `useImperativeHandle` expone `pause/resume/restart/end`.
- `ref` como prop (React 19), sin `forwardRef`.
- Exporta también una leyenda de controles (`<ul className="controls-legend">`) y `<p className="keys-notice">` (visible solo con `(pointer: coarse)`).
- APIs de navegador (`canvas`, rAF, `window`) solo dentro de `useEffect` (compatibilidad con `cacheComponents`).

## Registro de motores

`GamePlayer` hoy ramifica con `game.id === "asteroids"`. En cuanto hay un segundo motor, se generaliza:

```ts
// lib/games/registry.ts  ("use client")
export const ENGINES: Record<string, { Canvas: ComponentType<…>; Controls: ComponentType; hasLives: boolean; ariaLabel: string }>;
```

- `GamePlayer` consulta `ENGINES[game.id]`. Si no hay entrada, usa la simulación actual (`setInterval` y `.game-arena`).
- Las props comunes del canvas (`ref`, `onScore`, `onLives`, `onLevel`, `onGameOver`, `onPause`) tienen la misma forma en todos los juegos para poder tratarlos igual.
- El paso de `asteroids` al registro es un refactor sin cambio funcional y no toca su motor.
- Si el juego no tiene vidas, el HUD muestra «—» (ya lo hace con `lives = 0`) o se oculta, según lo decidido.
- Juego sin niveles: el nivel de la plataforma (`1 + floor(score / 2500)`) no debe mostrarse como si fuera del juego; decidirlo en la spec.
