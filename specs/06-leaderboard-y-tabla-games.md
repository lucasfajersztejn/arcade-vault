# SPEC 06 — Tabla `games` y leaderboard real en Supabase

**Estado:** Implementado
**Depende de:** SPEC 04 (`specs/04-integracion-supabase.md`, Implementado) por los clientes `lib/supabase/{server,client}.ts` y los tipos generados; SPEC 05 (`specs/05-juego-asteroids.md`, Implementado) por el catálogo de 9 juegos y el guardado de puntuación en `GamePlayer`; SPEC 01 (`specs/01-mvp-pantallas-visuales.md`, Implementado) por el Salón de la Fama y el ranking del detalle
**Fecha:** 2026-10-12
**Objetivo:** Mover el catálogo de juegos y las puntuaciones a las tablas `games` y `scores` de Supabase, y alimentar con ellas la biblioteca, el detalle de juego y el Salón de la Fama en lugar de los datos simulados y `av_scores`.

---

## Por qué existe esta spec

Hoy el ranking es falso (`seededScores` genera nombres y marcas con una semilla) y las puntuaciones reales viven en `localStorage["av_scores"]`, así que un leaderboard no puede ser compartido entre jugadores. La SPEC 04 dejó Supabase conectado pero con la BD vacía. Esta spec crea las dos primeras tablas y conecta la UI existente a ellas, sin rediseñarla.

`games` y `scores` van juntas porque `scores.game_id` es una clave foránea a `games.id`: una sin la otra no se puede verificar.

---

## Alcance

### Dentro

- **Migración** (`apply_migration` del MCP de Supabase) que crea:
  - Tabla `games` (catálogo) con seed de los 9 juegos actuales de `lib/data.ts`.
  - Tabla `scores` (puntuaciones) con clave foránea a `games`.
  - Vista `game_stats` con `plays` (`COUNT`) y `best` (`MAX`) por juego, calculados desde `scores`.
  - Vista `leaderboard` con la **mejor marca por jugador y juego** (una fila por `(game_id, player_name)`).
  - **RLS activada** en `games` y `scores` (obligatoria según SPEC 04): lectura pública; en `scores` solo `INSERT` anónimo con validaciones; sin `UPDATE` ni `DELETE`.
- **Seed de ejemplo en `scores`**: ~10 puntuaciones ficticias por juego (equivalentes a los nombres de `PLAYERS`) para que el ranking no nazca vacío.
- **Regenerar** `lib/supabase/database.types.ts` con `generate_typescript_types` tras la migración.
- **Capa de datos de servidor** en `lib/db/games.ts` y `lib/db/scores.ts` (consultas tipadas con el cliente de servidor): `getGames()`, `getGame(id)`, `getLeaderboard(gameId, limit)`, `getPlayerBest(gameId, name)`.
- **Escritura de puntuación** con el cliente de navegador desde `GamePlayer` (`insert` en `scores`), reemplazando `saveScore` de `lib/scores.ts`.
- **Conectar la UI**:
  - `/games` (`Library`) y `/games/[id]` leen el catálogo y las stats (`plays`, `best`) de BD.
  - `/games/[id]/jugar` obtiene el juego de BD.
  - Ranking de `/games/[id]` (`Leaderboard`): top 10 real del juego.
  - `/salon` (`HallOfFame`): podio y tabla (top 12) reales por juego; la fila «TU MEJOR MARCA EN …» sale de BD buscando por el nombre de `av_user`.
- **Estados de UI**: cargando (spinner existente), **vacío** («Sé el primero en puntuar») y **error con botón reintentar** cuando Supabase falla. Nunca datos falsos en el fallo.
- Revisión de la documentación local de Next 16.4 antes de escribir código (regla de CLAUDE.md), especialmente `cacheComponents: true`, `<Suspense>` y acceso a datos dinámicos.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) para los estados nuevos (vacío, error, cargando) y cualquier ajuste visual del ranking y del Salón. No se escribe ni modifica UI sin haberlos invocado antes.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- **Autenticación real** (Supabase Auth, reemplazo de `av_user`, login/registro, OAuth): spec propia. El nombre del jugador sigue siendo texto libre y **falsificable**; se acepta hasta esa spec.
- **`proxy.ts`** y refresco de sesión.
- **Migración de `av_scores`**: las puntuaciones locales previas se abandonan (son datos de prueba). `lib/scores.ts` se elimina.
- **Realtime** (ranking en vivo) y **Edge Functions**: specs propias. El ranking se actualiza al navegar o recargar.
- **Anti-trampas** (validación de la partida en servidor, rate limiting, captcha): solo hay validaciones de forma en BD.
- **Moderación de nombres** y nombres únicos o reservados.
- **Panel de administración** del catálogo: `games` solo se edita con migraciones.
- **Paginación** del ranking y filtros por periodo (semanal, mensual).
- **Una vista tabular nueva de juegos** en la UI: la «tabla de juegos» es la tabla de BD; la biblioteca mantiene sus tarjetas.
- **Portadas en BD o Storage**: `cover` guarda el nombre de la clase CSS (`cover-asteroids`), igual que hoy.
- Cambios en las mecánicas de los juegos, en `GamePlayer` fuera del guardado, rutas, `Nav` o `Footer`.
- Tests automatizados (sigue sin runner).

---

## Modelo de datos

```sql
-- Catálogo (id = slug actual, p. ej. 'asteroids'; se conservan las rutas /games/[id])
create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE','PUZZLE','SHOOTER','VERSUS')),
  cover      text not null,                 -- clase CSS, p. ej. 'cover-asteroids'
  color      text not null check (color in ('cyan','magenta','yellow','green')),
  sort_order int  not null default 0,       -- conserva el orden actual de GAMES
  created_at timestamptz not null default now()
);

-- Puntuaciones
create table public.scores (
  id          bigint generated always as identity primary key,
  game_id     text not null references public.games(id) on delete cascade,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 20),
  score       int  not null check (score >= 0 and score <= 99999999),
  created_at  timestamptz not null default now()
);
create index scores_game_score_idx on public.scores (game_id, score desc);

-- Vistas (security_invoker = true para respetar RLS del llamante)
-- game_stats(game_id, plays, best)
-- leaderboard(game_id, player_name, score, achieved_at)  -- máx. score por (game_id, player_name), desempate por fecha más antigua
```

Políticas RLS (contrato; el SQL exacto lo fija la migración):

| Tabla    | SELECT                   | INSERT                                                                                   | UPDATE / DELETE |
| -------- | ------------------------ | ---------------------------------------------------------------------------------------- | --------------- |
| `games`  | `anon` + `authenticated` | ninguna (solo migraciones)                                                               | ninguna         |
| `scores` | `anon` + `authenticated` | `anon` + `authenticated`, con `WITH CHECK` que repite los límites de nombre y puntuación | ninguna         |

Tipos TypeScript (los de tabla salen de `database.types.ts`; solo se declaran los de vista de dominio):

```ts
// lib/types.ts — Game conserva sus campos; best/plays pasan a calcularse
export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
  best: number;
  plays: number;
} // plays pasa de string ("12.4K") a number; se formatea en UI
// ScoreRow se conserva: { rank, name, score, date: "DD/MM/AAAA" } (date formateada desde achieved_at)
// SavedScore y SessionUser: SavedScore se elimina; SessionUser sin cambios
```

Convenciones:

- `plays` se formatea en la UI (`12.4K`) con una función utilitaria; ya no es un string guardado.
- Fechas en BD en UTC (`timestamptz`); en UI `toLocaleDateString("es-ES")`.
- El nombre vacío se normaliza a `INVITADO` en el cliente antes de insertar (comportamiento actual).
- `lib/data.ts` pierde `GAMES`, `getGame`, `seededScores` y `PLAYERS`; conserva `ALL_CATEGORIES` y `CATS` si siguen en uso.

---

## Archivos a crear / modificar

| Archivo                                | Acción                                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Migración Supabase (`apply_migration`) | crear: `games`, `scores`, vistas `game_stats` y `leaderboard`, índices, RLS, seed de 9 juegos y puntuaciones de ejemplo       |
| `lib/supabase/database.types.ts`       | modificar: regenerar con el MCP (no se edita a mano)                                                                          |
| `lib/db/games.ts`                      | crear: `getGames()`, `getGame(id)` (une `game_stats`)                                                                         |
| `lib/db/scores.ts`                     | crear: `getLeaderboard(gameId, limit)`, `getPlayerBest(gameId, name)`; `submitScore` para el cliente de navegador             |
| `lib/format.ts`                        | crear: `formatPlays(n)` y `formatDate(iso)`                                                                                   |
| `lib/types.ts`                         | modificar: `plays: number`; eliminar `SavedScore`                                                                             |
| `lib/data.ts`                          | modificar: eliminar `GAMES`, `getGame`, `seededScores`, `PLAYERS`; conservar solo lo que siga usándose                        |
| `lib/scores.ts`                        | eliminar (sustituido por `lib/db/scores.ts`)                                                                                  |
| `app/games/page.tsx`                   | modificar: obtener juegos de BD dentro de `<Suspense>` y pasarlos a `Library`                                                 |
| `components/library.tsx`               | modificar: recibe `games` por props en vez de importar `GAMES`                                                                |
| `app/games/[id]/page.tsx`              | modificar: `getGame` y `getLeaderboard` de BD; `generateStaticParams` consulta `games` o se elimina según la doc de Next      |
| `app/games/[id]/jugar/page.tsx`        | modificar: `getGame` de BD                                                                                                    |
| `components/leaderboard.tsx`           | modificar: estados vacío y error con reintento                                                                                |
| `components/hall-of-fame.tsx`          | modificar: tabs desde `games` por props; podio y tabla desde BD; fila «TU MEJOR MARCA» desde BD; estados cargando/vacío/error |
| `app/salon/page.tsx`                   | modificar: carga los juegos en servidor y los pasa a `HallOfFame`                                                             |
| `components/game-player.tsx`           | modificar: `saveScore` → `submitScore` (insert en `scores`); mismos estados `saved` / `error`                                 |
| `app/globals.css`                      | modificar: solo clases nuevas para estados vacío y error si hacen falta                                                       |
| `README.md`                            | modificar: nota breve en español sobre las tablas y el seed, solo si el README ya documenta la parte de datos                 |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre `cacheComponents`, `<Suspense>` con datos dinámicos y `generateStaticParams`. Consultar `search_docs` del MCP de Supabase sobre RLS y vistas con `security_invoker`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** antes de tocar UI y volver a aplicarlos en los pasos que modifiquen componentes visuales (6, 7 y 8).
3. **Migración de esquema:** `apply_migration` con `games`, `scores`, índice, vistas y RLS. Comprobar con `list_tables` y `get_advisors` (seguridad) que no hay avisos de RLS desactivada ni de vistas `security definer`.
4. **Seed:** migración aparte que inserta los 9 juegos (mismo `id`, textos, `cat`, `cover`, `color` y orden que `lib/data.ts`) y ~10 puntuaciones de ejemplo por juego. Regenerar `database.types.ts`.
5. **Capa de datos:** crear `lib/db/{games,scores}.ts` y `lib/format.ts`; actualizar `lib/types.ts`. Aún no se usan; la app sigue funcionando con `lib/data.ts`.
6. **Catálogo desde BD:** conectar `/games`, `/games/[id]` (datos del juego y stats) y `/games/[id]/jugar` a `getGames`/`getGame`; `Library` recibe props. Eliminar `GAMES` y `getGame` de `lib/data.ts`.
7. **Leaderboard real:** `Leaderboard` en `/games/[id]` con `getLeaderboard(id, 10)`, estados vacío y error; `HallOfFame` con tabs por props, podio y tabla (12), fila del usuario desde `getPlayerBest` y los mismos estados. Eliminar `seededScores` y `PLAYERS`.
8. **Guardado real:** `GamePlayer` inserta en `scores` con el cliente de navegador; eliminar `lib/scores.ts`. Tras guardar, el ranking aparece actualizado al visitar el detalle o el Salón.
9. **Verificación y cierre:** `npm run lint`, `npm run build`; `get_advisors` de seguridad; jugar una partida de `asteroids` y otra simulada y guardar; recorrido con Playwright de `/games`, `/games/asteroids`, `/games/asteroids/jugar` y `/salon` en escritorio y a ≤ 768 px, incluido el estado de error (simulado con una URL de Supabase inválida en local); capturas en `.playwright-screenshots/`; recorrer los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `list_tables` muestra `games` y `scores` con RLS activada; `get_advisors` (seguridad) no reporta tablas sin RLS ni vistas `security definer` para estas tablas.
- [ ] `games` tiene exactamente 9 filas con los mismos `id`, `title`, `cat` y `cover` que tenía `lib/data.ts`, y `/games` muestra las mismas 9 tarjetas en el mismo orden.
- [ ] `/games/[id]` de cualquier juego muestra `plays` igual al número de filas de `scores` de ese juego y «Mejor global» igual a su `MAX(score)`, calculados por consulta (no hay columnas `best`/`plays` en `games`).
- [ ] El ranking de `/games/asteroids` lista como máximo 10 filas, ordenadas por puntuación descendente y con un solo registro por nombre de jugador.
- [ ] `/salon` muestra, para cada pestaña, el podio con los 3 primeros reales y una tabla de hasta 12 filas coherente con `leaderboard`.
- [ ] Guardar una puntuación desde `/games/asteroids/jugar` crea una fila en `scores` con `game_id = 'asteroids'`, el nombre escrito (o `INVITADO`) y la puntuación final; aparece en el ranking al recargar `/games/asteroids` si supera la mejor marca previa de ese nombre.
- [ ] Con sesión iniciada, la fila «TU MEJOR MARCA EN …» del Salón muestra la mejor marca real de ese nombre en el juego elegido y su rango; sin marcas previas no se muestra una fila inventada.
- [ ] Un `INSERT` con nombre vacío, de más de 20 caracteres, con puntuación negativa o con un `game_id` inexistente es rechazado por la BD; `UPDATE` y `DELETE` sobre `scores` y cualquier escritura sobre `games` desde la publishable key también.
- [ ] Un juego sin puntuaciones muestra «Sé el primero en puntuar» en su ranking, sin filas falsas.
- [ ] Con la URL de Supabase inválida, `/games`, `/games/[id]` y `/salon` muestran un mensaje de error con botón «Reintentar» y ningún dato falso; al restaurar la URL y reintentar, cargan.
- [ ] `grep -rE "seededScores|PLAYERS|av_scores|GAMES\b" app components lib` no devuelve resultados (salvo comentarios o nombres de variables locales ajenas).
- [ ] `lib/scores.ts` ya no existe y `SavedScore` no está en `lib/types.ts`.
- [ ] `grep -r "service_role" app components lib` no devuelve resultados.
- [ ] La sesión (`av_user`) sigue funcionando y las rutas `/`, `/about`, `/login`, `/games/rocas/jugar` y `/games/caida/jugar` cargan como antes.
- [ ] El canvas y el motor de `asteroids` no han cambiado (`git diff` no toca `lib/games/` ni `components/asteroids-canvas.tsx`).
- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para los estados nuevos y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Las capturas de Playwright están en `.playwright-screenshots/` y los artefactos del MCP en `.playwright-mcp/`.

---

## Decisiones tomadas y descartadas

- **`games` y `scores` en la misma spec.** La clave foránea los acopla y el leaderboard no se puede verificar sin catálogo en BD. _Descartado:_ dos specs separadas (la primera dejaría `scores` sin juegos a los que apuntar).
- **«Tabla de juegos» = tabla `games` en Supabase** (decisión del usuario). _Descartado:_ una vista tabular nueva en la UI y mantener `GAMES` en código como respaldo (duplica la fuente de verdad).
- **`best` y `plays` calculados desde `scores`** mediante la vista `game_stats`. Nunca se desincronizan. _Descartado:_ columnas estáticas en `games`, que no reflejarían las partidas reales.
- **Ranking de mejor marca por jugador** (vista `leaderboard`). Un nombre no puede llenar el top 10 con repeticiones. _Descartado:_ listar todas las partidas.
- **Seed de ~10 puntuaciones de ejemplo por juego** para que el ranking no nazca vacío (decisión del usuario). Son datos ficticios identificables como tal en la migración. _Descartado:_ ranking vacío al inicio y migrar `av_scores`.
- **`av_scores` se abandona sin migrar.** Son datos de prueba locales y subirlos añadiría datos falsificables. _Descartado:_ migración al primer guardado.
- **Insert anónimo con RLS limitada** (decisión del usuario). La publishable key puede insertar `scores` con `CHECK`/`WITH CHECK` de forma; no hay `UPDATE`/`DELETE`. Es falsificable (cualquiera puede insertar una puntuación arbitraria), riesgo aceptado hasta la spec de auth. _Descartado:_ insert por Server Action (más superficie de código sin identidad real que proteger) y esperar a auth (bloquea guardar puntuaciones reales).
- **Estado de error con reintento, sin fallback local.** _Descartado:_ mantener `GAMES` en código como respaldo.
- **Leaderboard visible en detalle de juego y en el Salón** (decisión del usuario).
- **Sin Realtime.** El ranking se refresca al navegar o recargar. _Descartado:_ suscripción en vivo (spec propia).
- **Sin paginación ni filtros por periodo.** Top 10 y top 12 fijos.
- **Vistas con `security_invoker = true`.** Respetan RLS del llamante y evitan el aviso de seguridad de vistas `security definer`.
- **`cover` y `color` se guardan como texto de clases/valores existentes.** Las portadas siguen siendo CSS.
- **`plays` pasa de string a número** y se formatea en UI; evita guardar presentación en la BD.
- **Tipos generados versionados** y regenerados tras la migración (convención de la SPEC 04).

---

## Riesgos identificados

| Riesgo                                                                                                                           | Mitigación                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Cualquiera puede insertar puntuaciones falsas (nombre libre + publishable key)                                                   | Aceptado y documentado; límites de longitud y rango en `CHECK`; sin `UPDATE`/`DELETE`; la spec de auth lo cierra                         |
| Spam de inserciones llena la tabla                                                                                               | Fuera de alcance (sin rate limiting); se revisará con auth o una Edge Function                                                           |
| `cacheComponents: true`: consultar BD con cookies fuera de `<Suspense>` rompe el prerender, y `generateStaticParams` consulta BD | Paso 1 lee la doc local; todas las lecturas dentro de `<Suspense>` con fallback; decisión sobre `generateStaticParams` tomada con la doc |
| Vistas sin `security_invoker` exponen datos saltándose RLS                                                                       | Vistas creadas con `security_invoker = true`; `get_advisors` en el paso 3 y en el paso 9                                                 |
| Seed de `games` desalineado con `lib/data.ts` (ids o orden distintos) rompe rutas existentes                                     | El seed copia los `id` literalmente; criterio de aceptación que compara las 9 tarjetas antes y después                                   |
| Regresión al quitar `GAMES` de `lib/data.ts` (importaciones olvidadas)                                                           | Paso 6 elimina el export y el build/lint fallan si queda alguna referencia; criterio con `grep`                                          |
| Dos jugadores con el mismo nombre se fusionan en el ranking                                                                      | Limitación conocida por nombre libre; se resuelve con identidad real en la spec de auth                                                  |
| Fila «TU MEJOR MARCA» asociada solo al nombre de `av_user`, falsificable                                                         | Igual que arriba; es presentación, no autorización                                                                                       |
| Supabase caído o pausado (proyecto gratuito) deja la app sin catálogo                                                            | Estado de error con reintento en todas las pantallas que leen; documentado en la spec como degradado esperado                            |

---

## Lo que **no** entra en esta spec

- Autenticación y reemplazo de `av_user`.
- Migración de `av_scores` y de la sesión.
- Realtime y Edge Functions.
- Anti-trampas, rate limiting y moderación de nombres.
- Panel de administración del catálogo.
- Paginación y filtros por periodo del ranking.
- Una vista tabular nueva de juegos en la UI.
- Cambios en los motores de juego (`lib/games/`) o en `GamePlayer` fuera del guardado.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
