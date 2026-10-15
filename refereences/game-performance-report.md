# game-performance-booster — reporte

Memoria acumulativa del agente. Una entrada por juego. Última entrada arriba.

## caida (Tetris) — 2026-10-15

**Archivos tocados:**

- `lib/games/caida/engine.ts`
- `components/caida-canvas.tsx`

(No se editó `lib/games/caida/entities.ts`: las funciones de dibujo originales siguen exportadas por si otro módulo las usara, pero el motor ya no las llama. Las re-implementaciones cacheadas viven en el closure del engine, por lo que el refactor no cambia firmas públicas.)

**Patrones aplicados:**

- [x] 1. Fondo offscreen cacheado — `bgCanvas` 300×600 con `rebuildBackground()` pinta `palette.bg` + rejilla (9 verticales + 19 horizontales). `draw()` ahora hace un `ctx.drawImage(bgCanvas, 0, 0)` por frame en vez de `clearRect` + `fillRect` + `drawGrid` (28 strokes/frame).
- [x] 2. Sprite cache perezoso — `spriteCache: Map<string, HTMLCanvasElement>` con clave `block:${colorIndex}` (7 sprites BLOCK×BLOCK por paleta). `getBlockSprite()` hornea `fillRect` + gloss una vez; board, pieza, ghost y vista previa consumen el cache con `drawImage`. El ghost aplica `globalAlpha = GHOST_ALPHA` antes del `drawImage` (el gloss horneado respeta ya el patrón original).
- [x] 3. Guardas de emisión HUD — `lastEmittedScore/Lines/Level/Paused` + `emitScore/emitLines/emitLevel/emitPaused`. Reset de las 4 guardas en `initGame()` **antes** de los primeros emits para que `restart` propague aunque coincida con la partida anterior. `onGameOver` sin guarda (terminal).
- [x] 4. `memo(CaidaControls)` — `CaidaControls` no recibe props (devuelve `null`); envuelto con `memo(...)` siguiendo el patrón hermano de `FroggerControls`.
- [ ] 5. CRT aspect-ratio — **N/A**. El wrapper del juego es `.caida-stage` y contiene canvas + panel lateral (SCORE/LINES/LEVEL/NEXT/CONTROLS); la regla existente `.crt-screen:has(> .caida-stage) { aspect-ratio: auto; }` deja que el flex interno dicte la forma. Forzar un aspect-ratio fijo recortaría el panel. En móvil el bloque `@media (max-width: 768px)` ya reorganiza el stage. No se tocó `app/globals.css`.

**Invalidación de cachés:** `setPalette` → `spriteCache.clear()` + `rebuildBackground()` antes del próximo `draw()`, y seguidamente `drawNextCached(next)` para repintar la vista previa con la paleta nueva. Ningún otro punto invalida (ni `restart`, ni `initGame`, ni spawn).

**Capturas:** Playwright no disponible en esta pasada; no se añadieron capturas. Verificación visual queda pendiente para una pasada manual con el dev server. `npm run build` compiló los 10 estáticos sin regresión.

**Decisiones:**

- No refactorizar `lib/games/caida/entities.ts`: sus `drawBlock/drawGrid/drawBoard/drawPiece/drawGhost/drawNext` siguen exportados pero ya no se usan desde el engine. Se opta por **no** eliminarlos para minimizar la superficie del cambio y porque son API interna del juego — si un futuro refactor los reutiliza, siguen operativos.
- El pin del `ctx` ahora pasa por un alias `ctx: CanvasRenderingContext2D = ctx2d;` tras el early-return, replicando el patrón del engine de Frogger (TS pierde el narrowing dentro del closure si se usa directamente la variable del `getContext`).
- El sprite cache usa clave `block:${colorIndex}` (sin tamaño ni tint explícito): el tamaño es constante `BLOCK` y el color está determinado por el `colorIndex` + paleta activa; `setPalette` limpia el cache completo, por lo que no se mezclan sprites de dos paletas distintas.
- Pattern 5 declarado N/A y documentado en lugar de añadir una regla rota.

**Verificación:**

- `npm run lint` ✅ (único warning preexistente ajeno: `Entity` sin usar en `lib/games/frogger/engine.ts:37`).
- `npm run build` ✅ (Turbopack, 10/10 páginas).
- `grep -r "OffscreenCanvas\|webgl\|pixi" lib/games/caida` → vacío.
- Firma pública del motor intacta: `pause/resume/restart/end/setPalette/destroy/setInput` conservan nombre y comportamiento.
- `onGameOver` no filtrada por guarda. `components/game-player.tsx` sin tocar.

**Medición DevTools:** omitida (SPEC 13 contempla el opt-out). El patrón ya está validado sobre Frogger; en Tetris los puntos de alivio esperables son: 28 strokes de rejilla/frame → 1 `drawImage`; hasta ~208 `fillRect` + `fillRect` (gloss) de bloques/frame → `drawImage` desde cache; 4 setters React (`score/lines/level` + `onPause`) sólo cuando el valor cambia.

---
