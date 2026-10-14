# Juegos con skins de color

Registro que mantiene el agente `skin-designer`. Cada vez que implementa las 3 skins de
color (`clasico` por defecto, `neon`, `retro`) sobre un juego, añade o actualiza aquí su
entrada. Sirve de **referencia** para futuras implementaciones: qué slots tiene la paleta
de cada juego, qué ficheros se tocaron y qué decisiones se tomaron.

Base común: `lib/games/skins.ts` (`SkinId`, `SKIN_IDS`, `SKIN_LABELS`, `DEFAULT_SKIN`,
`readSkin`/`writeSkin` sobre `localStorage["av_skin_<gameId>"]`). El selector vive en
`components/game-player.tsx` y solo aparece si `engine.skins.length > 1`. Alcance: **solo
color** — nunca formas, física ni puntuación; `clasico` reproduce el aspecto original
idéntico.

---

## caida (Tetris) — 2026-10-14

Primer juego con skins del repo: esta implementación creó además la base común compartida.

### Ficheros

**Creados**

- `lib/games/skins.ts` — base común: `SkinId = "clasico" | "neon" | "retro"`, `SKIN_IDS`,
  `SKIN_LABELS` (Clásico/Neón/Retro), `DEFAULT_SKIN = "clasico"`, `readSkin`/`writeSkin`
  sobre `localStorage["av_skin_<gameId>"]` con try/catch y validación contra `SKIN_IDS`.
- `lib/games/caida/skins.ts` — tipo `CaidaPalette` y `SKINS: Record<SkinId, CaidaPalette>`.

**Modificados**

- `lib/games/caida/constants.ts` — eliminados `COLORS` y `GRID_LINE` (movidos a la paleta);
  `GHOST_ALPHA` se queda (es opacidad, no color).
- `lib/games/caida/entities.ts` — `drawBlock/drawGrid/drawBoard/drawPiece/drawGhost/drawNext`
  reciben `palette` y leen de ella (`pieceColors`, `grid`, `gloss`, `bg`). Sin cambios de
  forma, tamaño ni bucle.
- `lib/games/caida/types.ts` — `CaidaOptions.palette?` y `CaidaEngine.setPalette(palette)`.
- `lib/games/caida/engine.ts` — estado `palette`; `draw()` pinta `palette.bg` (fillRect tras
  el clearRect; en `clasico` es `#1a1a25`, el mismo `--caida-canvas` del CSS que antes se veía
  a través del canvas transparente → idéntico); `setPalette` cambia en vivo y repinta tablero
  + vista previa sin tocar el estado.
- `components/caida-canvas.tsx` — prop `skin?` (default `DEFAULT_SKIN`), paleta inicial al crear
  el motor vía `skinRef`, y `useEffect([skin])` que llama `setPalette(SKINS[skin])` sin recrear
  el motor.
- `lib/games/registry.ts` — `EngineCanvasProps.skin?` y `EngineEntry.skins?` (aditivos/opcionales);
  `caida` marcado con `skins: SKIN_IDS`.
- `components/game-player.tsx` — lectura de skin con `useSyncExternalStore` (snapshot servidor =
  `DEFAULT_SKIN` para evitar mismatch de hidratación; patrón de `session.tsx` porque el ESLint
  del proyecto prohíbe `setState` dentro de `useEffect`); `<select class="btn hud-skin">` en
  `.hud-actions` visible solo si `engine.skins.length > 1`; `changeSkin` persiste con `writeSkin`
  y notifica. No reinicia la partida.
- `app/globals.css` — reglas `.hud-skin` (cursor y `option` legible sobre fondo oscuro),
  reutilizando el estilo `.btn`.

### Paleta — `CaidaPalette`

| slot       | clasico                    | neon                       | retro                      |
| ---------- | -------------------------- | -------------------------- | -------------------------- |
| bg         | `#1a1a25`                  | `#0a0a14`                  | `#0d0b08`                  |
| grid       | `#22222e`                  | `#15263a`                  | `#1f1a12`                  |
| gloss      | `rgba(255,255,255,0.12)`   | `rgba(255,255,255,0.22)`   | `rgba(255,240,200,0.10)`   |
| pieza I    | `#4dd0e1`                  | `#00f5ff`                  | `#6fb98f`                  |
| pieza O    | `#ffd54f`                  | `#f5ff00`                  | `#d9c27a`                  |
| pieza T    | `#ba68c8`                  | `#ff006e`                  | `#c08457`                  |
| pieza S    | `#81c784`                  | `#00ff88`                  | `#8a9a5b`                  |
| pieza Z    | `#e57373`                  | `#ff1744`                  | `#b5533a`                  |
| pieza J    | `#90caf9`                  | `#2979ff`                  | `#5f8a8b`                  |
| pieza L    | `#ffb74d`                  | `#ff9100`                  | `#cf9b5c`                  |

`pieza I..L` es el array `pieceColors` (índices 1–7: I, O, T, S, Z, J, L; el índice 0 es celda
vacía). `neon` usa los tokens de plataforma (`--cyan/--yellow/--magenta/--green`) más rojo/azul/
naranja neón; `retro` es fósforo cálido y apagado sobre casi-negro.

### Verificación

- **`clasico` idéntico al original:** los hex de pieza, la rejilla `#22222e` y el gloss
  `rgba(255,255,255,0.12)` son los literales originales exactos; `bg = #1a1a25` coincide con el
  `--caida-canvas` que ya se veía por transparencia, así que pintarlo no altera nada visible.
- **Cambio en vivo:** `setPalette` repinta tablero y vista previa al instante (también en pausa /
  game over) sin reiniciar; puntuación y estado intactos.
- **Solo color:** ninguna forma, tamaño, física ni regla cambió. Grep final confirma que todo
  literal de color del juego vive solo en `lib/games/caida/skins.ts`.
- **lint:** ✅ · **build:** ✅ (Next 16.4, TypeScript OK).
- Verificación manual: en `/games/caida/jugar` el selector muestra Clásico/Neón/Retro; al elegir
  uno el tablero y la vista previa cambian de color sin perder la partida; recargando persiste la
  preferencia (`av_skin_caida` en localStorage).

### Decisiones / suposiciones

- Se añadió `bg` como slot aunque el original no pintaba fondo en canvas (lo heredaba del CSS):
  permite que `neon`/`retro` oscurezcan el tablero; en `clasico` el valor replica el CSS, sin
  cambio visible.
- Lectura de skin vía `useSyncExternalStore` en vez de `useEffect`+`setState` por la regla ESLint
  del proyecto (mismo patrón que `lib/session.tsx`).

---
