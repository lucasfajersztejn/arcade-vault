# SPEC 10 — Añadir el juego Snake al catálogo

**Estado:** Aprobado
**Depende de:** SPEC 05 (`specs/05-juego-asteroids.md`) por el patrón de motor, canvas y `GamePlayer`; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores` y el leaderboard; SPEC 07 (`specs/07-juego-caida.md`) por el registro de motores `lib/games/registry.ts`
**Fecha:** 2026-10-13
**Objetivo:** Añadir el juego `snake`, creado desde cero con las frutas de `refereences/source-assets/snake-assets`, con HUD, pausa, guardado de puntuación y leaderboard de la plataforma.

---

## Por qué existe esta spec

El catálogo tiene tres juegos con motor real: `bloque-buster`, `caida` y `asteroids`. Snake es el cuarto. A diferencia de los anteriores no se porta de `refereences/started-games/`, porque allí no existe: se diseña desde cero con mecánicas mínimas.

Los únicos recursos de partida son `fruits.png` y `sprites.js` (`refereences/source-assets/snake-assets/`). `fruits.png` es una hoja de 3790×442 con tres filas. `sprites.js` solo mapea la fila pixel-art: 22 frutas con coordenadas `{x, y, w, h}` y una altura de 160 px. El motor las escala a una celda del tablero.

Snake es el primer juego sin vidas pero con nivel propio (`1 + floor(frutas / 5)`), y el primero con canvas cuadrado (600×600). Lo único que añade al registro es una entrada nueva; `GamePlayer` no cambia.

---

## Alcance

### Dentro

- Escribir el motor desde cero en módulos TypeScript en `lib/games/snake/` (`types`, `constants`, `sprites`, `entities`, `engine`), sin React, sin `document.getElementById` y sin globales: el motor recibe el `<canvas>` y callbacks.
- Mecánicas y constantes del juego (propias de esta spec, al no haber original):
  - Canvas lógico 600×600: rejilla de 20×20 celdas de 30 px.
  - La serpiente avanza por pasos de tiempo fijo, acumulando `dt`.
  - Inicio: 3 segmentos con la cabeza en la columna 10, fila 10, y el cuerpo a su izquierda. Dirección inicial: derecha.
  - Se prohíbe girar 180°. Cola de entrada de 2 giros para no perder pulsaciones rápidas entre dos pasos.
  - Comer una fruta suma +10 y crece 1 segmento.
  - La fruta nueva aparece en una celda libre, con un tipo al azar entre las 22 del atlas. Nunca repite la fruta que se acaba de comer (para que el cambio se note).
  - Muere al chocar con una pared o con su propio cuerpo. No hay vidas ni wrap-around.
  - Si la serpiente llena las 400 celdas, es fin de partida (victoria). No queda celda libre para la fruta.
  - Velocidad: paso de 140 ms en el nivel 1; baja 5 ms por nivel con un mínimo de 70 ms (`STEP_MS = max(70, 140 - 5 × (nivel - 1))`).
  - Nivel: `1 + floor(frutas comidas / 5)`.
- Sprites: copiar `refereences/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` y portar las 22 coordenadas de `sprites.js` a `lib/games/snake/sprites.ts` como módulo, sin `window.SPRITE_ATLAS`. El motor carga la imagen y escala cada fruta a la celda conservando la proporción. El bucle arranca al terminar la carga.
- La serpiente se dibuja con formas del canvas (cuerpo, cabeza y ojos), porque no hay sprites de serpiente. El estilo concreto lo fija `/frontend-design`.
- Componente cliente `components/snake-canvas.tsx` con limpieza al desmontar (Strict Mode) y leyenda de controles.
- Registro de motores: añadir `snake` a `ENGINES` (`hasLives: false`) sin cambiar `GamePlayer`.
- Integración en `GamePlayer`: HUD real (Puntuación y Nivel del juego; sin tarjeta «Vidas»), PAUSA real y automática, FIN, modal «FIN DEL JUEGO» y guardado en `scores`.
- Fila en `games` con una migración (`apply_migration`): `id` `snake`, `cat` ARCADE, `color` green, `sort_order` 4. Portada `cover-snake` en `app/globals.css`.
- Seed de 10 puntuaciones ficticias en una migración aparte, aplicada **después** de verificar los criterios con el ranking vacío. Las marcas son múltiplos de 10 y no superan 1 200.
- Controles de teclado: `←` `↑` `→` `↓` y `W` `A` `S` `D` mueven la serpiente; `P` y `Esc` alternan la pausa. `preventDefault` solo con el motor activo y el foco fuera de un `input`. Aviso «requiere teclado» en `(pointer: coarse)`.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) para la portada, el tablero dentro del marco CRT, el dibujo de la serpiente y la leyenda. No se escribe ni modifica UI sin haberlos invocado antes.
- Revisión de la documentación local de Next 16.4 (`node_modules/next/dist/docs/`) antes de escribir código.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- Controles táctiles.
- Sonido y música.
- Soporte HiDPI.
- Power-ups, frutas con valores distintos, obstáculos y modo wrap-around.
- Las frutas de las filas de dibujo plano y fotorrealista de `fruits.png` (solo se usa la fila pixel-art mapeada en `sprites.js`).
- Overlays propios de GAME OVER o victoria y reinicio con tecla: los sustituye el modal de la plataforma.
- HUD dibujado en el canvas (puntos y nivel): lo pinta la plataforma.
- Tests automatizados.
- Cambios en `lib/db/*`, `/salon`, `Leaderboard`, `Library`, RLS o esquema.
- Cambios en `components/game-player.tsx`, salvo que el registro lo exija.
- Los demás juegos del catálogo.
- Modificar `refereences/`.

---

## Modelo de datos

Juego nuevo: fila en `games` mediante `apply_migration` (migración `add_snake_game`).

```sql
-- Juego nuevo: SNAKE
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'snake',
  'SNAKE',
  'Come, crece y no choques.',
  'Guía a la serpiente por el tablero, come frutas pixel-art y crece sin chocar con las paredes ni con tu propia cola. Cada cinco frutas sube el nivel y la serpiente acelera.',
  'ARCADE',
  'cover-snake',
  'green',
  4
);
```

Segunda migración (`seed_example_snake_scores`), aplicada **después** de verificar los criterios con el ranking vacío. Las marcas son múltiplos de 10 y no superan 1 200. Las fechas van cada 3 días, a las 12:00 UTC, como en SPEC 08.

```sql
-- Puntuaciones FICTICIAS de ejemplo para SNAKE: jugadores y marcas inventados.
insert into public.scores (game_id, player_name, score, created_at) values
  ('snake', 'GLITCHA',    1200, '2026-10-10 12:00:00+00'),
  ('snake', 'PX_KAI',      980, '2026-10-07 12:00:00+00'),
  ('snake', 'NEONFOX',     840, '2026-10-04 12:00:00+00'),
  ('snake', 'Z3R0COOL',    710, '2026-10-01 12:00:00+00'),
  ('snake', 'M00NRYU',     590, '2026-09-28 12:00:00+00'),
  ('snake', 'VAULT_07',    470, '2026-09-25 12:00:00+00'),
  ('snake', 'ATARI_KID',   360, '2026-09-22 12:00:00+00'),
  ('snake', 'CYBER_LU',    260, '2026-09-19 12:00:00+00'),
  ('snake', 'MAGENTA88',   170, '2026-09-16 12:00:00+00'),
  ('snake', 'SCANLINE',     80, '2026-09-13 12:00:00+00');
```

Tras el seed, `plays = 10` y «Mejor global» = 1 200 en `/games/snake`. No se crean tablas ni columnas, y no se tocan RLS ni las vistas `leaderboard` y `game_stats` (SPEC 06).

Contrato del motor (sin vidas, con nivel):

```ts
// lib/games/snake/types.ts
export type SnakeCallbacks = {
  onScore: (score: number) => void;
  onLevel: (level: number) => void; // 1 + floor(frutas / 5)
  onGameOver: (finalScore: number) => void; // choque, tablero lleno o FIN
  onPause?: (paused: boolean) => void; // pestaña oculta, blur o tecla P/Esc
};

export type SnakeEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void; // 3 segmentos, derecha, puntuación 0, nivel 1
  end: () => void; // fuerza game over (botón FIN)
  destroy: () => void; // cancela rAF y quita todos los listeners
};

// lib/games/snake/engine.ts
export function createSnake(
  canvas: HTMLCanvasElement,
  cb: SnakeCallbacks,
): SnakeEngine;

// lib/games/registry.ts  ("use client")
// Entrada nueva: snake, hasLives: false.
```

Constantes propias de esta spec (`lib/games/snake/constants.ts`):

- `GRID = 20`, `CELL = 30`, canvas 600×600.
- Inicio: cabeza en (col 10, fila 10), 3 segmentos, dirección derecha.
- `FRUIT_POINTS = 10`, `FRUITS_PER_LEVEL = 5`.
- `STEP_MS = max(70, 140 − 5 × (nivel − 1))`; el mínimo se alcanza en el nivel 15.
- `INPUT_QUEUE_MAX = 2`.
- `MAX_DT = 50` ms (regla de la plataforma).
- Puntuación máxima real: 397 frutas × 10 = 3 970 (400 celdas menos 3 iniciales); nivel máximo 80.

Sprites (`lib/games/snake/sprites.ts`): las 22 coordenadas de `sprites.js` (`banana`, `orange`, `grape`, `garlic`, `eggplant`, `strawberry`, `cherry`, `carrot`, `mushroom`, `broccoli`, `watermelon`, `pepper`, `kiwi`, `lemon`, `peach`, `peanut`, `apple`, `tomato`, `berries`, `grapes2`, `pineapple`, `melon`) copiadas tal cual, todas con `y = 136` y `h = 160`.

---

## Archivos a crear / modificar

| Archivo                                                        | Acción                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/games/snake/types.ts`                                     | crear: `SnakeCallbacks`, `SnakeEngine`                                                                |
| `lib/games/snake/constants.ts`                                 | crear: rejilla, celda, velocidades, puntos, cola de entrada, `dt` máximo                              |
| `lib/games/snake/sprites.ts`                                   | crear: coordenadas de las 22 frutas, carga de imagen y `drawFruit` por parámetro                      |
| `lib/games/snake/entities.ts`                                  | crear: tipos `Snake`, `Fruit`; avance, giro, colisión y celda libre puros                             |
| `lib/games/snake/engine.ts`                                    | crear: `createSnake` (estado, input, bucle con `dt` ≤ 50 ms, callbacks, pausa, restart, end, destroy) |
| `components/snake-canvas.tsx`                                  | crear: canvas 600×600 y leyenda de controles; expone `pause/resume/restart/end`                       |
| `lib/games/registry.ts`                                        | modificar: entrada `snake`                                                                            |
| `app/globals.css`                                              | modificar: `cover-snake`, estilos del canvas cuadrado, leyenda y aviso de teclado                     |
| `public/games/snake/fruits.png`                                | crear: copia de `refereences/source-assets/snake-assets/fruits.png`                                   |
| Migración Supabase (`apply_migration`)                         | crear (2): insert en `games` y seed de 10 puntuaciones ficticias                                      |
| `components/game-player.tsx`                                   | **no se modifica** (el registro basta)                                                                |
| `lib/games/asteroids/`, `caida/`, `bloque-buster/`, sus canvas | **no se modifican**                                                                                   |
| `refereences/source-assets/snake-assets/`                      | **no se modifica**                                                                                    |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre componentes cliente y `cacheComponents` con APIs de navegador (`canvas`, `Image`, rAF, `window`) solo dentro de `useEffect`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** y volver a aplicarlos en los pasos 6 y 8 (tablero en el marco CRT, serpiente, leyenda y portada).
3. **Constantes, tipos y sprites:** `lib/games/snake/{types,constants,sprites}.ts`; copiar el PNG a `public/games/snake/`. `sprites.ts` con las 22 coordenadas, la carga de la imagen y `drawFruit`, que recibe `ctx` por parámetro y desactiva el suavizado (pixel-art).
4. **Entidades:** `entities.ts` con avance de un paso, giro con la regla anti-180° y la cola de entrada, colisión con pared y cuerpo, y elección de una celda libre y un tipo de fruta distinto del anterior. Todo puro, con el generador aleatorio por parámetro.
5. **Motor:** `engine.ts` con `createSnake`.
   - Input por listeners en `window` (flechas y `WASD` giran; `P` y `Esc` alternan pausa y avisan por `onPause`), con `preventDefault` solo con el motor activo y el foco fuera de un `input`.
   - Bucle rAF con `dt` ≤ 50 ms que acumula tiempo y avanza un paso cada `STEP_MS`. Arranca al terminar la carga de la imagen; `destroy()` durante la carga cancela el arranque.
   - Pausa automática por `visibilitychange` y `blur`.
   - Detiene el bucle y llama a `onGameOver` con choque, tablero lleno o `end()`.
   - Dibuja tablero, fruta y serpiente. No dibuja HUD, overlays ni reinicio con tecla.
   - Emite `onScore` y `onLevel` (también al iniciar y al reiniciar).
6. **Componente canvas y estilos:** `snake-canvas.tsx` con el canvas 600×600, la leyenda de controles y el aviso «requiere teclado». Crea el motor en `useEffect` y lo destruye al desmontar (Strict Mode). Escalado por CSS dentro de `.crt-screen` en `app/globals.css`.
7. **Registro y conexión:** añadir `snake` a `ENGINES` (`hasLives: false`, `ariaLabel` «Juego Snake en curso»). `GamePlayer` no se toca.
8. **Catálogo:** `cover-snake` en `app/globals.css` y migración `add_snake_game`. Comprobar con `list_tables` y `get_advisors` (seguridad).
9. **Verificación y seed:** recorrer los criterios de aceptación con el ranking vacío; después aplicar la migración `seed_example_snake_scores` y verificar el ranking.

La verificación va en los criterios de aceptación, no en un paso del plan.

### Nombres de commit

Al terminar cada paso con cambios, quien implemente (`/spec-impl`) **propone** al usuario un nombre de commit con el formato `feat: descripción corta en inglés` y **no ejecuta el commit** hasta que el usuario lo confirme.

| Paso | Commit propuesto                                     |
| ---- | ---------------------------------------------------- |
| 3    | `feat: add snake constants, types and fruit sprites` |
| 4    | `feat: add snake entities`                           |
| 5    | `feat: add snake game engine`                        |
| 6    | `feat: add snake canvas component`                   |
| 7    | `feat: connect snake engine to game player`          |
| 8    | `feat: add snake to games catalog`                   |
| 9    | `feat: seed example snake scores`                    |

Los pasos 1 y 2 no producen cambios, por lo que no llevan commit. Los nombres se ajustan si el contenido real del paso cambia.

---

## Criterios de aceptación

### Build y calidad

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [x] `get_advisors` (seguridad) no reporta avisos nuevos tras la migración. Si salen avisos, anotar si son previos (los 2 de `public.rls_auto_enable()` ya existían en SPEC 07). _(Verificado tras `add_snake_game`: salen solo los 2 avisos de `public.rls_auto_enable()` que ya existían; ninguno nuevo.)_
- [ ] `grep -r "service_role" app components lib` no devuelve resultados.

### Catálogo

- [x] `select id, title, cat, cover, color, sort_order from games where id = 'snake'` devuelve `SNAKE`, `ARCADE`, `cover-snake`, `green`, `4`.
- [x] `/games` muestra la tarjeta «SNAKE» con su portada `cover-snake`; los otros tres juegos siguen en su orden (`bloque-buster`, `caida`, `asteroids`). _(Verificado en el build de producción, con captura en `.playwright-screenshots/spec10-games-desktop.png`.)_
- [x] El filtro ARCADE incluye SNAKE. _(Muestra ARKANOID y SNAKE.)_
- [x] `/games/snake` muestra el detalle y «JUGAR AHORA» lleva a `/games/snake/jugar`. _(Verificado: título SNAKE, portada `cover-snake` y enlace a `/games/snake/jugar`.)_
- [ ] Tras el seed, `scores` tiene 10 filas de `snake` (mejor marca 1 200, `GLITCHA`) y los demás juegos no cambian.

### Juego

- [ ] `/games/snake/jugar` muestra el canvas 600×600 dentro del marco CRT, con la serpiente de 3 segmentos mirando a la derecha y una fruta del atlas en una celda libre.
- [ ] Controles: `←` `↑` `→` `↓` y `W` `A` `S` `D` giran la serpiente; sin tecla sigue recto; girar 180° se ignora; dos giros rápidos entre pasos se aplican en pasos consecutivos y un tercero se descarta.
- [ ] La serpiente avanza una celda por paso (`STEP_MS`): 140 ms en el nivel 1 y 5 ms menos por nivel, con mínimo de 70 ms.
- [ ] Comer una fruta suma exactamente 10 puntos, crece 1 segmento y el HUD de la plataforma lo refleja al instante.
- [ ] La fruta nueva aparece siempre en una celda libre (nunca bajo la serpiente) y su tipo es distinto del anterior.
- [ ] Las frutas se dibujan con los sprites de `fruits.png` (fila pixel-art), sin suavizado y sin deformarse.
- [ ] El nivel del HUD es `1 + floor(frutas / 5)`: pasa a 2 al comer la 5.ª fruta y la velocidad cambia en ese momento.
- [ ] El HUD muestra Puntuación y Nivel con valores reales; la tarjeta «Vidas» no aparece.
- [ ] Chocar con una pared o con el propio cuerpo abre «FIN DEL JUEGO» con la puntuación final correcta. Llenar las 400 celdas hace lo mismo (verificado con `page.evaluate`, sin añadir código al motor).
- [ ] PAUSA (botón) y las teclas `P` y `Esc` congelan el juego (la serpiente no avanza) y REANUDAR o la tecla continúan sin saltos; el estado del botón se actualiza con la tecla; ocultar la pestaña o perder el foco pausa.
- [ ] Pulsar FIN abre «FIN DEL JUEGO»; el canvas no muestra su propio game over, ni HUD, ni overlay de pausa, ni reinicia con tecla.
- [ ] «JUGAR DE NUEVO» reinicia con 3 segmentos, a la derecha, puntuación 0 y nivel 1, sin duplicar el bucle (la velocidad no aumenta tras varios reinicios).
- [ ] Escribir un nombre en el input del modal (incluidas barra espaciadora, flechas y `WASD`) no mueve la serpiente ni hace scroll.
- [ ] Salir con SALIR o navegar a otra ruta no deja listeners ni bucles activos: las flechas y Espacio vuelven a hacer scroll en otras páginas; salir antes de que cargue `fruits.png` no arranca un bucle huérfano.
- [ ] A ancho ≤ 768 px el canvas se escala sin scroll horizontal; en `(pointer: coarse)` aparece el aviso «requiere teclado».
- [ ] La puntuación enviada es un entero entre 0 y 99 999 999 (máximo real 3 970).
- [ ] `grep -r "Audio\|mousemove\|localStorage\|window.SPRITE_ATLAS" lib/games/snake components/snake-canvas.tsx` no devuelve resultados.

### Leaderboard

- [ ] «GUARDAR PUNTUACIÓN» crea una fila en `scores` con `game_id = 'snake'`, el nombre escrito (o `INVITADO`) y la puntuación final.
- [ ] Sin puntuaciones (antes del seed), `/games/snake` muestra «Sé el primero en puntuar»; tras guardar una, aparece en el ranking al recargar.
- [ ] Tras el seed, `/games/snake` muestra el top 10 con `GLITCHA` (1 200) en primer lugar.
- [ ] Hay una pestaña «SNAKE» en `/salon` con podio y tabla coherentes con la vista `leaderboard`.
- [ ] Con sesión iniciada, «TU MEJOR MARCA EN SNAKE» muestra la marca y el rango reales.
- [ ] `plays` y «Mejor global» de `/games/snake` coinciden con `count(*)` y `max(score)` de `scores`.

### Sin regresiones

- [ ] `/games/asteroids/jugar`, `/games/caida/jugar` y `/games/bloque-buster/jugar` funcionan como antes.
- [ ] `git diff` no toca `components/game-player.tsx`, `lib/games/asteroids/`, `lib/games/caida/`, `lib/games/bloque-buster/` ni sus componentes canvas.
- [ ] `git status` no muestra cambios en `refereences/`.
- [ ] `lib/db/`, `app/salon/` y `components/leaderboard.tsx` no cambian.
- [ ] La sesión `av_user` sigue funcionando.

### Proceso

- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para la portada, el tablero, la serpiente y la leyenda, y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [ ] Capturas de Playwright en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/` (escritorio y ≤ 768 px).
- [ ] Tras cada paso con cambios se propuso al usuario un nombre de commit con el formato `feat: descripción corta en inglés` y no se hizo commit sin su confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint` y `npm run build`.
2. `npm run dev`, jugar hasta chocar con la pared y con el cuerpo, superar el nivel 2 y guardar con nombre y sin nombre.
3. Recorrer con Playwright `/games`, `/games/snake`, `/games/snake/jugar` y `/salon`, en escritorio y ≤ 768 px, y los otros tres juegos para las regresiones.
4. `execute_sql`: comprobar la fila en `scores` y las vistas `leaderboard` y `game_stats`.
5. `get_advisors` de seguridad.

---

## Decisiones tomadas y descartadas

- **Origen: diseñar desde cero con mecánicas mínimas.** No hay Snake en `refereences/started-games/`. _Descartado:_ portar un juego externo.
- **Catálogo: juego nuevo `snake`** (ARCADE, green, `sort_order` 4, `cover-snake`). ARCADE es la única de las 4 categorías permitidas que encaja. _Descartado:_ reconvertir una fila existente (no hay simulados pendientes tras SPEC 09).
- **Rejilla 20×20 con celdas de 30 px (canvas 600×600).** _Descartado:_ 800×600 como los demás motores (la rejilla no sería cuadrada).
- **Velocidad ligada al nivel** (140 ms, −5 ms por nivel, mínimo 70 ms) y **nivel = `1 + floor(frutas / 5)`.** _Descartado:_ velocidad constante con nivel oculto; el nivel genérico de la plataforma (`1 + floor(score / 2500)`), que nunca se alcanzaría (máximo 3 970).
- **Sin vidas** (`hasLives: false`, como `caida`): el HUD oculta «Vidas». _Descartado:_ mostrar «—».
- **Muerte por pared o cuerpo, sin wrap-around.** _Descartado:_ atravesar paredes (otra mecánica).
- **Llenar el tablero es game over con la puntuación final.** _Descartado:_ bucle infinito o mensaje de victoria propio (lo da el modal).
- **Cola de entrada de 2 giros y bloqueo del giro de 180°.** Evita morir por pulsar dos teclas entre dos pasos. _Descartado:_ aplicar solo el último giro (se pierden pulsaciones); cola ilimitada (acumula retraso).
- **Fruta al azar entre las 22 de la fila pixel-art, distinta de la anterior.** _Descartado:_ solo unas pocas frutas; frutas con puntos distintos (mecánica nueva); las filas de dibujo plano y fotorrealista (no mapeadas y desentonan con el CRT).
- **Serpiente dibujada con formas del canvas.** No hay sprites de serpiente. _Descartado:_ buscar o crear un spritesheet.
- **Atlas portado a módulo TS** (`sprites.ts`), sin `window.SPRITE_ATLAS`, y carga de la imagen dentro del motor. _Descartado:_ mantener `sprites.js` con global (rompe la regla de motores sin globales).
- **HUD de la plataforma, no del canvas.** _Descartado:_ HUD en canvas (duplicado).
- **Fin de partida por el modal de la plataforma.** _Descartado:_ overlay y reinicio con tecla.
- **Pausa: botón, teclas `P` y `Esc`, y pausa automática.** _Descartado:_ solo botón.
- **Solo teclado** (flechas y `WASD`). _Descartado:_ controles táctiles (spec propia).
- **Sin sonido.** La plataforma aún no tiene control de silencio. _Descartado:_ incluirlo.
- **Seed de 10 puntuaciones ficticias** (máximo 1 200), aplicado tras verificar el estado vacío, como en SPEC 07 y 08. _Descartado:_ dejar el ranking vacío.
- **`GamePlayer` no se toca.** El registro basta. _Descartado:_ cambios en `GamePlayer`.
- **Nombres de commit propuestos, no ejecutados.** _Descartado:_ commitear automáticamente.
- **Sin tests automatizados.** Coherente con las specs previas; los módulos puros facilitan añadirlos después. _Descartado:_ un runner de tests ahora.
- **Inicio fijo y sin repetir tipo de fruta consecutiva.** Decisiones propias de esta spec, sin referencia que las contradiga.

---

## Riesgos identificados

| Riesgo                                                                                     | Mitigación                                                                                                                    |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje de React Strict Mode duplica bucle y listeners                               | `destroy()` idempotente y devuelto siempre por el `useEffect`; criterio de reinicios y de desmontaje                          |
| `destroy()` antes de que cargue `fruits.png` deja un bucle huérfano                        | El arranque comprueba un indicador de destruido al terminar la carga; criterio de salida durante la carga                     |
| `preventDefault` rompe el input del modal o el scroll de otras páginas                     | Capturar solo las teclas del juego con el motor activo y el foco fuera de un `input`; `destroy()` quita los listeners         |
| `Esc` captura una tecla que otros componentes (modal) usan para cerrarse                   | Ignorar `Esc` si el foco está en un `input` o hay un modal abierto; el motor solo alterna la pausa y no hace `preventDefault` |
| `dt` enorme tras volver de una pestaña oculta                                              | Pausa automática y `dt` ≤ 50 ms; el acumulador avanza como mucho los pasos que caben                                          |
| Dos giros rápidos entre pasos provocan un giro de 180° y muerte injusta                    | Cola de 2 giros; cada giro se valida contra la dirección del último paso ya encolado                                          |
| Canvas cuadrado 600×600 dentro de un marco CRT pensado para 800×600                        | Se resuelve con CSS en el paso 6 con `/frontend-design`; criterio de captura a escritorio y ≤ 768 px                          |
| Las frutas (110–170 × 160 px) se ven borrosas o deformadas al escalar a una celda de 30 px | Escalado proporcional, `imageSmoothingEnabled = false` y criterio visual con captura                                          |
| Peso de `fruits.png` (3790×442, tres filas) en una página de juego                         | Se copia tal cual; si el peso resulta alto, se anota para una spec de optimización (recortar la fila usada)                   |
| Elegir una celda libre cuando el tablero está casi lleno                                   | Se elige entre la lista de celdas libres, no por reintentos; sin celdas libres es fin de partida                              |
| Puntuación fuera del rango de la BD (0 a 99 999 999)                                       | Máximo real 3 970; se acota en el motor antes de `onScore`/`onGameOver` por seguridad                                         |
| Datos ficticios confundidos con reales                                                     | El SQL del seed los marca como ficticios y la migración tiene nombre propio; mismo criterio que los demás seeds               |
| Regresión en los otros juegos al tocar el registro                                         | Solo se añade una entrada; `GamePlayer` y los motores existentes no cambian; criterios de regresión y `git diff` limpio       |

---

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido y música.
- Power-ups, frutas con valores distintos, obstáculos y modo wrap-around.
- Cambios de balance posteriores (velocidades, tamaño del tablero).
- Soporte HiDPI.
- Los demás juegos del catálogo.
- Cambios de esquema, RLS o capa `lib/db`; cambios en `GamePlayer`.
- Autenticación real, anti-trampas y Realtime.
- Optimización o recorte de `fruits.png`.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
