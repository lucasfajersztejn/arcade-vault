---
name: nuevo-juego
description: Diseña la spec para añadir un juego real con leaderboard a Arcade Vault, portándolo desde refereences/started-games o creándolo desde cero. Hace las preguntas propias de un juego y guarda specs/NN-juego-<id>.md en Draft. Úsalo antes de escribir código de un juego nuevo.
disable-model-invocation: true
argument-hint: "carpeta de referencia (p. ej. 03-tetris) o nombre del juego"
---

# /nuevo-juego — Spec para añadir un juego a Arcade Vault

Esta skill **no escribe código**. Produce una spec en `specs/NN-juego-<id>.md` (estado `Borrador`) que luego se implementa con `/spec-impl`. Sigue el patrón fijado por `specs/05-juego-asteroids.md` (motor + canvas + `GamePlayer`) y `specs/06-leaderboard-y-tabla-games.md` (tabla `games`, `scores`, leaderboard).

Ficheros de apoyo (léelos cuando los necesites, están en esta carpeta):

- `template-juego.md`: esqueleto de la spec con las partes fijas ya escritas.
- `reference/contrato-motor.md`: contrato motor ↔ plataforma.
- `reference/integracion-plataforma.md`: BD, portada, `GamePlayer`, leaderboard.
- `reference/criterios-estandar.md`: criterios de aceptación que toda spec de juego incluye.

Responde en el idioma del prompt (normalmente español). Si `$ARGUMENTS` viene vacío, pide una descripción de una sola frase del juego o la carpeta de `refereences/started-games/` que se quiere portar.

## Fase 1 — Contexto (solo lectura)

1. Lee `CLAUDE.md`, la skill `/spec` (`~/.agents/skills/spec/SKILL.md` y su `template.md`, de donde sale el flujo y la estructura de toda spec), `specs/05-juego-asteroids.md`, `specs/06-leaderboard-y-tabla-games.md` y las dos specs más recientes. Lista `specs/` para calcular el siguiente número.
2. Lista `refereences/started-games/`. Si el argumento coincide con una carpeta, lee su `game.js`, `index.html`, `README.md`/`CLAUDE.md` y sus assets. Anota: constantes y fórmulas, controles, estado (puntos, vidas, nivel, líneas…), bucle, dependencias de globales/DOM y assets (imágenes, sonidos).
3. Consulta el catálogo real: `execute_sql` con `select id, title, cat, cover, color, sort_order from public.games order by sort_order;`. Así sabes qué `id` están ocupados y el siguiente `sort_order`.
4. Mira cómo integra `components/game-player.tsx` los motores: si existe un registro de motores (`lib/games/registry.ts` o similar) o si todavía ramifica por `game.id === "asteroids"`. Esto decide si la spec debe incluir el paso de generalizar `GamePlayer`.

## Fase 2 — Preguntas

Haz las preguntas en bloques de 3 a 5, numeradas, concretas y con una recomendación. Espera respuesta antes de seguir. Cubre siempre:

1. **Origen.** ¿Se porta la referencia tal cual (constantes y fórmulas intactas, como en SPEC 05) o se diseña desde cero? Si es desde cero, pide las mecánicas mínimas.
2. **Catálogo.** Todo juego es una fila nueva en `games` con su propio motor. Pide `id` (slug), `title`, `short`, `long`, `cat`, `color`, `sort_order` y portada `cover-<id>`.
3. **HUD.** Cómo se mapea el estado del juego a Puntuación / Vidas / Nivel. Si no hay vidas (p. ej. Tetris), ¿se muestra «—» o se oculta? ¿Qué cuenta como nivel?
4. **Controles.** Teclas, cuáles se capturan con `preventDefault`, y si hace falta el aviso «requiere teclado».
5. **Assets.** Sprites o sonidos de la referencia. Si se usan, van a `public/games/<id>/`. El sonido queda fuera salvo que el usuario lo pida.
6. **Fuera de alcance.** Controles táctiles, HiDPI, cambios de balance, tests y seed de puntuaciones, salvo petición expresa.
7. **Pantalla de inicio / fin propios.** Si el original tiene menús, overlays o reinicio con tecla, ¿se eliminan a favor del modal de la plataforma? (recomendado: sí, igual que en SPEC 05).

Deja de preguntar cuando puedas responder sin suponer: qué archivos aparecen o cambian, cuál es el primer y el último paso, y cómo se verifica.

Si la idea no cabe en una frase, o mezcla varios juegos, propón una spec por juego.

## Fase 3 — Redactar sección por sección

Usa `template-juego.md` y los ficheros de `reference/`. Muestra cada sección y espera confirmación antes de la siguiente, en este orden: cabecera, alcance, modelo de datos, plan de implementación, criterios de aceptación, decisiones, riesgos, lo que no entra.

- Las partes fijas (migración de `games`, contrato del motor, integración en `GamePlayer`, criterios estándar) salen de `reference/`. Solo se rellenan los huecos `{{…}}` con los datos del juego.
- La migración de ejemplo debe respetar los CHECK de la BD: `cat` ∈ `ARCADE | PUZZLE | SHOOTER | VERSUS`, `color` ∈ `cyan | magenta | yellow | green`.
- Si no existe registro de motores, el plan incluye el paso de crearlo y mover `asteroids` a él **sin tocar su motor** (`git diff` no debe tocar `lib/games/asteroids/` ni `components/asteroids-canvas.tsx`).
- Cada paso del plan deja `npm run build` en verde.

## Fase 4 — Guardar

1. Nombre `specs/NN-juego-<id>.md` con el siguiente número libre; confirma el nombre con el usuario antes de escribir.
2. Estado `Borrador`. Nunca `Aprobado` por tu cuenta.
3. Informa de la ruta, recuerda que debe revisarla y cambiarla a `Aprobado`, y sugiere: _«/spec-impl NN-juego-<id>»_.

## Reglas duras

- **Nunca escribir código ni aplicar migraciones** en esta skill. Solo el `.md` de la spec al final.
- **No modificar `refereences/`**: es material de consulta.
- **No asumir** decisiones que el usuario no confirmó.
- La spec **exige** invocar `/frontend-design` y `/ui-ux-pro-max` para la portada y toda UI nueva (CLAUDE.md), y leer `node_modules/next/dist/docs/` antes de escribir código de Next.
- No generar la spec completa de golpe.
- No dejar TODOs: una decisión pendiente se anota con su motivo.
