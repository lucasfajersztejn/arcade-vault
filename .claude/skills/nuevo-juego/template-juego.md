# Plantilla de spec para un juego de Arcade Vault

Esqueleto que usa `/nuevo-juego`. Los huecos `{{…}}` se rellenan con las respuestas del usuario y con lo leído de la referencia. **No es texto para copiar sin adaptar.** Estructura y reglas generales: `~/.agents/skills/spec/template.md`.

Antes de rellenar, lee `reference/contrato-motor.md`, `reference/integracion-plataforma.md` y `reference/criterios-estandar.md`.

---

```markdown
# SPEC {{NN}} — Añadir el juego {{TITLE}} al catálogo

**Estado:** Borrador
**Depende de:** SPEC 05 (`specs/05-juego-asteroids.md`) por el patrón de motor, canvas y `GamePlayer`; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por las tablas `games`/`scores` y el leaderboard{{; otras}}
**Fecha:** {{YYYY-MM-DD}}
**Objetivo:** {{Una sola frase: añadir el juego `{{id}}`(portado de`refereences/started-games/{{carpeta}}` | creado desde cero) con HUD, pausa, guardado de puntuación y leaderboard de la plataforma.}}

---

## Por qué existe esta spec

{{Qué juego es, de dónde viene y qué lo distingue. Si convierte un simulado, di cuál y por qué.}}

---

## Alcance

### Dentro

- Portar/escribir el motor en módulos TypeScript en `lib/games/{{id}}/`, sin dependencias de React ni globales.
- Conservar las mecánicas y constantes del original: {{lista concreta de constantes y reglas}}.
- Componente cliente `components/{{id}}-canvas.tsx` con limpieza al desmontar (Strict Mode).
- {{Si no existe registro de motores: crear `lib/games/registry.ts` y mover `asteroids` a él sin tocar su motor.}}
- Integración en `GamePlayer`: HUD real ({{hud}}), PAUSA real y automática, FIN, modal «FIN DEL JUEGO» y guardado en `scores`.
- {{Juego nuevo: fila en `games` con una migración (`apply_migration`) y portada `cover-{{id}}`en`app/globals.css`. | Conversión: se conserva el `id` `{{id}}` y su portada.}}
- Controles de teclado: {{controles}}. Aviso «requiere teclado» en `(pointer: coarse)`.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) para la portada, la integración en el marco CRT y cualquier UI nueva. No se escribe ni modifica UI sin haberlos invocado antes.
- Revisión de la documentación local de Next 16.4 (`node_modules/next/dist/docs/`) antes de escribir código.
- Verificación con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- Controles táctiles.
- Sonido y música{{, salvo que se haya pedido}}.
- Soporte HiDPI.
- Cambios de balance o mecánicas respecto al original.
- Seed de puntuaciones de ejemplo{{, salvo que se haya pedido}}.
- Tests automatizados.
- Cambios en `lib/db/*`, `/salon`, `Leaderboard`, `Library`, RLS o esquema.
- Los demás juegos del catálogo.
- Modificar `refereences/`.
- {{Otros descartes de la fase de preguntas.}}

---

## Modelo de datos

{{Juego nuevo}}

\`\`\`sql
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values ('{{id}}', '{{TITLE}}', '{{short}}', '{{long}}', '{{cat}}', 'cover-{{id}}', '{{color}}', {{sort_order}});
\`\`\`

No se crean tablas ni columnas. Las puntuaciones usan `scores` y las vistas `leaderboard` y `game_stats` (SPEC 06).

Contrato del motor:

\`\`\`ts
// lib/games/{{id}}/types.ts
export type {{Juego}}Callbacks = { /* según reference/contrato-motor.md */ };
export type {{Juego}}Engine = { pause; resume; restart; end; destroy };

// lib/games/{{id}}/engine.ts
export function create{{Juego}}(canvas: HTMLCanvasElement, cb: {{Juego}}Callbacks): {{Juego}}Engine;
\`\`\`

Constantes que se conservan tal cual del original: {{lista con valores}}.

---

## Archivos a crear / modificar

| Archivo                                                       | Acción                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------- |
| `lib/games/{{id}}/{types,constants,utils,entities,engine}.ts` | crear                                                               |
| `components/{{id}}-canvas.tsx`                                | crear                                                               |
| `lib/games/registry.ts`                                       | {{crear                                                             | modificar}} |
| `components/game-player.tsx`                                  | modificar: usar el registro de motores en vez de ramificar por `id` |
| `app/globals.css`                                             | modificar: `cover-{{id}}`, estilos del canvas y aviso de teclado    |
| Migración Supabase (`apply_migration`)                        | {{crear: insert en `games`                                          | no aplica}} |
| `public/games/{{id}}/`                                        | {{crear: assets                                                     | no aplica}} |
| `refereences/started-games/{{carpeta}}/`                      | **no se modifica**                                                  |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** sobre componentes cliente y `cacheComponents` con APIs de navegador.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** y volver a aplicarlos en los pasos visuales.
3. **Constantes, tipos y utilidades:** portar los valores del original.
4. **Entidades:** sin globales; `ctx`, input y dimensiones por parámetro.
5. **Motor:** `create{{Juego}}` con input, `update`/`draw`, bucle con `dt` ≤ 50 ms, callbacks, pausa automática y `destroy`.
6. **Componente canvas** y estilos (escalado por CSS dentro de `.crt-screen`, leyenda de controles).
7. {{**Registro de motores:** crearlo y mover `asteroids` sin cambiar su motor.}}
8. **Catálogo:** {{migración con la fila de `games` y `cover-{{id}}`| portada ya existente}}. Comprobar con`list_tables`y`get_advisors`.
9. **Integración en `GamePlayer`** mediante el registro; el resto de juegos conserva la simulación.
10. {{Pasos propios del juego, de a ≤ 50 líneas.}}

La verificación va en los criterios de aceptación, no en un paso del plan.

---

## Criterios de aceptación

{{Copiar y adaptar `reference/criterios-estandar.md`, más los criterios de las mecánicas propias del juego.}}

---

## Decisiones tomadas y descartadas

- **{{Origen}}:** {{portar literal | diseñar desde cero}}. _Descartado:_ {{…}}.
- **{{Catálogo}}:** {{juego nuevo | conversión de `{{id}}`}}. _Descartado:_ {{…}}.
- **HUD de la plataforma, no del canvas.** _Descartado:_ HUD en canvas (duplicado).
- **Fin de partida por el modal de la plataforma.** _Descartado:_ overlay y reinicio con tecla del original.
- **Solo teclado.** _Descartado:_ controles táctiles (spec propia).
- **{{Más decisiones de la fase de preguntas, cada una con su motivo.}}**

---

## Riesgos identificados

| Riesgo                                                                 | Mitigación                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Doble montaje de React Strict Mode duplica bucle y listeners           | `destroy()` idempotente y devuelto siempre por el `useEffect`; criterio de reinicios y desmontaje |
| `preventDefault` rompe el input del modal o el scroll de otras páginas | Capturar solo con el motor activo y el foco fuera de un `input`; `destroy()` quita los listeners  |
| `dt` enorme tras volver de una pestaña oculta                          | Pausa automática y `dt` ≤ 50 ms                                                                   |
| Regresión en los juegos existentes al generalizar `GamePlayer`         | Cambio guiado por el registro; criterios de `asteroids` y un simulado                             |
| Puntuación fuera del rango de la BD (0 a 99 999 999)                   | Acotarla en el motor o en `submitScore`                                                           |
| {{Riesgos propios del juego}}                                          | {{…}}                                                                                             |

---

## Lo que **no** entra en esta spec

- Controles táctiles.
- Sonido{{, salvo petición}}.
- Los demás juegos del catálogo.
- Cambios de esquema, RLS o capa `lib/db`.
- Autenticación real, anti-trampas y Realtime.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
```

---

## Reglas al rellenar

- Nada de TODOs: una decisión pendiente se anota con su motivo.
- Nombres concretos de archivos y valores exactos de constantes.
- Código solo para ilustrar estructuras (SQL de la fila y firmas de tipos), nunca funciones completas.
- Quita bloques `{{…}}` condicionales que no apliquen.
