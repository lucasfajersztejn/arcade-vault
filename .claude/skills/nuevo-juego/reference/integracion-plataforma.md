# Integración con la plataforma (BD, portada, leaderboard)

Patrón fijado por SPEC 06. **Añadir un juego no crea tablas ni toca RLS.**

## Qué sale solo

Con una fila en `public.games` y partidas guardadas en `scores`:

- La tarjeta aparece en `/games` (orden `sort_order`) y el filtro por `cat` la incluye.
- `/games/<id>` y `/games/<id>/jugar` funcionan (`getGame` en `lib/db/games.ts`).
- `plays` y `best` salen de la vista `game_stats`.
- El ranking de `/games/<id>` (top 10) y la pestaña de `/salon` (podio y top 12) salen de la vista `leaderboard` (`getLeaderboard`, `getPlayerBest` en `lib/db/scores.ts`).
- Sin marcas, el ranking muestra «Sé el primero en puntuar».
- `GamePlayer` guarda con `submitScore(createClient(), { gameId, playerName, score })`.

## Migración del catálogo

Solo se edita con `apply_migration` (el MCP de Supabase). Consulta antes `list_tables` y el catálogo actual.

```sql
-- Juego nuevo: {{TITLE}}
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  '{{id}}',
  '{{TITLE}}',
  '{{short}}',
  '{{long}}',
  '{{cat}}',          -- ARCADE | PUZZLE | SHOOTER | VERSUS
  'cover-{{id}}',
  '{{color}}',        -- cyan | magenta | yellow | green
  {{sort_order}}      -- siguiente libre (select max(sort_order) + 1 from games)
);
```

- `id` es el slug de la ruta `/games/<id>` y la clave foránea de `scores.game_id`. No se cambia después.
- No se añaden columnas `best`/`plays`.
- Sin seed de puntuaciones, salvo que el usuario lo pida. Si lo pide, que sean ficticias y se identifiquen como tales en la migración.
- Tras la migración: `get_advisors` (seguridad). No debe haber avisos nuevos. Regenerar `lib/supabase/database.types.ts` con `generate_typescript_types` solo si cambió el esquema (insertar una fila no lo cambia).

### Conversión de un juego simulado

Si el juego reemplaza a uno existente (`caida`, `bloque-buster`, `serpentina`…):

- Se conserva su `id`, su portada y sus `scores`. No hay migración de catálogo salvo cambios de texto.
- Si los `scores` previos eran del simulado (puntuaciones sin sentido para el juego real), decidir y anotar en la spec si se limpian con una migración (`delete from scores where game_id = '…'`).
- El motor se registra en el registro de motores con el `id` existente.

## Portada

Clase `cover-<id>` en `app/globals.css`, siguiendo `.cover-asteroids` y las demás (`.cover-bg` + pseudoelementos, solo CSS, sin imágenes). Diseñarla con `/frontend-design` y `/ui-ux-pro-max`. La clase se guarda en `games.cover` como texto.

## `GamePlayer`

- El flujo común (PAUSA, FIN, JUGAR DE NUEVO, modal «FIN DEL JUEGO», guardado, estados `saved`/`error`) no cambia.
- El nombre se normaliza a `INVITADO` si está vacío y `submitScore` lo recorta a 20 caracteres.
- Las puntuaciones deben ser enteros entre 0 y 99 999 999 (CHECK de la BD). Si el juego puede superar ese rango, hay que acotarlo en el motor.

## Fuera de lo que cambia

`lib/db/*`, `app/games/**`, `app/salon/**`, `components/leaderboard.tsx`, `components/hall-of-fame.tsx`, `components/library.tsx` no deben necesitar cambios. Si la spec propone tocarlos, hay que justificar por qué.
