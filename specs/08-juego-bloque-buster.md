# SPEC 08 — Convertir BLOQUE BUSTER en un Arkanoid real

**Estado:** Implementado
**Depende de:** SPEC 05 (`specs/05-juego-asteroids.md`) por el patrón de motor, canvas y `GamePlayer`; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores` y el leaderboard; SPEC 07 (`specs/07-juego-caida.md`) por el registro de motores `lib/games/registry.ts`
**Fecha:** 2026-10-13
**Objetivo:** Convertir el juego simulado `bloque-buster` en un Arkanoid real, portado de `refereences/started-games/04-arkanoid` (5 niveles, 3 vidas), con HUD, pausa, guardado de puntuación y leaderboard de la plataforma.

---

## Por qué existe esta spec

`bloque-buster` es hoy un juego simulado (puntuación por `setInterval`). Asteroids (SPEC 05) y Caída (SPEC 07) ya son motores reales y el registro de motores existe. Esta spec añade el tercer motor real sin cambiar `GamePlayer`: basta una entrada nueva en `ENGINES`.

Se porta el Arkanoid de `refereences/started-games/04-arkanoid` literalmente (constantes, fórmulas y niveles). Se convierte `bloque-buster` (ARCADE, cyan, `cover-bricks`, `sort_order` 1) en lugar de crear un juego nuevo, para no tener dos Arkanoid en el catálogo. Se conservan su `id`, su portada y su texto, y se descartan sus puntuaciones: eran del simulado y llegan a 28 450, imposible en el juego real (máximo 2 080).

---

## Alcance

### Dentro

- Portar `game.js`, `levels.js` y `assets/spritesheet.js` a módulos TypeScript en `lib/games/bloque-buster/` (`types`, `constants`, `levels`, `sprites`, `entities`, `engine`), sin React, sin `document.getElementById` y sin globales: el motor recibe el `<canvas>` y callbacks.
- Conservar las mecánicas y constantes del original:
  - Canvas lógico 800×600.
  - Pala 81×14 en `y = 560`, velocidad 400 px/s, centrada al iniciar.
  - Bola 16×16; velocidad base `vx = 200`, `vy = -300`, multiplicada por la `speed` del nivel.
  - Rejilla de 10 columnas × 6 filas de bloques de 64×24, origen `x = 80`, `y = 80`.
  - 5 niveles con `speed` 1.00, 1.10, 1.21, 1.33, 1.46 y sus formas (60, 40, 30, 39 y 39 bloques).
  - Rebotes en paredes izquierda, derecha y techo.
  - Rebote en la pala si `vy > 0` y la bola toca su cara superior (tolerancia de 8 px); la bola siempre sube, sin efecto según el punto de impacto.
  - Colisión AABB con bloques: un bloque por frame, `vy = -vy`, +10 puntos.
  - Explosión de 4 frames y 150 ms por bloque roto.
  - 3 vidas; al caer la bola por abajo se pierde una vida y la bola vuelve sobre la pala con la velocidad del nivel.
  - Al vaciar los bloques se pasa al siguiente nivel (la pala y las vidas se conservan).
- Fin de partida: sin vidas, o al vaciar los bloques del nivel 5. En ambos casos `onGameOver` con la puntuación final y el modal de la plataforma (en el original, el segundo caso era «¡Completaste el juego!»).
- Sprites: copiar `assets/spritesheet-breakout.png` a `public/games/bloque-buster/` y portar las coordenadas de `spritesheet.js`. La imagen se carga dentro del motor y el bucle arranca al cargar.
- Componente cliente `components/bloque-buster-canvas.tsx` con limpieza al desmontar (Strict Mode) y leyenda de controles.
- Registro de motores: añadir `bloque-buster` a `ENGINES` (`hasLives: true`) sin cambiar `GamePlayer`.
- Integración en `GamePlayer`: HUD real (Puntuación, Vidas y Nivel del juego, 1 a 5), PAUSA real y automática, FIN y modal «FIN DEL JUEGO» con guardado en `scores`.
- Controles de teclado: `←` `→` mueven la pala; `P` y `Esc` alternan la pausa. `preventDefault` solo con el motor activo y el foco fuera de un `input`. Aviso «requiere teclado» en `(pointer: coarse)`.
- Catálogo: se conserva el `id` `bloque-buster`, su portada `cover-bricks` y su texto. Migración que borra las `scores` de `bloque-buster` y otra que siembra 10 ficticias con marcas realistas (máximo 2 080).
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) para la integración en el marco CRT y la leyenda de controles. No se escribe ni modifica UI sin haberlos invocado antes.
- Revisión de la documentación local de Next 16.4 (`node_modules/next/dist/docs/`) antes de escribir código.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- Control con ratón (`mousemove`) y clic del original.
- Overlay de PAUSA con botones «Saltar al nivel» (atajo de depuración).
- Overlays propios de GAME OVER y «¡Completaste el juego!».
- HUD dibujado en el canvas (Score, Nivel, bolas de vida): lo pinta la plataforma.
- Sonido (`ball-bounce.mp3`, `break-sound.mp3`).
- Controles táctiles.
- Soporte HiDPI.
- Cambios de balance o mecánicas.
- Tests automatizados.
- Cambios en `lib/db/*`, `/salon`, `Leaderboard`, `Library`, RLS o esquema.
- Cambios en `components/game-player.tsx`, salvo que el registro lo exija.
- Los demás juegos del catálogo.
- Modificar `refereences/`.

---

## Modelo de datos

Conversión de un simulado: se conserva el `id` `bloque-buster`, su fila en `games` y su portada `cover-bricks`. No hay `insert` ni cambio de texto del catálogo.

Dos migraciones (`apply_migration`). La primera borra las puntuaciones del simulado:

```sql
-- Puntuaciones del BLOQUE BUSTER simulado (setInterval): no corresponden al Arkanoid real.
delete from public.scores where game_id = 'bloque-buster';
```

Antes: 10 filas, mejor marca 28 450 (imposible en el juego real, cuyo máximo es 2 080). Después, `plays` y «Mejor global» de `/games/bloque-buster` salen a 0 por la vista `game_stats`, y el ranking muestra «Sé el primero en puntuar».

La segunda (`seed_example_bloque_buster_scores`) se aplica **después de verificar los criterios con el ranking vacío**. Siembra 10 puntuaciones ficticias con los mismos apodos y fechas que las filas borradas (cada 3 días, a las 12:00 UTC) y la misma convención que los demás seeds. Las marcas son múltiplos de 10 y no superan 2 080:

```sql
-- Puntuaciones FICTICIAS de ejemplo para BLOQUE BUSTER: jugadores y marcas inventados.
insert into public.scores (game_id, player_name, score, created_at) values
  ('bloque-buster', 'PX_KAI',    1840, '2026-10-01 12:00:00+00'),
  ('bloque-buster', 'NEONFOX',   1520, '2026-09-28 12:00:00+00'),
  ('bloque-buster', 'Z3R0COOL',  1290, '2026-09-25 12:00:00+00'),
  ('bloque-buster', 'M00NRYU',   1070, '2026-09-22 12:00:00+00'),
  ('bloque-buster', 'VAULT_07',   880, '2026-09-19 12:00:00+00'),
  ('bloque-buster', 'GLITCHA',    730, '2026-09-16 12:00:00+00'),
  ('bloque-buster', 'ATARI_KID',  590, '2026-09-13 12:00:00+00'),
  ('bloque-buster', 'CYBER_LU',   450, '2026-09-10 12:00:00+00'),
  ('bloque-buster', 'MAGENTA88',  320, '2026-09-07 12:00:00+00'),
  ('bloque-buster', 'SCANLINE',   180, '2026-09-04 12:00:00+00');
```

Tras el seed, `plays = 10` y «Mejor global» = 1 840 en `/games/bloque-buster`. No se crean tablas ni columnas; no se tocan RLS ni las vistas `leaderboard` y `game_stats` (SPEC 06).

Contrato del motor (igual que el de Asteroids: tiene vidas y niveles):

```ts
// lib/games/bloque-buster/types.ts
export type BloqueBusterCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void; // 1 a 5
  onGameOver: (finalScore: number) => void; // sin vidas, nivel 5 completado o FIN
  onPause?: (paused: boolean) => void; // pestaña oculta, blur o tecla P/Esc
};

export type BloqueBusterEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void; // nivel 1, puntuación 0, 3 vidas
  end: () => void; // fuerza game over (botón FIN)
  destroy: () => void; // cancela rAF y quita todos los listeners
};

// lib/games/bloque-buster/engine.ts
export function createBloqueBuster(
  canvas: HTMLCanvasElement,
  cb: BloqueBusterCallbacks,
): BloqueBusterEngine;

// lib/games/registry.ts  ("use client")
// Entrada nueva: bloque-buster, hasLives: true.
```

Constantes que se conservan tal cual del original:

- Canvas 800×600.
- `PADDLE_SPEED = 400`; pala `w = 81`, `h = 14`, `y = 560`.
- Bola `w = h = 16`; `BASE_BALL_VX = 200`, `BASE_BALL_VY = -300`.
- `BLOCK_COLS = 10`, `BLOCK_ROWS = 6`, `BLOCK_W = 64`, `BLOCK_H = 24`, `BLOCKS_ORIGIN_X = 80`, `BLOCKS_ORIGIN_Y = 80`.
- Vidas iniciales 3; +10 por bloque.
- Tolerancia de la pala: `ball.y + ball.h <= paddle.y + paddle.h + 8`.
- `EXPLOSION_DURATION = 150` ms, 4 frames.
- `speed` por nivel: 1.00, 1.10, 1.21, 1.33, 1.46.
- Niveles y colores de `levels.js` (7 colores de bloque: gray, red, yellow, cyan, magenta, hotpink, green).
- Coordenadas del spritesheet de `spritesheet.js` (pala fuente 162×14 escalada a 81×14).
- `dt` máximo 50 ms (regla de la plataforma; el original no lo limita).

---

## Archivos a crear / modificar

| Archivo                                                | Acción                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `lib/games/bloque-buster/types.ts`                     | crear: `BloqueBusterCallbacks`, `BloqueBusterEngine`                                                         |
| `lib/games/bloque-buster/constants.ts`                 | crear: dimensiones, velocidades, vidas, puntos, tolerancia, `dt` máximo                                      |
| `lib/games/bloque-buster/levels.ts`                    | crear: `LEVELS` (5 niveles, `speed` y `blocks`)                                                              |
| `lib/games/bloque-buster/sprites.ts`                   | crear: coordenadas, `EXPLOSION_FRAMES`, carga de imagen y `drawSprite`/`drawFrame` por parámetro             |
| `lib/games/bloque-buster/entities.ts`                  | crear: tipos `Paddle`, `Ball`, `Block`, `Explosion`; colisión AABB y rebotes puros                           |
| `lib/games/bloque-buster/engine.ts`                    | crear: `createBloqueBuster` (estado, input, bucle con `dt` ≤ 50 ms, callbacks, pausa, restart, end, destroy) |
| `components/bloque-buster-canvas.tsx`                  | crear: canvas 800×600 y leyenda de controles; expone `pause/resume/restart/end`                              |
| `lib/games/registry.ts`                                | modificar: entrada `bloque-buster`                                                                           |
| `app/globals.css`                                      | modificar: estilos del canvas, leyenda y aviso de teclado; `cover-bricks` no cambia                          |
| `public/games/bloque-buster/spritesheet-breakout.png`  | crear: copia del original                                                                                    |
| Migración Supabase (`apply_migration`)                 | crear (2): `delete` de `scores` de `bloque-buster` y seed de 10 puntuaciones ficticias                       |
| `components/game-player.tsx`                           | **no se modifica** (el registro basta)                                                                       |
| `lib/games/asteroids/`, `lib/games/caida/`, sus canvas | **no se modifican**                                                                                          |
| `refereences/started-games/04-arkanoid/`               | **no se modifica**                                                                                           |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre componentes cliente y `cacheComponents` con APIs de navegador (`canvas`, `Image`, rAF, `window`) solo dentro de `useEffect`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** y volver a aplicarlos en el paso 6 (marco CRT, canvas 800×600, leyenda y aviso de teclado).
3. **Constantes, tipos y niveles:** `lib/games/bloque-buster/{types,constants,levels}.ts`, portando literalmente los valores de `game.js` y `levels.js`. Comprobar que los niveles suman 60, 40, 30, 39 y 39 bloques.
4. **Sprites y entidades:** copiar el PNG a `public/games/bloque-buster/`. `sprites.ts` con las coordenadas, `EXPLOSION_FRAMES`, la carga de la imagen y `drawSprite`/`drawFrame`, que reciben `ctx` por parámetro. `entities.ts` con los tipos, la colisión AABB, el rebote en paredes y pala, y la creación de bloques de un nivel. Todo sin globales.
5. **Motor:** `engine.ts` con `createBloqueBuster`.
   - Input por listeners en `window` (`←` `→` mueven la pala; `P` y `Esc` alternan pausa y avisan por `onPause`), con `preventDefault` solo con el motor activo y el foco fuera de un `input`.
   - Bucle rAF con `dt` ≤ 50 ms, que arranca cuando la imagen termina de cargar. `destroy()` durante la carga cancela el arranque.
   - Pausa automática por `visibilitychange` y `blur`.
   - Pierde vida si la bola cae; sin vidas, o al vaciar el nivel 5, detiene el bucle y llama a `onGameOver`.
   - Dibuja bloques, explosiones, pala y bola. No dibuja HUD, overlays ni reinicio con tecla.
   - Emite `onScore`, `onLives` y `onLevel` (también al iniciar y al reiniciar).
6. **Componente canvas y estilos:** `bloque-buster-canvas.tsx` con el canvas 800×600, la leyenda de controles y el aviso «requiere teclado». Crea el motor en `useEffect` y lo destruye al desmontar (Strict Mode). Estilos y escalado por CSS dentro de `.crt-screen` en `app/globals.css`.
7. **Registro y conexión:** añadir `bloque-buster` a `ENGINES` (`hasLives: true`, `ariaLabel` propio). `GamePlayer` no se toca. Comprobar `/games/bloque-buster/jugar`, `/games/asteroids/jugar`, `/games/caida/jugar` y un simulado.
8. **Migración 1:** `apply_migration` con el `delete` de `scores`. Comprobar con `execute_sql` (`count(*)` en 0) y `get_advisors` de seguridad.
9. **Verificación y seed:** recorrer los criterios de aceptación con el ranking vacío; después aplicar la migración 2 (seed ficticio) y verificar el ranking.

La verificación va en los criterios de aceptación, no en un paso del plan.

### Nombres de commit

Al terminar cada paso con cambios, quien implemente (`/spec-impl`) **propone** al usuario un nombre de commit con el formato `feat: descripción corta en inglés`, y **no ejecuta el commit** hasta que el usuario lo confirme.

| Paso | Commit propuesto                                      |
| ---- | ----------------------------------------------------- |
| 3    | `feat: add bloque-buster constants, types and levels` |
| 4    | `feat: add bloque-buster sprites and entities`        |
| 5    | `feat: add bloque-buster game engine`                 |
| 6    | `feat: add bloque-buster canvas component`            |
| 7    | `feat: connect bloque-buster engine to game player`   |
| 8    | `feat: clear simulated bloque-buster scores`          |
| 9    | `feat: seed example bloque-buster scores`             |

Los pasos 1 y 2 (lectura de documentación y skills) no producen cambios, por lo que no llevan commit. Los nombres se ajustan si el contenido real del paso cambia.

---

## Criterios de aceptación

### Build y calidad

- [x] `npm run lint` y `npm run build` terminan sin errores.
- [x] `get_advisors` (seguridad) no reporta avisos nuevos tras la migración. Si salen avisos, anotar si son previos (los 2 de `public.rls_auto_enable()` ya existían en SPEC 07). *(Verificado: salen los 2 avisos de `public.rls_auto_enable()` que ya existían en SPEC 07; no hay ninguno nuevo.)*
- [x] `grep -r "service_role" app components lib` no devuelve resultados.

### Catálogo (conversión de `bloque-buster`)

- [x] `select id, title, cat, cover, color, sort_order from games where id = 'bloque-buster'` devuelve la misma fila que antes (`ARCADE`, `cover-bricks`, `cyan`, `sort_order` 1).
- [x] `/games` muestra las mismas 9 tarjetas en el mismo orden; «BLOQUE BUSTER» conserva su portada `cover-bricks`.
- [x] El filtro ARCADE sigue incluyendo BLOQUE BUSTER.
- [x] `/games/bloque-buster` muestra el detalle y «JUGAR AHORA» lleva a `/games/bloque-buster/jugar`.
- [x] `select count(*) from scores where game_id = 'bloque-buster'` devuelve 0 tras la primera migración, y `scores` de los demás juegos no cambian.
- [x] Tras el seed, `scores` tiene 10 filas de `bloque-buster` (mejor marca 1 840, `PX_KAI`) y los demás juegos no cambian.

### Juego

- [x] `/games/bloque-buster/jugar` muestra el canvas 800×600 dentro del marco CRT; no aparecen la arena simulada ni el `setInterval` de puntuación.
- [x] El nivel 1 muestra 60 bloques en 6 filas con los colores `red, yellow, cyan, magenta, hotpink, green`; los niveles 2 a 5 muestran 40, 30, 39 y 39 bloques con las formas de `levels.js`.
- [x] Controles: `←` y `→` mueven la pala a 400 px/s sin salir del canvas; sin tecla, la pala no se mueve; el ratón no la mueve.
- [x] Al iniciar, la pala está centrada y la bola sobre ella sale con `vx = 200`, `vy = -300` (nivel 1). *(Verificado por constantes y por simulación del motor, no medido en el navegador.)*
- [x] La bola rebota en las paredes izquierda, derecha y techo, y en la pala siempre hacia arriba, sin cambiar `vx` según el punto de impacto. *(Verificado por simulación del motor: un autojugador sostiene la bola con la pala y las paredes durante la partida completa.)*
- [x] Romper un bloque suma exactamente 10 puntos, invierte `vy`, dibuja la explosión de 4 frames durante 150 ms y el HUD de la plataforma lo refleja al instante. Dos bloques no se rompen en el mismo frame. *(Puntos, `vy` y un bloque por frame verificados con la simulación; los 4 frames y los 150 ms, solo por código.)*
- [x] Al vaciar los bloques de un nivel del 1 al 4 se carga el siguiente: nivel del HUD +1, bola sobre la pala con la `speed` del nuevo nivel (1.10, 1.21, 1.33, 1.46), puntuación y vidas conservadas. *(Verificado por simulación: cambios de nivel con 600, 1 000, 1 300 y 1 690 puntos.)*
- [x] Si la bola cae por abajo, las vidas bajan en 1 y el HUD lo muestra; la bola vuelve sobre la pala con la velocidad del nivel actual; los bloques rotos siguen rotos.
- [x] El HUD muestra Puntuación, Vidas (3 al empezar) y Nivel (1 a 5) con valores reales; «Vidas» está visible.
- [x] PAUSA (botón) y las teclas `P` y `Esc` congelan el juego (bola, pala y explosiones no se mueven) y REANUDAR o la tecla continúan sin saltos; el estado del botón se actualiza con la tecla; ocultar la pestaña o perder el foco pausa.
- [x] El game over llega con 0 vidas, al vaciar el nivel 5 o al pulsar FIN, y abre «FIN DEL JUEGO» con la puntuación final correcta; el canvas no muestra GAME OVER ni «¡Completaste el juego!», ni reinicia con tecla.
- [x] El canvas no pinta HUD (Score, Nivel, bolas de vida) ni overlay de pausa ni botones «Saltar al nivel».
- [x] «JUGAR DE NUEVO» reinicia en nivel 1, 3 vidas, puntuación 0 y bloques completos, sin duplicar el bucle (la velocidad de la bola no aumenta tras varios reinicios).
- [x] Escribir un nombre en el input del modal (incluidas barra espaciadora y flechas) no mueve la pala ni hace scroll.
- [x] Salir con SALIR o navegar a otra ruta no deja listeners ni bucles activos: las flechas vuelven a hacer scroll en otras páginas; salir antes de que cargue el spritesheet no arranca un bucle huérfano. *(Salir de `/jugar` con la partida en curso deja de capturar `←`, `→` y `Esc`. Salir antes de que cargue el spritesheet, solo por código.)*
- [x] A ancho ≤ 768 px el canvas se escala sin scroll horizontal; en `(pointer: coarse)` aparece el aviso «requiere teclado». *(Verificado a 390 px: sin scroll horizontal y canvas a 310 px. El aviso se comprobó con un contexto táctil emulado, `(pointer: coarse)` = true, sin dispositivo físico.)*
- [x] La puntuación enviada es un entero entre 0 y 99 999 999 (máximo real 2 080).
- [x] `grep -r "Audio\|mousemove\|localStorage" lib/games/bloque-buster components/bloque-buster-canvas.tsx` no devuelve resultados.

### Leaderboard

- [x] «GUARDAR PUNTUACIÓN» crea una fila en `scores` con `game_id = 'bloque-buster'`, el nombre escrito (o `INVITADO`) y la puntuación final.
- [x] Sin puntuaciones (antes del seed), `/games/bloque-buster` muestra «Sé el primero en puntuar»; tras guardar una, aparece en el ranking al recargar.
- [x] Tras el seed, `/games/bloque-buster` muestra el top 10 con `PX_KAI` (1 840) en primer lugar y `/salon` muestra podio y tabla de BLOQUE BUSTER.
- [x] Hay una pestaña «BLOQUE BUSTER» en `/salon` con podio y tabla coherentes con la vista `leaderboard`.
- [x] Con sesión iniciada, «TU MEJOR MARCA EN BLOQUE BUSTER» muestra la marca y el rango reales.
- [x] `plays` y «Mejor global» de `/games/bloque-buster` coinciden con `count(*)` y `max(score)` de `scores`.

### Sin regresiones

- [x] `/games/asteroids/jugar` y `/games/caida/jugar` funcionan como antes. *(Verificado jugando: `asteroids` con 3 vidas, nivel 01, puntos al disparar, pausa y FIN; `caida` sin «Vidas», soft y hard drop, `P` y FIN.)*
- [x] Un simulado (`/games/rocas/jugar`, `/games/serpentina/jugar`) conserva la puntuación que sube sola y las vidas = 3. *(Verificado: `rocas` y `serpentina` suben la puntuación solas (0 a 615 y 0 a 780 en 3 s), con 3 vidas, sin canvas y con la arena simulada.)*
- [x] `git diff` no toca `components/game-player.tsx`, `lib/games/asteroids/`, `lib/games/caida/`, `components/asteroids-canvas.tsx` ni `components/caida-canvas.tsx`.
- [x] `git status` no muestra cambios en `refereences/`.
- [x] `lib/db/`, `app/salon/` y `components/leaderboard.tsx` no cambian.
- [x] La sesión `av_user` sigue funcionando.

### Proceso

- [x] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para la integración en el marco CRT, la leyenda y el aviso de teclado, y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [x] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [x] Capturas de Playwright en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/` (escritorio y ≤ 768 px). *(El juego se capturó también a 390 px; las demás pantallas, solo en escritorio.)*
- [x] Tras cada paso con cambios se propuso al usuario un nombre de commit con el formato `feat: descripción corta en inglés` y no se hizo commit sin su confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint` y `npm run build`.
2. `npm run dev`, jugar una partida hasta el game over, otra superando niveles, y guardar con nombre y sin nombre.
3. Recorrer con Playwright `/games`, `/games/bloque-buster`, `/games/bloque-buster/jugar` y `/salon`, en escritorio y ≤ 768 px, y `/games/asteroids/jugar`, `/games/caida/jugar` y `/games/rocas/jugar` para las regresiones.
4. `execute_sql`: comprobar la fila en `scores` y las vistas `leaderboard` y `game_stats`.
5. `get_advisors` de seguridad.

---

## Decisiones tomadas y descartadas

- **Origen: portar el Arkanoid de `refereences/started-games/04-arkanoid` con constantes y fórmulas intactas.** Incluye la pala de 81 px que usa `game.js` (el `CLAUDE.md` de la referencia dice 162, pero es el ancho del sprite fuente, no el del juego), un bloque por frame y el rebote vertical fijo en la pala. _Descartado:_ diseñarlo desde cero; añadir efecto según el punto de impacto en la pala (cambiaría el balance).
- **Catálogo: conversión de `bloque-buster`.** Conserva `id`, portada `cover-bricks`, texto y `sort_order`. _Descartado:_ juego nuevo `arkanoid` (dos Arkanoid en el catálogo).
- **Se borran las `scores` de `bloque-buster`.** Eran del simulado y llegan a 28 450, imposible en el juego real (máximo 2 080). _Descartado:_ conservarlas (falsearían el ranking).
- **Seed de 10 puntuaciones ficticias.** Mismos apodos y fechas que las filas borradas, marcas realistas (máximo 1 840) y aplicado tras verificar el estado vacío, como en SPEC 07. _Descartado:_ dejar el ranking vacío; reutilizar las marcas del simulado.
- **HUD de la plataforma, no del canvas.** Puntuación, Vidas (3) y Nivel (1 a 5) llegan por callbacks. _Descartado:_ el HUD dibujado del original (duplicado).
- **Nivel del HUD = nivel del juego (1 a 5).** _Descartado:_ el nivel genérico de la plataforma (`1 + floor(score / 2500)`), que no tendría sentido aquí.
- **Terminar el nivel 5 es game over.** Llama a `onGameOver` con la puntuación final y abre el modal. _Descartado:_ overlay «¡Completaste el juego!» del original; seguir en bucle de niveles (cambio de mecánica).
- **Fin de partida por el modal de la plataforma.** Se quitan los overlays de GAME OVER y victoria. _Descartado:_ conservarlos en el canvas.
- **Pausa: botón de la plataforma, teclas `P` y `Esc`, y pausa automática.** Las teclas conservan las del original y avisan por `onPause`. Se quitan los botones «Saltar al nivel» (atajo de depuración que permitiría saltarse el juego). _Descartado:_ conservar el overlay de pausa con salto de nivel; solo botón.
- **Solo teclado.** Se quita el `mousemove` y el clic del original: es menos trabajo y evita dos esquemas de control. _Descartado:_ ratón (complica el aviso de teclado y el foco); controles táctiles (spec propia).
- **Spritesheet sí, sonido no.** El PNG va a `public/games/bloque-buster/`. Los dos mp3 quedan fuera: la plataforma aún no tiene control de silencio. _Descartado:_ incluir sonido; dibujar bloques con formas del canvas en vez de sprites (pierde el aspecto del original).
- **Carga de la imagen dentro del motor.** El bucle arranca al terminar la carga y `destroy()` la cancela. _Descartado:_ cargarla en el componente React (acopla motor y UI) o con globales de módulo como `spritesheet.js`.
- **Sin cuenta atrás al perder una vida.** La bola sale al instante, como en el original. _Descartado:_ añadir una pausa de relanzamiento (cambio de mecánica).
- **`dt` limitado a 50 ms.** El original no lo limita; sin él, al volver de una pestaña oculta la bola atravesaría bloques o la pala. _Descartado:_ copiar el bucle sin límite.
- **`GamePlayer` no se toca.** El registro de SPEC 07 basta: solo se añade una entrada. _Descartado:_ cambios en `GamePlayer`.
- **Nombres de commit propuestos, no ejecutados.** Formato `feat: descripción corta en inglés`; el commit solo se hace con confirmación. _Descartado:_ commitear automáticamente al terminar cada paso.
- **Sin atajo de depuración para saltar de nivel.** Los niveles 2 a 5 y la victoria se verifican con Playwright (`page.evaluate`) sin añadir código al motor. _Descartado:_ exponer un salto de nivel en desarrollo (código de depuración en producción).
- **Sin tests automatizados.** Coherente con las specs previas; el motor en módulos puros facilita añadirlos después. _Descartado:_ un runner de tests ahora.

---

## Riesgos identificados

| Riesgo                                                                           | Mitigación                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doble montaje de React Strict Mode duplica bucle y listeners                     | `destroy()` idempotente y devuelto siempre por el `useEffect`; criterio de reinicios y de desmontaje                                                               |
| `destroy()` antes de que cargue el spritesheet deja un bucle huérfano            | El arranque comprueba un indicador de destruido al terminar la carga; criterio de salida durante la carga                                                          |
| `preventDefault` rompe el input del modal o el scroll de otras páginas           | Capturar solo `←` `→` con el motor activo y el foco fuera de un `input`; `destroy()` quita los listeners                                                           |
| `Esc` captura una tecla que otros componentes (modal) usan para cerrarse         | Ignorar `Esc` si el foco está en un `input` o hay un modal abierto; el motor solo alterna la pausa y no hace `preventDefault`                                      |
| `dt` enorme tras volver de una pestaña oculta                                    | Pausa automática y `dt` ≤ 50 ms                                                                                                                                    |
| La bola atraviesa un bloque o la pala a velocidad alta (nivel 5: 1.46)           | Se conserva la colisión del original, que es la que da el balance; con `dt` ≤ 50 ms el desplazamiento máximo es 22 px por frame, aceptado por ser fiel al original |
| Un bloque por frame hace que la bola «se quede dentro» de la rejilla en esquinas | Comportamiento del original, conservado; se anota para una spec de balance                                                                                         |
| Pala de 81 px frente a los 162 px del sprite fuente                              | El sprite se escala a 81×14 al dibujar, como hace `drawSprite`; criterio visual con captura                                                                        |
| Regresión en Asteroids, Caída y simulados al tocar el registro                   | Solo se añade una entrada; `GamePlayer` y los motores existentes no cambian; criterios de regresión y `git diff` limpio                                            |
| Puntuación fuera del rango de la BD (0 a 99 999 999)                             | Máximo real 2 080; se acota en el motor antes de `onScore`/`onGameOver` por seguridad                                                                              |
| Datos ficticios confundidos con reales                                           | El SQL del seed los marca como ficticios y la migración tiene nombre propio; mismo criterio que los demás seeds                                                    |
| Borrar `scores` es irreversible                                                  | Se confirma el `count` previo (10 filas, mejor marca 28 450) y la migración filtra solo `game_id = 'bloque-buster'`; son datos del simulado                        |

---

## Lo que **no** entra en esta spec

- Controles táctiles y ratón.
- Sonido.
- Salto de nivel o cualquier atajo de depuración.
- Power-ups, bloques de varios golpes, efecto de la pala según el punto de impacto o cualquier mecánica nueva.
- Cambios de balance (velocidades, vidas, puntos).
- Soporte HiDPI.
- Los demás juegos del catálogo y cualquier cambio en los motores de Asteroids y Caída.
- Cambios en `GamePlayer`, esquema, RLS o capa `lib/db`.
- Autenticación real, anti-trampas y Realtime.
- Seed de puntuaciones de otros juegos.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
