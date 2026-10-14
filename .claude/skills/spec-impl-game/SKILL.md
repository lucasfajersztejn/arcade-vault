---
name: spec-impl-game
description: Implementa de principio a fin una spec de juego aprobada (valida estado, crea rama, implementa paso a paso) y al terminar lanza en serie skin-designer y mobile-porter sobre el juego nuevo.
disable-model-invocation: true
argument-hint: "<NN-spec-juego> (p. ej. 13-juego-frogger o specs/game-jam/frogger/01-frogger-core.md)"
---

# /spec-impl-game — Implementar una spec de juego y dejarlo completo

Este comando **ejecuta él mismo** todo el ciclo: no invoca a `/spec-impl` ni le cede el turno.
Pero sí **lee** su `SKILL.md` como referencia, para heredar sus convenciones (validación de estado,
nombrado de rama, `AutoCreateBranch`, ritmo paso → diff → confirmación, no commitear nunca por
iniciativa propia). Leer para imitar, no llamar para delegar.

```
Fase 0  →  leer /spec-impl y heredar sus patrones
Fase 1  →  identificar la spec
Fase 2  →  validar que el estado significa «Aprobado»   (si no → bloqueo, fin)
Fase 3  →  working tree + rama spec-NN-slug + resumen de la spec
Fase 4  →  alinear la spec con el contrato motor ↔ plataforma
Fase 5  →  implementación paso a paso + criterios de aceptación
Fase 6  →  resolver el id del juego
Fase 7  →  agente skin-designer  (neon / retro / clasico + selector en vivo)
Fase 8  →  agente mobile-porter  (gamepad táctil, HUD compacto, sin scroll)
Fase 9  →  cierre y checklist
```

Responde **en español**. Argumento recibido: `$ARGUMENTS`.

Este comando **no hace ningún commit**, ni por paso ni al final. En su lugar, cada vez que cierra
un bloque de trabajo te entrega el **mensaje de commit ya redactado en inglés** para que lo pegues
tú (ver «Mensajes de commit» más abajo).

---

## Contexto de sesión

Estado del repositorio:
!`git status --short`

Rama actual:
!`git branch --show-current`

Specs disponibles (incluidas las de game-jam):
!`ls specs/*.md 2>/dev/null; ls specs/game-jam/*/*.md 2>/dev/null || true`

Configuración de creación de rama:
!`cat specs/.spec-config.yml 2>/dev/null || echo "AutoCreateBranch: true (por defecto, sin fichero de config)"`

Juegos ya registrados:
!`grep -oE '^\s{2}[a-z-]+:' lib/games/registry.ts 2>/dev/null | tr -d ' :' || echo "registry.ts no encontrado"`

---

## Fase 0 — Leer `/spec-impl` y heredar sus patrones

Antes de nada, localiza y **lee** su fichero (Glob + Read):

1. `~/.claude/skills/spec-impl/SKILL.md` (ubicación habitual, skill global);
2. si no aparece, `.claude/skills/spec-impl/SKILL.md` dentro del proyecto.

Reglas de esta lectura:

- **No la invoques con la herramienta Skill.** Está marcada `disable-model-invocation: true` y la
  llamada será rechazada. Además no queremos delegar: el flujo es el de este fichero.
- **Sus bloques `!` no se ejecutan** al leerla con Read. Usa el «Contexto de sesión» de arriba como
  su contexto.
- La lees para **imitar sus prácticas**, que son las buenas y conviene heredar aunque `/spec-impl`
  cambie: cómo decide si un estado significa «Aprobado» (en cualquier idioma) y su mensaje de
  bloqueo, cómo avisa del working tree sucio sin tocarlo, cómo deriva `spec-NN-slug` y respeta
  `AutoCreateBranch`, cómo resume objetivo/alcance/plan/criterios antes de empezar, el ritmo
  «un paso → diff → confirmación», y la prohibición de commitear por iniciativa propia.
- **Las Fases 1–5 de abajo mandan.** Si algo de `/spec-impl` choca con ellas (p. ej. este comando
  busca también en `specs/game-jam/*/`, añade la Fase 4 de contrato y te entrega mensajes de
  commit en inglés), gana lo escrito aquí. Si `/spec-impl` cubre un caso que aquí no está
  detallado, aplica su criterio.
- Si no encuentras su fichero, **no te bloquees**: dilo en una línea y sigue con las Fases 1–5, que
  ya son completas por sí solas.

---

## Fase 1 — Identificar la spec

Si `$ARGUMENTS` está vacío: muestra las specs disponibles de arriba, pide el nombre exacto y
**para**. No adivines.

Si tiene valor, localiza el fichero. El usuario puede escribir la ruta completa
(`specs/game-jam/frogger/01-frogger-core.md`), solo el número (`13`) o solo el slug
(`juego-frogger`). Busca en `specs/` **y** en `specs/game-jam/*/`. Si no lo encuentras o hay más de
un candidato, muestra las opciones y pide que lo concrete. No elijas tú.

---

## Fase 2 — Validar el estado

Lee el fichero. Busca cerca de la cabecera la línea de estado (`**Estado:**`, `**Status:**` o su
equivalente en cualquier idioma). Identifícala por posición y por la máquina de estados que la
rodea, no por la etiqueta literal.

**Regla absoluta:** solo continúas si el estado **significa «Aprobado»** — `Aprobado`, `Approved`,
`Aprovado`, `Approuvé`, `Genehmigt`, `Approvato`, o el término equivalente en otro idioma.

Cualquier otra cosa (`Borrador`/`Draft`, `En revisión`, `Implementado`, `Obsoleto`, un valor
irreconocible o la ausencia de la línea) significa **parar** con este mensaje exacto:

```
❌ No puedo implementar esta spec.

Estado actual: [ESTADO ENCONTRADO]
Solo trabajo con specs cuyo estado signifique «Aprobado».

Tienes dos opciones:
  1. Si la spec está lista, ábrela y cambia el estado a «Aprobado» a mano.
     Ese cambio lo hace el humano, no el agente.
  2. Si todavía necesita trabajo, usa /spec [nombre] para retomarla.
```

Sin rama, sin código, **sin lanzar ningún agente**. No ofrezcas alternativas ni «puedo empezar
igualmente si quieres»: el bloqueo es intencionado. Si dudas de si un valor significa aprobado,
**no asumas**: pregunta.

Ojo con las specs de `specs/game-jam/`: `game-jam` las escribe en estado `Borrador` y es el humano
quien aprueba la variante elegida. Una en `Borrador` se bloquea igual que cualquier otra.

---

## Fase 3 — Working tree, rama y resumen

**3.0 — Working tree.** Mira el `git status --short` del contexto. Si **no** está vacío, muestra los
cambios pendientes y pregunta:

```
⚠️ Hay cambios sin commitear en el working tree.
Cambiar de rama se los lleva a la nueva. ¿Qué hacemos?
  1. Los commiteas o stasheas tú y relanzas el comando  (recomendado)
  2. Seguimos igualmente — los cambios viajan a la rama nueva
```

Espera respuesta. **Nunca** commitees ni stashees por iniciativa propia. Si está limpio, pasa al
3.1 sin mencionarlo.

**3.1 — Nombre de rama.** Formato `spec-NN-slug`, derivado del nombre del fichero sin extensión:
`13-juego-frogger.md` → `spec-13-juego-frogger`.

Caso especial de `specs/game-jam/<game-id>/NN-variante.md`: su numeración es **local a la carpeta**
y choca con la de `specs/`. Antes de crear nada, propón promover la variante elegida a
`specs/<siguiente-NN-libre>-juego-<id>.md` (moviendo el fichero) y usar esa rama. Si el usuario
prefiere dejarla donde está, usa `spec-gamejam-<game-id>-<slug>` para no duplicar el número.
Pregunta y espera: no renombres ni muevas ficheros por tu cuenta.

**3.2 — Crear la rama.** Lee `AutoCreateBranch` de `specs/.spec-config.yml` (ausente, vacío o
irreconocible → `true`; solo un `false` explícito lo desactiva).

- `true`: procede sin preguntar.
  - Si la rama **no existe**: `git checkout -b spec-NN-slug`.
  - Si **ya existe**: es trabajo que se retoma. Cámbiate a ella, lee `git log --oneline`, di qué
    pasos del plan parecen hechos y desde cuál propones seguir, y **espera confirmación** del
    punto de retomada antes de implementar nada.
  - En ambos casos, confirma que el cambio de rama ha funcionado antes de seguir.
- `false`: pregunta `¿Creo y me cambio a la rama spec-NN-slug? [s/N]`. Si dice que no o no
  contesta nada concreto, **no crees ninguna rama**: di que implementarías sobre la rama actual y
  pide confirmación explícita. No improvises.

**3.3 — Confirmación visual:**

```
✅ Listo para implementar.

Spec:   specs/NN-slug.md
Rama:   spec-NN-slug  (activa)
Estado: Aprobado   (← el valor real encontrado en la spec)
```

**3.4 — Resumen de la spec.** Antes de tocar código, extrae y muestra: **objetivo**, **alcance**
(dentro y fuera), **plan de implementación** (los pasos numerados) y **criterios de aceptación**.
Identifica las secciones por significado, no por el título literal.

---

## Fase 4 — Alinear la spec con el contrato motor ↔ plataforma

Las specs generadas por `game-jam` o por `/nuevo-juego` pueden describir una arquitectura genérica
que **no es la de este repo**. Antes del primer paso, contrasta la spec contra el contrato real:

| El contrato real de Arcade Vault                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Motor en `lib/games/<id>/` (`constants`, `types`, `entities`, `engine`, opcionales `utils`/`sprites`/`levels`)                                                                                                           |
| `components/<id>-canvas.tsx` exportando `<Id>Canvas` y `<Id>Controls`                                                                                                                                                    |
| Entrada en `lib/games/registry.ts`: `{ Canvas, Controls, hasLives, ariaLabel }`                                                                                                                                          |
| `EngineCanvasProps` (`onScore`, `onLives`, `onLevel`, `onGameOver`, `onPause?`, `skin?`) y `EngineHandle` por ref (`pause/resume/restart/end/setInput`)                                                                  |
| **Sin play-page propia**: `app/games/[id]/jugar` + `components/game-player.tsx` ya dan HUD, pausa, modal de game over y guardado de score                                                                                |
| Nombre de jugador en `localStorage["av_user"]` vía `lib/session.tsx`                                                                                                                                                     |
| Tipos en `lib/types.ts` y `lib/supabase/database.types.ts`                                                                                                                                                               |
| Hall of Fame en `/salon`                                                                                                                                                                                                 |
| Catálogo: fila en `games` por **migración** (`mcp__supabase__apply_migration`), con `cat ∈ ARCADE\|PUZZLE\|SHOOTER\|VERSUS`, `color ∈ cyan\|magenta\|yellow\|green` y `cover = cover-<id>` definido en `app/globals.css` |
| Assets en `public/games/<id>/`                                                                                                                                                                                           |

Si la spec contradice cualquiera de esas filas, o se contradice a sí misma (dos tamaños de canvas,
dos mapas de coordenadas, un `color` que no pasa el CHECK…), **para antes del paso 1**: lista las
discrepancias en una tabla «la spec dice / el repo es» y ofrece tres salidas concretas —

1. **adaptar** (implementar la _mecánica_ de la spec sobre el contrato real) — normalmente la buena;
2. **literal** (avisando de que el juego quedará fuera del registry y que las Fases 7 y 8 se omiten);
3. **reescribir la spec** antes de implementar.

Espera la decisión. No elijas tú.

---

## Fase 5 — Implementación paso a paso

Antes de escribir una línea, di:

```
Voy a implementar la spec siguiendo su plan de implementación.
Me paro después de cada paso para que revises el diff.

¿Empezamos por el Paso 1?
```

Espera confirmación explícita. Después, durante toda la implementación:

- **Nunca commitees automáticamente.** Ni por paso ni al final. Escribes el código y enseñas el
  diff; commitear es decisión y comando del usuario.
- **Implementa lo que dice la spec** (con las adaptaciones acordadas en la Fase 4). Si algo te
  parece subóptimo, dilo como observación e impleméntalo igual. Los cambios de criterio van a la
  spec, no al código por sorpresa.
- **Ritmo:** un paso → resumen de ficheros tocados → **mensaje de commit en inglés** (formato de
  abajo) → `Paso N completado. ¿Revisas el diff y sigo con el Paso N+1?` → esperar confirmación.
- **Ambigüedad no resuelta por la spec:** para, descríbela exacta, ofrece dos o tres opciones
  concretas y espera. No improvises.
- **Petición fuera de alcance:** recuérdalo, sugiere anotarlo para la siguiente spec y no lo
  implementes en esta rama.
- El hook `PostToolUse` (`.claude/hooks/format-lint.mjs`) corre en cada Write/Edit. Si ESLint
  falla, **arréglalo antes** de seguir.

**Al terminar el último paso:** verifica los criterios de aceptación **uno a uno** y muestra la
lista con ✅/❌. Si alguno queda en ❌, repórtalo y **para**: no se lanza `skin-designer` ni
`mobile-porter` sobre un juego que todavía no cumple su propia spec.

---

## Mensajes de commit (los pegas tú)

Nunca ejecutas `git commit`, `git add` ni `git push`. Lo que haces es **entregar el mensaje ya
redactado** al cerrar cada bloque de trabajo: cada paso del plan (Fase 5), la pasada de skins
(Fase 7), la pasada de móvil (Fase 8) y los ficheros de reporte (Fase 9).

Formato: **Conventional Commits, en inglés**, aunque la spec, la UI y los comentarios del repo
estén en español — así es como está escrito el historial de este repositorio. Asunto en imperativo,
≤ 72 caracteres, sin punto final. Cuerpo opcional de 1–3 bullets solo si el asunto no basta.
Termina siempre con la línea de coautoría.

Entrégalo en un bloque de código `text` listo para copiar, precedido de los ficheros que abarca:

````
Ficheros: lib/games/frogger/engine.ts, lib/games/frogger/constants.ts

```text
feat: add frogger lane builder and jump engine

- build road and river lanes scaled by level
- discrete 40px grid with 120ms jump animation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```
````

Tipos según el bloque: `feat:` para el motor, el canvas y el registro del juego; `feat:` también
para las pasadas de skins y de móvil (`feat: add neon, retro and clasico skins to frogger`,
`feat: wire touch gamepad into frogger`); `docs:` para los reportes de
`refereences/` y para el cambio de estado de la spec.

---

## Fase 6 — Resolver el id del juego

1. Saca el id de la spec: el nombre suele ser `NN-juego-<id>.md`, y el id aparece además en su
   sección de integración (fila de `games`, `cover-<id>`, `lib/games/<id>/`).
2. Confírmalo contra `lib/games/registry.ts` (debe existir su entrada `{ Canvas, Controls, … }`) y,
   si quieres, contra la tabla `games` con `mcp__supabase__execute_sql` (**solo lectura**).
3. Si la spec no registra ningún juego jugable (no hay id en el registry), avisa:

   ```
   ℹ️ Esta spec no registra un juego en lib/games/registry.ts.
   Omito las pasadas de skin-designer y mobile-porter.
   ```

   Lista lo implementado, salta a la Fase 9 y termina.

4. Sugerencia (no la ejecutes tú): hacer `git add` del juego nuevo antes de las pasadas hace que
   los diffs de los dos agentes se lean limpios.

---

## Fase 7 — skin-designer (primera pasada, sola)

1. Lanza **un único** agente:
   `Agent(subagent_type: "skin-designer", prompt: "lanza skin-designer sobre <id>")`.
2. **Espera a que termine.** Nada más en ese mismo bloque de tool calls.
3. Cuando vuelva, resume en 3–5 líneas: `lib/games/<id>/skins.ts`, refactor del render a `Palette`,
   `setPalette` en el motor, selector operativo en `components/game-player.tsx`, y confirma que
   dejó su entrada en `refereences/game-with-themes.md`. Cierra con el **mensaje de commit en
   inglés** de la pasada.
4. Si devuelve criterios en ❌ o avisa de que dejó el render a medias: muéstralo y **para**. No
   encadenes mobile-porter sobre un canvas a medio refactorizar.

---

## Fase 8 — mobile-porter (segunda pasada)

1. Solo **después** de haber mostrado el resumen de la Fase 7, y en un turno distinto:
   `Agent(subagent_type: "mobile-porter", prompt: "lanza mobile-porter sobre <id>")`.
2. Cuando vuelva, resume: `touchLayout`/`touchActions` en `lib/games/registry.ts`, `setInput` en el
   motor y en su `*Handle` de `components/<id>-canvas.tsx`, retirada del aviso «requiere teclado»,
   ajustes de `app/globals.css`, y el resultado de su auditoría móvil de `/`, `/games`, `/salon` y
   `/about`. Confirma su entrada en `refereences/mobile-porter-report.md`. Cierra con el **mensaje
   de commit en inglés** de la pasada.

---

## Fase 9 — Cierre

Mensaje final con:

- rama activa (`spec-NN-slug`) y recordatorio de que **el estado de la spec lo pasa a
  `Implementado` el humano**, no tú;
- checklist de las tres pasadas: spec ✅/❌, skins ✅/❌, móvil ✅/❌;
- ficheros de reporte generados (`refereences/game-with-themes.md`,
  `refereences/mobile-porter-report.md`) y su **mensaje de commit en inglés** (`docs:`) para que
  los commitee el humano;
- recordatorio de `npm run lint` y `npm run build` antes de abrir el PR;
- recapitulación de los mensajes de commit entregados que todavía estén sin usar, por si el humano
  prefiere commitear todo de una vez al final.

---

## Reglas duras

- **Leer sí, delegar no.** Lees `/spec-impl` en la Fase 0 para heredar sus prácticas, pero el
  flujo lo ejecutas tú con las Fases 1–5 de este fichero. Nunca le cedas el turno con la
  herramienta Skill.
- **Cero comandos de git que escriban.** Ni `commit`, ni `add`, ni `push`, ni `stash`. Solo
  `status`, `branch`, `checkout`, `log` y `diff`. Todo lo demás se entrega como mensaje de commit
  en inglés para que lo pegue el humano.
- **En serie, nunca en paralelo.** Una sola llamada a `Agent` por bloque de respuesta. El motivo no
  es estético: `skin-designer` y `mobile-porter` editan los mismos ficheros
  (`lib/games/registry.ts`, `components/game-player.tsx`, `components/<id>-canvas.tsx`,
  `app/globals.css`) y en paralelo se pisan. No lo "optimices" a futuro.
- **Orden fijo: skins antes de móvil.** `mobile-porter` toca el mismo `*-canvas.tsx` que
  `skin-designer` acaba de refactorizar a `Palette`; al revés se pierde trabajo.
- Los dos agentes **no pueden preguntar al usuario**: deciden y dejan sus suposiciones escritas en
  su reporte. Repite esas suposiciones en tu resumen para que el humano las vea sin abrir el fichero.
- Ninguno de los dos agentes toca la BD. Si una pasada pide un cambio de esquema, páralo y
  dilo: eso es otra spec.

---

## Comportamiento esperado

```
/spec-impl-game 13-juego-frogger        (estado: Aprobado)

  Fase 0   →  lee ~/.claude/skills/spec-impl/SKILL.md (referencia, no delegación)
  Fase 1–2 →  specs/13-juego-frogger.md, estado Aprobado ✅
  Fase 3   →  working tree limpio, rama spec-13-juego-frogger, resumen de la spec
  Fase 4   →  la spec encaja con el contrato → sin discrepancias
  Fase 5   →  implementación paso a paso, un mensaje de commit en inglés por paso
              criterios de aceptación verificados ✅
  Fase 6   →  id = frogger (presente en lib/games/registry.ts)
  Fase 7   →  skin-designer sobre frogger  → resumen + refereences/game-with-themes.md
  Fase 8   →  mobile-porter sobre frogger  → resumen + refereences/mobile-porter-report.md
  Fase 9   →  checklist, lint/build, la spec la cierra el humano

/spec-impl-game 11-controles-tactiles-movil   (estado: Implementado)

  Fase 2   →  bloqueo con el mensaje de estado
              sin rama, sin código, sin agentes
```
