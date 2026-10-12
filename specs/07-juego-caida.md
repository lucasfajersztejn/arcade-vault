# SPEC 07 — Convertir CAÍDA en un Tetris real

**Estado:** Implementado
**Depende de:** SPEC 05 (`specs/05-juego-asteroids.md`) por el patrón de motor, canvas y `GamePlayer`; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores` y el leaderboard
**Fecha:** 2026-10-12
**Objetivo:** Convertir el juego simulado `caida` en un Tetris real, portado de `refereences/started-games/03-tetris` (7 piezas), con HUD, pausa, guardado de puntuación y leaderboard de la plataforma.

---

## Por qué existe esta spec

`caida` es hoy un juego simulado (puntuación por `setInterval`). Asteroids (SPEC 05) fijó el patrón de motor TypeScript + canvas + `GamePlayer`; esta spec añade el segundo motor real y obliga a generalizar `GamePlayer` con un registro de motores (`lib/games/registry.ts`), en lugar de ramificar por `game.id`.

Se porta el Tetris de `refereences/started-games/03-tetris` conservando sus constantes y fórmulas, con una sola desviación: se elimina la pieza `N` («tuerca», anillo 3×3) que el original añade a las 7 clásicas y que su README no documenta. Se convierte `caida` (PUZZLE, magenta, `cover-tetro`, `sort_order` 2) en lugar de crear un juego nuevo, para no tener dos Tetris en el catálogo; se conservan su `id` y su portada, y se descartan sus puntuaciones, que eran del simulado.

---

## Alcance

### Dentro

- Portar `game.js` a módulos TypeScript en `lib/games/caida/` (`types`, `constants`, `utils`, `entities`, `engine`), sin React, sin `document.getElementById` y sin globales: el motor recibe el `<canvas>` y callbacks.
- Conservar las mecánicas y constantes del original:
  - Tablero `COLS=10`, `ROWS=20`, `BLOCK=30`.
  - 7 piezas I, O, T, S, Z, J, L con sus matrices y colores.
  - Rotación horaria con wall kicks `[0,-1,1,-2,2]`.
  - Pieza fantasma (alpha 0,2).
  - Puntos por líneas `[0,100,300,500,800] × nivel`.
  - Soft drop +1 por fila y hard drop +2 por celda.
  - Nivel `floor(líneas/10)+1`.
  - Caída `max(100, 1000 − (nivel−1)×90)` ms.
  - Sorteo uniforme de piezas.
- Quitar la pieza `N` (tuerca): `randomPiece()` sortea entre 7 y se elimina el color 8. Es la única desviación respecto al original.
- Canvas lógico fijo de 300×600 (solo tablero, como en el original), escalado por CSS dentro de `.crt-screen`.
- Conservar el HUD interior del original, tal cual: panel lateral de 160 px con SCORE, LINES, LEVEL, NEXT (canvas de 120×120) y CONTROLS. Se implementa como bloque React en `components/caida-canvas.tsx`, con los estilos del original (solo tema oscuro) en `app/globals.css`, con prefijo propio `.caida-*` para no chocar con las clases de la plataforma. El título «TETRIS» del original queda fuera.
- Contrato del motor ampliado: `createCaida(canvas, cb, { nextCanvas })` y callback extra `onLines`; el motor sigue sin tocar el DOM.
- Componente cliente `components/caida-canvas.tsx`, con limpieza al desmontar (compatible con React Strict Mode).
- Registro de motores `lib/games/registry.ts`: mover `asteroids` a él sin tocar su motor y registrar `caida`. `GamePlayer` consulta el registro en vez de ramificar por `id`.
- Integración en `GamePlayer`:
  - HUD de la plataforma adaptado: Puntuación y Nivel reales (mismos valores que el panel interior), «Vidas» oculto (`hasLives: false` en el registro). Las líneas solo se ven en el panel interior.
  - PAUSA real y automática al ocultar la pestaña o perder el foco.
  - FIN fuerza el game over.
  - Modal «FIN DEL JUEGO» y guardado en `scores`.
  - Game over cuando una pieza nueva colisiona al aparecer.
- Controles de teclado: `←` `→` mover, `↑` o `X` rotar, `↓` soft drop, `Espacio` hard drop, `P` pausa/reanudar. Se usa `preventDefault` solo con el motor activo y el foco fuera de un `input`. Aviso «requiere teclado» en `(pointer: coarse)`.
- Layout responsive: a ≤ 768 px el panel lateral se apila bajo el tablero.
- Catálogo: se conserva el `id` `caida` y su portada `cover-tetro`. Migración que borra las `scores` de `caida` (eran del simulado) y otra que siembra 10 puntuaciones ficticias de ejemplo, con el mismo formato que los demás juegos, para que el ranking no salga vacío (añadido durante la implementación, a petición del usuario). El texto del juego no cambia.
- Diseño: usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max` (CLAUDE.md) para la integración en el marco CRT, el panel lateral, el aviso de teclado y la ocultación de «Vidas». No se escribe ni modifica UI sin invocarlos.
- Revisión de la documentación local de Next 16.4 (`node_modules/next/dist/docs/`) antes de escribir código.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- Tema claro/oscuro y `localStorage` del original (se conserva solo el aspecto oscuro del panel).
- Overlay propio de PAUSA/GAME OVER y botón «Reiniciar» (los sustituye la plataforma).
- Título «TETRIS» del original.
- Rediseñar el panel lateral: se mantiene como en el original.
- Pieza `N` (tuerca).
- Mostrar las líneas en el HUD de la plataforma.
- Controles táctiles.
- Sonido y música.
- Soporte HiDPI.
- Cambios de balance o mecánicas distintos de quitar la `N`.
- Seed de puntuaciones distinto de las 10 filas ficticias de `caida`.
- Tests automatizados.
- Cambios en `lib/db/*`, `/salon`, `Leaderboard`, `Library`, RLS o esquema.
- Los demás juegos del catálogo.
- Modificar `refereences/`.

---

## Modelo de datos

Conversión de un simulado: se conserva el `id` `caida`, su fila en `games` y su portada `cover-tetro`. No hay `insert` ni cambio de texto: el `short` y el `long` actuales («…La velocidad aumenta sin piedad cada 10 líneas.») ya describen el juego real.

Dos migraciones (`apply_migration`). La primera borra las puntuaciones del simulado:

```sql
-- Puntuaciones del CAÍDA simulado (setInterval): no corresponden al Tetris real.
delete from public.scores where game_id = 'caida';
```

Antes: 10 filas, mejor marca 184 220. Después, `plays` y «Mejor global» de `/games/caida` salen a 0 por la vista `game_stats`, y el ranking muestra «Sé el primero en puntuar».

La segunda (`seed_example_caida_scores`) se aplica **después de verificar los criterios con el ranking vacío** y siembra 10 puntuaciones ficticias, con los mismos apodos, el mismo espaciado de fechas (cada 3 días, a las 12:00 UTC) y la misma convención que el seed de los otros juegos (`seed_games_and_example_scores`). Las marcas son realistas para este Tetris (puntos × nivel):

```sql
-- Puntuaciones FICTICIAS de ejemplo para CAÍDA: jugadores y marcas inventados.
insert into public.scores (game_id, player_name, score, created_at) values
  ('caida', 'VAULT_07',  24380, '2026-10-02 12:00:00+00'),
  ('caida', 'GLITCHA',   19650, '2026-09-29 12:00:00+00'),
  ('caida', 'ATARI_KID', 15820, '2026-09-26 12:00:00+00'),
  ('caida', 'CYBER_LU',  12475, '2026-09-23 12:00:00+00'),
  ('caida', 'MAGENTA88',  9930, '2026-09-20 12:00:00+00'),
  ('caida', 'SCANLINE',   7640, '2026-09-17 12:00:00+00'),
  ('caida', 'BIT_LORD',   5410, '2026-09-14 12:00:00+00'),
  ('caida', 'ARKADYA',    3880, '2026-09-11 12:00:00+00'),
  ('caida', 'DROID_X',    2560, '2026-09-08 12:00:00+00'),
  ('caida', 'RGB_QUEEN',  1420, '2026-09-05 12:00:00+00');
```

Tras el seed, `plays = 10` y «Mejor global» = 24 380 en `/games/caida`. No se crean tablas ni columnas; no se tocan RLS ni las vistas `leaderboard` y `game_stats` (SPEC 06).

Contrato del motor (amplía el de Asteroids con `onLines` y el canvas de NEXT):

```ts
// lib/games/caida/types.ts
export type CaidaCallbacks = {
  onScore: (score: number) => void;
  onLevel: (level: number) => void;
  onLines: (lines: number) => void;
  onGameOver: (finalScore: number) => void; // pieza nueva que colisiona al aparecer, o FIN
  onPause?: (paused: boolean) => void; // pestaña oculta, blur o tecla P
};
// Sin onLives: Tetris no tiene vidas.

export type CaidaEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void; // tablero vacío, puntuación 0, líneas 0, nivel 1
  end: () => void; // fuerza game over (botón FIN)
  destroy: () => void; // cancela rAF y quita todos los listeners
};

// lib/games/caida/engine.ts
export function createCaida(
  canvas: HTMLCanvasElement,
  cb: CaidaCallbacks,
  opts?: { nextCanvas?: HTMLCanvasElement },
): CaidaEngine;

// lib/games/registry.ts  ("use client")
// Entrada nueva por juego; `hasLives: false` oculta «Vidas» en el HUD de la plataforma.
```

Constantes que se conservan tal cual del original:

- `COLS = 10`, `ROWS = 20`, `BLOCK = 30` (canvas 300×600; canvas NEXT 120×120).
- 7 piezas con sus matrices: `I`, `O`, `T`, `S`, `Z`, `J`, `L`.
- Colores `#4dd0e1`, `#ffd54f`, `#ba68c8`, `#81c784`, `#e57373`, `#90caf9`, `#ffb74d` (el `#9e9e9e` de la `N` se elimina).
- `LINE_SCORES = [0, 100, 300, 500, 800]`, multiplicado por el nivel.
- Wall kicks `[0, -1, 1, -2, 2]`.
- Soft drop +1 por fila; hard drop +2 por celda.
- Nivel `floor(líneas / 10) + 1`.
- Caída inicial `1000 ms`; `dropInterval = max(100, 1000 − (nivel − 1) × 90)`.
- Pieza fantasma con `globalAlpha = 0.2`.
- `dt` máximo 50 ms (regla de la plataforma; el original no lo limita).
- Sorteo de pieza uniforme, ahora `floor(random × 7) + 1` (única desviación: sin la `N`).

---

## Archivos a crear / modificar

| Archivo                                                   | Acción                                                                                                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/caida/types.ts`                                | crear: `CaidaCallbacks`, `CaidaEngine`                                                                                                            |
| `lib/games/caida/constants.ts`                            | crear: `COLS`, `ROWS`, `BLOCK`, `COLORS` (7), `PIECES` (7), `LINE_SCORES`, wall kicks, `dt` máximo                                                |
| `lib/games/caida/utils.ts`                                | crear: `createBoard`, `rotateCW`, `randomPiece` (7 tipos)                                                                                         |
| `lib/games/caida/entities.ts`                             | crear: tipo `Piece`, `collide`, `merge`, `clearLines`, `ghostY`, `drawBlock`; sin globales (reciben tablero y `ctx` por parámetro)                |
| `lib/games/caida/engine.ts`                               | crear: `createCaida` (estado, input, bucle con `dt` ≤ 50 ms, callbacks, pausa/`P`, restart, end, destroy, dibujo de NEXT en `opts.nextCanvas`)    |
| `components/caida-canvas.tsx`                             | crear: canvas 300×600 + panel lateral (SCORE, LINES, LEVEL, NEXT 120×120, CONTROLS) y leyenda/aviso de teclado; expone `pause/resume/restart/end` |
| `lib/games/registry.ts`                                   | crear: `ENGINES` con `asteroids` y `caida`                                                                                                        |
| `components/game-player.tsx`                              | modificar: consulta `ENGINES[game.id]` en vez de `isAsteroids`; oculta «Vidas» si `hasLives` es falso                                             |
| `app/globals.css`                                         | modificar: estilos del panel interior con prefijo propio (`.caida-*`), layout apilado a ≤ 768 px, aviso de teclado; `cover-tetro` no cambia       |
| Migración Supabase (`apply_migration`)                    | crear (2): `delete` de `scores` de `caida` y seed de 10 puntuaciones ficticias                                                                    |
| `lib/games/asteroids/`, `components/asteroids-canvas.tsx` | **no se modifican**                                                                                                                               |
| `refereences/started-games/03-tetris/`                    | **no se modifica**                                                                                                                                |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre componentes cliente y `cacheComponents` con APIs de navegador (`canvas`, rAF, `window`) solo dentro de `useEffect`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** y volver a aplicarlos en los pasos 6 y 7 (panel lateral, layout responsive, aviso de teclado, «Vidas» oculto).
3. **Constantes, tipos y utilidades:** `lib/games/caida/{types,constants,utils}.ts`, portando literalmente los valores del original con 7 piezas (sin `N`).
4. **Entidades y lógica pura:** `entities.ts` con `collide`, rotación con wall kicks, `merge`, `clearLines` (puntos × nivel, nivel por líneas, `dropInterval`), `ghostY`, hard y soft drop. Todo recibe el tablero y el `ctx` por parámetro.
5. **Motor:** `engine.ts` con `createCaida`. Input por listeners en `window` (`←` `→` `↑`/`X` `↓` `Espacio`, y `P` que alterna pausa y avisa por `onPause`), con `preventDefault` solo con el motor activo y el foco fuera de un `input`. Bucle rAF con `dt` ≤ 50 ms. Pausa automática por `visibilitychange` y `blur`. Game over si la pieza nueva colisiona al aparecer; el bucle se detiene y se llama a `onGameOver`. Dibuja tablero, rejilla, fantasma y pieza actual en `canvas`, y la siguiente en `opts.nextCanvas`. Emite `onScore`, `onLevel`, `onLines`. Sin overlay ni reinicio con tecla.
6. **Componente canvas y estilos:** `caida-canvas.tsx` con el canvas 300×600, el panel lateral con los estilos del original (solo tema oscuro) y los valores que llegan por callback (SCORE, LINES, LEVEL). Reenvía `onScore`/`onLevel`/`onGameOver`/`onPause` al padre y guarda `lines` en su propio estado. Limpieza en el `return` del `useEffect` (Strict Mode). Estilos `.caida-*` y apilado a ≤ 768 px en `app/globals.css`.
7. **Registro de motores y `GamePlayer`:** crear `lib/games/registry.ts` con `asteroids` (`hasLives: true`) y mover a él las referencias de `GamePlayer` (`isAsteroids`, `AsteroidsCanvas`, `AsteroidsControls`) sin tocar su motor. `GamePlayer` consulta `ENGINES[game.id]`: sin entrada, conserva la simulación (`setInterval` y `.game-arena`). Es un refactor sin cambio funcional. Comprobar `/games/asteroids/jugar` y un simulado.
8. **Registrar `caida`:** añadir su entrada al registro (`hasLives: false`, `ariaLabel` propio, panel de controles). `GamePlayer` oculta el bloque «Vidas» y pasa `onLevel`; `/games/caida/jugar` usa el motor real.
9. **Migración:** `apply_migration` con el `delete` de `scores`. Comprobar con `execute_sql` (`count(*)` en 0) y `get_advisors` de seguridad. El seed ficticio (segunda migración) se aplica al final del paso 10, tras verificar los criterios con el ranking vacío.
10. **Verificación:** recorrer los criterios de aceptación.

La verificación va en los criterios de aceptación, no en un paso del plan.

### Nombres de commit

Al terminar cada paso con cambios, quien implemente (`/spec-impl`) **propone** al usuario un nombre de commit con el formato `feat: descripción corta en inglés`, y **no ejecuta el commit** hasta que el usuario lo confirme. Propuestas por paso:

| Paso | Commit propuesto                                    |
| ---- | --------------------------------------------------- |
| 3    | `feat: add caida engine constants, types and utils` |
| 4    | `feat: add caida piece and board logic`             |
| 5    | `feat: add caida game engine`                       |
| 6    | `feat: add caida canvas component with side panel`  |
| 7    | `feat: add game engine registry and move asteroids` |
| 8    | `feat: connect caida engine to game player`         |
| 9    | `feat: clear simulated caida scores`                |
| 10   | `feat: seed example caida scores`                   |

Los pasos 1 y 2 (lectura de documentación y skills) no producen cambios, por lo que no llevan commit. Los nombres son una propuesta y se ajustan si el contenido real del paso cambia.

---

## Criterios de aceptación

### Build y calidad

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `get_advisors` (seguridad) no reporta avisos nuevos tras la migración. *(Pendiente: devuelve 2 avisos sobre `public.rls_auto_enable()` (función `SECURITY DEFINER` ejecutable por `anon` y `authenticated`), ajenos a esta spec; son los mismos tras las dos migraciones, pero no hay medición previa para confirmar que no son nuevos.)*
- [x] `grep -r "service_role" app components lib` no devuelve resultados.

### Catálogo (conversión de `caida`)

- [x] `select id, title, cat, cover, color, sort_order from games where id = 'caida'` devuelve la misma fila que antes (`PUZZLE`, `cover-tetro`, `magenta`, `sort_order` 2).
- [x] `/games` muestra las mismas 9 tarjetas en el mismo orden; «CAÍDA» conserva su portada `cover-tetro`.
- [x] El filtro PUZZLE sigue incluyendo CAÍDA.
- [x] `/games/caida` muestra el detalle y «JUGAR AHORA» lleva a `/games/caida/jugar`.
- [x] `select count(*) from scores where game_id = 'caida'` devuelve 0 tras la primera migración, y `scores` de los demás juegos no cambian.
- [x] Tras el seed, `scores` tiene 10 filas de `caida` (mejor marca 24 380, `VAULT_07`) y los demás juegos no cambian. *(10 filas al aplicar el seed; después se suman las partidas reales que se jueguen.)*

### Juego

- [x] `/games/caida/jugar` muestra el tablero 300×600 con el panel lateral dentro del marco CRT; no aparecen la arena simulada ni el `setInterval` de puntuación.
- [x] Solo salen las 7 piezas I, O, T, S, Z, J, L: tras ≥ 100 piezas generadas no aparece la tuerca gris `N` ni ninguna pieza de 3×3 en anillo.
- [x] Controles: `←` `→` mueven una columna sin salir del tablero; `↑` y `X` rotan en sentido horario; `↓` baja una fila; `Espacio` baja la pieza hasta el fondo y la fija.
- [x] Wall kicks: rotar una pieza pegada a la pared desplaza `0, -1, +1, -2, +2` columnas, en ese orden, y no gira si ninguna posición es válida.
- [x] Soft drop suma exactamente +1 por fila; hard drop suma +2 por celda recorrida; el HUD lo refleja al instante.
- [x] Limpiar 1, 2, 3 o 4 líneas a la vez suma 100, 300, 500 o 800 puntos × el nivel actual.
- [x] El nivel sube cada 10 líneas (`floor(líneas / 10) + 1`) y la caída automática pasa de 1000 ms a `max(100, 1000 − (nivel − 1) × 90)` ms.
- [x] La pieza fantasma se dibuja con alpha 0,2 donde aterrizará la pieza actual y se mueve con ella.
- [x] El panel NEXT muestra la pieza que saldrá a continuación y coincide con la que aparece al fijar la actual.
- [x] El panel interior muestra SCORE, LINES, LEVEL y CONTROLS con los estilos del original (tema oscuro), sin tema claro ni `localStorage` (`grep -r "localStorage" lib/games/caida components/caida-canvas.tsx` no devuelve resultados).
- [x] El HUD de la plataforma muestra Puntuación y Nivel con los mismos valores que el panel interior, y no muestra «Vidas»; en `asteroids` «Vidas» sigue visible.
- [x] PAUSA (botón) y la tecla `P` congelan el juego (la pieza no cae y las teclas de movimiento no hacen nada) y REANUDAR o `P` continúan sin saltos; `P` actualiza el estado del botón; ocultar la pestaña o perder el foco pausa.
- [x] El game over llega cuando una pieza nueva colisiona al aparecer, o al pulsar FIN, y abre «FIN DEL JUEGO» con la puntuación final correcta; el canvas no muestra su propio overlay ni reinicia con tecla.
- [x] «JUGAR DE NUEVO» reinicia con tablero vacío, puntuación 0, líneas 0 y nivel 1, sin duplicar el bucle (la velocidad de caída no aumenta tras varios reinicios).
- [x] Escribir un nombre en el input del modal (incluidas barra espaciadora y flechas) no mueve ni suelta piezas ni hace scroll.
- [x] Salir con SALIR o navegar a otra ruta no deja listeners ni bucles activos: las flechas y Espacio vuelven a hacer scroll en otras páginas.
- [ ] A ancho ≤ 768 px el panel se apila bajo el tablero sin scroll horizontal; en `(pointer: coarse)` aparece el aviso «requiere teclado». *(Pendiente: la regla CSS `(pointer: coarse)` existe y el aviso está oculto en escritorio, pero no se vio activo en un dispositivo táctil real; el resto del criterio se verificó a 390 px.)*
- [x] La puntuación enviada es un entero entre 0 y 99 999 999.

### Leaderboard

- [x] «GUARDAR PUNTUACIÓN» crea una fila en `scores` con `game_id = 'caida'`, el nombre escrito (o `INVITADO`) y la puntuación final.
- [x] Sin puntuaciones (antes del seed), `/games/caida` muestra «Sé el primero en puntuar»; tras guardar una, aparece en el ranking al recargar.
- [x] Tras el seed, `/games/caida` muestra el top 10 con `VAULT_07` (24 380) en primer lugar y `/salon` muestra podio y tabla de CAÍDA.
- [x] Hay una pestaña «CAÍDA» en `/salon` con podio y tabla coherentes con la vista `leaderboard`.
- [x] Con sesión iniciada, «TU MEJOR MARCA EN CAÍDA» muestra la marca y el rango reales.
- [x] `plays` y «Mejor global» de `/games/caida` coinciden con `count(*)` y `max(score)` de `scores`.

### Sin regresiones

- [x] `/games/asteroids/jugar` funciona como antes (vidas, nivel, pausa, FIN, guardado) tras mover su integración al registro.
- [x] Un simulado (`/games/rocas/jugar`, `/games/serpentina/jugar`) conserva la puntuación que sube sola y las vidas = 3.
- [x] `git diff` no toca `lib/games/asteroids/` ni `components/asteroids-canvas.tsx`.
- [x] `git status` no muestra cambios en `refereences/`.
- [x] `lib/db/`, `app/salon/` y `components/leaderboard.tsx` no cambian.
- [x] La sesión `av_user` sigue funcionando.

### Proceso

- [x] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para el panel lateral, el layout responsive, el aviso de teclado y el HUD sin «Vidas», y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [x] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [x] Capturas de Playwright en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/` (escritorio y ≤ 768 px).
- [x] Tras cada paso con cambios se propuso al usuario un nombre de commit con el formato `feat: descripción corta en inglés` y no se hizo commit sin su confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint` y `npm run build`.
2. `npm run dev`, jugar una partida completa hasta el game over y guardar con nombre y sin nombre.
3. Recorrer con Playwright `/games`, `/games/caida`, `/games/caida/jugar` y `/salon`, en escritorio y ≤ 768 px, y `/games/asteroids/jugar` y `/games/rocas/jugar` para las regresiones.
4. `execute_sql`: comprobar la fila en `scores` y las vistas `leaderboard` y `game_stats`.
5. `get_advisors` de seguridad.

---

## Decisiones tomadas y descartadas

- **Origen: portar el Tetris de `refereences/started-games/03-tetris` con constantes y fórmulas intactas.** _Descartado:_ diseñarlo desde cero.
- **Se elimina la pieza `N` (tuerca).** El original añade este anillo 3×3 a las 7 piezas clásicas y su README no la documenta. Es la única desviación de mecánicas (`randomPiece()` sortea entre 7). _Descartado:_ conservarla; sorteo con bolsa de 7 (cambiaría el balance).
- **Catálogo: conversión de `caida`.** Conserva `id`, portada `cover-tetro`, texto y `sort_order`. _Descartado:_ juego nuevo `tetris` (dos Tetris en el catálogo).
- **Se borran las `scores` de `caida`.** Eran del simulado y no tienen sentido para el juego real. _Descartado:_ conservarlas (falsearían el ranking, con una mejor marca de 184 220).
- **Seed de 10 puntuaciones ficticias para `caida`.** A petición del usuario durante el paso 10, para que el ranking no esté vacío cuando juegue alguien; sigue el formato del seed de los demás juegos y se aplica tras verificar el estado vacío. _Descartado:_ dejar el ranking vacío (mala primera impresión); reutilizar las 10 filas borradas (marcas del simulado, sin sentido para este Tetris).
- **HUD interior conservado tal cual.** A petición del usuario, el panel lateral del original (SCORE, LINES, LEVEL, NEXT, CONTROLS) se mantiene dentro del juego, como bloque React con los estilos del original (solo tema oscuro). _Descartado:_ dibujarlo en el canvas (no reproduce la tipografía y los estilos); HUD solo en la plataforma (regla anterior de SPEC 05, revisada).
- **HUD de la plataforma adaptado.** Puntuación y Nivel reales (duplicados con el panel interior) y «Vidas» oculto con `hasLives: false`. _Descartado:_ mostrar «—» en Vidas (Tetris no tiene vidas); añadir las líneas al HUD de la plataforma (se ven en el panel interior).
- **Canvas lógico 300×600 con panel aparte.** El tablero conserva las medidas del original y el NEXT usa un segundo canvas 120×120 que recibe el motor (`opts.nextCanvas`). _Descartado:_ un canvas único de 420×600 con NEXT dibujado dentro.
- **Título «TETRIS» del original fuera.** La plataforma ya tiene su cabecera con el título.
- **Panel apilado bajo el tablero a ≤ 768 px.** _Descartado:_ escalar todo junto (texto ilegible).
- **Fin de partida por el modal de la plataforma.** Se quita el overlay y el botón «Reiniciar» del original. _Descartado:_ conservar el overlay del canvas.
- **Pausa: botón de la plataforma, atajo `P` y pausa automática.** `P` conserva la tecla del original y avisa por `onPause`. _Descartado:_ solo botón.
- **Sin tema claro/oscuro ni `localStorage`.** La plataforma ya tiene su aspecto. _Descartado:_ portar el selector de tema.
- **`dt` limitado a 50 ms.** El original no lo limita; sin él, al volver de una pestaña oculta caerían o se fijarían varias piezas de golpe. _Descartado:_ copiar el bucle sin límite.
- **Registro de motores en `lib/games/registry.ts`.** Es el segundo motor real, por lo que se generaliza `GamePlayer` y `asteroids` pasa al registro sin tocar su motor. _Descartado:_ un segundo `if (game.id === "caida")`.
- **`lines` queda dentro de `caida-canvas.tsx`.** `GamePlayer` no lo necesita; así no se amplían las props comunes del registro. _Descartado:_ `onLines` en el contrato común.
- **Nombres de commit propuestos, no ejecutados.** Formato `feat: descripción corta en inglés`, a petición del usuario; el commit solo se hace con su confirmación. _Descartado:_ commitear automáticamente al terminar cada paso.
- **Solo teclado.** _Descartado:_ controles táctiles (spec propia).
- **Sin tests automatizados.** Coherente con las specs previas; el motor en módulos puros facilita añadirlos después. _Descartado:_ un runner de tests ahora.

---

## Riesgos identificados

| Riesgo                                                                                            | Mitigación                                                                                                                              |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Doble montaje de React Strict Mode duplica bucle y listeners                                      | `destroy()` idempotente y devuelto siempre por el `useEffect`; criterio de reinicios y de desmontaje                                    |
| `preventDefault` rompe el input del modal o el scroll de otras páginas                            | Capturar solo con el motor activo y el foco fuera de un `input`; `destroy()` quita los listeners                                        |
| `dt` enorme tras volver de una pestaña oculta                                                     | Pausa automática y `dt` ≤ 50 ms                                                                                                         |
| Regresión en `asteroids` y en los simulados al generalizar `GamePlayer`                           | El refactor del paso 7 va aislado y sin cambio funcional; criterios de `asteroids`, `rocas` y `serpentina`; `git diff` limpio del motor |
| Puntuación fuera del rango de la BD (0 a 99 999 999)                                              | Acotarla en el motor antes de `onScore`/`onGameOver`                                                                                    |
| El motor necesita el canvas de NEXT, que vive en el componente React y no existe al crearlo       | `caida-canvas.tsx` crea el motor en `useEffect`, cuando ambos `ref` ya están montados; `nextCanvas` es opcional                         |
| Duplicación de Puntuación y Nivel en dos HUD (plataforma e interior) que se desincronicen         | Ambos leen los mismos callbacks del motor (`onScore`, `onLevel`); criterio de igualdad de valores                                       |
| Choque de estilos entre el CSS del original (`.panel`, `.label`, `.value`, `kbd`) y la plataforma | Todas las clases llevan prefijo `.caida-*` y no se importan reglas globales (`body`, `*`, `kbd`)                                        |
| Entrada rápida (varias teclas por frame) y rotación cerca de la pared dan estados raros           | Lógica pura de `collide` y wall kicks portada literal; criterios de rotación y movimiento                                               |
| Datos ficticios confundidos con reales                                                            | El SQL del seed los marca como ficticios y la migración tiene nombre propio; mismo criterio que el seed de los demás juegos            |
| Borrar `scores` es irreversible                                                                   | Se confirma el `count` previo (10 filas, mejor marca 184 220) y la migración filtra solo `game_id = 'caida'`; son datos del simulado    |

---

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido y música.
- La pieza `N` (tuerca) y cualquier pieza o modo nuevo.
- Mostrar las líneas en el HUD de la plataforma.
- Tema claro/oscuro.
- Soporte HiDPI.
- Los demás juegos del catálogo (Arkanoid, Serpentina…) y cualquier cambio en el motor de Asteroids.
- Cambios de esquema, RLS o capa `lib/db`.
- Autenticación real, anti-trampas y Realtime.
- Seed de puntuaciones de otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
