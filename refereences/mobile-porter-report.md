# mobile-porter — reporte

Memoria acumulativa del agente. Una entrada por juego. Última entrada arriba.

## frogger — 2026-10-14

**Archivos tocados:**

- `lib/games/registry.ts` (entrada `frogger`: `touchActions`)
- `app/globals.css` (bloque móvil «layout app»: `.frogger-canvas`, `.crt-screen:has(> .frogger-canvas)`, alto de `.av-player`; borrado del override muerto `@media (max-width:768px) .crt-screen:has(> .frogger-canvas){aspect-ratio:8/7}`)

No hizo falta tocar `lib/games/frogger/types.ts`, `lib/games/frogger/engine.ts` ni `components/frogger-canvas.tsx`: ya traían `setInput` por flanco, `FroggerHandle` con `setInput` y una leyenda sin `.keys-notice`.

**Mapeo táctil aplicado (gamepad MK-II, SPEC 12):**

- D-pad: `↑ up`, `↓ down`, `← left`, `→ right` (los cuatro activos; cada pulsación encola un salto de celda, sin hold).
- Botones: A y B **inertes** (`null`).
- Descartados: asignar algo a A/B. Frogger no tiene ninguna acción además del salto; inventar una (p. ej. «salto rápido») sería cambiar la mecánica. Quedan pintados apagados para conservar la silueta fija del cabinet, como en Bloque Buster (precedente SPEC 12).

**Checklist SPEC 11 + 12:**

- [x] `touchActions` registrado (ya no existe `touchLayout`: SPEC 12 lo eliminó; silueta única)
- [x] `setInput` en motor (`engine.ts:550`, por flanco, ignora `pressed === false`) y en `FroggerHandle`
- [x] `FroggerControls` sin aviso «requiere teclado» (solo `controls-legend`, oculta en móvil)
- [x] HUD compacto no desborda (390 × 844: `.player-hud` 370 × 179, sin scroll horizontal)
- [x] HUD + canvas + gamepad visibles en 390 × 844 sin scroll (gamepad acaba en y = 830 de 844). Verificado también en 412 × 915 y 360 × 740
- [x] Canvas respeta el aspect-ratio 8:7 (`object-fit: contain` dentro del hueco flex)
- [x] Escritorio sin regresión: 1440 × 900 sin gamepad, leyenda visible, teclado funcional (3 × `ArrowUp` → 30 puntos), canvas 861 × 753 = 1.143 ≈ 8/7
- [x] Zona táctil ≥ 44 × 44 px en portrait (flechas 46 × 46, A/B 64 × 64)
- [ ] Landscape móvil (844 × 390): flechas 42 × 42 px y la página scrollea — **pre-existente y común a los 5 juegos** (ver abajo)

**Capturas** (Playwright 1.64 con el Chromium 1223 ya instalado en `~/AppData/Local/ms-playwright`; el repo no tiene Playwright como dependencia, se usó una instalación aparte en el scratchpad):

- `.playwright-screenshots/mobile-porter-frogger-portrait.png` (390 × 844)
- `.playwright-screenshots/mobile-porter-frogger-landscape.png` (844 × 390)
- `.playwright-screenshots/mobile-porter-frogger-desktop.png` (1440 × 900, sin gamepad)
- `.playwright-screenshots/mobile-porter-frogger-gameover.png` (modal dentro de pantalla y gamepad desmontado)

**Decisiones:**

1. **A y B inertes.** Frogger solo tiene salto; no se inventa mecánica (precedente «HIPER» de SPEC 11).
2. **`object-fit: contain` en vez de `height:100%; width:auto; aspect-ratio:8/7`.** Con el canvas a alto 100 % y `max-width:100%`, el ancho se recortaba (350 × 362 en vez de 8:7) y el tablero salía estirado verticalmente. Con `width/height: 100%` + `object-fit: contain`, el bitmap 640 × 560 se letterboxea correcto (mismo patrón que Asteroids/Bloque Buster).
3. **Borrado del override `.crt-screen:has(> .frogger-canvas){aspect-ratio:8/7}` en móvil.** En el layout «app» la pantalla es `flex: 1 1 auto` y forzarle una proporción desbordaba el alto; quedó sustituido por `aspect-ratio: auto` (igual que Snake).
4. **`.av-player` pasa de `100dvh` a `calc(100dvh - 68px)` en ≤ 768 px.** La navbar sticky ocupa ~68 px por encima del player, así que con `100dvh` el gamepad quedaba fuera de la ventana **en los cinco juegos** (medido: `touch-controls` acababa en y = 898 con viewport 844). Es un cambio global dentro del bloque móvil ya existente, pero sin él el criterio «canvas + gamepad en una sola pantalla» no se cumple en ningún juego. Verificado en frogger, snake, caida, asteroids y bloque-buster a 390 × 844, 412 × 915 y 360 × 740: ningún elemento del player sobrepasa la ventana.
5. **No se tocó `components/game-player.tsx`** (ni `useTouchViewport` ni la condición de montaje) ni `components/touch-controls.tsx`: con SPEC 12 la silueta es fija y no hay rama por layout que añadir.
6. **No se tocaron colores ni `lib/games/frogger/skins.ts`** (pase previo de `skin-designer`).

**Verificación:**

- `npm run lint` ✅ sin salida de errores · `npm run build` ✅
- `grep -r "navigator.vibrate" app components lib` → vacío ✅
- Entrada táctil real en 390 × 844: 3 taps en la flecha ↑ → PUNTUACIÓN 30 (el motor recibe `setInput('up', true)`) ✅
- Modal «GAME OVER» en móvil: cabe en pantalla (210 → 634 px) y el gamepad se desmonta mientras está abierto ✅

**Auditoría sitio (390 × 844):** `/`, `/games`, `/games/frogger`, `/salon`, `/about` sin scroll horizontal (scrollWidth = clientWidth = 390); el formulario de contacto de `/about` entra en pantalla. ✅ sin regresiones atribuibles a este pase.

**Pendientes pre-existentes (no causados por este pase, para un pase futuro):**

- **Landscape ≤ 1024 px de ancho:** el bloque «layout app» solo aplica a `max-width: 768px`, así que en 844 × 390 la página scrollea verticalmente (scrollHeight 1297) y las flechas del D-pad miden 42 × 42 px (< 44). Medido idéntico en asteroids (1297) y caida (1281). Requiere ampliar el bloque a `(pointer: coarse) and (orientation: landscape)` y subir el tamaño de `.dp` — afecta a los 5 juegos, fuera del alcance de un pase por juego.
- **Navbar a 390 px:** el botón «Iniciar Sesión» se recorta («…iciar Sesi») en todas las rutas. Pre-existente, es CSS de `.av-nav`.
- **Zonas táctiles del chrome:** botones de filtro de `/games` y `/salon` (40 px de alto) y «JUGAR AHORA» (41 px) quedan 3–4 px por debajo de los 44 px del HIG. Pre-existente.
- **Footer:** bajo el player quedan 74 px de `.av-footer` fuera de la ventana; el juego entero es visible sin scroll, pero el documento sigue siendo scrollable esos 74 px. Se deja así a propósito (el footer es chrome del sitio, no del juego).

---
