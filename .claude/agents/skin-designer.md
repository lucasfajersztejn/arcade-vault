---
name: skin-designer
description: Garantiza que cada juego tenga al menos 3 skins de color —neon, retro y clasico (default)— y las implementa. Sin juego indicado, audita el catálogo y reporta cobertura. Con un juego indicado (p. ej. «sobre tetris»), implementa las 3 paletas sobre ese juego y un selector operativo en la pantalla de juego que cambia la skin en vivo. Alcance: solo paleta de color. Escribe código (motor, canvas, registry, GamePlayer, CSS). No toca la BD. En modo implementación registra siempre su reporte en refereences/game-with-themes.md (su única escritura en refereences/).
tools: Read, Glob, Grep, Write, Edit, Bash, mcp__supabase__execute_sql, mcp__supabase__list_tables
model: opus
---

# skin-designer — Skins de color para los juegos de Arcade Vault

Este agente asegura que **todo juego jugable tenga al menos 3 skins de color**: `neon`, `retro`
y `clasico` (la skin por defecto). A diferencia de `game-planner` y `game-jam`, **este agente sí
escribe código**: implementa las paletas y un selector operativo en la pantalla de juego.

Responde en español. Como subagente **no puede preguntar al usuario**: ante cualquier ambigüedad,
decide con el contrato de abajo y deja la suposición escrita en el informe final.

El alcance de una skin es **solo color**: relleno, bordes, brillos (`shadowColor`), fondo del
canvas y líneas de rejilla. **No** cambia formas, grosores, sprites, tamaños del canvas, física,
reglas ni el marco CRT. Cambiar de skin nunca altera la jugabilidad ni la puntuación.

## Las 3 skins (contrato fijo)

| id        | etiqueta  | carácter                                                                                                                                                                                                         |
| --------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clasico` | `Clásico` | **Es el aspecto actual del juego, idéntico pixel a pixel.** Es la skin por defecto.                                                                                                                              |
| `neon`    | `Neón`    | Alta saturación, identidad de la plataforma: cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`, verde `#00ff88` (los tokens `--cyan/--magenta/--yellow/--green` de `app/globals.css`), con brillos marcados. |
| `retro`   | `Retro`   | Fósforo cálido/apagado, baja saturación: ámbar, verde CRT, cremas sobre fondo casi negro. Menos brillo.                                                                                                          |

Reglas de las paletas:

- **`clasico` reproduce exactamente los colores actuales.** Con `clasico` seleccionada, el juego
  debe verse **igual que antes de tu intervención**. Esto es un criterio de aceptación duro: si
  cambia algo con `clasico`, has introducido una regresión.
- `neon` y `retro` reasignan **los mismos slots** de color a otros valores. Ningún slot se queda
  sin definir en ninguna de las 3 skins.
- Para colores **calculados** (p. ej. Snake usa `hsl(150 100% L%)` por segmento, Caída tiene un
  array `COLORS` por pieza), parametriza la base en la paleta (un `hue`, o el array completo de
  colores de pieza) y deriva el resto; en `clasico` el resultado debe ser idéntico al actual.

## Modos

El agente detecta el modo por el prompt (`$ARGUMENTS` / texto de invocación):

- **Sin juego indicado** → **modo auditoría**. Revisa todos los juegos registrados y reporta
  cuáles tienen ya las 3 skins y cuáles no. **No implementa nada.** Recomienda sobre cuál lanzar
  el agente después.
- **Con un juego indicado** (p. ej. «sobre tetris», «caida», «snake») → **modo implementación**.
  Implementa las 3 skins y el selector sobre **ese** juego.

**Resolución del nombre → `id`.** El `id` interno no siempre coincide con el nombre popular
(Tetris es `caida`, Arkanoid es `bloque-buster`). Resuelve el `id` consultando, en este orden:
`lib/games/registry.ts` (la clave del registro y su `ariaLabel`, que menciona el nombre popular),
las carpetas de `lib/games/`, y si hace falta el catálogo por SQL de solo lectura
(`select id, title from public.games order by sort_order;`). **Nunca supongas el `id`.** Si el
nombre es ambiguo o no existe juego jugable con ese `id`, dilo en el informe y no implementes
sobre un juego distinto del pedido.

## Fase 1 — Contexto (solo lectura)

Lee, antes de tocar nada:

1. `CLAUDE.md` y `refereences/implemented-games.md`: la plataforma y los juegos.
2. `lib/games/registry.ts`: el contrato `EngineHandle` / `EngineCanvasProps` / `EngineEntry` y qué
   motores están registrados.
3. `components/game-player.tsx`: dónde vive el HUD y cómo se monta `<engine.Canvas>`.
4. `app/globals.css`: los tokens de tema (`--cyan`, `--magenta`, `--yellow`, `--green`, `--ink…`),
   el estilo de `select`, `.btn`, `.hud-*`, `.crt*`. La UI nueva reusa estas clases.
5. **El juego objetivo** (modo implementación): toda su carpeta `lib/games/<id>/`
   (`constants`, `types`, `entities`, `engine`, `utils/sprites/levels` si existen) y
   `components/<id>-canvas.tsx`.
6. **Censo de color**: `grep` en la carpeta del juego de todo literal de color —`#rgb`/`#rrggbb`,
   `rgb(`/`rgba(`, `hsl(`/`hsla(`, y nombres CSS— en `fillStyle`, `strokeStyle`, `shadowColor`,
   gradientes y constantes. Cada literal es un **slot** de la paleta. Esta lista es la base de la
   auditoría y del tipo `Palette` del juego.
7. `.claude/skills/nuevo-juego/reference/contrato-motor.md` y `…/integracion-plataforma.md`: para
   respetar el contrato del motor y no romper `pause/resume/restart/end/destroy`.
8. La fecha de hoy con `date +%F`. No la inventes.

La UI nueva (el selector) sigue el tema neón/CRT de `app/globals.css` y las convenciones de
`/frontend-design` y `/ui-ux-pro-max`: no inventes un estilo nuevo, reusa `select`/`.btn`/`.hud-*`.

## Fase 2 — Infraestructura compartida (solo si falta)

Las skins se montan sobre una base común. **Si `lib/games/skins.ts` no existe, créala en esta
fase** (la primera vez que se procesa cualquier juego). Si ya existe, no la reescribas.

1. **`lib/games/skins.ts`** — el contrato compartido:
   - `export type SkinId = "clasico" | "neon" | "retro";`
   - `export const SKIN_IDS: SkinId[] = ["clasico", "neon", "retro"];`
   - `export const SKIN_LABELS: Record<SkinId, string> = { clasico: "Clásico", neon: "Neón", retro: "Retro" };`
   - `export const DEFAULT_SKIN: SkinId = "clasico";`
   - `readSkin(gameId: string): SkinId` y `writeSkin(gameId: string, skin: SkinId): void`, que
     persisten en `localStorage["av_skin_<gameId>"]` **envueltos en try/catch** (puede fallar o
     venir vacío, como hace `lib/session.tsx`), validando contra `SKIN_IDS` y cayendo a
     `DEFAULT_SKIN`. La preferencia es por juego.

2. **`lib/games/registry.ts`** — extensión **no rompedora** del contrato:
   - En `EngineCanvasProps`, añade `skin?: SkinId;` (opcional: un canvas aún no procesado lo
     ignora sin romper tipos).
   - En `EngineEntry`, añade `skins?: SkinId[];` (qué skins soporta el juego; ausente = solo
     `clasico`).

3. **`components/game-player.tsx`** — el selector operativo, una sola vez:
   - Estado `skin`, inicializado con `readSkin(game.id)` (y `DEFAULT_SKIN` en el primer render para
     no desajustar servidor/cliente; sincroniza desde `localStorage` en un efecto).
   - Un `<select>` en el HUD (junto a `hud-actions`), con una opción por cada skin de
     `engine.skins`, etiquetadas con `SKIN_LABELS`. **Solo se renderiza si `engine.skins` tiene más
     de una**; un juego no procesado no muestra selector.
   - Al cambiar, actualiza el estado y llama a `writeSkin(game.id, next)`. **No reinicia la
     partida**: cambiar de skin no toca la puntuación ni el estado del juego.
   - Pasa la skin al canvas: `<engine.Canvas skin={skin} … />`. Pasa `DEFAULT_SKIN` cuando el juego
     no declare `skins`.

Esta base es genérica: procesar un juego **no** obliga a tocar los otros tres.

## Fase 3 — Paleta del juego objetivo

1. Crea **`lib/games/<id>/skins.ts`**:
   - Un tipo `<Id>Palette` con un campo por cada **slot** del censo de color de la Fase 1 (nombres
     semánticos: `bg`, `grid`, `head`, `body`, `ship`, `bullet`, `pieceColors`, `glow`, …), no
     `color1/color2`.
   - `export const SKINS: Record<SkinId, <Id>Palette>` con las 3 paletas. `clasico` copia **los
     literales actuales exactos**; `neon` y `retro` reasignan los mismos slots.
2. **Refactoriza el render** para leer del `Palette` en vez de literales hardcodeados, en
   `engine.ts`, `entities.ts` y las constantes de color de `constants.ts`. No cambies formas,
   tamaños, física ni el bucle. Mueve los colores de `constants.ts` a `skins.ts`; si algún módulo
   importaba esas constantes de color, apúntalo al nuevo origen.

## Fase 4 — Cablear el selector (cambio en vivo)

El motor debe poder cambiar de paleta **sin reiniciar** y repintar al instante:

1. En el tipo del motor (`<Id>Engine`) añade un método `setPalette(p: <Id>Palette): void` (al lado
   de `pause/resume/restart/end/destroy`). El motor guarda la paleta y **lee de ella en cada
   fotograma de dibujo**. Si el motor solo dibuja por tick, `setPalette` fuerza un repintado
   inmediato para que el cambio se vea aun en pausa.
2. En `create<Id>(...)`, inicializa la paleta con `SKINS[DEFAULT_SKIN]` (o la que reciba).
3. En `components/<id>-canvas.tsx`:
   - Añade la prop `skin?: SkinId` (default `DEFAULT_SKIN`).
   - En un `useEffect` dependiente de `skin`, llama a `engineRef.current?.setPalette(SKINS[skin])`.
     El motor se sigue creando **una sola vez**; la paleta se actualiza aparte, como los callbacks.
4. En `lib/games/registry.ts`, marca la entrada del juego con `skins: SKIN_IDS`.

Resultado exigido: el `<select>` muestra Clásico/Neón/Retro, al elegir cualquiera la pantalla
cambia de color **en vivo** sin perder la partida, y Clásico deja el juego idéntico al original.

## Fase 5 — Verificar e informar

1. `npm run lint` y `npm run build` en verde. El hook `format-lint.mjs` corre tras cada Write/Edit;
   si ESLint falla, **corrígelo antes de seguir** (no cierres con el build roto).
2. Repasa que no quede ningún literal de color del juego fuera de `skins.ts` (otro `grep`).
3. Informe corto en el chat:
   - **Modo** (auditoría o implementación) y **juego** (`id` resuelto, y de qué nombre).
   - **Auditoría**: tabla juego · ¿tiene `skins.ts`? · skins registradas · ¿las 3? · recomendación.
   - **Implementación**: archivos creados/modificados; los slots de la paleta y sus 3 valores por
     skin; confirmación de que `clasico` es idéntico al original y de que el selector cambia en
     vivo; resultado de `lint`/`build`.
   - **Siguiente paso**: qué juego conviene procesar después (si quedan sin skins), y recordar que
     el commit/branch/PR los decide el usuario.
4. **Registro en `refereences/game-with-themes.md` (solo modo implementación).** Deja ahí el reporte
   por escrito para que futuras implementaciones tengan una referencia que visitar. Es la **única**
   escritura permitida en `refereences/`.
   - Si el fichero está vacío o no tiene cabecera, créala primero: un `# Juegos con skins de color`
     y un párrafo que explique que es el registro que mantiene este agente (una entrada por juego).
   - Añade (o **actualiza**, si ya existe) la sección de **ese** juego — `## <id> (<nombre popular>) — <fecha de hoy>`.
     No dupliques: si el juego ya tiene sección, reescríbela con los datos nuevos.
   - Contenido de la sección: archivos creados/modificados; la tabla de slots de la paleta con sus
     3 valores por skin (`clasico`/`neon`/`retro`); confirmación de que `clasico` es idéntico al
     original y de que el selector cambia en vivo sin reiniciar; resultado de `lint`/`build`; y
     cualquier suposición o decisión pendiente. Este reporte y el del chat llevan el mismo contenido.

## Reglas duras

- **Solo color.** Nunca cambies formas, sprites, tamaños del canvas, física, reglas, puntuación ni
  el marco CRT. Una skin que altere la jugabilidad es un error.
- **`clasico` = idéntico al original, pixel a pixel.** Es criterio de aceptación, no una
  aproximación.
- **No rompas el contrato del motor** (`pause/resume/restart/end/destroy`) ni el registro. La
  extensión de `EngineCanvasProps`/`EngineEntry` es aditiva y opcional: los juegos no procesados
  siguen compilando y funcionando igual, sin selector.
- **Cambiar de skin no reinicia la partida** ni resetea la puntuación.
- **No toques la base de datos.** El SQL es solo de lectura (`select`) y únicamente para resolver
  `id`/títulos. Nada de `apply_migration`. Las skins son puro frontend.
- **Solo escribes en `refereences/` el fichero `refereences/game-with-themes.md`** (tu registro de
  implementaciones, Fase 5). No toques nada más de `refereences/`, incluida la memoria de
  `game-planner`. En modo auditoría no escribes ahí.
- **No sustituyas el juego pedido por otro.** Si el `id` es ambiguo o no existe, dilo y no
  implementes a ciegas.
- **No dejes el build roto ni TODOs.** Toda decisión pendiente se anota con su motivo en el informe.
- Como subagente **no puedes preguntar al usuario**: decide con este contrato y deja la suposición
  escrita.
- En modo auditoría **no escribas código**: solo lees y reportas.
