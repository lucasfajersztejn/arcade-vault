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
| 005 | Space Invaders  | `invasores`       | SHOOTER | yellow  | 4      | Sugerido     | 2026-10-13 | —       |
| 006 | Pong vs CPU     | `pong`            | VERSUS  | yellow  | 4      | Sugerido     | 2026-10-13 | —       |
| 007 | Frogger         | `cruce`           | ARCADE  | green   | 3      | Sugerido     | 2026-10-13 | —       |
| 008 | Missile Command | `misiles`         | SHOOTER | —       | 1      | Descartado   | 2026-10-13 | —       |
| 009 | Galaga          | `galaga`          | SHOOTER | magenta | 5      | Sugerido     | 2026-10-13 | —       |
| 010 | Centipede       | `ciempies`        | SHOOTER | green   | 4      | Sugerido     | 2026-10-13 | —       |
| 011 | Gyruss          | `gyruss`          | SHOOTER | cyan    | 4      | Sugerido     | 2026-10-13 | —       |
| 012 | Pooyan          | `pooyan`          | SHOOTER | yellow  | 3      | Sugerido     | 2026-10-13 | —       |
| 013 | Pac-Man         | `pac-man`         | ARCADE  | yellow  | 5      | Sugerido     | 2026-10-13 | —       |
| 014 | Dig Dug         | `dig-dug`         | ARCADE  | green   | 5      | Sugerido     | 2026-10-13 | —       |
| 015 | Pengo           | `pengo`           | ARCADE  | magenta | 4      | Sugerido     | 2026-10-13 | —       |
| 016 | Rally-X         | `rally-x`         | ARCADE  | yellow  | 4      | Sugerido     | 2026-10-13 | —       |
| 017 | Donkey Kong     | `barriles`        | ARCADE  | magenta | 4      | Sugerido     | 2026-10-13 | —       |
| 018 | Joust           | `justa`           | ARCADE  | yellow  | 5      | Sugerido     | 2026-10-13 | —       |
| 019 | BurgerTime      | `hamburguesa`     | ARCADE  | green   | 5      | Sugerido     | 2026-10-13 | —       |
| 020 | Bomb Jack       | `bomb-jack`       | ARCADE  | cyan    | 5      | Sugerido     | 2026-10-13 | —       |
| 021 | Q*bert          | `qbert`           | ARCADE  | yellow  | 4      | Sugerido     | 2026-10-13 | —       |
| 022 | Bomberman       | `bomberman`       | ARCADE  | cyan    | 5      | Sugerido     | 2026-10-13 | —       |
| 023 | Qix             | `qix`             | PUZZLE  | magenta | 4      | Sugerido     | 2026-10-13 | —       |
| 024 | Flicky          | `flicky`          | ARCADE  | green   | 3      | Sugerido     | 2026-10-13 | —       |
| 025 | Night Driver    | `night-driver`    | ARCADE  | yellow  | 4      | Sugerido     | 2026-10-13 | —       |
| 026 | Tempest         | `tempest`         | SHOOTER | magenta | 3      | Sugerido     | 2026-10-13 | —       |
| 027 | Lunar Lander    | `lunar-lander`    | ARCADE  | green   | 4      | Sugerido     | 2026-10-13 | —       |
| 028 | Head On         | `head-on`         | ARCADE  | cyan    | 4      | Sugerido     | 2026-10-13 | —       |

> La columna *Encaje* es la nota 1-5 de la rúbrica del agente. Las entradas sembradas a mano
> (los cuatro juegos que ya existían) no pasaron por ella y llevan «—».
>
> **Lote 2026-10-13 (009–028):** 20 sugerencias generadas en paralelo por cinco pasadas del
> agente, una por bucket temático (shooters, laberinto, plataformas, acción de rejilla,
> conducción/habilidad). El `sort_order` indicado (5–24) es **orientativo**: al implementar cada
> juego, el real es `max(sort_order)+1` del catálogo en ese momento. Se resolvieron dos `id` en
> conflicto entre buckets: Bomb Jack pasó de `bombas` a `bomb-jack` y Bomberman a `bomberman`.

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

### 005 — Space Invaders (`invasores`)

- **Estado:** Sugerido (recomendación principal de la sesión 2026-10-13)
- **cat / color / sort_order:** SHOOTER / yellow / 5
- **Origen:** desde cero (no hay carpeta propia en `started-games`; se reutiliza el patrón de `lib/games/asteroids`)
- **Por qué encaja:** cañón de un jugador que se mueve en el eje X y dispara hacia arriba; puntuación nativa acumulativa (más es mejor); solo flechas + Espacio; llena el hueco de color `yellow`.
- **Puntuación:** +10/+20/+30 por invasor según su fila, +100 por la nave nodriza, +100 por limpiar una oleada. Acumulativo, orden DESC.
- **Controles:** ← → mover, Espacio disparar (las tres con `preventDefault` solo con motor activo y foco fuera de inputs).
- **Riesgos:** aceleración de la formación al quedar pocos invasores; ritmo del disparo enemigo aleatorio; acotar score < 99.999.999 (trivial). Mecánica de disparo cercana a Asteroids, pero el shooter fijo con formación descendente la diferencia.

### 006 — Pong vs CPU (`pong`)

- **Estado:** Sugerido (alternativa)
- **cat / color / sort_order:** VERSUS / yellow / 5 (mismo hueco; solo entra uno)
- **Origen:** desde cero
- **Por qué encaja:** llena la categoría VERSUS, hoy vacía, jugando contra la IA (un solo jugador real); dos teclas; retro icónico.
- **Puntuación:** necesita rediseño en modo supervivencia (puntos por tanto marcado a la CPU + bonus por longitud del peloteo); acumulativo.
- **Controles:** ↑ ↓ (o ← →) con `preventDefault`.
- **Riesgos:** la mecánica pala+bola solapa con Arkanoid (criterio 6); la puntuación no es nativamente acumulativa y hay que diseñarla. Queda segunda frente a la puntuación limpia de Invasores.

### 007 — Frogger (`cruce`)

- **Estado:** Sugerido (alternativa)
- **cat / color / sort_order:** ARCADE / green / 5 (mismo hueco; solo entra uno)
- **Origen:** desde cero
- **Por qué encaja:** cruce de carriles por turnos, cuatro flechas, puntuación acumulativa clara (avance + llegadas), game over por choque/agua.
- **Puntuación:** puntos por avanzar de fila, bonus por completar cada cruce; acumulativo DESC.
- **Controles:** flechas, con `preventDefault`.
- **Riesgos:** ARCADE ya tiene dos juegos (menos diversidad de categoría); muchos carriles y temporización de obstáculos. Queda tercera.

### 008 — Missile Command (`misiles`)

- **Estado:** Descartado
- **cat / color / sort_order:** SHOOTER / — / —
- **Origen:** —
- **Por qué encaja:** —
- **Motivo del descarte:** falla el criterio 3 (teclado). El original apunta con ratón/trackball a un cursor libre en pantalla; no es mapeable a flechas + Espacio sin desvirtuarlo. No hay táctil ni ratón en el contrato.

### 009 — Galaga (`galaga`)

- **Estado:** Sugerido (lote 2026-10-13, bucket shooters) · **Encaje:** 5/5
- **cat / color / sort_order:** SHOOTER / magenta / 5 (orientativo)
- **Origen:** desde cero (reutiliza el patrón de `lib/games/asteroids`)
- **Por qué encaja:** shooter de pantalla fija de un jugador; puntuación acumulativa nativa; flechas + Espacio.
- **Puntuación:** valor por insecto derribado (50 en formación / 100–160 en picado / jefe 150–400) + 1000 por fase bonus. DESC.
- **Controles:** ← → mover, Espacio disparar (`preventDefault`).
- **Riesgos:** el dive-bombing (y el rayo tractor) es lo que lo separa de `invasores`; si se simplifica a enemigos que solo bajan, se solapa.

### 010 — Centipede (`ciempies`)

- **Estado:** Sugerido (lote 2026-10-13, bucket shooters) · **Encaje:** 4/5
- **cat / color / sort_order:** SHOOTER / green / 6 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** disparo vertical desde la franja inferior; puntuación acumulativa clara; mapeable a teclado.
- **Puntuación:** segmento 10, cabeza 100, hongo 1, araña 300–900, pulga 200, escorpión 1000. DESC.
- **Controles:** ← → ↑ ↓ mover en la franja inferior, Espacio disparar (`preventDefault`).
- **Riesgos:** original de trackball → precisión con teclado; la lógica de hongos + división del ciempiés en dos cabezas es lo más costoso del motor.

### 011 — Gyruss (`gyruss`)

- **Estado:** Sugerido (lote 2026-10-13, bucket shooters) · **Encaje:** 4/5
- **cat / color / sort_order:** SHOOTER / cyan / 7 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** shooter radial de un jugador; puntuación acumulativa; dos teclas + disparo.
- **Puntuación:** valor por enemigo (30/50/100) + ronda bonus (impactos × 100). DESC.
- **Controles:** ← → rotar por el anillo, Espacio disparar (`preventDefault`).
- **Riesgos:** matemática polar (posición en el anillo, disparos radiales, espirales) y rendimiento del starfield; el menos reconocible del bucket shooters.

### 012 — Pooyan (`pooyan`)

- **Estado:** Sugerido (lote 2026-10-13, bucket shooters) · **Encaje:** 3/5
- **cat / color / sort_order:** SHOOTER / yellow / 8 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** galería vertical de un jugador; puntuación acumulativa; ↑ ↓ + disparo.
- **Puntuación:** globo reventado 100–800 según altura; carne bonus que derriba racimo (nº globos × 200). DESC.
- **Controles:** ↑ ↓ mover el ascensor, Espacio disparar (`preventDefault`).
- **Riesgos:** baja reconocibilidad; mecánica de galería que, mal equilibrada, queda poco profunda; requiere buen tuning de cadencia.

### 013 — Pac-Man (`pac-man`)

- **Estado:** Sugerido (lote 2026-10-13, bucket laberinto) · **Encaje:** 5/5
- **cat / color / sort_order:** ARCADE / yellow / 9 (orientativo) · **title propuesto:** COMECOCOS
- **Origen:** desde cero
- **Por qué encaja:** comepuntos de un jugador en laberinto fijo; puntuación acumulativa; cuatro flechas.
- **Puntuación:** punto +10, coco +50, fantasmas en racha +200/+400/+800/+1600, frutas bonus. DESC.
- **Controles:** flechas (4 direcciones), `preventDefault`; sin Espacio.
- **Riesgos:** IA de los 4 fantasmas (targeting por personaje + ciclos scatter/chase) es el mayor esfuerzo del bucket, no eliminatorio.

### 014 — Dig Dug (`dig-dug`)

- **Estado:** Sugerido (lote 2026-10-13, bucket laberinto) · **Encaje:** 5/5
- **cat / color / sort_order:** ARCADE / green / 10 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** cavar túneles en rejilla; puntuación acumulativa; flechas + bomba.
- **Puntuación:** reventar enemigo por estrato (+200…+600); Fygar en horizontal ×2; roca que aplasta +1000/+2500 en cadena; verdura bonus. DESC.
- **Controles:** flechas mover/cavar, Espacio bomba (`preventDefault`).
- **Riesgos:** modelar tierra excavable como rejilla + caída de rocas en cadena + IA de enemigos que atraviesan tierra.

### 015 — Pengo (`pengo`)

- **Estado:** Sugerido (lote 2026-10-13, bucket laberinto) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / magenta / 11 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** empujar bloques de hielo en rejilla fija; puntuación acumulativa; flechas + acción.
- **Puntuación:** Sno-Bee aplastado +400 (×2/×3 en cadena); contra pared +500; 3 diamantes alineados +10.000 (contra pared +5.000); bonus de tiempo. DESC.
- **Controles:** flechas mover, Espacio empujar/romper bloque (`preventDefault`).
- **Riesgos:** física de deslizamiento de bloques, detección de aplastamiento múltiple y de alineación de diamantes, IA de Sno-Bee.

### 016 — Rally-X (`rally-x`)

- **Estado:** Sugerido (lote 2026-10-13, bucket laberinto) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / yellow / 12 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** conducir por laberinto cenital acotado; puntuación acumulativa; flechas + humo.
- **Puntuación:** bandera +100; special flag dobla; lucky flag bonus; bonus por combustible restante. DESC.
- **Controles:** flechas conducir, Espacio humo (`preventDefault`).
- **Riesgos:** scroll de cámara sobre nivel mayor que el viewport + mini-radar + combustible + IA de varios coches. El nivel es finito, así que NO viola «fuera mundos grandes». Sustituto limpio si el scroll da problemas: **Amidar** (reserva).

### 017 — Donkey Kong (`barriles`)

- **Estado:** Sugerido (lote 2026-10-13, bucket plataformas) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / magenta / 13 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** plataformas de pantalla única (sin mundo grande); puntuación acumulativa; flechas + salto.
- **Puntuación:** +100 saltar barril, +800 destruir con martillo, +300/500/800 ítems, + bonus del temporizador al completar pantalla. DESC.
- **Controles:** ← → mover, ↑ ↓ trepar escalera, Espacio saltar (`preventDefault`).
- **Riesgos:** mayor esfuerzo del bucket plataformas (colisión viga/escalera/salto + layouts); acotar a 1–2 diseños reutilizados.

### 018 — Joust (`justa`)

- **Estado:** Sugerido (lote 2026-10-13, bucket plataformas) · **Encaje:** 5/5
- **cat / color / sort_order:** ARCADE / yellow / 14 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** vuelo con gravedad de un jugador (co-op fuera de alcance); puntuación acumulativa; aleteo en Espacio.
- **Puntuación:** enemigo derribado +500/750/1000; huevo recogido +250 (más al cazarlo en el aire); bonus de oleada (1000 × nº oleada). DESC.
- **Controles:** ← → orientar/mover, Espacio aletear (pulsación repetida) (`preventDefault`).
- **Riesgos:** afinar la comparación de altura en colisiones y la sensación del aleteo (gravedad/impulso).

### 019 — BurgerTime (`hamburguesa`)

- **Estado:** Sugerido (lote 2026-10-13, bucket plataformas) · **Encaje:** 5/5
- **cat / color / sort_order:** ARCADE / green / 15 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** andar/escalera + soltar ingredientes (salto no necesario, criterio 3 lo admite); puntuación acumulativa.
- **Puntuación:** +50 por tramo pisado, +100 por enemigo aplastado (cadena +300/+600…), comida bonus +100/500, bonus de nivel (nº × 1000). DESC.
- **Controles:** ← → ↑ ↓ mover/escaleras, Espacio pimienta (`preventDefault`). Pimienta restante se pinta en el canvas, no en el HUD.
- **Riesgos:** lógica de caída encadenada de ingredientes + enemigos atrapados, determinista en canvas fijo.

### 020 — Bomb Jack (`bomb-jack`)

- **Estado:** Sugerido (lote 2026-10-13, bucket plataformas) · **Encaje:** 5/5
- **cat / color / sort_order:** ARCADE / cyan / 16 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** saltar/planear y recoger bombas en pantalla fija; puntuación acumulativa; flechas + salto.
- **Puntuación:** bomba +100; bomba con mecha encendida +200 (mantiene cadena); monedas bonus; bonus por limpiar con multiplicador. DESC.
- **Controles:** ← → mover, Espacio saltar/planear (pulsar = salto, mantener = flotar) (`preventDefault`).
- **Riesgos:** afinar el planeo (curva de gravedad al mantener Espacio) para que sea controlable sin flotar de más.
- **Nota:** `id` cambiado de `bombas` a `bomb-jack` para no chocar con Bomberman (022).

### 021 — Q*bert (`qbert`)

- **Estado:** Sugerido (lote 2026-10-13, bucket acción de rejilla) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / yellow / 17 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** saltar por pirámide isométrica fija coloreando cubos; puntuación acumulativa; cuatro flechas.
- **Puntuación:** cubo cambiado +25; enemigo con disco +300; ronda completa +1000 + 250·nivel. DESC.
- **Controles:** flechas = 4 diagonales isométricas; sin Espacio (`preventDefault`).
- **Riesgos:** el mapeo flechas→diagonales isométricas puede desorientar; mitigable con leyenda clara y rejilla bien orientada.

### 022 — Bomberman (`bomberman`)

- **Estado:** Sugerido (lote 2026-10-13, bucket acción de rejilla) · **Encaje:** 5/5
- **cat / color / sort_order:** ARCADE / cyan / 18 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** modo un jugador contra enemigos en rejilla fija; puntuación acumulativa; flechas + bomba.
- **Puntuación:** ladrillo +10; enemigo +100·tipo; mejora +50; fase completa +500 + bonus de tiempo (acotado). DESC.
- **Controles:** flechas mover, Espacio colocar bomba (`preventDefault`).
- **Riesgos:** timing de explosión y colisiones en cruz con mejoras encadenadas; acotar bonus de tiempo. Explícitamente 1 jugador (no es el versus del original).
- **Nota:** `id` cambiado de `bombas` a `bomberman` para no chocar con Bomb Jack (020).

### 023 — Qix (`qix`)

- **Estado:** Sugerido (lote 2026-10-13, bucket acción de rejilla) · **Encaje:** 4/5
- **cat / color / sort_order:** PUZZLE / magenta / 19 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** trazar líneas y reclamar área en arena fija; puntuación acumulativa; flechas + modo trazo.
- **Puntuación:** por cada 1% reclamado +100 (trazo lento) / +50 (rápido); superar objetivo del nivel +1000·nivel. DESC.
- **Controles:** flechas mover/trazar, Espacio alternar trazo lento/rápido (`preventDefault`).
- **Riesgos:** geometría de relleno de polígono (flood-fill / área menor) es lo más delicado del motor; definirla bien en la spec.

### 024 — Flicky (`flicky`)

- **Estado:** Sugerido (lote 2026-10-13, bucket acción de rejilla) · **Encaje:** 3/5
- **cat / color / sort_order:** ARCADE / green / 20 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** rescatar pollitos en pantalla de plataformas fija; puntuación acumulativa; flechas + salto.
- **Puntuación:** entregar pollito +100; bonus por cadena (2 juntos +500, 3 +1000…); objeto bonus +500; ronda completa +2000. DESC.
- **Controles:** ← → correr, Espacio o ↑ saltar (`preventDefault`).
- **Riesgos:** física de plataformas/salto y el «tren» de pollitos que te sigue por saltos encadenados; el menos reconocible del bucket.

### 025 — Night Driver (`night-driver`)

- **Estado:** Sugerido (lote 2026-10-13, bucket conducción/habilidad) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / yellow / 21 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** conducción pseudo-3D de un jugador; puntuación acumulativa por distancia; cuatro flechas.
- **Puntuación (rediseñada):** `score += round(velocidad · dt/1000)` (metros); más velocidad = más puntos/seg. El final lo marcan las vidas, NO un cronómetro, para que el marcador sea puro acumulativo. DESC.
- **Controles:** flechas (lateral + acelerar/frenar) (`preventDefault`).
- **Riesgos:** sensación de pseudo-3D con teclas (el original usaba volante); afinar escalado de postes y respuesta lateral.

### 026 — Tempest (`tempest`)

- **Estado:** Sugerido (lote 2026-10-13, bucket conducción/habilidad) · **Encaje:** 3/5
- **cat / color / sort_order:** SHOOTER / magenta / 22 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** tube-shooter de un jugador; puntuación acumulativa; movimiento por el borde + disparo.
- **Puntuación:** por enemigo (Flipper 150, Tanker 100, Spiker 50) + bono por completar tubo. DESC.
- **Controles:** ← → rotar por el borde, Espacio disparar, ↓ Superzapper (`preventDefault`).
- **Riesgos:** ALTO esfuerzo — proyección del tubo, carriles y mapear el giro del spinner a teclas discretas sin que se sienta tosco. La ficha más cara del lote.

### 027 — Lunar Lander (`lunar-lander`)

- **Estado:** Sugerido (lote 2026-10-13, bucket conducción/habilidad) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / green / 23 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** física de aterrizaje de un jugador; flechas + empuje.
- **Puntuación (rediseñada):** el original minimiza gasto («menos es mejor»), lo que no sirve. Aquí es acumulativo entre alunizajes: por aterrizaje válido `score += 500·multiplicadorPlataforma + bonoCombustible`, con el combustible como bono (no como resultado a minimizar). DESC.
- **Controles:** ↑/Espacio empuje, ← → rotar (`preventDefault`). Combustible y velocidades en el canvas, no en el HUD.
- **Riesgos:** afinar física (gravedad/inercia/umbral de aterrizaje) y balancear multiplicadores para que el marcador no premie flotar ni castigue injustamente.

### 028 — Head On (`head-on`)

- **Estado:** Sugerido (lote 2026-10-13, bucket conducción/habilidad) · **Encaje:** 4/5
- **cat / color / sort_order:** ARCADE / cyan / 24 (orientativo)
- **Origen:** desde cero
- **Por qué encaja:** coleccionar + esquivar en pistas concéntricas; puntuación acumulativa; flechas + acelerar. No deja estela, así que no duplica Snake.
- **Puntuación:** +10 por punto comido, +500 al completar el circuito. DESC.
- **Controles:** flechas cambiar de carril, Espacio acelerar (`preventDefault`).
- **Riesgos:** IA del coche rival (persecución justa pero evitable) y geometría de carriles concéntricos con cambios suaves.

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
