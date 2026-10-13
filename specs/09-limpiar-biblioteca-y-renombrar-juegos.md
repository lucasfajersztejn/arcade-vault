# SPEC 09 — Limpiar la biblioteca y renombrar los juegos reales

**Estado:** Aprobado 
**Depende de:** SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores` y la FK `on delete cascade`; SPEC 07 (`specs/07-juego-caida.md`) y SPEC 08 (`specs/08-juego-bloque-buster.md`) por los motores reales de `caida` y `bloque-buster`; SPEC 05 (`specs/05-juego-asteroids.md`) por `asteroids`
**Fecha:** 2026-10-13
**Objetivo:** Dejar en el catálogo solo los tres juegos con motor real (Bloque Buster, Caída y Asteroids), eliminando los seis simulados y sus puntuaciones, y renombrar de cara al usuario Caída como TETRIS y Bloque Buster como ARKANOID.

---

## Por qué existe esta spec

El catálogo tiene 9 juegos, pero solo 3 son jugables (`bloque-buster`, `caida`, `asteroids`). Los otros 6 (`serpentina`, `gloton`, `invasores`, `rocas`, `ranaria`, `duelo-pixel`) son simulados: puntuación por `setInterval` y una arena decorativa. Se quitan para que la biblioteca solo ofrezca lo que se puede jugar de verdad.

Los nombres «Caída» y «Bloque Buster» eran los de la plantilla. Los juegos reales son un Tetris y un Arkanoid, y así se llamarán. `asteroids` no cambia.

---

## Alcance

### Dentro

- **Migración** (`apply_migration`) que elimina de `games` los 6 juegos simulados. Sus 60 filas de `scores` desaparecen por `on delete cascade` (10 por juego).
- **Renombrado solo del título visible**: `games.title` de `caida` pasa a `TETRIS` y el de `bloque-buster` a `ARKANOID`. `asteroids` queda como `ASTEROIDS`.
- **Orden del catálogo**: `sort_order` se compacta a `bloque-buster` = 1, `caida` = 2, `asteroids` = 3, de modo que la biblioteca muestra ARKANOID, TETRIS, ASTEROIDS.
- **Textos con el nombre antiguo**: `ariaLabel` de `lib/games/registry.ts` («Juego Caída en curso», «Juego Bloque Buster en curso») pasa a usar el título nuevo. `short` y `long` de los tres juegos no contienen el nombre antiguo y no cambian.
- **Filtro de categorías**: se quita `"VERSUS"` de `CATS` en `lib/data.ts`, porque ningún juego restante es VERSUS. Quedan TODOS, ARCADE, PUZZLE y SHOOTER.
- **Borrar las portadas CSS** de los 6 juegos eliminados en `app/globals.css`: `cover-snake`, `cover-glot`, `cover-invaders`, `cover-rocas`, `cover-rana` y `cover-duelo` (con sus `::before`/`::after`). Se conservan `cover-bricks`, `cover-tetro` y `cover-asteroids`.
- **Borrar la simulación de `GamePlayer`**: el `useEffect` con `setInterval`, la rama `.game-arena` (`grid-floor`, `enemy`, `player-ship`), el nivel calculado por puntuación (`POINTS_PER_LEVEL`) y las ramas `hasEngine`. `GamePlayer` pasa a exigir un motor: si `ENGINES[game.id]` no existe, la ruta cae en el 404 (`notFound()`, a confirmar con la doc de Next 16.4).
- **Borrar el CSS de la arena simulada** en `app/globals.css`: `.game-arena` y sus hijos (`.grid-floor`, `.player-ship`, `.enemy`, `.e1`, `.e2`, `.e3`) y los `@keyframes bob` y `drift`. `@keyframes gridscroll` se conserva: también lo usa el fondo de la línea 106.
- **Actualizar la skill `/nuevo-juego`** (`.claude/skills/nuevo-juego/`): quitar de `SKILL.md`, `template-juego.md` y `reference/*` las referencias a juegos simulados (`rocas`, `serpentina`, «conversión de un simulado», regresión con un simulado, «sin arena simulada ni `setInterval`») y dejar como ejemplos de regresión los tres juegos reales. Pasa a ser siempre un juego nuevo con motor.
- Se conservan **las puntuaciones de los tres juegos que se quedan** (las sembradas y las reales guardadas), sin tocarlas.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- **Cambiar `id`/URL**: `/games/caida`, `/games/bloque-buster` y `/games/asteroids` no cambian. Tampoco las FK de `scores`.
- **Renombrar carpetas, componentes, clases CSS o portadas**: `lib/games/caida/`, `lib/games/bloque-buster/`, `components/caida-canvas.tsx`, `components/bloque-buster-canvas.tsx`, `.caida-*`, `cover-tetro`, `cover-bricks` y similares se quedan como están.
- **Quitar `VERSUS` del `CHECK` de `games.cat` y del tipo `GameCategory`**: se mantienen para juegos futuros.
- **Cambiar `short`, `long`, `cat`, `cover` o `color`** de los tres juegos.
- **Tocar los motores, `lib/db/*`, RLS, vistas o esquema.** `GamePlayer` solo se toca para quitar la simulación.
- **Cambiar la lógica de los tres juegos reales en `GamePlayer`** (HUD, pausa, FIN, guardado): se conserva tal cual.
- **Editar specs anteriores ni `refereences/`**: las specs 01 a 08 son histórico y conservan los nombres de su época.
- Tests automatizados.

---

## Modelo de datos

No se crean tablas ni columnas. Una migración de datos, `clean_catalog_and_rename_games`:

```sql
-- Se eliminan los juegos simulados; sus scores caen por on delete cascade.
delete from public.games
where id in ('serpentina', 'gloton', 'invasores', 'rocas', 'ranaria', 'duelo-pixel');

-- Renombrado de cara al usuario; los id (slugs) no cambian.
update public.games set title = 'ARKANOID', sort_order = 1 where id = 'bloque-buster';
update public.games set title = 'TETRIS',    sort_order = 2 where id = 'caida';
update public.games set                      sort_order = 3 where id = 'asteroids';
```

Estado esperado tras la migración:

| id              | title     | cat     | cover             | sort_order |
| --------------- | --------- | ------- | ----------------- | ---------- |
| `bloque-buster` | ARKANOID  | ARCADE  | `cover-bricks`    | 1          |
| `caida`         | TETRIS    | PUZZLE  | `cover-tetro`     | 2          |
| `asteroids`     | ASTEROIDS | SHOOTER | `cover-asteroids` | 3          |

Antes de aplicarla, `select game_id, count(*) from scores group by game_id` confirma 60 filas en los 6 juegos a borrar y 11, 11 y 11 en `bloque-buster`, `caida` y `asteroids` (deben quedar igual).

Cambio de código (sin tipos nuevos):

```ts
// lib/data.ts
export const CATS = [ALL_CATEGORIES, "ARCADE", "PUZZLE", "SHOOTER"] as const; // sin "VERSUS"
// lib/types.ts: GameCategory conserva "VERSUS" (se mantiene el CHECK de la BD).

// components/game-player.tsx: sin rama simulada. Los hooks se llaman siempre; después:
const engine = ENGINES[game.id];
if (!engine) notFound(); // next/navigation; sin motor no hay juego jugable
```

---

## Archivos a crear / modificar

| Archivo                                                                      | Acción                                                                                                                     |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Migración Supabase (`apply_migration`)                                       | crear: `clean_catalog_and_rename_games` (delete de 6 juegos, update de títulos y `sort_order`)                             |
| `lib/games/registry.ts`                                                      | modificar: `ariaLabel` de `caida` y `bloque-buster` con los títulos nuevos                                                 |
| `lib/data.ts`                                                                | modificar: quitar `"VERSUS"` de `CATS`                                                                                     |
| `lib/supabase/database.types.ts`                                             | **no se modifica** (no cambia el esquema)                                                                                  |
| `components/game-player.tsx`                                                 | modificar: quitar simulación (`setInterval`, `.game-arena`, `POINTS_PER_LEVEL`, ramas `hasEngine`); `notFound()` sin motor |
| `app/globals.css`                                                            | modificar: borrar 6 portadas, `.game-arena` y sus hijos, `@keyframes bob` y `drift`                                        |
| `.claude/skills/nuevo-juego/SKILL.md`, `template-juego.md`, `reference/*.md` | modificar: quitar referencias a simulados y a `rocas`/`serpentina`                                                         |
| `lib/games/*/engine`, `lib/db/`                                              | **no se modifican**                                                                                                        |
| `refereences/`, `specs/01` a `specs/08`                                      | **no se modifican**                                                                                                        |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Estado previo:** `execute_sql` con el catálogo y `select game_id, count(*) from scores group by game_id order by game_id`. Anotar los conteos para los criterios.
2. **Migración:** `apply_migration` con `clean_catalog_and_rename_games`. Comprobar con `execute_sql` (3 filas en `games`, títulos y `sort_order` esperados, 0 `scores` de los juegos borrados, 11 en cada juego que queda) y `get_advisors` de seguridad.
3. **Código:** actualizar `ariaLabel` en `lib/games/registry.ts` y quitar `"VERSUS"` de `CATS` en `lib/data.ts`. Buscar con `grep` restos de los nombres antiguos en `app`, `components` y `lib`.
4. **Quitar la simulación de `GamePlayer`:** leer la doc local de Next 16.4 sobre `notFound()` en componentes cliente. Eliminar el `useEffect` con `setInterval`, `POINTS_PER_LEVEL`, las ramas `hasEngine` y la rama `.game-arena`; `notFound()` si no hay motor. Comprobar con `grep` que no quedan `setInterval` ni `game-arena` en `components/`.
5. **Limpiar CSS:** invocar `/frontend-design` y `/ui-ux-pro-max` si el borrado afecta al aspecto de la biblioteca o del marco CRT. Borrar de `app/globals.css` las 6 portadas, `.game-arena` con sus hijos y `@keyframes bob`/`drift`. Conservar `gridscroll`, `cover-bricks`, `cover-tetro` y `cover-asteroids`. Comprobar con `grep` que ninguna clase borrada se usa en `app`, `components` o `lib`.
6. **Actualizar la skill `/nuevo-juego`:** editar `SKILL.md`, `template-juego.md` y `reference/*.md` para quitar «conversión de un simulado», la regresión con un simulado y el criterio «sin arena simulada ni `setInterval`»; usar los tres juegos reales en los ejemplos.
7. **Verificación:** `npm run lint` y `npm run build`; recorrer con Playwright `/games`, `/games/bloque-buster`, `/games/caida`, `/games/asteroids`, `/salon`, las tres rutas `/jugar` y una ruta eliminada (`/games/rocas`), en escritorio y a ≤ 768 px; recorrer los criterios de aceptación.

La verificación va en los criterios de aceptación.

### Nombres de commit

Al terminar cada paso con cambios, quien implemente (`/spec-impl`) **propone** al usuario un nombre de commit con el formato `feat: descripción corta en inglés` y **no ejecuta el commit** hasta que el usuario lo confirme.

| Paso | Commit propuesto                                           |
| ---- | ---------------------------------------------------------- |
| 2    | `feat: remove simulated games and rename tetris, arkanoid` |
| 3    | `feat: update game labels and drop versus filter`          |
| 4    | `feat: remove simulated game from game player`             |
| 5    | `feat: remove unused game covers and arena styles`         |
| 6    | `feat: update nuevo-juego skill for real engines only`     |

Los pasos 1 y 7 no producen cambios, por lo que no llevan commit. Los nombres se ajustan si el contenido real del paso cambia.

---

## Criterios de aceptación

### Build y calidad

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `get_advisors` (seguridad) no reporta avisos nuevos tras la migración (los 2 de `public.rls_auto_enable()` ya existían).
- [ ] `grep -r "service_role" app components lib` no devuelve resultados.

### Catálogo

- [ ] `select id, title, cat, cover, color, sort_order from games order by sort_order` devuelve exactamente 3 filas: `bloque-buster` / ARKANOID / ARCADE / `cover-bricks` / 1; `caida` / TETRIS / PUZZLE / `cover-tetro` / 2; `asteroids` / ASTEROIDS / SHOOTER / `cover-asteroids` / 3.
- [ ] `select count(*) from scores where game_id in ('serpentina','gloton','invasores','rocas','ranaria','duelo-pixel')` devuelve 0.
- [ ] `scores` de `bloque-buster`, `caida` y `asteroids` conservan sus 11 filas cada uno (los conteos del paso 1).
- [ ] `/games` muestra exactamente 3 tarjetas, en este orden: ARKANOID, TETRIS, ASTEROIDS, cada una con su portada.
- [ ] El filtro de categorías muestra TODOS, ARCADE, PUZZLE y SHOOTER (sin VERSUS); cada filtro lista exactamente su juego, y TODOS lista los 3.
- [ ] `/games/bloque-buster`, `/games/caida` y `/games/asteroids` muestran el detalle con el título nuevo (ARKANOID, TETRIS, ASTEROIDS) y su ranking de 10 filas.
- [ ] `/games/rocas`, `/games/serpentina` y las demás rutas de juegos eliminados devuelven el 404 de la plataforma (SPEC 02), tanto el detalle como `/jugar`.
- [ ] No queda «Bloque Buster» ni «Caída» como nombre de juego en la UI: `grep -rE "Bloque Buster|BLOQUE BUSTER|Juego Caída|CAÍDA" app components lib` no devuelve resultados.

### Limpieza de código

- [ ] `grep -rE "setInterval|game-arena|grid-floor|player-ship|POINTS_PER_LEVEL|hasEngine" components app lib` no devuelve resultados.
- [ ] `grep -E "cover-(snake|glot|invaders|rocas|rana|duelo)|\.game-arena|@keyframes (bob|drift)" app/globals.css` no devuelve resultados, y `cover-bricks`, `cover-tetro`, `cover-asteroids` y `@keyframes gridscroll` siguen presentes.
- [ ] Ninguna clase CSS borrada se referencia en `app`, `components` o `lib`.
- [ ] Un `id` de juego sin entrada en `ENGINES` (p. ej. `/games/rocas/jugar`) devuelve el 404 de la plataforma, no una pantalla rota.
- [ ] `grep -riE "rocas|serpentina|simulad|setInterval|game-arena" .claude/skills/nuevo-juego` no devuelve resultados.
- [ ] `/nuevo-juego` sigue coherente: no ofrece «conversión de un simulado» y sus ejemplos y criterios de regresión citan `asteroids`, `caida` y `bloque-buster`.

### Juego

- [ ] `/games/bloque-buster/jugar` y `/games/caida/jugar` y `/games/asteroids/jugar` funcionan como antes (canvas, HUD, pausa, FIN y modal de guardado).
- [ ] El `aria-label` del juego en curso usa «Arkanoid» y «Tetris».

### Leaderboard

- [ ] `/salon` muestra exactamente 3 pestañas (ARKANOID, TETRIS, ASTEROIDS), cada una con podio y tabla coherentes con la vista `leaderboard`.
- [ ] Guardar una puntuación en cualquiera de los tres juegos crea una fila en `scores` con el `game_id` original y aparece en el ranking al recargar.
- [ ] Con sesión iniciada, «TU MEJOR MARCA EN …» usa el título nuevo del juego elegido.
- [ ] `plays` y «Mejor global» de cada juego coinciden con `count(*)` y `max(score)` de `scores`.

### Sin regresiones

- [ ] `git diff` no toca `lib/games/asteroids/`, `lib/games/caida/`, `lib/games/bloque-buster/`, `lib/db/`, `components/leaderboard.tsx` ni `components/hall-of-fame.tsx`.
- [ ] `git diff` de `components/game-player.tsx` solo elimina la simulación y añade `notFound()`: HUD, pausa, FIN, guardado y modal no cambian.
- [ ] `git status` no muestra cambios en `refereences/` ni en `specs/01` a `specs/08`.
- [ ] La sesión `av_user` sigue funcionando y `/`, `/about` y `/login` cargan como antes.

### Proceso

- [ ] Capturas de Playwright en `.playwright-screenshots/` y artefactos del MCP en `.playwright-mcp/` (escritorio y ≤ 768 px).
- [ ] Tras cada paso con cambios se propuso al usuario un nombre de commit con el formato `feat: descripción corta en inglés` y no se hizo commit sin su confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint` y `npm run build`.
2. `npm run dev` y recorrer `/games`, el filtro por categoría y `/salon`.
3. Jugar unos segundos en las tres rutas `/jugar` y guardar una puntuación.
4. `execute_sql`: catálogo, conteos de `scores` y vistas `leaderboard` y `game_stats`.
5. `get_advisors` de seguridad.

---

## Decisiones tomadas y descartadas

- **Se borran los 6 simulados con sus puntuaciones** (decisión del usuario). El borrado de `games` arrastra `scores` por `on delete cascade`, sin `delete` explícito. Es irreversible; las puntuaciones eran ficticias o de prueba. _Descartado:_ ocultarlos en la UI (no elimina nada y deja datos y rutas vivas).
- **Los tres juegos reales conservan todas sus puntuaciones.** No se borra ni se siembra nada. _Descartado:_ reiniciar los rankings.
- **Renombrado solo del título visible** (decisión del usuario). Cambia `games.title`; `id`, rutas, FK, carpetas, componentes y portadas se quedan. Es una migración de tres sentencias sin riesgo para `scores`. _Descartado:_ cambiar el `id` a `tetris`/`arkanoid` (rompe URLs y exige migrar la FK) y renombrar carpetas y clases CSS (diff grande sin efecto para el jugador).
- **Títulos `ARKANOID` y `TETRIS`, en mayúsculas** como el resto del catálogo. `asteroids` se queda como `ASTEROIDS`.
- **Orden ARKANOID (1), TETRIS (2), ASTEROIDS (3)**: el relativo que ya tenían, compactado. _Descartado:_ dejar huecos en `sort_order` (3, 2 y 7).
- **Se quita `VERSUS` del filtro, no de la BD ni del tipo** (decisión del usuario). Un filtro vacío confunde; mantener el `CHECK` y `GameCategory` evita una migración de esquema y deja la categoría lista para un juego futuro. _Descartado:_ dejar el filtro vacío; borrar la categoría de BD y tipos.
- **Se limpia el código huérfano en la misma spec** (decisión del usuario): portadas CSS de los 6 eliminados, simulación de `GamePlayer`, CSS de la arena y skill `/nuevo-juego`. Dejarlo sería código muerto que nadie ejecuta ni mantiene. _Descartado:_ spec aparte (el código muerto sobreviviría de verdad).
- **`GamePlayer` sin motor → `notFound()`.** Un juego en BD sin entrada en `ENGINES` no es jugable y debe fallar claramente. _Descartado:_ mantener un respaldo simulado; mostrar un mensaje propio (más UI sin uso).
- **`@keyframes gridscroll` se conserva.** Lo usa también un fondo global (línea 106 de `globals.css`); solo se borran `bob` y `drift`.
- **`/nuevo-juego` pasa a «solo juegos nuevos con motor».** Al no quedar simulados, desaparece el caso «conversión de un simulado». _Descartado:_ dejar el caso documentado «por si acaso».
- **Las specs anteriores no se editan.** Son histórico y se refieren a los juegos por el nombre de su época. _Descartado:_ reescribirlas.
- **Sin tests automatizados.** Coherente con las specs previas.

---

## Riesgos identificados

| Riesgo                                                                                   | Mitigación                                                                                                                |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| El borrado de `games` es irreversible y arrastra 60 filas de `scores`                    | Paso 1 confirma conteos y la lista cerrada de 6 `id` en el `where`; solo son juegos simulados                             |
| Un `delete` mal filtrado borra los juegos reales                                         | El `where id in (...)` lista los 6 `id` explícitos; el criterio verifica que quedan 3 filas y 11 `scores` en cada una     |
| Rutas antiguas (`/games/rocas`, etc.) guardadas por usuarios dan error                   | `getGame` devuelve vacío y la ruta cae en el 404 de la plataforma (SPEC 02); criterio explícito                           |
| Romper `GamePlayer` (componente crítico) al quitar la simulación                         | Solo se borra la rama simulada; criterio de `git diff` y recorrido de las tres rutas `/jugar` (HUD, pausa, FIN, guardado) |
| `notFound()` no funciona dentro de un componente cliente en Next 16.4                    | Paso 4 lee la doc local; si no vale, sustituirlo por un mensaje mínimo «Juego no disponible» y anotarlo                   |
| Borrar una clase CSS que aún se usa (p. ej. `gridscroll`, `bob` o `drift`)               | `gridscroll` se conserva; `grep` de cada clase borrada en `app`, `components` y `lib` antes de borrar                     |
| La skill `/nuevo-juego` queda incoherente tras quitar los simulados                      | Criterio con `grep` sobre `.claude/skills/nuevo-juego` y repaso del flujo de `SKILL.md`                                   |
| Un juego nuevo sin motor daría 404 en lugar de una simulación                            | Es lo deseado; `/nuevo-juego` añade siempre el motor al registro                                                          |
| El título del `id` `caida` (TETRIS) y el slug `caida` pueden confundir al leer el código | Decisión consciente; se documenta aquí. Un renombrado de `id` queda para una spec propia si se quiere                     |
| Restos de los nombres antiguos en la UI                                                  | Paso 3 con `grep`; criterio de aceptación con `grep`                                                                      |

---

## Lo que **no** entra en esta spec

- Cambiar `id`, rutas o FK de los juegos.
- Renombrar carpetas, componentes o clases CSS (`caida-*`, `bloque-buster-*`).
- Cambiar HUD, pausa, FIN o guardado de `GamePlayer`.
- Quitar `VERSUS` del `CHECK` de BD o de `GameCategory`.
- Cambiar textos `short`/`long`, categorías, colores o portadas de los tres juegos.
- Juegos nuevos o cambios en los motores existentes.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
