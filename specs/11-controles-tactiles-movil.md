# SPEC 11 — Controles táctiles para móvil

**Estado:** Aprobado
**Depende de:** SPEC 05 (`specs/05-juego-asteroids.md`), SPEC 07 (`specs/07-juego-caida.md`), SPEC 08 (`specs/08-juego-bloque-buster.md`) y SPEC 10 (`specs/10-juego-snake.md`) por los motores y sus contratos; SPEC 06 (`specs/06-leaderboard-y-tabla-games.md`) por `GamePlayer` y el HUD.
**Fecha:** 2026-10-14
**Objetivo:** Hacer jugables en móvil los cuatro juegos del catálogo (Asteroids, Caída, Bloque Buster, Snake) con un overlay de controles táctiles sobre el canvas (D-pad + botones de acción) y un HUD compactado para pantallas pequeñas.

---

## Por qué existe esta spec

Hoy los cuatro juegos solo son jugables con teclado. En móvil muestran el aviso «requiere teclado» y no hay forma de interactuar. La imagen de referencia (`refereences/image-control-mobile/idea-canvas-controls.png`) propone un overlay semitransparente: D-pad abajo-izquierda y botones de acción abajo-derecha, con el HUD superior compactado para que todo entre en portrait.

Esta spec añade el framework de controles táctiles al registro de motores, extiende el contrato de cada motor con `setInput(action, pressed)` para recibir pulsaciones táctiles como una fuente de entrada equivalente al teclado, y aplica el mapeo a los cuatro juegos. También compacta el HUD de `GamePlayer` en `(pointer: coarse)` o ancho ≤ 768 px.

---

## Alcance

### Dentro

- Framework de controles táctiles en `components/touch-controls.tsx` (nuevo), montado por `GamePlayer` cuando el juego registrado declara `touchLayout`.
- Activación por media query: visible solo si `(pointer: coarse)` **o** ancho ≤ 768 px. En escritorio no aparece nunca. Sin toggle manual.
- Posicionamiento: **overlay sobre el canvas**, con fondo semitransparente, zonas de toque amplias. D-pad abajo-izquierda, botones de acción abajo-derecha. `pointer-events` solo en los botones, no en el fondo intermedio (para no bloquear taps al canvas si en el futuro se añade click).
- Contrato de registro: `EngineEntry` añade dos campos opcionales:
  - `touchLayout: 'dpad4' | 'dpad-horizontal' | 'asteroids' | 'caida' | 'bloque-buster' | 'snake'` (el layout concreto a renderizar).
  - `touchActions?: { dpad?: ReadonlyArray<'up'|'down'|'left'|'right'>; buttons?: ReadonlyArray<{ id: string; label: string }> }` que describe qué botones pinta el framework (etiquetas en español mayúsculas: `DISPARO`, `HIPER`, `DROP`, `LANZAR`, `ROTAR`).
- Contrato del motor: cada `Engine` expone una función nueva `setInput(action: string, pressed: boolean)`. El framework llama `setInput('left', true)` en `touchstart` y `setInput('left', false)` en `touchend`/`touchcancel`. El motor convierte eso al mismo estado interno que ya usa para el teclado (holdable). Las acciones de pulsación única (shoot, hyperspace, hard drop, launch) se tratan como "edge" en el motor: ignora el `false` y, para `true`, dispara una sola vez por pulsación.
- Mapeos por juego:
  - **Snake:** `dpad4` (arriba/abajo/izq/der). Sin botones. Acciones: `up`, `down`, `left`, `right`.
  - **Caída (Tetris):** D-pad (izq, der, abajo = soft drop, arriba = rotar) + 1 botón `DROP` (hard drop). Acciones: `left`, `right`, `down`, `rotate`, `drop`.
  - **Bloque Buster (Arkanoid):** D-pad solo con izq/der + 1 botón `LANZAR`. Acciones: `left`, `right`, `launch`.
  - **Asteroids:** D-pad (izq = rotar antihorario, der = rotar horario, arriba = propulsión; abajo oculto/inerte) + 2 botones derecha `DISPARO` y `HIPER`. Acciones: `rot-left`, `rot-right`, `thrust`, `shoot`, `hyperspace`.
- HUD compactado en móvil (`GamePlayer`): a `(pointer: coarse)` o ancho ≤ 768 px, las tarjetas (JUGADOR, PUNTUACIÓN, VIDAS, NIVEL, SKIN) se reorganizan en 2 filas apretadas y los botones (PAUSA/REANUDAR, FIN, SALIR) en una tercera fila horizontal. Se reduce padding y tipografía. En escritorio nada cambia.
- Soporte landscape: el overlay se reposiciona a los laterales (D-pad pegado al borde izquierdo, botones al derecho, HUD superior en una sola fila). En portrait, lo descrito arriba.
- Feedback táctil: solo visual (botón iluminado + `transform: scale(0.95)` al pulsar). Sin `navigator.vibrate`.
- Multi-touch: cada botón reserva su propio `pointerId` (`setPointerCapture`), de modo que el usuario puede mantener D-pad izq con un dedo y pulsar DISPARO con otro sin que uno cancele al otro.
- Eliminar el aviso «requiere teclado» en los componentes de controles (`AsteroidsControls`, `CaidaControls`, `BloqueBusterControls`, `SnakeControls`) para cualquier juego con `touchLayout` registrado. En escritorio los controles bajo el canvas siguen mostrando la leyenda de teclas.
- Verificación con Playwright emulando iPhone 13 y Pixel 7 en portrait y landscape; capturas en `.playwright-screenshots/`.

### Fuera (explícito)

- Nuevos juegos o cambios de mecánica.
- Haptics / `navigator.vibrate`.
- Toggle manual del usuario para mostrar/ocultar controles.
- Sonido o indicador visual del nivel de carga de las acciones (p. ej. una barra de "cooldown" del disparo).
- Autenticación real, Realtime, anti-trampas.
- Cambios en Supabase (tablas `games`, `scores`, vistas `leaderboard`/`game_stats`) o en `lib/db/*`.
- Cambios en `/salon`, `/games`, `/games/[id]` fuera del CSS móvil heredado del HUD.
- Modificar `refereences/`.
- Tests automatizados.

---

## Modelo de datos

Esta spec no introduce estructuras persistentes nuevas. No se tocan tablas, vistas, migraciones, RLS, `lib/db/*` ni `localStorage` (`av_user`, `av_skin_*` siguen igual). No hay `apply_migration`.

Contratos TypeScript nuevos o extendidos:

```ts
// lib/games/registry.ts (modificado)
export type TouchLayoutId =
  | "dpad4"
  | "dpad-horizontal"
  | "asteroids"
  | "caida"
  | "bloque-buster"
  | "snake";

export type TouchDpadDir = "up" | "down" | "left" | "right";

export type TouchActionButton = {
  /** Id enviado a `setInput`, p. ej. 'shoot'. */
  id: string;
  /** Etiqueta mostrada en el botón, en MAYÚSCULAS. */
  label: string;
};

export type TouchSpec = {
  dpad?: ReadonlyArray<TouchDpadDir>;
  buttons?: ReadonlyArray<TouchActionButton>;
};

export type EngineEntry = {
  Canvas: ComponentType<EngineCanvasProps>;
  Controls: ComponentType;
  hasLives: boolean;
  ariaLabel: string;
  skins?: SkinId[];
  /** Si está presente, `GamePlayer` monta el overlay táctil en móvil. */
  touchLayout?: TouchLayoutId;
  touchActions?: TouchSpec;
};
```

```ts
// Contrato nuevo del motor (añadido a cada tipo *Engine)
setInput: (action: string, pressed: boolean) => void;
```

Acciones por juego (strings exactos pasados a `setInput`):

| Juego         | Hold (press+release) usados por bucle                                                    | Edge (solo true)      |
| ------------- | ---------------------------------------------------------------------------------------- | --------------------- |
| snake         | `up`, `down`, `left`, `right` (edge: cada pulsación encola un giro, igual que una tecla) | —                     |
| caida         | `left`, `right`, `down`                                                                  | `rotate`, `drop`      |
| bloque-buster | `left`, `right`                                                                          | `launch`              |
| asteroids     | `rot-left`, `rot-right`, `thrust`                                                        | `shoot`, `hyperspace` |

El motor es libre de distinguir hold de edge internamente: para edge basta con ignorar el `false` y disparar al `true` solo cuando pase de no-pulsado a pulsado (mismo criterio que ya aplican hoy al `keydown`).

Config de registro para los cuatro juegos:

```ts
asteroids: {
  touchLayout: "asteroids",
  touchActions: {
    dpad: ["up", "left", "right"],
    buttons: [{ id: "shoot", label: "DISPARO" }, { id: "hyperspace", label: "HIPER" }],
  },
},
caida: {
  touchLayout: "caida",
  touchActions: {
    dpad: ["up", "down", "left", "right"],
    buttons: [{ id: "drop", label: "DROP" }],
  },
},
"bloque-buster": {
  touchLayout: "bloque-buster",
  touchActions: {
    dpad: ["left", "right"],
    buttons: [{ id: "launch", label: "LANZAR" }],
  },
},
snake: {
  touchLayout: "snake",
  touchActions: { dpad: ["up", "down", "left", "right"] },
},
```

---

## Archivos a crear / modificar

| Archivo                                  | Acción                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `components/touch-controls.tsx`          | crear: overlay con D-pad + botones; `pointerdown`/`pointerup`/`pointercancel` con `setPointerCapture`           |
| `lib/games/registry.ts`                  | modificar: tipos `TouchLayoutId`, `TouchSpec`, `touchLayout`/`touchActions` en los 4 juegos                     |
| `components/game-player.tsx`             | modificar: montar `<TouchControls>` cuando `touchLayout` existe y estamos en móvil; HUD compactado              |
| `app/globals.css`                        | modificar: estilos del overlay, media queries `(pointer: coarse)` y `max-width: 768px`, HUD compacto, landscape |
| `lib/games/asteroids/engine.ts`          | modificar: `setInput('rot-left'/'rot-right'/'thrust'/'shoot'/'hyperspace', pressed)`                            |
| `lib/games/asteroids/types.ts`           | modificar: exponer `setInput` en `AsteroidsEngine`                                                              |
| `lib/games/caida/engine.ts`              | modificar: `setInput('left'/'right'/'down'/'rotate'/'drop', pressed)`                                           |
| `lib/games/caida/types.ts`               | modificar: exponer `setInput` en `CaidaEngine`                                                                  |
| `lib/games/bloque-buster/engine.ts`      | modificar: `setInput('left'/'right'/'launch', pressed)`                                                         |
| `lib/games/bloque-buster/types.ts`       | modificar: exponer `setInput` en `BloqueBusterEngine`                                                           |
| `lib/games/snake/engine.ts`              | modificar: `setInput('up'/'down'/'left'/'right', pressed)` (encola giro al `true`)                              |
| `lib/games/snake/types.ts`               | modificar: exponer `setInput` en `SnakeEngine`                                                                  |
| `components/asteroids-canvas.tsx`        | modificar: quitar aviso «requiere teclado»; la leyenda queda solo con teclas en escritorio                      |
| `components/caida-canvas.tsx`            | modificar: idem                                                                                                 |
| `components/bloque-buster-canvas.tsx`    | modificar: idem                                                                                                 |
| `components/snake-canvas.tsx`            | modificar: idem                                                                                                 |
| `lib/db/*`, `app/**/*` (fuera de player) | **no se modifican**                                                                                             |
| Migraciones Supabase                     | **no se crean**                                                                                                 |
| `refereences/**`                         | **no se modifica**                                                                                              |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable, con el teclado funcionando en escritorio como hoy.

1. **Leer la documentación local de Next 16.4** (`node_modules/next/dist/docs/`) sobre componentes cliente, `cacheComponents`, `useEffect` con APIs del navegador (pointer events, media queries) y SSR safety de `window.matchMedia`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** para el overlay (D-pad y botones), el HUD compacto, portrait vs landscape y el tratamiento visual (transparencia, bordes neon, tipografía). Volver a aplicarlos en los pasos 4 y 6.
3. **Contrato en el registro:** añadir `TouchLayoutId`, `TouchSpec`, `touchLayout`, `touchActions` a `lib/games/registry.ts` y rellenar las cuatro entradas con los mapeos de arriba. Esto por sí solo no cambia el comportamiento visible.
4. **`<TouchControls>`:** nuevo componente cliente. Recibe `layout`, `actions` y `onInput(action, pressed)`. Pinta el overlay según `layout`. Usa `pointerdown`/`pointerup`/`pointercancel` con `setPointerCapture` por botón. CSS en `app/globals.css` (media queries `(pointer: coarse)` y `max-width: 768px`, variantes portrait/landscape). Solo visual, sin lógica de juego.
5. **`setInput` en los motores:** añadir la función a `AsteroidsEngine`, `CaidaEngine`, `BloqueBusterEngine` y `SnakeEngine`. Cada motor mapea las acciones al mismo estado interno que ya usa para el teclado: hold → setea el flag, edge → dispara una vez. Los listeners de teclado existentes no se tocan. Snake encola un giro al `pressed = true` (ignora `false`).
6. **Enganche en `GamePlayer`:** si `entry.touchLayout` y `matchMedia('(pointer: coarse), (max-width: 768px)').matches`, monta `<TouchControls>` y pasa `onInput = (a, p) => engineRef.current?.setInput(a, p)`. Pausa automática al perder foco del juego y al minimizar sigue funcionando como hoy.
7. **HUD compacto:** rediseñar la fila superior de `GamePlayer` para móvil (2 filas de tarjetas + 1 fila de botones). Solo CSS más algún `className` adicional en `GamePlayer`; sin cambios en los datos.
8. **Quitar aviso «requiere teclado»** de los cuatro `*Controls`. La leyenda sigue mostrando teclas en escritorio.
9. **Verificación:** Playwright con dispositivos emulados (iPhone 13, Pixel 7), portrait y landscape, los cuatro juegos. Capturas en `.playwright-screenshots/spec11-<juego>-<orientation>.png`. Verificar que el canvas sigue respondiendo al teclado en escritorio y que no hay regresión visual.

### Nombres de commit

Al terminar cada paso con cambios, `/spec-impl` **propone** el nombre y **no commitea** hasta confirmación.

| Paso | Commit propuesto                                            |
| ---- | ----------------------------------------------------------- |
| 3    | `feat: add touch layout fields to engine registry`          |
| 4    | `feat: add TouchControls overlay component`                 |
| 5    | `feat: add setInput to all game engines`                    |
| 6    | `feat: wire touch controls into game player`                |
| 7    | `feat: compact game player HUD on mobile`                   |
| 8    | `chore: remove keyboard-required notice from game controls` |
| 9    | `test: verify mobile controls across games with playwright` |

Los pasos 1 y 2 no producen cambios.

---

## Criterios de aceptación

### Build y calidad

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `grep -r "service_role" app components lib` no devuelve resultados.
- [ ] `grep -r "navigator.vibrate" app components lib` no devuelve resultados (confirmación de "solo visual").

### Framework de controles táctiles

- [ ] En viewport ≤ 768 px **o** `(pointer: coarse)`, `/games/<id>/jugar` muestra el overlay con D-pad abajo-izquierda y botones abajo-derecha según el `touchLayout` del juego.
- [ ] En viewport > 768 px con puntero `fine` (escritorio), el overlay **no** aparece. El canvas sigue respondiendo al teclado como hoy.
- [ ] Los botones registran pulsación en `pointerdown` (no en `click`) y liberación en `pointerup`/`pointercancel`. Al deslizar el dedo fuera del botón sin levantarlo, el motor no recibe un `false` espurio (gracias a `setPointerCapture`).
- [ ] Multi-touch: mantener D-pad izquierda con un dedo y pulsar DISPARO con otro no cancela el movimiento (verificado con Playwright `page.touchscreen` o `dispatchEvent` de `pointerdown`/`pointerup` con dos `pointerId` distintos).
- [ ] Al cambiar la pestaña o perder foco, el overlay deja de recibir pulsaciones (los listeners se limpian al desmontar).
- [ ] Al desmontar `GamePlayer` o navegar fuera, `TouchControls` libera todos los `pointerId` capturados.

### Mapeos por juego (móvil)

- [ ] **Snake:** las 4 flechas del D-pad giran la serpiente igual que las teclas; mantener el D-pad no acelera (solo encola un giro al pressed = true).
- [ ] **Caída:** izq/der mueven lateralmente; abajo baja (soft drop); arriba rota; botón DROP hace hard drop. Mantener izq/der aplica DAS/ARR si ya existe para el teclado; si no, mantiene la misma frecuencia que la pulsación de tecla.
- [ ] **Bloque Buster:** izq/der mueven la pala; LANZAR dispara la bola desde la pala (solo en `pressed = true`); mantenerlo no la vuelve a lanzar.
- [ ] **Asteroids:** izq/der rotan mientras se mantienen; arriba aplica propulsión mientras se mantiene; DISPARO dispara una sola vez por pulsación; HIPER hace hiperespacio una vez por pulsación.
- [ ] En los cuatro juegos, pulsar un botón del overlay funciona con la partida en curso **y** desde el estado inicial (sin tener que pulsar el canvas primero).

### HUD móvil

- [ ] A ≤ 768 px, el HUD superior entra sin scroll horizontal en un iPhone 13 (390 px) y Pixel 7 (412 px), en portrait y landscape.
- [ ] Las tarjetas de JUGADOR, PUNTUACIÓN, VIDAS, NIVEL y SKIN siguen siendo legibles (tipografía ≥ 12 px efectivos) y los botones PAUSA/FIN/SALIR tienen zona táctil ≥ 44×44 px (regla iOS HIG).
- [ ] En escritorio (> 768 px, `pointer: fine`) el HUD queda idéntico al actual (no hay regresión visible en captura).

### Teclado y leyenda

- [ ] En escritorio, la leyenda de teclas (`controls-legend`) sigue mostrándose igual que hoy en los cuatro juegos.
- [ ] En `(pointer: coarse)`, el aviso «requiere teclado» ya **no** aparece en Asteroids, Caída, Bloque Buster ni Snake.
- [ ] El teclado sigue funcionando aunque el overlay táctil esté montado (p. ej., portátil con pantalla táctil). Pulsar una tecla no entra en conflicto con un pointer activo.

### Landscape

- [ ] En landscape ≤ 500 px de alto, el D-pad se mantiene abajo-izquierda y los botones abajo-derecha, pero el HUD se contrae a una sola fila superior. El canvas no se tapa con los controles (el overlay respeta la safe-area).
- [ ] En iPad vertical (ancho ≈ 820 px, `pointer: coarse`): aparece el overlay (porque la media query incluye `(pointer: coarse)` sin requerir ≤ 768 px). El canvas y el HUD se escalan sin scroll.

### Sin regresiones

- [ ] `/games`, `/games/[id]`, `/salon`, `/`, `/about` y `/login` siguen funcionando en escritorio y móvil (capturas en `.playwright-screenshots/`).
- [ ] `git diff` no toca `lib/db/`, `app/salon/`, `components/leaderboard.tsx`, migraciones ni `refereences/`.
- [ ] `apply_migration` **no** se ha ejecutado (no hay cambios de BD).
- [ ] Las skins (`/salon`, selector en `GamePlayer`) siguen funcionando: cambiar la skin con el overlay táctil montado no reinicia la partida.
- [ ] Guardar puntuación desde móvil con el input del modal funciona: escribir el nombre no activa pulsaciones del D-pad, ni el teclado virtual rompe el layout del overlay (`TouchControls` se desmonta o se oculta mientras el modal está abierto).

### Proceso

- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para el overlay, el HUD compacto y las variantes portrait/landscape, y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [ ] Capturas de Playwright de los cuatro juegos en portrait y landscape (iPhone 13 y Pixel 7), más una captura de escritorio por juego para verificar no-regresión.
- [ ] Tras cada paso con cambios se propuso al usuario un nombre de commit con el formato `feat: …` o `chore: …` en inglés y no se commiteó sin su confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint` y `npm run build`.
2. `npm run dev` y abrir `/games/<id>/jugar` desde un móvil real (o DevTools con touch emulation) en los cuatro juegos; verificar que el juego es jugable sin teclado.
3. Rotar a landscape y volver a portrait: comprobar que el overlay se reposiciona sin recargar.
4. En escritorio: comprobar que el overlay no aparece, que el HUD es idéntico al actual y que las teclas funcionan igual.
5. Guardar puntuación desde móvil (nombre y sin nombre) en los cuatro juegos.

---

## Decisiones tomadas y descartadas

- **Framework + los 4 juegos en una sola spec.** _Descartado:_ framework + un piloto (Snake) y los otros 3 en spec aparte; se habría dejado el catálogo a medias en móvil durante semanas.
- **Activación automática por `(pointer: coarse)` o ≤ 768 px, sin toggle manual.** _Descartado:_ toggle en el HUD (añade superficie de bug para un caso borde de tablets híbridas); siempre visible (ruido en escritorio).
- **Overlay sobre el canvas, no banda separada bajo el marco CRT.** La imagen de referencia lo valida y aprovecha el alto de pantalla. _Descartado:_ banda separada (reduce el canvas en móviles pequeños); flotantes por juego (fragmenta la UX).
- **Contrato del motor: `setInput(action, pressed)` por motor.** El framework no simula `KeyboardEvent`. _Descartado:_ reemitir teclas sintéticas (`preventDefault` del input del modal, foco perdido, iOS a veces ignora los eventos sintéticos).
- **Mapeos por juego aprobados en Fase 2** (ver tabla de alcance). _Descartado:_ dejar los mapeos TBD para `/spec-impl` (scope sin congelar).
- **Portrait y landscape soportados.** _Descartado:_ solo portrait con aviso «gira el móvil» (regresión UX en landscape); portrait + aviso de rotación (pausa innecesaria).
- **HUD compactado en móvil con cambios en `GamePlayer`.** _Descartado:_ dejar el HUD como está (scroll vertical excesivo y botones pequeños para dedo).
- **Solo feedback visual, sin `navigator.vibrate`.** iOS Safari lo ignora en PWA no instalada; añadiría ruido para poca ganancia. _Descartado:_ visual + vibración corta.
- **Multi-touch con `setPointerCapture` por botón.** _Descartado:_ un solo pointer activo (haría imposible rotar y disparar a la vez en Asteroids).
- **Eliminar «requiere teclado» solo en juegos con `touchLayout` registrado.** Un juego futuro sin mapeo seguirá mostrando el aviso para no engañar al usuario. _Descartado:_ eliminarlo en todos; mantenerlo en todos.
- **Sin cambios en BD, migraciones ni `lib/db/*`.** _Descartado:_ guardar la preferencia del usuario de "mostrar/ocultar overlay" (no hay toggle).
- **Verificación con Playwright emulando dispositivos**, no en dispositivo real como criterio obligatorio. _Descartado:_ exigir dispositivo real (frena el PR; se recomienda en la verificación manual).

---

## Riesgos identificados

| Riesgo                                                                                      | Mitigación                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| El overlay tapa partes del canvas donde ocurre acción (p. ej. nave de Asteroids en esquina) | Overlay con `opacity` baja en el fondo y zona central libre; criterio visual con captura; posible reserva de "safe zone" en el motor |
| `pointerup` perdido fuera del elemento deja el botón "pegado" (hold permanente)             | `setPointerCapture` + listener `pointercancel`; `setInput(false)` al desmontar; criterio con test de arrastre fuera                  |
| Multi-touch rompe en navegadores viejos o `TouchEvent` sin pointer events                   | Comprobación de `PointerEvent` disponible (iOS 13+ y Android 9+); se asume soporte moderno y se documenta en Decisiones              |
| Teclado virtual del modal "GUARDAR PUNTUACIÓN" rompe el layout del overlay                  | `TouchControls` se oculta mientras el modal está abierto; criterio explícito                                                         |
| Media query `(pointer: coarse)` falsamente positiva en portátiles híbridos con touch        | También exige ≤ 768 px **o** `(pointer: coarse)` con `any-hover: none`; si el usuario rechaza, se puede escapar con el teclado       |
| Añadir `setInput` a los motores regresiona el teclado por un typo en el estado interno      | Añadir `setInput` como un wrapper que apunta al mismo estado interno; criterio explícito de teclado sin regresión                    |
| El HUD compactado reduce legibilidad por debajo de iOS HIG (44×44)                          | Criterio explícito de zona táctil ≥ 44×44 px y tipografía ≥ 12 px efectivos                                                          |
| Landscape en móviles con notch oculta el D-pad detrás de la safe-area                       | `padding` del overlay con `env(safe-area-inset-*)`; verificación en Playwright emulando iPhone con notch                             |
| El selector de skin del HUD compacto queda muy pequeño y el usuario no puede pulsarlo       | Rediseño con `/ui-ux-pro-max`; posible cambio del `<select>` por botones de skin en móvil                                            |
| Doble montaje de React Strict Mode duplica listeners de pointer                             | `TouchControls` limpia en el `useEffect` y libera `pointerId` capturados al desmontar                                                |
| Snake con D-pad: pulsaciones rápidas se pierden si el motor solo mira "edge" al pressed     | El motor Snake ya tiene cola de 2 giros (SPEC 10); `setInput('left', true)` encola igual que una tecla                               |
| Asteroids con pulsación larga de HIPER repite el hiperespacio                               | El motor trata HIPER como edge: ignora el pressed si el flag ya está en true hasta que llegue un false                               |

---

## Lo que **no** entra en esta spec

- Nuevos juegos o cambios de mecánica.
- Haptics / `navigator.vibrate`.
- Toggle manual del usuario para mostrar/ocultar los controles.
- Guardar la preferencia de controles en `localStorage` o Supabase.
- Modo "manos cruzadas" (D-pad a la derecha y botones a la izquierda) para zurdos.
- Soporte de gamepad físico (`navigator.getGamepads`).
- Sonido o feedback haptico avanzado.
- Autenticación real, Realtime, anti-trampas.
- Cambios en Supabase o en `lib/db/*`.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
