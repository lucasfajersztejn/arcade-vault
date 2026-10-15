# SPEC — NIGHT DRIVER (variante A: Velocidad Variable)

**Estado:** Borrador
**Depende de:** SPEC 05 (`specs/05-juego-asteroids.md`) por el patrón de motor, canvas y `GamePlayer`; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores` y el leaderboard; SPEC 07 (`specs/07-juego-caida.md`) por el registro de motores `lib/games/registry.ts`
**Fecha:** 2026-10-15
**Objetivo:** Añadir el juego `night-driver` creado desde cero, en su variante de velocidad variable: el jugador controla aceleración y dirección mientras conduce de noche en un entorno pseudo-3D, con HUD, pausa, guardado de puntuación y leaderboard de la plataforma.

---

## Por qué existe esta spec

Night Driver (Atari, 1976) es un juego de conducción pseudo-3D nocturna: el jugador solo ve los postes reflectantes al borde de la carretera y los faros de los coches que vienen de frente. Es un ARCADE de un jugador con puntuación acumulativa —distancia recorrida a mayor velocidad— y con pocas teclas, cumpliendo el contrato motor ↔ plataforma.

Esta variante A mantiene el **control de velocidad** como mecánica central: ↑ acelera, ↓ frena. La velocidad afecta directamente a los puntos por segundo (`score += floor(speed × dt / 1000)`), creando una tensión riesgo/recompensa: ir más rápido suma más pero aumenta la dificultad de reacción. Los coches contrarios (de nivel 2 en adelante) obligan a soltar el acelerador o a esquivarlos con dirección precisa.

Esta spec es la variante «más fiel al espíritu original»; la spec 02 (`02-night-driver-reflex.md`) elimina la gestión de velocidad para un diseño de puro reflex.

---

## Alcance

### Dentro

- Escribir el motor desde cero en módulos TypeScript en `lib/games/night-driver/` (`types`, `constants`, `entities`, `engine`, `skins`), sin React, sin `document.getElementById` y sin globales: el motor recibe el `<canvas>` y callbacks.
- Mecánicas y constantes de esta variante (definidas en esta spec):
  - Canvas lógico fijo 800×600. Horizonte a `HORIZON_Y = 200` px. La carretera se proyecta en perspectiva: a profundidad `d` (0 = horizonte, `DEPTH = 200` unidades), el semiancho de la calzada va de `HALF_ROAD_NEAR = 20` px en el horizonte hasta `HALF_ROAD_FAR = 340` px en la base.
  - La posición lateral de la carretera es `centerX + curveOffset(d)`, donde `curveOffset` acumula la curvatura de la sección activa escalada por profundidad.
  - Generación de carretera por segmentos: array de `N_SEGS = 200` segmentos de `SEG_LEN = 10` unidades de profundidad. Cada segmento lleva `curve` ∈ `[-1.0, 1.0]` (0 = recto). Al avanzar, el primer segmento sale y se añade uno nuevo al fondo.
  - La carretera se dibuja de abajo hacia arriba (el segmento más cercano primero), calculando las coordenadas de pantalla de los cuatro vértices de cada franja con la proyección lineal `scale = d / DEPTH; screenY = HORIZON_Y + scale × (HEIGHT - HORIZON_Y)`.
  - Postes reflectantes: uno por lado cada `POLE_STEP = 20` segmentos, altura `clamp(2, 40, scale × 40)` px y anchura 4 × scale px.
  - Velocidad del jugador `speed` ∈ `[SPEED_MIN = 60, SPEED_MAX = 300]` (unidades/s). Arranca en `SPEED_START = 120`. Tecla ↑ → `speed += ACCEL × dt` (ACCEL = 100/s²); tecla ↓ → `speed -= BRAKE × dt` (BRAKE = 150/s²); sin tecla → `speed -= FRICTION × dt` (FRICTION = 20/s²).
  - El scroll de la carretera avanza `speed × dt` unidades por segundo.
  - Posición lateral del jugador `carX` ∈ `[-1.0, 1.0]` (0 = centro). Tecla ← → `carX -= STEER × dt` (STEER = 1.4/s); tecla → → `carX += STEER × dt`. Sin movimiento lateral al soltar, no hay inercia en X.
  - El coche del jugador se pinta a `screenX = WIDTH/2 + carX × HALF_ROAD_FAR × 0.7`, `screenY = 540`, como rectángulo de 40×24 px con color de la paleta.
  - Colisión con borde de carretera: si `|carX| > 1.0 + MARGIN (0.05)` → crash.
  - Coches contrarios: desde el nivel 2, un coche nuevo aparece cada `CAR_INTERVAL_BASE / nivel` segundos (CAR_INTERVAL_BASE = 4.0). Cada coche tiene `depth = 0` (horizonte), posición lateral `cx` ∈ `[-0.8, 0.8]` aleatoria, y avanza hacia el jugador a `ONCOMING_SPEED × (nivel × 0.3 + 1.0)` unidades/s. Máximo `MAX_CARS = 5` a la vez. Colisión si `|carX_jugador - cx_coche| < 0.25` y `depth > 150` (coche lo suficientemente cerca). Crash = pierde vida.
  - Puntuación: `score += floor(speed × dt / 1000)` (metros conducidos). Entero acumulativo, DESC.
  - Vidas: `LIVES_START = 3`. Crash resta 1 vida. `speed` baja a `SPEED_CRASH = 80` tras el choque. Game over al llegar a 0 vidas.
  - Nivel: `nivel = floor(score / LEVEL_SCORE) + 1` con `LEVEL_SCORE = 500`. El nivel máximo representado es 10 (sin tope de juego). Cada nivel añade 1 coche contrario más y hace las curvas más pronunciadas (`curveStrength = 0.4 + nivel × 0.06`, tope 1.0).
  - Semilla de sección: las secciones de carretera se generan en grupos de 40 segmentos (straight: 20-40 segs, curve: 20-40 segs con `curve = ±curveStrength`). El generador usa un `prng` interno (xorshift32 con seed basada en `score` y `nivel`) para reproducibilidad dentro de la sesión; no es persistente.
  - `dt` limitado a 50 ms. Al reanudar se reinicia `lastTime`.
- Skins: `lib/games/night-driver/skins.ts` con tipo `NightDriverPalette` y paleta por defecto `clasico`. El motor lee la paleta en cada `draw()`; ningún color literal fuera de `skins.ts`.
- Componente cliente `components/night-driver-canvas.tsx` con limpieza al desmontar (Strict Mode) y leyenda de controles.
- Entrada al registro `lib/games/registry.ts` sin `skins` ni `touchActions` (los añaden `skin-designer` y `mobile-porter`).
- Integración en `GamePlayer`: HUD real (Puntuación, Vidas, Nivel), PAUSA real y automática, FIN, modal «FIN DEL JUEGO» y guardado en `scores`.
- Fila en `games` con migración (`apply_migration`) y portada `cover-night-driver` en `app/globals.css`.
- Controles de teclado: ← → dirigir, ↑ acelerar, ↓ frenar, `P` y `Esc` pausar/reanudar. `preventDefault` solo con el motor activo y el foco fuera de un `input`/`textarea`. Aviso «requiere teclado» en `(pointer: coarse)`.
- `setInput` sostenido: escribe directamente en el mapa de teclas activas (`keys.left/right/accel/brake = pressed`); el frame de update lo lee en cada tick. El `pressed === false` siempre pasa para no dejar teclas atascadas.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** para la portada, el canvas (perspectiva, coche, coches contrarios, postes) y cualquier UI nueva. No se escribe ni modifica UI sin haberlos invocado.
- Revisión de la documentación local de Next 16.4 (`node_modules/next/dist/docs/`) antes de escribir código.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- Controles táctiles y gamepad MK-II (spec de `mobile-porter`).
- Skins de color (spec de `skin-designer`).
- Sonido y música.
- Soporte HiDPI.
- Modo multijugador y cooperativo.
- Coches precedentes (mismo sentido de marcha).
- Lluvia, niebla u otros efectos de tiempo.
- Dificultad configurable desde el menú.
- Curvas en S, puentes o bifurcaciones.
- Seed de puntuaciones ficticias salvo petición explícita del usuario.
- Tests automatizados.
- Cambios en `lib/db/*`, `/salon`, `Leaderboard`, `Library`, RLS o esquema.
- Los demás juegos del catálogo.
- Modificar `refereences/`.

---

## Modelo de datos

Juego nuevo: fila en `games` mediante `apply_migration` (migración `add_night_driver_game`).

```sql
-- Juego nuevo: NIGHT DRIVER
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'night-driver',
  'NIGHT DRIVER',
  'Conduce de noche. Más rápido, más puntos.',
  'Pisa el acelerador y esquiva los coches que vienen de frente en la oscuridad total. Solo los postes reflectantes marcan la carretera. Cada segundo a fondo suma metros; cada choque te cuesta una vida.',
  'ARCADE',
  'cover-night-driver',
  'yellow',
  6
);
```

> `sort_order = 6` es **provisional**: al implementar usar `select max(sort_order) + 1 from public.games`.

No se crean tablas ni columnas. Las puntuaciones usan `scores` y las vistas `leaderboard` y `game_stats` (SPEC 06).

Contrato del motor (con vidas y nivel, sin `onLines`):

```ts
// lib/games/night-driver/types.ts
export type NightDriverCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onPause?: (paused: boolean) => void;
};

export type NightDriverOptions = {
  palette?: NightDriverPalette;
};

export type NightDriverEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void;
  end: () => void;
  destroy: () => void;
  setPalette: (p: NightDriverPalette) => void;
  setInput: (action: string, pressed: boolean) => void;
};

// lib/games/night-driver/engine.ts
export function createNightDriver(
  canvas: HTMLCanvasElement,
  cb: NightDriverCallbacks,
  options?: NightDriverOptions,
): NightDriverEngine;
```

Paleta (`lib/games/night-driver/skins.ts`):

```ts
export type NightDriverPalette = {
  sky: string;       // fondo del cielo nocturno
  road: string;      // superficie de la calzada
  roadLine: string;  // línea central discontinua
  pole: string;      // postes reflectantes
  playerCar: string; // coche del jugador
  oncomingGlow: string; // halo de faros de coche contrario
};

export const CLASICO_PALETTE: NightDriverPalette = {
  sky: "#000000",
  road: "#1a1a1a",
  roadLine: "#cccc00",
  pole: "#ffffff",
  playerCar: "#00ff44",
  oncomingGlow: "#ffff00",
};
```

Constantes que esta spec define (no hay original que portar):

- `CANVAS_W = 800`, `CANVAS_H = 600`, `HORIZON_Y = 200`.
- `DEPTH = 200`, `HALF_ROAD_NEAR = 20`, `HALF_ROAD_FAR = 340`.
- `N_SEGS = 200`, `SEG_LEN = 10`, `POLE_STEP = 20`.
- `SPEED_MIN = 60`, `SPEED_MAX = 300`, `SPEED_START = 120`, `SPEED_CRASH = 80`.
- `ACCEL = 100`, `BRAKE = 150`, `FRICTION = 20` (unidades/s²).
- `STEER = 1.4` (unidades/s en X normalizado).
- `CAR_INTERVAL_BASE = 4.0` s, `MAX_CARS = 5`, `ONCOMING_SPEED = 80`.
- `LIVES_START = 3`, `LEVEL_SCORE = 500`.
- `MAX_SCORE = 99_999_999`, `MAX_DT = 50` ms.

---

## Archivos a crear / modificar

| Archivo | Acción |
| --- | --- |
| `lib/games/night-driver/types.ts` | crear: `NightDriverCallbacks`, `NightDriverOptions`, `NightDriverEngine` |
| `lib/games/night-driver/constants.ts` | crear: todas las constantes de esta spec |
| `lib/games/night-driver/entities.ts` | crear: tipos `RoadSegment`, `OncomingCar`; funciones puras: proyección, generación de segmentos, colisión borde, colisión coche, avance xorshift32 |
| `lib/games/night-driver/engine.ts` | crear: `createNightDriver` (estado, input sostenido, bucle dt≤50ms, callbacks, pausa automática, restart, end, destroy, dibujo) |
| `lib/games/night-driver/skins.ts` | crear: `NightDriverPalette`, `CLASICO_PALETTE` |
| `components/night-driver-canvas.tsx` | crear: canvas 800×600, leyenda de controles y aviso de teclado |
| `lib/games/registry.ts` | modificar: entrada `night-driver` (sin `skins`, sin `touchActions`) |
| `app/globals.css` | modificar: `cover-night-driver` (solo CSS), `.night-driver-canvas`, aviso de teclado |
| Migración Supabase (`apply_migration`) | crear: `add_night_driver_game` |
| `lib/games/asteroids/`, `lib/games/caida/`, etc. | **no se modifican** |
| `refereences/` | **no se modifica** |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre componentes cliente y `cacheComponents` con APIs de navegador (`canvas`, rAF, `window`) solo dentro de `useEffect`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** y volver a aplicarlos en los pasos 5 y 7 (canvas perspectiva, coche, postes, portada CSS).
3. **Tipos y constantes:** `lib/games/night-driver/{types,constants,skins}.ts`. Todas las constantes de esta spec, más `NightDriverPalette` y `CLASICO_PALETTE`. Verificar que `CANVAS_W × CANVAS_H` y `HORIZON_Y` son coherentes.
4. **Entidades:** `entities.ts` con las funciones puras:
   - `project(d, curveOff)` → `{screenX, screenY, scale}` (proyección lineal).
   - `generateSegment(prng, nivel)` → `RoadSegment` con su `curve`, longitud del tramo en curso y tipo (recto/curva).
   - `xorshift32(seed)` → `number` (prng determinista, solo enteros; devuelve el siguiente número).
   - `crashEdge(carX, margin)` → `boolean`.
   - `crashCar(carX, cx, depth)` → `boolean`.
   - Sin globales; el estado entra y sale por valor o por referencia explícita.
5. **Motor:** `engine.ts` con `createNightDriver`.
   - Input sostenido: `keys = {left, right, accel, brake}` actualizado por listeners en `window` (`←↑→↓` y `P`/`Esc`); `setInput` escribe en `keys`; `preventDefault` solo con motor activo y foco fuera de `input`/`textarea`.
   - Bucle rAF con `dt ≤ 50 ms`. En cada tick: acumula velocidad, avanza scroll, actualiza `carX`, genera nuevos segmentos al fondo, avanza coches contrarios, verifica colisiones, actualiza score/lives/nivel, dibuja.
   - Dibujo por capas: 1) cielo (fillRect del horizonte arriba), 2) franjas de carretera de abajo hacia arriba (`N_SEGS` franjas, proyectando cada par de segmentos adyacentes), 3) línea central discontinua sobre la calzada, 4) postes (escalados por `scale`), 5) coches contrarios (rectángulo escalado con halo amarillo arriba = faros), 6) coche del jugador (rectángulo fijo en la base).
   - `onPause` solo desde `P`/`Esc`, `blur` y `visibilitychange` (nunca desde `pause()`/`resume()` públicos).
   - Game over: `lives === 0` o llamada a `end()`. El bucle se detiene y se llama a `onGameOver(finalScore)`.
   - `restart()` resetea todo el estado a los valores iniciales (speed=120, carX=0, lives=3, score=0, nivel=1, nueva carretera) sin duplicar el bucle.
   - `destroy()` idempotente. Cancela el rAF pendiente y quita los listeners de teclado.
   - `setPalette(p)` asigna y redibuja de inmediato (también en pausa y en game over).
   - Si `canvas.getContext("2d")` devuelve `null`, devuelve un motor noop con las siete claves apuntando a `() => {}`.
   - Narrowing de `ctx`: `const ctx2d = canvas.getContext("2d"); if (!ctx2d) return noopEngine; const ctx: CanvasRenderingContext2D = ctx2d;`
6. **Componente canvas y estilos:** `night-driver-canvas.tsx` con el `<canvas>` de 800×600, leyenda de controles (← → dirigir, ↑ acelerar, ↓ frenar, P pausar) y aviso «requiere teclado». Crea el motor en `useEffect([], [])` con `callbacksRef` actualizado en un segundo `useEffect` para que el motor siempre llame a la última versión. `useImperativeHandle` expone `pause/resume/restart/end/setInput`. `ref` como prop (React 19). CSS `.night-driver-canvas` en `app/globals.css` con `width: 100%; height: 100%` (como asteroids) más el bloque móvil `object-fit: contain`.
7. **Registro y catálogo:** entrada `night-driver` en `lib/games/registry.ts` (sin `skins`, sin `touchActions`) + `cover-night-driver` en `app/globals.css` + migración `add_night_driver_game`. Verificar con `get_advisors`.
8. **Verificación:** recorrer los criterios de aceptación.

### Nombres de commit

| Paso | Commit propuesto |
| --- | --- |
| 3 | `feat: add night-driver types, constants and palette` |
| 4 | `feat: add night-driver road and collision entities` |
| 5 | `feat: add night-driver game engine` |
| 6 | `feat: add night-driver canvas component` |
| 7 | `feat: add night-driver to catalog and registry` |

Los pasos 1 y 2 no producen cambios; no llevan commit. Los nombres son propuestas y se ajustan si el contenido real cambia.

---

## Criterios de aceptación

### Build y calidad

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `get_advisors` (seguridad) no reporta avisos nuevos tras la migración.
- [ ] `grep -r "service_role" app components lib` no devuelve resultados.
- [ ] `grep -r "#[0-9a-fA-F]\{3,6\}" lib/games/night-driver/engine.ts` no devuelve resultados (todos los colores están en `skins.ts`).

### Catálogo

- [ ] `select id, cat, cover, color, sort_order from games where id = 'night-driver'` devuelve `ARCADE`, `cover-night-driver`, `yellow` y el sort_order asignado.
- [ ] `/games` muestra la tarjeta «NIGHT DRIVER» con su portada `cover-night-driver`; los demás juegos siguen en su orden.
- [ ] El filtro ARCADE incluye NIGHT DRIVER.
- [ ] `/games/night-driver` muestra el detalle y «JUGAR AHORA» lleva a `/games/night-driver/jugar`.

### Juego

- [ ] `/games/night-driver/jugar` muestra el canvas 800×600 dentro del marco CRT con la carretera en perspectiva, postes reflectantes y el coche del jugador en la base.
- [ ] Controles: ← y → modifican `carX` de forma continua mientras se mantienen pulsados; ↑ y ↓ aumentan y reducen la velocidad respectivamente; sin tecla, la velocidad baja por fricción.
- [ ] Velocidad acotada: `speed` no supera `SPEED_MAX = 300` ni baja de `SPEED_MIN = 60` incluso manteniendo ↑ o ↓ indefinidamente.
- [ ] Puntuación: `score` crece más rápido cuando `speed` es mayor; a velocidad 300 con dt=16ms suma `floor(300 × 16 / 1000) = 4` puntos por frame (≈ 240 por segundo).
- [ ] Nivel: el HUD de la plataforma sube a 2 cuando `score` alcanza 500, a 3 en 1000, etc.
- [ ] Vidas: el HUD muestra 3 al iniciar; cada crash resta 1 y el motor emite `onLives(vidas_restantes)`.
- [ ] Crash con borde: salirse del ancho de la carretera (`|carX| > 1.05`) provoca un crash: 1 vida menos, `speed` baja a `SPEED_CRASH = 80`.
- [ ] Coches contrarios ausentes en nivel 1; aparecen desde el nivel 2. Chocar contra uno provoca el mismo crash (1 vida menos, speed baja).
- [ ] La carretera se curva de forma suave, sin teleportaciones ni saltos bruscos. Las curvas se vuelven más pronunciadas al subir de nivel.
- [ ] PAUSA (botón, `P` o `Esc`) congela el juego; REANUDAR continúa sin saltos; ocultar la pestaña o perder el foco pausa automáticamente.
- [ ] Pulsar FIN o agotar las 3 vidas abre «FIN DEL JUEGO» con la puntuación final; el canvas no muestra su propio overlay ni reinicia con tecla.
- [ ] «JUGAR DE NUEVO» reinicia sin duplicar el bucle (la velocidad inicial es siempre 120, el carX=0, vidas=3, score=0).
- [ ] Escribir un nombre en el input del modal (incluidas flechas y Espacio) no mueve el coche ni hace scroll.
- [ ] Salir con SALIR o navegar a otra ruta no deja listeners ni bucles activos: flechas y Espacio vuelven a hacer scroll.
- [ ] A ≤ 768 px el canvas se escala sin scroll horizontal; en `(pointer: coarse)` aparece el aviso «requiere teclado».
- [ ] La puntuación enviada es un entero entre 0 y 99 999 999.

### Leaderboard

- [ ] «GUARDAR PUNTUACIÓN» crea una fila en `scores` con `game_id = 'night-driver'`, el nombre escrito (o `INVITADO`) y la puntuación final.
- [ ] La puntuación aparece en el ranking de `/games/night-driver` al recargar.
- [ ] Hay una pestaña «NIGHT DRIVER» en `/salon` con podio y tabla coherentes con la vista `leaderboard`.
- [ ] Con sesión iniciada, «TU MEJOR MARCA EN NIGHT DRIVER» muestra la marca y el rango reales.
- [ ] Sin puntuaciones, el ranking muestra «Sé el primero en puntuar».
- [ ] `plays` y «Mejor global» de `/games/night-driver` coinciden con `count(*)` y `max(score)` de `scores`.

### Sin regresiones

- [ ] `/games/asteroids/jugar`, `/games/caida/jugar`, `/games/bloque-buster/jugar`, `/games/snake/jugar` y `/games/frogger/jugar` funcionan como antes.
- [ ] `git diff` no toca `lib/games/asteroids/`, `lib/games/caida/`, `lib/games/bloque-buster/`, `lib/games/snake/`, `lib/games/frogger/` ni sus componentes canvas.
- [ ] `git status` no muestra cambios en `refereences/`.
- [ ] `lib/db/`, `app/salon/` y `components/leaderboard.tsx` no cambian.
- [ ] La sesión `av_user` sigue funcionando.

### Proceso

- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para la portada, el canvas en perspectiva y la leyenda, y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [ ] Capturas de Playwright en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/` (escritorio y ≤ 768 px).
- [ ] Tras cada paso con cambios se propuso al usuario un nombre de commit y no se hizo commit sin su confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint` y `npm run build`.
2. `npm run dev`, jugar hasta perder las 3 vidas (alcanzando al menos el nivel 2 para ver coches contrarios) y guardar con nombre y sin nombre.
3. Recorrer con Playwright `/games`, `/games/night-driver`, `/games/night-driver/jugar` y `/salon`, en escritorio y ≤ 768 px, y los cinco juegos existentes para las regresiones.
4. `execute_sql`: comprobar la fila en `scores` y las vistas `leaderboard` y `game_stats`.
5. `get_advisors` de seguridad.

---

## Decisiones tomadas y descartadas

- **Origen: desde cero.** No hay carpeta en `refereences/started-games/` para Night Driver. _Descartado:_ portar un juego externo de GitHub (dependencia ajena al repo y sin garantías de licencia).
- **Catálogo: juego nuevo `night-driver`** (ARCADE, yellow, `sort_order` provisional 6). ARCADE es la única categoría válida para un arcade de conducción. `yellow` rellena el último color libre de ARCADE (cyan y green ya tienen dos juegos cada uno). _Descartado:_ SHOOTER (no hay disparos), VERSUS (sin rival humano).
- **Puntuación acumulativa por distancia recorrida** (`score += floor(speed × dt / 1000)`). Esto convierte la velocidad en riesgo/recompensa y garantiza «más es mejor», cumpliendo el contrato del leaderboard. _Descartado:_ cronómetro de vuelta (resultado de tiempo = «menos es mejor», fuera del contrato); puntos por hito (menor continuidad).
- **Control de velocidad (↑↓) como mecánica central de esta variante.** Define la identidad de la variante A frente a la B, que tiene velocidad automática. _Descartado:_ velocidad solo automática (convierte esta spec en un clon de la variante B).
- **3 vidas** (`LIVES_START = 3`). Coherente con asteroids, bloque-buster y frogger; encaja en el HUD estándar. _Descartado:_ vidas infinitas (no hay tensión ni game over natural); 5 vidas (la partida se alarga demasiado).
- **Coches contrarios desde el nivel 2, no desde el 1.** El nivel 1 introduce al jugador a la mecánica de steering y aceleración sin el estrés extra de los coches. _Descartado:_ coches desde el nivel 1 (curva de aprendizaje demasiado abrupta para un arcade casual).
- **Proyección lineal, no proyección perspectiva real (raycasting).** La proyección lineal `scale = d/DEPTH` es suficiente para la ilusión visual y mucho más sencilla de implementar. _Descartado:_ raycasting estilo Wolfenstein (rendimiento y complejidad fuera del alcance de una spec); sprite scaling logarítmico (mayor fidelidad visual pero sin diferencia perceptible a esta escala).
- **Generador de carretera por segmentos con xorshift32.** Produce tramos de carretera procedurales pero deterministas dentro de la sesión; el jugador no memoriza el trazado entre partidas. _Descartado:_ pista fija hardcodeada (aburrida tras pocas partidas); generación pura aleatoria sin prng (no reproducible entre ciclos de test).
- **HUD de la plataforma, no del canvas.** Puntuación, vidas y nivel los pinta `GamePlayer`. _Descartado:_ HUD dibujado en el canvas (duplica la plataforma).
- **Fin de partida por el modal de la plataforma.** _Descartado:_ overlay propio de game over y reinicio con tecla.
- **Pausa: botón, teclas P/Esc y pausa automática.** _Descartado:_ solo botón.
- **`setInput` sostenido** (escribe en `keys`; `false` siempre pasa). Este juego requiere teclas mantenidas para acelerar, frenar y girar. _Descartado:_ por flanco (encolaría una pulsación discreta, inservible para steering continuo).
- **Canvas 800×600** (misma dimensión que asteroids y bloque-buster), llenando la pantalla CRT. _Descartado:_ canvas cuadrado como snake (el trazado de la carretera es más natural en formato apaisado).
- **Solo teclado.** _Descartado:_ controles táctiles (spec de `mobile-porter`).
- **Sin sonido.** La plataforma no tiene control de silencio. _Descartado:_ motor de audio ahora.
- **Sin seed de puntuaciones ficticias.** Salvo petición explícita del usuario. _Descartado:_ incluir 10 filas por defecto (no es el flujo estándar del catálogo).
- **Sin tests automatizados.** Coherente con las specs previas. _Descartado:_ un runner de tests ahora.

---

## Riesgos identificados

| Riesgo | Mitigación |
| --- | --- |
| Doble montaje de React Strict Mode duplica bucle y listeners | `destroy()` idempotente devuelto siempre por el `useEffect`; criterio de reinicio |
| `preventDefault` rompe el input del modal o el scroll | Capturar solo con motor activo y foco fuera de `input`/`textarea`; `destroy()` quita los listeners |
| `dt` enorme al volver de pestaña oculta | Pausa automática + `dt ≤ 50 ms`; `lastTime` se reinicia al reanudar |
| Regresión en los cinco juegos existentes al tocar `registry.ts` | Solo se añade una entrada; los demás motores no cambian; criterios de regresión y `git diff` limpio |
| Puntuación fuera del rango de la BD (0–99 999 999) | `MAX_SCORE = 99_999_999`; el motor acota antes de `onScore`/`onGameOver` |
| La ilusión pseudo-3D se rompe en los extremos de la curva | Clampar `curveOff` para que el centro de la carretera no salga del viewport; criterio visual con captura |
| Coche contrario generado dentro del coche del jugador al aparecer (falsa colisión) | Los coches aparecen con `depth = 0` (horizonte, invisibles al jugador); la colisión solo se evalúa para `depth > 150` |
| Velocidad baja a cero por FRICTION+BRAKE si se mantiene ↓ mucho tiempo | `speed = clamp(SPEED_MIN, SPEED_MAX, speed + delta)` en cada tick |
| El color `yellow` puede no estar en el CHECK de la BD si el proyecto usa valores distintos | Verificar `color ∈ cyan|magenta|yellow|green` con `list_tables` antes de ejecutar la migración |

---

## Lo que **no** entra en esta spec

- Controles táctiles.
- Skins de color.
- Sonido y música.
- Coches precedentes (mismo sentido de marcha).
- Efectos de tiempo (lluvia, niebla).
- Curvas en S, bifurcaciones o puentes.
- Los demás juegos del catálogo.
- Cambios de esquema, RLS o capa `lib/db`.
- Autenticación real, anti-trampas y Realtime.
- Tests automatizados.
- Seed de puntuaciones ficticias (salvo petición).

Cada uno, si llega, va en su propia spec.
