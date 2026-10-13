# To-do de juegos sugeridos — Arcade Vault

Memoria y to-do del agente `game-planner` (`.claude/agents/game-planner.md`). El agente **lo lee
al empezar** cada ejecución, para no repetir sugerencias ni volver a evaluar lo ya descartado, y
**lo escribe al terminar**, siempre que sugiere, descarta o cambia el estado de un juego. Es su
memoria persistente: vive en el repo y sobrevive al cierre de la sesión, a diferencia de lo que el
agente recuerde dentro de una conversación.

**Es el único fichero de `refereences/` que se escribe**, y el agente tiene permiso explícito para
hacerlo. El resto de la carpeta es material de consulta. Commitea los cambios de este fichero **antes** de arrancar `/spec-impl`, para que siga
cumpliéndose el criterio estándar de «`git status` no muestra cambios en `refereences/`» durante
la implementación.

Cada sugerencia vive en dos sitios: una fila en el **Tablero** y un bloque en el **Historial**. Si
cambias un estado a mano, cambia también el bloque.

**Estados:** `Sugerido` (pendiente de decisión) · `Aprobado` (spec en marcha) ·
`Implementado` (ya en el catálogo) · `Descartado` (no encaja, con motivo)

## Tablero

| #   | Juego         | `id`            | cat     | color   | Encaje | Estado       | Fecha      | Spec    |
| --- | ------------- | --------------- | ------- | ------- | ------ | ------------ | ---------- | ------- |
| 001 | Arkanoid      | `bloque-buster` | ARCADE  | cyan    | —      | Implementado | 2026-10-13 | SPEC 08 |
| 002 | Tetris        | `caida`         | PUZZLE  | magenta | —      | Implementado | 2026-10-12 | SPEC 07 |
| 003 | Asteroids     | `asteroids`     | SHOOTER | cyan    | —      | Implementado | 2026-10-12 | SPEC 05 |
| 004 | Snake         | `snake`         | ARCADE  | green   | —      | Implementado | 2026-10-13 | SPEC 10 |

> La columna *Encaje* es la nota 1-5 de la rúbrica del agente. Las entradas sembradas a mano
> (los cuatro juegos que ya existían) no pasaron por ella y llevan «—».

## Historial

### 001 — Arkanoid (`bloque-buster`)

- **Estado:** Implementado (SPEC 08, `specs/08-juego-bloque-buster.md`)
- **cat / color / sort_order:** ARCADE / cyan / 1
- **Origen:** port de `refereences/started-games/04-arkanoid`
- **Por qué encaja:** rompe-ladrillos de un jugador, puntuación acumulativa, dos teclas.
- **Nota:** su portada es `cover-bricks`, anterior a la convención `cover-<id>`.

### 002 — Tetris (`caida`)

- **Estado:** Implementado (SPEC 07, `specs/07-juego-caida.md`)
- **cat / color / sort_order:** PUZZLE / magenta / 2
- **Origen:** port de `refereences/started-games/03-tetris`
- **Por qué encaja:** puzzle de caída sin vidas, puntuación por líneas, controles de flechas.
- **Nota:** su portada es `cover-tetro`, anterior a la convención `cover-<id>`.

### 003 — Asteroids (`asteroids`)

- **Estado:** Implementado (SPEC 05, `specs/05-juego-asteroids.md`)
- **cat / color / sort_order:** SHOOTER / cyan / 3
- **Origen:** port de `refereences/started-games/02-asteroids`
- **Por qué encaja:** primer juego real; fijó el patrón motor + canvas + `GamePlayer`.

### 004 — Snake (`snake`)

- **Estado:** Implementado (SPEC 10, `specs/10-juego-snake.md`)
- **cat / color / sort_order:** ARCADE / green / 4
- **Origen:** desde cero, con las frutas de `refereences/source-assets/snake-assets`
- **Por qué encaja:** cuatro teclas, puntuación por fruta, game over inmediato al chocar.

<!-- Las entradas nuevas las añade el agente a partir de 005. Formato del bloque:

### NNN — Nombre del juego (`id` propuesto)

- **Estado:** Sugerido | Aprobado | Implementado | Descartado
- **cat / color / sort_order:** …
- **Origen:** port de `refereences/started-games/<carpeta>` | desde cero
- **Por qué encaja:** …
- **Puntuación:** …
- **Controles:** …
- **Riesgos:** …
- **Motivo del descarte:** (solo si Descartado: el criterio eliminatorio que falló)
-->
