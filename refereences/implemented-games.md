# Juegos implementados en Arcade Vault

| ID              | Título    | Categoría | Color   | Skins | Táctil | Descripción breve                                      |
| --------------- | --------- | --------- | ------- | ----- | ------ | ------------------------------------------------------ |
| `bloque-buster` | ARKANOID  | ARCADE    | cyan    | 3     | sí     | Rebota la pelota y destruye muros de neón.              |
| `caida`         | TETRIS    | PUZZLE    | magenta | 3     | sí     | Encaja las piezas antes de que el techo te aplaste.     |
| `asteroids`     | ASTEROIDS | SHOOTER   | cyan    | 3     | sí     | Pilota tu nave y pulveriza el campo de asteroides.      |
| `snake`         | SNAKE     | ARCADE    | green   | 3     | sí     | Come, crece y no choques.                               |
| `frogger`       | FROGGER   | ARCADE    | green   | 3     | sí     | Cruza la carretera y el río sin convertirte en papilla. |

Ojo con la convención de portadas: es `cover-<id>`, pero **dos filas históricas no la siguen**
(`bloque-buster → cover-bricks`, `caida → cover-tetro`). Un juego nuevo usa siempre `cover-<id>`.

---

## Cómo añadir un juego nuevo

El detalle vive en `.claude/skills/nuevo-juego/reference/` (`contrato-motor.md`,
`integracion-plataforma.md`, `criterios-estandar.md`). Esto es el mapa corto.

**Flujo:** `game-planner` (qué juego) → `/nuevo-juego` o `game-jam` (escriben la spec, en
Borrador) → el humano la aprueba → `/spec-impl-game` (la implementa y encadena `skin-designer`
y `mobile-porter`).

**Lo que hay que tocar, en orden:**

1. **Migración** (`mcp__supabase__apply_migration`, nombre `add_<id>_game`). Una fila en
   `games`. Sin carpeta de migraciones local. Restricciones reales de la tabla:
   `cat ∈ ARCADE|PUZZLE|SHOOTER|VERSUS`, `color ∈ cyan|magenta|yellow|green`,
   `cover = 'cover-<id>'`, `sort_order = (select max(sort_order)+1 from games)`. Ningún
   campo admite null. Insertar una fila **no** cambia el esquema: no hay que regenerar
   `database.types.ts`.
2. **Motor** en `lib/games/<id>/` y **canvas** en `components/<id>-canvas.tsx`, según
   `contrato-motor.md`. Las siete claves del engine desde el principio, `setInput` incluido.
3. **Registro** en `lib/games/registry.ts`. Sin `skins` ni `touchActions`: los añaden los
   agentes.
4. **CSS** en `app/globals.css`: la clase `.cover-<id>` (solo gradientes y/o SVG inline en
   `data:`, sin imágenes) y la clase `.<id>-canvas` con su comportamiento en móvil.
5. **Verificación**: `npm run lint`, `npm run build`, y jugar la partida de verdad.

**Lo que NO hay que tocar:** `lib/db/*`, `app/games/**`, `app/salon/**`, `leaderboard.tsx`,
`hall-of-fame.tsx`, `library.tsx`. Con la fila en `games` y la entrada en el registry salen
gratis la card, el filtro por categoría, la página de detalle, `/games/<id>/jugar`, el HUD, la
pausa, el modal, el guardado del score, el ranking y la pestaña de `/salon`.

**Assets:** `public/games/<id>/`. Fuentes a portar: `refereences/started-games/`.

---

## Cosas que ya nos han mordido

- **El `color` de la spec puede no existir.** `game-jam` ha propuesto `lime`, que revienta el
  CHECK. Contrasta los valores de la spec contra la tabla **antes** de ejecutar la migración.
- **Las specs de `game-jam` describen una arquitectura genérica** (`components/games/<X>.tsx`,
  play-page propia, `onScoreChange`, `av_player_name`, `/hall-of-fame`) que **no es la de este
  repo**. Hay que traducirlas al contrato real antes del primer paso; `/spec-impl-game` tiene
  una fase dedicada a eso.
- **`GamePlayer` no persiste el nombre del jugador al guardar un score.** Inserta en `scores`
  pero no escribe `av_user`. Afecta a los cinco juegos; está pendiente de una spec propia.
- **El temporizador que corre desde la carga de la página es hostil.** Si el juego mata por
  tiempo, ármalo con el primer input de la partida: si no, leer la leyenda de controles cuesta
  las vidas.
- **Scores de ejemplo**: solo si se piden, por migración `seed_example_<id>_scores` y siempre
  marcados como ficticios en el comentario SQL.
