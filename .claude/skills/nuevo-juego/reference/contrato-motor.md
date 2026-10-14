# Contrato motor ↔ plataforma

Patrón fijado por SPEC 05 (Asteroids), ampliado por SPEC 11/12 (táctil) y por el agente
`skin-designer` (paletas). Todo juego real lo sigue. Referencias vivas más completas:
`lib/games/snake/` (sin vidas) y `lib/games/frogger/` (con vidas, niveles y temporizador).

## Estructura de archivos

```
lib/games/<id>/
  types.ts       # callbacks, options y engine
  constants.ts   # dimensiones y valores del original, copiados tal cual
  utils.ts       # helpers puros (opcional)
  entities.ts    # tipos de dominio y lógica pura: sin ctx, sin DOM, testeable a mano
  skins.ts       # <Juego>Palette + SKINS: Record<SkinId, <Juego>Palette>
  engine.ts      # create<Juego>(canvas, callbacks, options): estado, input, update, draw, bucle
components/<id>-canvas.tsx   # componente cliente + leyenda de controles
```

No hay `index.ts` en ningún juego. `sprites.ts`, `levels.ts` o `tint.ts` aparecen solo si el
juego los necesita.

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

export type <Juego>Options = {
  palette?: <Juego>Palette;            // skin inicial; sin ella, `clasico`
};

export type <Juego>Engine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;                 // estado inicial
  end: () => void;                     // fuerza game over (botón FIN)
  destroy: () => void;                 // cancela rAF y quita todos los listeners
  setPalette: (p: <Juego>Palette) => void;        // cambio de skin en vivo
  setInput: (action: string, pressed: boolean) => void;  // gamepad táctil
};

export function create<Juego>(
  canvas: HTMLCanvasElement,
  cb: <Juego>Callbacks,
  options?: <Juego>Options,
): <Juego>Engine;
```

Las **siete** claves son obligatorias: `skin-designer` y `mobile-porter` dan por hechas
`setPalette` y `setInput`. Escribirlas desde el principio ahorra una repasada entera.

`setInput` tiene dos sabores según el juego, y hay que elegir a conciencia:

- **Por flanco** (snake, frogger): `if (!pressed) return;` y la pulsación encola una acción
  discreta. Para movimiento celda a celda.
- **Sostenido** (bloque-buster): escribe en el mismo objeto `keys` que el teclado, y el
  `pressed === false` **siempre** pasa, para no dejar teclas pegadas al soltar.

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
- Si `canvas.getContext("2d")` devuelve `null`, el motor **no lanza**: devuelve un motor noop
  con las siete claves apuntando a `() => {}`. Es lo que mantiene vivo el SSR y los tests.
- El motor lee la paleta en cada `draw()`; `setPalette` asigna y redibuja de inmediato
  (también en pausa y en game over). Ningún color literal fuera de `skins.ts`.
- Emite `onLevel` al menos una vez en el init: el HUD de nivel de la plataforma se muestra
  siempre, no está condicionado por ningún flag.

### El error de `onPause` que cuesta una tarde

`onPause` se emite **solo** desde los caminos que origina el motor: tecla P/Esc,
`blur` y `visibilitychange`. Los `pause()`/`resume()` públicos **no** lo emiten. `GamePlayer`
pasa `onPause={setPaused}` y además llama él mismo a `pause()`/`resume()`: si el método
público emitiera, se entra en bucle.

### El error de `ctx` que cuesta diez minutos

TypeScript no conserva el estrechamiento de `const ctx = canvas.getContext("2d")` dentro de
las funciones del closure, así que `ctx` sale como `possibly null` en cada `draw*`. Dos
soluciones en el repo: pasar `ctx` por parámetro a cada helper (snake), o declarar un alias ya
estrechado tras el guard (frogger, menos ruidoso):

```ts
const ctx2d = canvas.getContext("2d");
if (!ctx2d) return noopEngine;
const ctx: CanvasRenderingContext2D = ctx2d;
```

### Entidades que recorren el tablero en bucle

Si el juego tiene carriles con tráfico, no reintroduzcas cada entidad en `col = COLS` al
salir: los huecos se degradan con el tiempo. Reparte las entidades sobre un circuito más
ancho que el tablero (`LANE_SPAN = COLS + n`) y da la vuelta restando `LANE_SPAN`, mirando
**el sentido del carril**: comprobar los dos bordes a la vez hace que una entidad
reintroducida por la derecha vuelva a saltar en el frame siguiente.

## Componente canvas

Modelo: `components/asteroids-canvas.tsx`.

- `useEffect(..., [])` crea el motor una sola vez y devuelve `destroy`.
- `callbacksRef` se actualiza en otro `useEffect` para que el motor siempre llame a la última versión.
- `useImperativeHandle(ref, …, [])` expone **cinco** métodos:
  `pause/resume/restart/end/setInput`. `destroy` y `setPalette` **no** se exponen: el primero
  es del cleanup, el segundo entra por la prop `skin`.
- `<Juego>Handle = Pick<<Juego>Engine, "pause"|"resume"|"restart"|"end"|"setInput">`.
- Props: `<Juego>Callbacks & { ref?: Ref<<Juego>Handle>; skin?: SkinId }`, con
  `skin = DEFAULT_SKIN` por defecto y un `useEffect([skin])` que llama a `setPalette(SKINS[skin])`.
- `ref` como prop (React 19), sin `forwardRef`.
- El `<canvas>` lleva `width`/`height` también en el JSX, además de los que fija el motor:
  evita el flash de 300×150 antes de que corra el efecto.
- Exporta también una leyenda de controles (`<ul className="controls-legend">`) y `<p className="keys-notice">` (visible solo con `(pointer: coarse)`).
- APIs de navegador (`canvas`, rAF, `window`) solo dentro de `useEffect` (compatibilidad con `cacheComponents`).

## Registro de motores

`GamePlayer` elige el motor por `game.id` en un registro:

```ts
// lib/games/registry.ts  ("use client")
export type EngineEntry = {
  Canvas: ComponentType<EngineCanvasProps>;
  Controls: ComponentType;
  hasLives: boolean; // false ⇒ el HUD no muestra «Vidas»
  ariaLabel: string;
  skins?: SkinId[]; // ausente ⇒ solo `clasico`, sin selector
  touchActions?: TouchSpec; // presente ⇒ gamepad MK-II en móvil/tablet
};
```

`skins` y `touchActions` son opcionales **a propósito**: déjalos fuera al implementar la spec
del juego y que los añadan `skin-designer` y `mobile-porter` en sus pasadas. Registrar
`skins: SKIN_IDS` antes de tener paletas reales pinta un selector con tres opciones idénticas.

`TouchSpec` es `{ dpad: { up, down, left, right }, buttons: { a, b } }`, donde cada slot es el
string que se le pasará a `setInput(action, pressed)` o `null` para pintarlo inerte. Un juego
que solo se mueve (frogger) deja A y B en `null`: no se inventa mecánica para llenar huecos.

- `GamePlayer` consulta `ENGINES[game.id]`. Si no hay entrada, muestra «JUEGO NO DISPONIBLE»: todo juego del catálogo necesita su motor registrado.
- Las props comunes del canvas (`ref`, `onScore`, `onLives`, `onLevel`, `onGameOver`, `onPause`) tienen la misma forma en todos los juegos para poder tratarlos igual.
- Si el juego no tiene vidas, el HUD muestra «—» (ya lo hace con `lives = 0`) o se oculta, según lo decidido.
- Juego sin niveles: el nivel de la plataforma (`1 + floor(score / 2500)`) no debe mostrarse como si fuera del juego; decidirlo en la spec.

## CSS del canvas (no es opcional)

Cada juego necesita **su propia clase** `.<id>-canvas` en `app/globals.css`, junto a las de
los demás (busca `.snake-canvas`). La pantalla `.crt-screen` es 4:3; el canvas lógico casi
nunca lo es, así que hay dos patrones:

- **El canvas llena la pantalla** (asteroids, bloque-buster): `width: 100%; height: 100%`.
- **El canvas conserva su proporción** (snake 1:1, frogger 8:7): `height: 100%; width: auto;
  aspect-ratio: <w> / <h>; margin-inline: auto`, con bandas negras a los lados.

En el bloque móvil «layout app» (`@media (max-width: 768px)`, busca el comentario
«todo (HUD + CRT + gamepad) entra en la ventana del móvil sin scroll») la pantalla pasa a
`flex: 1 1 auto` con `aspect-ratio: auto`. Ahí **no** puedes forzarle proporción a
`.crt-screen`: desborda el alto. Lo que funciona es `width:100%; height:100%; aspect-ratio:
auto; object-fit: contain` sobre el canvas, que letterboxea el bitmap sin estirarlo.

`.av-player` mide `calc(100dvh - 68px)` en móvil, descontando la navbar sticky. Si pones
`100dvh`, el gamepad queda fuera de la ventana **en todos los juegos**.

## Qué NO es trabajo del motor

El HUD de puntuación/vidas/nivel, el overlay de pausa, el modal de fin de partida, el
guardado del score, el selector de skin y el gamepad táctil son de `components/game-player.tsx`
y salen gratis al registrar el motor. Un canvas que los repinta está duplicando la
plataforma. La única excepción admitida hasta hoy es la **barra de temporizador** de frogger:
información de juego que el HUD de plataforma no tiene ranura para mostrar.
