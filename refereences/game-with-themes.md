# Juegos con skins de color

Registro que mantiene el agente `skin-designer`. Cada vez que implementa las 3 skins de
color (`clasico` por defecto, `neon`, `retro`) sobre un juego, añade o actualiza aquí su
entrada. Sirve de **referencia** para futuras implementaciones: qué slots tiene la paleta
de cada juego, qué ficheros se tocaron y qué decisiones se tomaron.

Base común: `lib/games/skins.ts` (`SkinId`, `SKIN_IDS`, `SKIN_LABELS`, `DEFAULT_SKIN`,
`readSkin`/`writeSkin` sobre `localStorage["av_skin_<gameId>"]`). El selector vive en
`components/game-player.tsx` y solo aparece si `engine.skins.length > 1`. Alcance: **solo
color** — nunca formas, física ni puntuación; `clasico` reproduce el aspecto original
idéntico.

---

## caida (Tetris) — 2026-10-14

Primer juego con skins del repo: esta implementación creó además la base común compartida.

### Ficheros

**Creados**

- `lib/games/skins.ts` — base común: `SkinId = "clasico" | "neon" | "retro"`, `SKIN_IDS`,
  `SKIN_LABELS` (Clásico/Neón/Retro), `DEFAULT_SKIN = "clasico"`, `readSkin`/`writeSkin`
  sobre `localStorage["av_skin_<gameId>"]` con try/catch y validación contra `SKIN_IDS`.
- `lib/games/caida/skins.ts` — tipo `CaidaPalette` y `SKINS: Record<SkinId, CaidaPalette>`.

**Modificados**

- `lib/games/caida/constants.ts` — eliminados `COLORS` y `GRID_LINE` (movidos a la paleta);
  `GHOST_ALPHA` se queda (es opacidad, no color).
- `lib/games/caida/entities.ts` — `drawBlock/drawGrid/drawBoard/drawPiece/drawGhost/drawNext`
  reciben `palette` y leen de ella (`pieceColors`, `grid`, `gloss`, `bg`). Sin cambios de
  forma, tamaño ni bucle.
- `lib/games/caida/types.ts` — `CaidaOptions.palette?` y `CaidaEngine.setPalette(palette)`.
- `lib/games/caida/engine.ts` — estado `palette`; `draw()` pinta `palette.bg` (fillRect tras
  el clearRect; en `clasico` es `#1a1a25`, el mismo `--caida-canvas` del CSS que antes se veía
  a través del canvas transparente → idéntico); `setPalette` cambia en vivo y repinta tablero
  + vista previa sin tocar el estado.
- `components/caida-canvas.tsx` — prop `skin?` (default `DEFAULT_SKIN`), paleta inicial al crear
  el motor vía `skinRef`, y `useEffect([skin])` que llama `setPalette(SKINS[skin])` sin recrear
  el motor.
- `lib/games/registry.ts` — `EngineCanvasProps.skin?` y `EngineEntry.skins?` (aditivos/opcionales);
  `caida` marcado con `skins: SKIN_IDS`.
- `components/game-player.tsx` — lectura de skin con `useSyncExternalStore` (snapshot servidor =
  `DEFAULT_SKIN` para evitar mismatch de hidratación; patrón de `session.tsx` porque el ESLint
  del proyecto prohíbe `setState` dentro de `useEffect`); `<select class="btn hud-skin">` en
  `.hud-actions` visible solo si `engine.skins.length > 1`; `changeSkin` persiste con `writeSkin`
  y notifica. No reinicia la partida.
- `app/globals.css` — reglas `.hud-skin` (cursor y `option` legible sobre fondo oscuro),
  reutilizando el estilo `.btn`.

### Paleta — `CaidaPalette`

| slot       | clasico                    | neon                       | retro                      |
| ---------- | -------------------------- | -------------------------- | -------------------------- |
| bg         | `#1a1a25`                  | `#0a0a14`                  | `#0d0b08`                  |
| grid       | `#22222e`                  | `#15263a`                  | `#1f1a12`                  |
| gloss      | `rgba(255,255,255,0.12)`   | `rgba(255,255,255,0.22)`   | `rgba(255,240,200,0.10)`   |
| pieza I    | `#4dd0e1`                  | `#00f5ff`                  | `#6fb98f`                  |
| pieza O    | `#ffd54f`                  | `#f5ff00`                  | `#d9c27a`                  |
| pieza T    | `#ba68c8`                  | `#ff006e`                  | `#c08457`                  |
| pieza S    | `#81c784`                  | `#00ff88`                  | `#8a9a5b`                  |
| pieza Z    | `#e57373`                  | `#ff1744`                  | `#b5533a`                  |
| pieza J    | `#90caf9`                  | `#2979ff`                  | `#5f8a8b`                  |
| pieza L    | `#ffb74d`                  | `#ff9100`                  | `#cf9b5c`                  |

`pieza I..L` es el array `pieceColors` (índices 1–7: I, O, T, S, Z, J, L; el índice 0 es celda
vacía). `neon` usa los tokens de plataforma (`--cyan/--yellow/--magenta/--green`) más rojo/azul/
naranja neón; `retro` es fósforo cálido y apagado sobre casi-negro.

### Verificación

- **`clasico` idéntico al original:** los hex de pieza, la rejilla `#22222e` y el gloss
  `rgba(255,255,255,0.12)` son los literales originales exactos; `bg = #1a1a25` coincide con el
  `--caida-canvas` que ya se veía por transparencia, así que pintarlo no altera nada visible.
- **Cambio en vivo:** `setPalette` repinta tablero y vista previa al instante (también en pausa /
  game over) sin reiniciar; puntuación y estado intactos.
- **Solo color:** ninguna forma, tamaño, física ni regla cambió. Grep final confirma que todo
  literal de color del juego vive solo en `lib/games/caida/skins.ts`.
- **lint:** ✅ · **build:** ✅ (Next 16.4, TypeScript OK).
- Verificación manual: en `/games/caida/jugar` el selector muestra Clásico/Neón/Retro; al elegir
  uno el tablero y la vista previa cambian de color sin perder la partida; recargando persiste la
  preferencia (`av_skin_caida` en localStorage).

### Decisiones / suposiciones

- Se añadió `bg` como slot aunque el original no pintaba fondo en canvas (lo heredaba del CSS):
  permite que `neon`/`retro` oscurezcan el tablero; en `clasico` el valor replica el CSS, sin
  cambio visible.
- Lectura de skin vía `useSyncExternalStore` en vez de `useEffect`+`setState` por la regla ESLint
  del proyecto (mismo patrón que `lib/session.tsx`).

---

## snake (Snake) — 2026-10-14

Segunda implementación: reutiliza la base común (`lib/games/skins.ts`) y el selector del HUD
ya integrados con Caída. Solo añade la paleta de Snake, el refactor del render y el cableado
`setPalette` + prop `skin` en el canvas.

### Ficheros

**Creados**

- `lib/games/snake/skins.ts` — tipo `SnakePalette` y `SKINS: Record<SkinId, SnakePalette>`.

**Modificados**

- `lib/games/snake/types.ts` — `SnakeOptions.palette?` y `SnakeEngine.setPalette(palette)` junto
  a `pause/resume/restart/end/destroy`.
- `lib/games/snake/engine.ts` — `createSnake` acepta `options?: SnakeOptions`; estado
  `let palette = options?.palette ?? SKINS.clasico`; `drawBoard`, `drawFruitTile` y `drawSnake`
  leen del `palette` (tiles, borde, baldosa de fruta, degradado de la serpiente y ojos);
  `setPalette(p)` reasigna y llama `draw()` para repintar aun en pausa o game over. El bucle,
  `step`, `update`, `initGame`, la carga de frutas y el `destroy` no se tocan.
- `components/snake-canvas.tsx` — prop `skin?: SkinId` (default `DEFAULT_SKIN`); `skinRef`
  sincronizada; `useEffect([skin])` que llama `engineRef.current?.setPalette(SKINS[skin])`;
  paleta inicial pasada como tercer argumento a `createSnake(...)`. Patrón idéntico al de
  `caida-canvas.tsx`.
- `lib/games/registry.ts` — entrada `snake` marcada con `skins: SKIN_IDS` (una línea).

**No tocados** (fuera de scope): `lib/games/skins.ts`, `components/game-player.tsx`,
`app/globals.css`, `lib/games/snake/constants.ts`, `lib/games/snake/entities.ts`,
`lib/games/snake/sprites.ts`, base de datos y el PNG `public/games/snake/fruits.png`.

### Paleta — `SnakePalette`

| slot            | clasico                       | neon                           | retro                        |
| --------------- | ----------------------------- | ------------------------------ | ---------------------------- |
| `tileDark`      | `#05070d`                     | `#05080f`                      | `#0d0b08`                    |
| `tileLight`     | `#080c16`                     | `#0a1120`                      | `#141009`                    |
| `border`        | `rgba(0, 255, 136, 0.8)`      | `rgba(0, 245, 255, 0.9)`       | `rgba(255, 176, 0, 0.75)`    |
| `fruitTile`     | `#12172a`                     | `#140726`                      | `#1a1308`                    |
| `fruitTileEdge` | `rgba(255, 255, 255, 0.18)`   | `rgba(255, 0, 110, 0.35)`      | `rgba(255, 220, 160, 0.18)`  |
| `snakeHue`      | `150`                         | `187`                          | `120`                        |
| `snakeSat`      | `100`                         | `100`                          | `55`                         |
| `eye`           | `#05070d`                     | `#05070d`                      | `#0d0b08`                    |

El degradado de la serpiente sigue siendo `hsl(hue sat% L%)` con `L` derivada de la posición
en la cola (no se parametriza; es una curva que no es color). En `clasico` el string resultante
es exactamente `hsl(150 100% L%)`, idéntico al original.

### Verificación

- **`clasico` idéntico al original:** los 7 slots copian los literales previos del render;
  `snakeHue=150` + `snakeSat=100` reproducen el `hsl(150 100% L%)` original con la misma
  lightness por segmento. Ni formas, ni tamaños, ni la carga del sprite de frutas cambian.
- **Cambio en vivo:** `setPalette` repinta tablero + serpiente + fruta al instante gracias al
  `draw()` final; también funciona en pausa y tras game over. No toca `segments`, `dir`,
  `queue`, `score`, `fruit`, `level` ni el bucle, así que la partida continúa igual.
- **Persistencia:** `localStorage["av_skin_snake"]` vía `writeSkin` (base común). El selector
  aparece automáticamente al tener `engine.skins.length > 1`.
- **Solo color:** grep de `#`/`rgb`/`hsl` dentro de `lib/games/snake/` confirma que todos los
  literales viven en `skins.ts`; en `engine.ts` solo queda el template `` `hsl(${palette.snakeHue} ${palette.snakeSat}% ${lightness}%)` ``.
- **lint:** OK (`npm run lint` exit 0).
- **build:** la parte de Snake compila limpia; los errores restantes de `npm run build`
  pertenecen a `lib/games/bloque-buster/` (Arkanoid), que otro agente está procesando en
  paralelo y queda fuera del scope de esta tarea.

### Decisiones / suposiciones

- Se parametriza el degradado de la serpiente como `snakeHue` + `snakeSat` en lugar de un
  array de colores por segmento: la `lightness` por segmento es una curva derivada de la cola,
  no un slot de color. Así `clasico` reproduce `hsl(150 100% L%)` exacto.
- En `neon` la serpiente va cian (`hue=187`) para alinearse con `--cyan`; el borde también
  pasa de verde (`rgba(0,255,136,0.8)`) a cian.
- En `retro` el borde es ámbar CRT (`rgba(255,176,0,0.75)`) y la serpiente fósforo verde
  apagado (`hue=120`, `sat=55`).
- `eye` se expone como slot propio aunque en `clasico`/`neon` coincida con `tileDark`
  (`#05070d`): en `retro` baja a `#0d0b08` para mantener contraste cuando la cabeza es verde
  apagado.
- `components/snake-canvas.tsx` se reescribió completo (versión antigua muy corta) siguiendo
  el patrón exacto de `caida-canvas.tsx` para `skinRef` + `useEffect([skin])`.

---

## bloque-buster (Arkanoid) — 2026-10-14

Tercera implementación. A diferencia de Caída y Snake, Arkanoid **no pinta con `fillStyle` +
hex**: renderiza desde un spritesheet PNG (`/games/bloque-buster/spritesheet-breakout.png`,
ver `lib/games/bloque-buster/sprites.ts`): pala, bola, 7 colores de bloque y 4 frames de
explosión por color. El único literal de color real del motor era `ctx.fillStyle = "#000"`
en `engine.ts` (fondo del canvas). Por eso la paleta se expresa como "tintes" opcionales
por sprite y la skin se aplica con **composición offscreen cacheada** por `(rect, color)`.

### Ficheros

**Creados**

- `lib/games/bloque-buster/skins.ts` — tipo `BloqueBusterPalette` (`bg`, `blockTints`,
  `explosionTints`, `paddleTint`, `ballTint`) y `SKINS: Record<SkinId, BloqueBusterPalette>`.
  En `clasico` **todos los tintes son `null`** y `bg = "#000"` → el motor usa `drawSprite`
  original = aspecto idéntico al PNG pixel a pixel.
- `lib/games/bloque-buster/tint.ts` — helper offscreen cacheado. `getTintedSprite(sheet,
  rect, tint)` crea perezosamente un `canvas` del tamaño nativo del recorte, pinta el sprite
  original, aplica `globalCompositeOperation = "multiply"` + `fillRect` (cambia el color
  conservando luces/sombras del PNG) y recorta al alfa con `destination-in` (no se tiñen
  píxeles transparentes). Cache en `Map<"sx,sy,sw,sh|tint", HTMLCanvasElement>`.
  `clearTintCache()` lo invoca `setPalette` al cambiar de skin. Si `tint === null`, devuelve
  `null` y el llamador cae a `drawSprite` original (ruta rápida de `clasico`).

**Modificados**

- `lib/games/bloque-buster/entities.ts` — `drawBlocks`/`drawExplosions`/`drawPaddle`/
  `drawBall` reciben `palette`. Nuevo helper interno `drawTintedSprite`: si hay tinte usa la
  cache; si no, `drawSprite(ctx, sheet, …)` idéntico al original. Física/geometría/estado
  intactos (nada en `createPaddle/createBall/createBlocks/resetBall/bounce*/collideAABB/
  advanceExplosions/findHitBlock/isBallLost`).
- `lib/games/bloque-buster/types.ts` — `BloqueBusterOptions.palette?` y
  `BloqueBusterEngine.setPalette(palette)`.
- `lib/games/bloque-buster/engine.ts` — tercer parámetro `options: BloqueBusterOptions = {}`
  (compatible hacia atrás). Estado `palette` inicializado con `options.palette ?? SKINS[
  DEFAULT_SKIN]`. `draw()` lee `ctx.fillStyle = palette.bg` (antes `"#000"` literal) y pasa
  `palette` a los cuatro `draw*`. `setPalette(p)`: reasigna la paleta, `clearTintCache()` y
  llama a `draw()` para repintar en vivo (también en pausa o game over, usando el `sheet` ya
  cargado). No toca `score/lives/level/state/paused/rafId/blocks/ball/paddle/explosions`.
- `components/bloque-buster-canvas.tsx` — prop `skin?: SkinId` (default `DEFAULT_SKIN`). La
  skin inicial se guarda en `skinRef` y se pasa a `createBloqueBuster` solo al crear el
  motor (mismo patrón que `callbacksRef`); un `useEffect([skin])` llama
  `engineRef.current?.setPalette(SKINS[skin])` sin recrear el motor ni la partida.
- `lib/games/registry.ts` — entrada `"bloque-buster"` marcada con `skins: SKIN_IDS`.

### Paleta — `BloqueBusterPalette`

| slot                    | clasico | neon        | retro     |
| ----------------------- | ------- | ----------- | --------- |
| bg                      | `#000`  | `#05070f`   | `#0d0b08` |
| blockTints.gray         | `null`  | `#9aa6c7`   | `#8a7f6a` |
| blockTints.red          | `null`  | `#ff1744`   | `#b5533a` |
| blockTints.yellow       | `null`  | `#f5ff00`   | `#d9c27a` |
| blockTints.cyan         | `null`  | `#00f5ff`   | `#6fb98f` |
| blockTints.magenta      | `null`  | `#ff006e`   | `#c08457` |
| blockTints.hotpink      | `null`  | `#ff4bd8`   | `#c9956d` |
| blockTints.green        | `null`  | `#00ff88`   | `#8a9a5b` |
| explosionTints.gray     | `null`  | `#9aa6c7`   | `#8a7f6a` |
| explosionTints.red      | `null`  | `#ff1744`   | `#b5533a` |
| explosionTints.yellow   | `null`  | `#f5ff00`   | `#d9c27a` |
| explosionTints.cyan     | `null`  | `#00f5ff`   | `#6fb98f` |
| explosionTints.magenta  | `null`  | `#ff006e`   | `#c08457` |
| explosionTints.hotpink  | `null`  | `#ff4bd8`   | `#c9956d` |
| explosionTints.green    | `null`  | `#00ff88`   | `#8a9a5b` |
| paddleTint              | `null`  | `#00f5ff`   | `#d9c27a` |
| ballTint                | `null`  | `#f5ff00`   | `#ffd9a0` |

`neon` reutiliza los tokens de plataforma `--cyan/--magenta/--yellow/--green` (coherente con
Caída y Snake) más rojo/rosa/gris saturados para los que faltan. `retro` es fósforo cálido
y apagado, baja saturación, sobre casi-negro.

### Verificación

- **`clasico` idéntico al original:** con todos los tintes `null`, `drawTintedSprite` cae
  siempre al `drawSprite` original (misma línea de código que antes del cambio); `bg = "#000"`
  = valor literal previo del `fillStyle` que había en `engine.ts`. Resultado: ruta rápida sin
  cache = identidad pixel a pixel.
- **Cambio en vivo:** elegir `neon` o `retro` llama a `setPalette` → `clearTintCache()` →
  `draw()` inmediato. Bola, pala, bloques vivos, explosiones en curso y fondo cambian de
  color sin reiniciar la partida; puntuación, vidas, nivel y posiciones intactas. Funciona
  también en pausa y en game over porque `setPalette` llama a `draw()` directamente.
- **Solo color:** cambios únicamente en `fillStyle`, `fillRect` del fondo y el origen del
  `drawImage` (sheet original vs. cache teñida). Nada de física, formas, tamaños, reglas,
  puntuación ni marco CRT.
- **Grep final:** todo literal de color del juego vive solo en
  `lib/games/bloque-buster/skins.ts` (confirmado por `grep '#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|
  hsl\(|hsla\('` sobre `lib/games/bloque-buster/`).
- **lint:** ✅ · **build:** ✅ (Next 16.4, TypeScript OK).
- Preferencia persistente en `localStorage["av_skin_bloque-buster"]` vía el `writeSkin` del
  selector genérico de `game-player.tsx`.

### Decisiones / suposiciones

- Los valores de tinte de `neon` y `retro` son una elección editorial coherente con Caída y
  Snake y con los tokens `--cyan/--magenta/--yellow/--green` de la plataforma; no derivan del
  PNG original (sería imposible: los colores del PNG no son parámetro, son píxeles).
- El tinte vía `multiply` + recorte alfa preserva las luces y sombras del sprite original
  (los bloques tienen un borde brillante y una sombra inferior en el PNG); un simple
  `source-atop` + `fillRect` habría aplastado el sprite a un color plano, perdiendo el
  volumen. `multiply` sobre un sprite con blancos y negros deja los blancos como el color del
  tinte y los negros negros, que es exactamente el look deseado.
- La cache de tinte es idempotente y se invalida con `clearTintCache()` al cambiar de skin:
  evita recomputar en cada frame y evita acumular canvases de skins antiguas en memoria.
- El tinte de `explosionTints` por color se duplica con `blockTints`: aunque los frames de
  explosión viven en una fila distinta del PNG, su color base es el mismo que el del bloque
  del que proceden, así que el tinte lógico también coincide. Si en un futuro se quisiera
  separar (p. ej. explosiones blancas universales), el slot ya está desacoplado.

---

## asteroids (Asteroids) — 2026-10-14

Cuarta implementación. Asteroids renderiza en modo vectorial puro con `fillStyle`/`strokeStyle`
y hex/rgba (sin spritesheet), así que el patrón es el de Caída y Snake: slots de la paleta que
reemplazan los literales originales en todos los `draw*`. No se necesitan tintes offscreen ni
cache, ni se toca `tint.ts` (patrón de Arkanoid).

### Ficheros

**Creados**

- `lib/games/asteroids/skins.ts` — tipo `AsteroidsPalette` (`bg`, `bullet`, `asteroid`, `ship`,
  `thrust`, `particleRgb`, `powerUp`, `hudTriple`) y `SKINS: Record<SkinId, AsteroidsPalette>`.
  En `clasico` todos los slots son los literales originales exactos.

**Modificados**

- `lib/games/asteroids/entities.ts` — `Bullet.draw`, `Asteroid.draw`, `PowerUp.draw`,
  `Ship.draw` y `Particle.draw` reciben `palette: AsteroidsPalette` y leen de ella (balas,
  trazo del polígono, trazo del casco, llama del propulsor, trazo del cuadrado + texto `3x`
  del power-up y la línea de estela de partícula). Formas, tamaños, grosores de línea,
  parpadeos y física sin cambios.
- `lib/games/asteroids/types.ts` — nuevos `AsteroidsOptions.palette?` y
  `AsteroidsEngine.setPalette(palette)` junto a `pause/resume/restart/end/destroy`.
- `lib/games/asteroids/engine.ts` — `createAsteroids(canvas, callbacks, options = {})`
  (tercer parámetro opcional, compat hacia atrás). Estado `let palette = options.palette ??
  SKINS.clasico`. `draw()` pinta `ctx.fillStyle = palette.bg` (antes `"#000"`) y pasa
  `palette` a cada `draw*`. El HUD interno `3x Ns` usa `palette.hudTriple` (antes `"#0ff"`).
  Nuevo `setPalette(p)` reasigna la paleta y llama `draw()` para repintar en vivo (también en
  pausa / game over porque `end()` y `pause()` no detienen el `draw()` directamente llamado).
  No toca `score/lives/level/state/paused/rafId/ship/bullets/asteroids/particles/powerUps` ni
  los listeners.
- `components/asteroids-canvas.tsx` — prop `skin?: SkinId` (default `DEFAULT_SKIN`); `skinRef`
  sincronizada; `useEffect([skin])` llama `engineRef.current?.setPalette(SKINS[skin])` sin
  recrear el motor; paleta inicial se pasa como `{ palette: SKINS[skinRef.current] }` a
  `createAsteroids`. Patrón idéntico al de `caida-canvas.tsx` / `snake-canvas.tsx`.
- `lib/games/registry.ts` — entrada `asteroids` marcada con `skins: SKIN_IDS` (una línea).

**No tocados** (fuera de scope): `lib/games/skins.ts`, `components/game-player.tsx`,
`app/globals.css`, `lib/games/asteroids/constants.ts`, `lib/games/asteroids/utils.ts`,
`AsteroidsControls`, base de datos.

### Paleta — `AsteroidsPalette`

| slot          | clasico                  | neon                   | retro                     |
| ------------- | ------------------------ | ---------------------- | ------------------------- |
| `bg`          | `#000`                   | `#05070f`              | `#0d0b08`                 |
| `bullet`      | `#fff`                   | `#f5ff00`              | `#ffd9a0`                 |
| `asteroid`    | `#fff`                   | `#00f5ff`              | `#d9c27a`                 |
| `ship`        | `#fff`                   | `#00f5ff`              | `#d9c27a`                 |
| `thrust`      | `rgba(255, 130, 0, 0.85)`| `rgba(255, 0, 110, 0.9)`| `rgba(255, 120, 40, 0.8)`|
| `particleRgb` | `255,255,255`            | `255,0,110`            | `255,200,140`             |
| `powerUp`     | `#0ff`                   | `#ff006e`              | `#6fb98f`                 |
| `hudTriple`   | `#0ff`                   | `#ff006e`              | `#6fb98f`                 |

`particleRgb` es la tripleta `r,g,b` que se interpola en el `rgba(${particleRgb}, ${alpha})`
de `Particle.draw` (el alpha es dinámico — depende de la vida restante, no es color sino
intensidad). `neon` reutiliza los tokens de plataforma `--cyan/--magenta/--yellow`. `retro`
es fósforo cálido / apagado sobre casi negro.

### Verificación

- **`clasico` idéntico al original:** los 8 slots copian uno a uno los literales que había en
  `engine.ts` (`"#000"`, `"#0ff"`) y `entities.ts` (`"#fff"`, `"rgba(255, 130, 0, 0.85)"`,
  `"rgba(255,255,255,${alpha})"` → ahora con `particleRgb = "255,255,255"`). Formas, tamaños,
  grosores de línea, parpadeos de invencibilidad / power-up expirando y la física siguen
  idénticas.
- **Cambio en vivo:** `setPalette` reasigna la paleta y llama `draw()` inmediato. Nave, balas,
  asteroides vivos, partículas en curso, power-up flotante, texto HUD `3x Ns` y fondo
  cambian de color sin reiniciar la partida. Funciona también en pausa (donde el bucle está
  parado) y en game over porque `draw()` dentro de `setPalette` se llama al margen del
  `requestAnimationFrame`. `score/lives/level/state` intactos.
- **Solo color:** grep de `#`/`rgb`/`hsl` en `lib/games/asteroids/` confirma que todo literal
  de color vive solo en `skins.ts`; el único uso restante fuera es la plantilla
  `` `rgba(${palette.particleRgb},${alpha.toFixed(2)})` `` en `Particle.draw`, que es la
  interpolación paramétrica esperada.
- **lint:** OK (`npm run lint` exit 0).
- **build:** OK (`npm run build` compila 10/10 páginas estáticas sin errores; TypeScript OK).
- Preferencia persistente en `localStorage["av_skin_asteroids"]` vía `writeSkin` del selector
  genérico de `game-player.tsx` (que ya existe desde Caída y aparece automáticamente al tener
  `engine.skins.length > 1`).

### Decisiones / suposiciones

- Las partículas usan un `alpha` que se calcula frame a frame como `ttl/life` (fade-out
  natural). Para que `clasico` reproduzca `rgba(255,255,255,${alpha})` exacto se parametriza
  solo la tripleta RGB como un string literal (`"255,255,255"`), no un color opaco; así el
  template `` `rgba(${particleRgb},${alpha})` `` encaja sin tocar la curva de alpha.
- `powerUp` y `hudTriple` son dos slots aunque en las 3 skins coinciden: el power-up flotante
  en el canvas y el texto fijo del HUD interno son dos "roles" visualmente distintos; dejarlos
  separados permite re-colorearlos de forma independiente en el futuro sin tocar el motor.
- Para `thrust` se usa un `rgba` completo (incluye alpha) porque la llama original tenía
  `0.85` opacity integrada: parametrizarlo como un único string mantiene esa transparencia
  dentro de la paleta sin exponer `thrustAlpha` como slot aparte.
- El build inicial falló porque el formateador había reemplazado `let palette` por
  `const palette` tras un reformat; se corrigió a `let` ya que `setPalette` reasigna el valor.

---

---

## frogger (Frogger) — 2026-10-14

Caso particular: el refactor del render a `Palette` ya venía hecho desde la propia spec del
juego (rama `spec-01-frogger-core`). Esta pasada solo **diseñó** las paletas `neon` y `retro`
(que eran placeholders apuntando al mismo objeto que `clasico`) y activó el selector.

### Ficheros

**Modificados**

- `lib/games/frogger/skins.ts` — añadidas las paletas reales `neon` y `retro`; `clasico` se
  dejó intacta byte a byte. `SKINS` deja de reutilizar el objeto `clasico` para las otras dos.
- `lib/games/registry.ts` — la entrada `frogger` pasa a declarar `skins: SKIN_IDS` (antes no
  la tenía, para no mostrar un selector con tres paletas idénticas).

**Sin cambios (ya correctos)**

- `lib/games/frogger/engine.ts` — `palette = options.palette ?? SKINS.clasico`, todo `draw()`
  lee de `palette` (no queda ningún literal de color en el motor) y `setPalette(next)` asigna
  y llama a `draw()` de inmediato, así que el cambio se ve aun en pausa y no toca estado,
  vidas ni puntuación.
- `components/frogger-canvas.tsx` — prop `skin` con default `DEFAULT_SKIN`, `useEffect([skin])`
  que llama a `engineRef.current?.setPalette(SKINS[skin])`, y creación única del motor con
  `{ palette: SKINS[skinRef.current] }`.
- `components/game-player.tsx` — selector `.btn.hud-skin` genérico, ya existente.

### Slots de la paleta (`FroggerPalette`)

| slot | clasico | neon | retro |
| --- | --- | --- | --- |
| `safe` | `#0d2818` | `#120a1e` | `#141008` |
| `road` | `#101014` | `#05050a` | `#0b0a07` |
| `river` | `#06183a` | `#001a2e` | `#101a16` |
| `goalRow` | `#0a1f14` | `#1a0a26` | `#12170d` |
| `roadLine` | `#3a3a42` | `#00f5ff` | `#6b5a2a` |
| `goalEmpty` | `#071b10` | `#0a0014` | `#0d1109` |
| `goalBorder` | `#d9a520` | `#f5ff00` | `#c08b2a` |
| `goalFilled` | `#1d5c33` | `#00ff88` | `#5a7a3a` |
| `carBodies[0]` | `#ff3b30` | `#ff006e` | `#b5651d` |
| `carBodies[1]` | `#f5d020` | `#f5ff00` | `#c9a227` |
| `carBodies[2]` | `#2f8fff` | `#ff8a00` | `#7f8c5a` |
| `carGlass` | `#0b1220` | `#05050a` | `#0b0a07` |
| `truckBody` | `#b8bdc7` | `#e6f9ff` | `#cbbd9a` |
| `truckCab` | `#6b7280` | `#00f5ff` | `#8a7f63` |
| `wheel` | `#15151a` | `#1b0b2a` | `#0e0d0a` |
| `log` | `#7a4a24` | `#7b2cbf` | `#6b4a24` |
| `logGrain` | `#5d3519` | `#c77dff` | `#4a3217` |
| `turtleShell` | `#2fbf6a` | `#00f5ff` | `#6e9456` |
| `turtleShellEdge` | `#17753f` | `#0088a8` | `#3f5a30` |
| `turtleHead` | `#48d97f` | `#aef7ff` | `#8fb46f` |
| `turtleSubmerged` | `rgba(47, 191, 106, 0.22)` | `rgba(0, 245, 255, 0.28)` | `rgba(110, 148, 86, 0.22)` |
| `frogBody` | `#39e65c` | `#00ff88` | `#7ea832` |
| `frogBelly` | `#9cf7a8` | `#ccffe8` | `#c7d89a` |
| `frogLeg` | `#22a63c` | `#00b35f` | `#4e6b22` |
| `frogEye` | `#ffffff` | `#ffffff` | `#e8e2c8` |
| `frogPupil` | `#0a0a0a` | `#12002b` | `#100e08` |
| `timeTrack` | `rgba(255, 255, 255, 0.12)` | `rgba(0, 245, 255, 0.18)` | `rgba(232, 226, 200, 0.1)` |
| `timeHigh` | `#39e65c` | `#00ff88` | `#7ea832` |
| `timeMid` | `#f5d020` | `#f5ff00` | `#c9a227` |
| `timeLow` | `#ff3b30` | `#ff006e` | `#b5431d` |

### Decisiones de diseño

- **Neón**: negro casi puro de base con los tokens de la plataforma. Las líneas de carril pasan
  a cian (`--cyan`), los coches a magenta/amarillo/naranja, los troncos a violeta (`#7b2cbf`)
  para que no se confundan con el río cian, y las tortugas a cian con casco claro. La rana se
  queda verde (`--green #00ff88`), igual que la boca destino ocupada: el jugador y su objetivo
  comparten color, que es la lectura clásica del juego.
- **Retro**: fósforo cálido y desaturado sobre negro ámbar. Coches en tierras/ámbares, tronco
  marrón apagado, rana y tortugas en verde CRT, cremas (`#e8e2c8`) para el ojo y la barra de
  tiempo. Sin brillos (Frogger no usa `shadowColor` en ningún slot).
- Las transparencias (`turtleSubmerged`, `timeTrack`) conservan su rol de opacidad en las tres
  skins; solo cambia el tinte, nunca el alfa como mecanismo (la tortuga sumergida sigue
  legible como contorno).

### Verificación

- `clasico` idéntico al original: el objeto `clasico` no se tocó y es la skin por defecto
  (`DEFAULT_SKIN`), tanto en `createFrogger` (`options.palette ?? SKINS.clasico`) como en el
  default de la prop `skin` del canvas.
- Selector en vivo: `/games/frogger/jugar` renderiza el `<select class="btn hud-skin">` con
  Clásico/Neón/Retro; `setPalette` repinta al instante sin tocar estado, ronda, vidas ni
  puntuación (no se llama a `restart` ni a `initGame`).
- `npm run lint` ✅ · `npm run build` ✅.

### Pendiente / suposiciones

- Sin regresiones esperadas en otros juegos: el único cambio compartido es aditivo
  (`skins: SKIN_IDS` en la entrada `frogger`).
- El commit/rama/PR los decide el usuario; esta pasada no commiteó nada.
