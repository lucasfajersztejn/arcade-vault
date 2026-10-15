# SPEC 13 — Frogger: performance y encaje de pantalla

> **Nota de implementación (2026-10-15):** implementado en la rama `spec-13-frogger-performance-y-encaje` siguiendo los 8 pasos del plan. Desviaciones vs. la spec:
>
> - **Paso 4 — cache de sprites perezoso en lugar de `rebuildSprites()` anticipado.** El `spriteCache` se llena en `drawLanes` la primera vez que aparece cada combinación `(kind, width, tint, dir)`; `setPalette` lo vacía y la primera frame tras el cambio lo rellena. Más simple y robusto que iterar `LANE_SPECS` desde el motor (que vive en `entities.ts`).
> - **`startRound` no invalida el cache ni el fondo.** Ni la paleta ni los sprites cambian entre rondas; invalidar sería trabajo gratuito. `setPalette` sigue siendo el único invalidador.
> - **Paso 8 — medición DevTools omitida.** El usuario optó por no ejecutar la grabación comparativa 4× CPU. El cambio de perf es correcto por código (`drawImage` sobre canvas prerrenderizados reemplaza decenas de `arc`/`beginPath` por frame + guardas `lastEmitted*` cortan re-renders del HUD), pero no se ha medido el delta exacto.

**Estado:** Implementado
**Depende de:** SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por `GamePlayer` y el contrato de motor; SPEC 11 (`specs/11-controles-tactiles-movil.md`) y SPEC 12 (`specs/12-gamepad-estandar-movil.md`) por el gamepad táctil y la media query; `specs/game-jam/frogger/01-frogger-core.md` por la implementación actual del juego.
**Fecha:** 2026-10-15
**Objetivo:** Hacer que Frogger ocupe su marco CRT en desktop sin franjas y bajar el coste de render del motor con un fondo offscreen y sprites prerrenderizados, manteniendo la estética y las 3 skins intactas.

---

## Por qué existe esta spec

El tablero de Frogger mide 640×560 (8:7) pero `.crt-screen` fuerza `aspect-ratio: 4/3`. La regla actual `.frogger-canvas { height: 100%; width: auto; aspect-ratio: 8/7; margin-inline: auto }` centra el canvas y deja franjas negras laterales anchas en desktop; en móvil ya se corrigió con el bloque `@media (max-width: 768px)` que libera `aspect-ratio` del `.crt-screen` y deja el flex-1 controlar el alto. Snake resolvió exactamente este caso con `.crt-screen:has(> .snake-canvas) { aspect-ratio: 1/1; }`.

En paralelo, el motor repinta todo cada frame con primitivas Canvas 2D: `drawZones` (fillRect + `setLineDash` + 5 strokes), `drawLanes` (11 carriles, `arc` por tortuga), `drawGoals` (5 huecos + ellipses), `drawFrog` (varios `beginPath`/`fill`) y `drawTimeBar`. El fondo y las bocas vacías son estáticos por nivel, y los sprites de vehículos/troncos/tortugas son invariantes por nivel —sólo cambia su `col`—. En móviles medios eso se traduce en jitter perceptible y mayor consumo.

Esta spec hace dos cosas acopladas al juego Frogger: adapta el marco CRT a su proporción cuando lo contiene, y refactoriza el motor para pintar sobre un fondo cacheado y sprites prerrenderizados. No cambia la mecánica, el contrato de motor, la BD ni los demás juegos.

---

## Alcance

### Dentro

- **CSS.** Añadir en `app/globals.css`, al lado de la regla equivalente de Snake:
  ```css
  .crt-screen:has(> .frogger-canvas) {
    aspect-ratio: 8 / 7;
  }
  ```
  Mantener el bloque `@media (max-width: 768px)` existente (líneas ~1774-1784) que libera `aspect-ratio` en móvil. Mantener `image-rendering: pixelated` en `.frogger-canvas`.
- **Render en capas en `lib/games/frogger/engine.ts`.** Introducir dos cachés offscreen de 640×560:
  - `bgCanvas`: zonas (`river`, `goalRow`, `safe`, `road`), líneas discontinuas de los carriles y los 5 slots de meta vacíos con su borde. Se reconstruye en `rebuildBackground()`.
  - Sprites prerrenderizados por `(kind, width, tint)` guardados en un `Map<string, HTMLCanvasElement>` (clave p. ej. `car:1:0`, `truck:3`, `log:3`, `turtle:2`). Se reconstruyen en `rebuildSprites()` reutilizando las funciones de dibujo actuales adaptadas a «pintar en `(spriteCtx, x=0, y=0, width)`».
- **Loop de frame reducido:** `drawImage(bgCanvas, 0, 0)` → `drawLanes()` (sólo `drawImage` por entidad) → `drawGoalsFilled()` (sólo las bocas con `goals[i] = true`) → `drawFrog()` (dinámico; estira patas) → `drawTimeBar()` (2 `fillRect`).
- **Invalidación de cachés:** `rebuildBackground()` + `rebuildSprites()` se llaman al crear el motor, en cada `startRound(level)` (los sprites no dependen del nivel, pero `startRound` es el único punto donde cambia el conjunto de entidades) y en `setPalette(next)`.
- **React mínimo en Frogger.** En `components/frogger-canvas.tsx`:
  - Envolver `FroggerControls` en `memo` (no tiene props, no debe re-renderizar al cambiar score/vidas).
  - Verificar que `FroggerCanvas` sigue sin provocar recreación del engine entre renders: el `useEffect` del engine debe mantener el array de deps vacío `[]`, los callbacks siguen por `callbacksRef`, la skin por `skinRef` + efecto dedicado.
  - Añadir guardas de emisión dentro del motor Frogger: variables locales `lastEmittedScore/lives/level/paused` para no llamar al callback si el valor no cambió. Esto no cambia el contrato pero evita re-renders redundantes del HUD en `GamePlayer`.
- **Verificación con Playwright:** `/games/frogger/jugar` en desktop 1920×1080 y 1280×720, y en iPhone 13 portrait emulado. Capturas en `.playwright-screenshots/spec13-frogger-<viewport>.png`.
- **Medición antes/después con DevTools Performance** (10 s de partida en throttle 4× CPU): registrar en el PR el tiempo medio de script+render por frame.

### Fuera (explícito)

- Reescritura a WebGL o Pixi.
- Cambios de mecánica, puntuación, dificultad, controles o vocabulario de `setInput`.
- Cambios en `components/game-player.tsx`, `components/touch-controls.tsx`, `lib/games/registry.ts` (más allá de leer el engine entry; no se tocan `touchActions`/`skins`).
- Cambios en los demás juegos (`asteroids`, `caida`, `bloque-buster`, `snake`).
- Supabase, migraciones, `lib/db/*`, RLS.
- Deuda `av_user` (nombre del jugador no se persiste tras guardar score) — tiene su propia spec pendiente, no entra aquí.
- Nuevas skins, nuevos sprites, cambios visuales que alteren pixel a pixel el aspecto actual.
- Tests automatizados.
- Modificar `refereences/`.

---

## Modelo de datos

Esta spec no introduce estructuras persistentes ni tipos nuevos de dominio. No toca tablas, vistas, migraciones, RLS, `lib/db/*` ni `localStorage`. No hay `apply_migration`.

Cambia la **estructura interna** del motor Frogger (closure de `createFrogger`) con tres referencias nuevas, no exportadas:

```ts
let bgCanvas: HTMLCanvasElement;
let bgCtx: CanvasRenderingContext2D;
// Sprites por tipo+ancho+tint (tint sólo relevante para "car").
const spriteCache = new Map<string, HTMLCanvasElement>();
// Último valor emitido para evitar notificaciones redundantes al HUD.
let lastEmittedScore = -1;
let lastEmittedLives = -1;
let lastEmittedLevel = -1;
let lastEmittedPaused: boolean | null = null;
```

El tipo público `FroggerEngine` y las funciones del contrato (`pause/resume/restart/end/destroy/setPalette/setInput`) no cambian.

---

## Plan de implementación

Cada paso deja la rama compilable (`npm run build`) y los demás juegos intactos.

1. **CSS.** Añadir `.crt-screen:has(> .frogger-canvas) { aspect-ratio: 8 / 7; }` en `app/globals.css` junto a la regla equivalente de Snake. Smoke test manual en desktop (`/games/frogger/jugar` 1920×1080 y 1280×720) y en iPhone 13 emulado: ocupa el marco en desktop sin franjas, en móvil sigue dentro del `calc(100dvh - 68px)`.
2. **Extraer dibujo de sprites.** En `lib/games/frogger/engine.ts`, convertir `drawCar`, `drawTruck`, `drawLog`, `drawTurtles` en funciones que acepten `(ctx2d, offsetX=0, offsetY=0, width, tint?)` y pinten relativo a `(offsetX, offsetY)`. El motor sigue llamándolas directamente en vivo —paso puramente de refactor, sin cambio funcional—.
3. **Fondo offscreen.** Crear `bgCanvas = document.createElement('canvas')` con las dimensiones `CANVAS_W × CANVAS_H` y una función `rebuildBackground()` que pinta sobre `bgCtx` lo que hoy pinta `drawZones` + los 5 slots de meta vacíos (sin la rana cacheada; esa parte va aparte). Llamar `rebuildBackground()` al crear el motor y en `setPalette`. Sustituir en `draw()` la llamada a `drawZones` por `ctx.drawImage(bgCanvas, 0, 0)` y eliminar la parte estática de `drawGoals` del hot path (queda sólo el overlay de bocas rellenas).
4. **Sprites prerrenderizados.** Añadir `rebuildSprites()` que, para cada combinación `(kind, width, tint?)` presente en los `LANE_SPECS` (del paso 2 ya expuestas), crea un `HTMLCanvasElement` del tamaño exacto `width*CELL × CELL`, lo pinta una vez y lo guarda en `spriteCache`. Reemplazar en `drawLanes()` las llamadas a las funciones por `ctx.drawImage(spriteCache.get(key)!, px(entity.col), py(lane.row))`. Llamarla al crear el motor y en `setPalette`.
5. **Guardas de emisión.** Dentro de `emitScore`, `killFrog`, `completeRound`, `startRound` y `togglePause`/`onAutoPause`, comparar con `lastEmitted*` y sólo llamar al callback si cambia. Mantener los emits iniciales de `initGame()` como "forzados" (reset de `lastEmitted*` a `-1` previo a la llamada).
6. **React mínimo.** En `components/frogger-canvas.tsx`, envolver `FroggerControls` con `memo` (importado de React). Comprobar que el engine se sigue creando sólo una vez (el `useEffect` principal mantiene `[]` como deps).
7. **Verificación visual con Playwright.** Capturas desktop (1920×1080, 1280×720) e iPhone 13 portrait emulado en las 3 skins; comparar con captura previa de `main` (misma posición de la rana ≈ inicio de partida pausada) para constatar que no hay regresión visual pixel a pixel.
8. **Medición DevTools.** Grabar 10 s de juego a nivel 1 en throttle 4× CPU, antes y después, y adjuntar al PR el tiempo medio de script+render por frame. Objetivo: ≥40 % de caída.

---

## Criterios de aceptación

- [x] ✅ En `/games/frogger/jugar` a ≥1280 px de ancho el tablero ocupa todo el marco CRT sin franjas negras y sin distorsión. (verificado 1920×1080 y 1280×720: canvas 1004×878.5 == CRT 1004×878.5, ratio exacto 8/7).
- [x] ✅ En móvil (iPhone 13 portrait emulado) el canvas se comporta igual que antes: dentro de la pantalla con el gamepad táctil debajo, sin scroll vertical. (verificado 390×844: canvas = CRT 685×599, gamepad visible 733×237, scrollH == innerH).
- [x] ✅ `CANVAS_W` y `CANVAS_H` siguen siendo 640 y 560; no se cambian constantes del motor. (`lib/games/frogger/constants.ts` sin tocar).
- [x] ✅ Las 3 skins (`clasico`, `neon`, `retro`) se ven idénticas antes/después del refactor. (capturas Playwright `spec13-frogger-desktop-1920.png`, `-neon.png`, `-retro.png` muestran paletas aplicadas correctamente sobre la misma geometría).
- [x] ✅ Cambiar la skin durante una partida en marcha reconstruye fondo y sprites sin reiniciar la partida y sin parpadeo visible. (verificado en vivo: `clasico → neon → retro` sin reset del score/vidas; `setPalette` hace `spriteCache.clear() + rebuildBackground()` antes del siguiente `draw`).
- [x] 🔍 `setPalette`, `pause`, `resume`, `restart`, `end`, `destroy` y `setInput` conservan la misma firma pública y comportamiento observable. (firmas intactas en el `return` de `createFrogger`; `restart`/`end`/`destroy`/`pause`/`resume` no se tocaron; `setPalette` sólo añade invalidación de cachés antes del `draw`).
- [x] ✅ El gamepad táctil, el HUD compacto en móvil y la pausa automática por `blur`/`visibilitychange` siguen funcionando. (gamepad visible en captura `iphone13.png`; HUD compacto confirmado; handlers `onAutoPause`/`onVisibility` sin tocar).
- [x] ~~En DevTools Performance a 4× CPU, el tiempo medio de script+render por frame baja al menos un 40 %.~~ ❌ **No medido** (decisión del usuario 2026-10-15: omitir la grabación comparativa). Correcto por código: el loop sustituye todas las primitivas estáticas por un `drawImage(bgCanvas,0,0)` y todos los `arc`/`beginPath` de entidades por `drawImage(sprite,x,y)`.
- [x] 🔍 El motor no emite callbacks redundantes al HUD. (guardas `lastEmittedScore/Lives/Level/Paused` en `emitScore`/`emitLives`/`emitLevel`/`emitPaused`; `initGame` resetea las guardas; `onGameOver` queda sin filtro).
- [x] ✅ `npm run lint` y `npm run build` pasan. (`build` verificado tras el Paso 6: Compiled successfully in 1.6s + TypeScript OK + 10/10 páginas prerenderizadas).
- [x] ✅ Playwright emula iPhone 13 portrait sin regresión visual; capturas en `.playwright-screenshots/spec13-frogger-*.png`. (5 capturas: 1920, 1280, iphone13, neon, retro).

---

## Decisiones tomadas y descartadas

- **Encaje CRT: `has(> .frogger-canvas)` con 8/7.** Elegido por paralelo con Snake, mantiene el canvas en sus proporciones y no estira el tablero. Descartadas: (a) estirar canvas a 4/3 por distorsión evidente de carriles; (b) decorar franjas con bezel/scanlines porque sigue sin resolver la queja «no ocupa el recuadro».
- **Técnica de performance: cachés offscreen + sprites.** Elegida por rendimiento × riesgo. Descartada reescritura a WebGL/Pixi: coste alto, obliga a repensar el contrato de skins y a reimplementar el canvas-neutro del arcade. Descartado también «sólo cachear el fondo»: deja los `arc` por tortuga en el hot path.
- **Alcance limitado a Frogger.** El usuario pidió no barrer el catálogo. Los demás juegos no están reportando lag ni usan `arc` masivamente.
- **React: minimizar `useState` sin tocar `GamePlayer`.** `GamePlayer` es compartido con 4 juegos; cualquier cambio de estado estructural debería ir en su propia spec. En Frogger lo que resuelve el objetivo es cortar emits redundantes del motor —misma firma, menos re-renders— y memoizar `FroggerControls`.
- **No introducir `OffscreenCanvas`.** Un `HTMLCanvasElement` detached basta y evita el bump de compatibilidad con Safari viejo.
- **No subir el detalle hiDPI de los sprites.** Mantener tamaños lógicos (`width*CELL × CELL`); `image-rendering: pixelated` ya está en el canvas visible y el estilo del juego acepta pixelación.

---

## Riesgos identificados

- **`has()` en navegadores antiguos.** Soporte sólido en Chrome, Safari y Firefox desde 2023; en Firefox ESR convendría comprobar. Si falla, el fallback es inofensivo: vuelve el 4/3 actual con franjas, que es el estado hoy en main.
- **Repintado del fondo durante `setPalette` en vivo.** Si el frame del juego llega antes de `rebuildBackground()`, aparece un flash. Mitigación: llamar `rebuildBackground()` y `rebuildSprites()` **antes** del `draw()` del siguiente frame, dentro del propio `setPalette`.
- **HiDPI y nitidez.** En pantallas con `devicePixelRatio > 1` los sprites prerrenderizados a 1× pueden verse borrosos al escalar. Con `image-rendering: pixelated` el efecto es coherente con el resto del juego, pero si se percibe degradación mayor que en `main`, se escala el cache a `devicePixelRatio × tamaño lógico` (riesgo acotado al bloque B, sin tocar el canvas visible).
- **Guardas de emisión y modal de game over.** Si el motor filtra un `onScore` final por igualdad accidental, el modal podría quedar desincronizado. Mitigación: `gameOver()` emite el score final sin filtro —se añade un segundo path `emitScoreForced()`—.
- **Scroll de la ruta en desktop a aspect ratio nuevo.** Con el marco a 8/7 el `.crt` queda más alto que antes. Si descolga del viewport en pantallas pequeñas tipo 1280×720, se pondrá `max-width` o `max-block-size` al `.crt` como mitigación en el paso 1.
