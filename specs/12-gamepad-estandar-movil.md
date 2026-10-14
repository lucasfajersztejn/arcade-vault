# SPEC 12 — Gamepad estándar MK-II para móvil/tablet

**Estado:** Aprobado
**Depende de:** SPEC 11 (`specs/11-controles-tactiles-movil.md`) por el contrato `setInput` y el enganche en `GamePlayer`; SPEC 05 (`specs/05-juego-asteroids.md`), SPEC 07 (`specs/07-juego-caida.md`), SPEC 08 (`specs/08-juego-bloque-buster.md`) y SPEC 10 (`specs/10-juego-snake.md`) por los motores que exponen `setInput`.
**Fecha:** 2026-10-14
**Objetivo:** Unificar los controles táctiles de los 4 juegos del catálogo en un único gamepad neón MK-II con silueta fija (D-pad de 4 flechas + 2 botones circulares A magenta y B cyan), basado en `refereences/gamepad-assets/`.

---

## Por qué existe esta spec

SPEC 11 resolvió el problema funcional (jugar sin teclado en móvil) pero cada juego pinta un gamepad distinto: Snake sin botones, Bloque Buster con 1 botón `LANZAR`, Caída con `DROP`, Asteroids con `DISPARO` + `HIPER` y un D-pad con flechas ocultas según el juego. El resultado se percibe inconsistente y rompe la identidad del "cabinet".

La referencia `refereences/gamepad-assets/gamepad.html` + `gamepad-neon.png` propone una silueta fija y reconocible: banda horizontal neón con D-pad de 4 flechas (hub central con "gema" cyan pulsante) y 2 botones circulares A (magenta) + B (cyan). Esa silueta debe mantenerse idéntica en los 4 juegos. Lo único que cambia por juego es qué acción dispara cada posición; las posiciones no usadas se pintan **inertes** (apagadas) para preservar la forma del cabinet.

Esta spec cambia solo la capa visual del overlay táctil y los mapeos del registro. **No toca motores, ni BD, ni el contrato `setInput`** que ya introdujo SPEC 11.

---

## Alcance

### Dentro

- **Reescribir** `components/touch-controls.tsx` para pintar un gamepad único inspirado en `refereences/gamepad-assets/gamepad.html`:
  - Banda horizontal con D-pad a la izquierda (4 flechas visibles + hub central con "gema" cyan pulsante) y botones circulares a la derecha (B cyan a la izquierda, A magenta a la derecha, como en la referencia).
  - `pointerdown`/`pointerup`/`pointercancel` con `setPointerCapture` por botón (misma técnica que SPEC 11).
  - Multi-touch: cada slot reserva su propio `pointerId`.
  - Feedback visual al pulsar: iluminación cyan/magenta + `transform: translateY(3px)`.
- **Rediseñar el contrato** de `lib/games/registry.ts` reemplazando `touchLayout` + `touchActions` libres por un mapeo fijo por posición:
  ```ts
  export type TouchActionId = string | null;
  export type TouchDpadMap = {
    up: TouchActionId;
    down: TouchActionId;
    left: TouchActionId;
    right: TouchActionId;
  };
  export type TouchButtons = { a: TouchActionId; b: TouchActionId };
  export type TouchSpec = { dpad: TouchDpadMap; buttons: TouchButtons };
  ```
  Las posiciones con `null` se pintan inertes (clase `.gp-slot-off`), no reciben hover y **no** disparan `setInput`.
- **Eliminar** el tipo `TouchLayoutId` y el campo `touchLayout` del `EngineEntry` (ya no hay layouts por juego: la silueta es única).
- **Rellenar las 4 entradas** del registro con esta tabla (A = magenta, B = cyan):

  | Juego         | ←        | →         | ↑      | ↓    | A (magenta) | B (cyan)   |
  | ------------- | -------- | --------- | ------ | ---- | ----------- | ---------- |
  | asteroids     | rot-left | rot-right | thrust | —    | shoot       | hyperspace |
  | caida         | left     | right     | —      | down | rotate      | drop       |
  | bloque-buster | left     | right     | —      | —    | launch      | —          |
  | snake         | left     | right     | up     | down | —           | —          |

- **CSS en `app/globals.css`:** portar los bloques `.gp`, `.gp-body`, `.gp-dpad`, `.dp`, `.dp-hub`, `.dp-hub-gem`, `.ab`, animación `pulse-led` del HTML de referencia, prefijando con `.touch-controls` para evitar colisiones. Añadir `.gp-slot-off` (opacidad reducida, sin hover, `cursor: default`).
- **Visibilidad:** ampliar la media query a `(pointer: coarse), (max-width: 1024px)` para que iPad portrait (820 px) y landscape (≤ 1024 px) también muestren el gamepad. En escritorio con puntero `fine` y viewport > 1024 px no se monta nunca.
- **Enganche en `GamePlayer`:** mantener el flujo de SPEC 11 (ocultar el gamepad mientras el modal "GUARDAR PUNTUACIÓN" esté abierto); solo cambia la MQ y la forma de pasar la spec al componente.
- **Verificación con Playwright:** iPhone 13, Pixel 7 e iPad (portrait + landscape); capturas en `.playwright-screenshots/spec12-<juego>-<device>-<orientation>.png`.

### Fuera (explícito)

- Nuevos juegos o cambios de mecánica.
- Haptics / `navigator.vibrate` / sonido del gamepad.
- Toggle manual del usuario para mostrar/ocultar el gamepad.
- Modo zurdo (A/B a la izquierda, D-pad a la derecha).
- Gamepad reactivo a la skin del juego (siempre cyan/magenta).
- Añadir Press Start 2P o JetBrains Mono como fuentes nuevas (se reutilizan las ya cargadas por el proyecto).
- Cambios en motores (`lib/games/*/engine.ts`), tipos de motor (`*/types.ts`), componentes canvas, Supabase, `lib/db/*`.
- Cambios en `/salon`, `/games`, `/`, `/about`, `/login`.
- Modificar `refereences/`.
- Tests automatizados.

---

## Modelo de datos

Esta spec no introduce estructuras persistentes nuevas. No se tocan tablas, vistas, migraciones, RLS, `lib/db/*` ni `localStorage`. No hay `apply_migration`.

Contratos TypeScript nuevos o modificados en `lib/games/registry.ts`:

```ts
export type TouchActionId = string | null;

export type TouchDpadMap = {
  up: TouchActionId;
  down: TouchActionId;
  left: TouchActionId;
  right: TouchActionId;
};

export type TouchButtons = {
  a: TouchActionId;
  b: TouchActionId;
};

export type TouchSpec = {
  dpad: TouchDpadMap;
  buttons: TouchButtons;
};

export type EngineEntry = {
  Canvas: ComponentType<EngineCanvasProps>;
  Controls: ComponentType;
  hasLives: boolean;
  ariaLabel: string;
  skins?: SkinId[];
  /** Si está presente, `GamePlayer` monta el gamepad en móvil/tablet. */
  touchActions?: TouchSpec;
  // touchLayout: ELIMINADO
};
```

Entradas de registro para los 4 juegos (strings = acciones ya aceptadas por el `setInput` de cada motor; mismo vocabulario que SPEC 11):

```ts
asteroids: {
  touchActions: {
    dpad: { up: "thrust", down: null, left: "rot-left", right: "rot-right" },
    buttons: { a: "shoot", b: "hyperspace" },
  },
},
caida: {
  touchActions: {
    dpad: { up: null, down: "down", left: "left", right: "right" },
    buttons: { a: "rotate", b: "drop" },
  },
},
"bloque-buster": {
  touchActions: {
    dpad: { up: null, down: null, left: "left", right: "right" },
    buttons: { a: "launch", b: null },
  },
},
snake: {
  touchActions: {
    dpad: { up: "up", down: "down", left: "left", right: "right" },
    buttons: { a: null, b: null },
  },
},
```

El contrato de motor `setInput(action, pressed)` de SPEC 11 **no cambia**: cada acción listada aquí ya está implementada en el motor correspondiente.

---

## Archivos a crear / modificar

| Archivo                               | Acción                                                                                                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/touch-controls.tsx`       | reescribir: nuevo render con silueta fija (4 flechas + A + B); props `{ spec: TouchSpec; onInput }`; inertes para slots `null`                                   |
| `lib/games/registry.ts`               | modificar: nuevo tipo `TouchSpec`, 4 entradas rellenas; eliminar `TouchLayoutId` y `touchLayout`                                                                 |
| `components/game-player.tsx`          | modificar mínimo: pasar `entry.touchActions` al componente; ampliar MQ a 1024 px; condición de montaje usa `touchActions` (no `touchLayout`)                     |
| `app/globals.css`                     | modificar: portar CSS del gamepad MK-II desde la referencia, prefijado con `.touch-controls`; añadir `.gp-slot-off`; MQ `(pointer: coarse), (max-width: 1024px)` |
| `lib/games/*/engine.ts`               | **no se modifica**                                                                                                                                               |
| `lib/games/*/types.ts`                | **no se modifica**                                                                                                                                               |
| `components/*-canvas.tsx`             | **no se modifica**                                                                                                                                               |
| `lib/db/`, `app/**/*` fuera de player | **no se modifica**                                                                                                                                               |
| Migraciones Supabase                  | **no se crean**                                                                                                                                                  |
| `refereences/**`                      | **no se modifica**                                                                                                                                               |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable; el teclado en escritorio sigue funcionando como hoy.

1. **Leer la documentación local de Next 16.4** (`node_modules/next/dist/docs/`) sobre componentes cliente, `useEffect` con pointer events y SSR safety de `window.matchMedia`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** con la referencia `refereences/gamepad-assets/gamepad.html` + `gamepad-neon.png`: paleta exacta, estados pulsado/inerte, transiciones, tipografías disponibles en el proyecto. Volver a aplicarlos en los pasos 4 y 5.
3. **Nuevo contrato en el registro:** sustituir `TouchActionButton[]` por `TouchSpec` con `dpad`/`buttons` en `lib/games/registry.ts`; borrar `TouchLayoutId` y `touchLayout`; rellenar las 4 entradas con la tabla del alcance. Esto por sí solo rompe el componente actual hasta el paso 4.
4. **Reescritura de `components/touch-controls.tsx`:** render fijo (4 flechas + A + B siempre pintados); props `{ spec: TouchSpec; onInput: (action: string, pressed: boolean) => void }`; `setPointerCapture` por slot; cuando un slot vale `null`, se pinta con `.gp-slot-off` y los handlers hacen `return` antes de llamar a `onInput`; aria-labels dinámicos (p. ej. `aria-label="A: disparar"` o `aria-label="A: inactivo"`).
5. **CSS en `app/globals.css`:** portar los bloques `.gp`, `.gp-body`, `.gp-dpad`, `.dp`, `.dp-hub`, `.dp-hub-gem`, `.ab`, `@keyframes pulse-led` del HTML de referencia, todos prefijados con `.touch-controls` como namespace para evitar colisiones. Añadir `.gp-slot-off` (opacidad reducida, sin `:hover`, `cursor: default`, sin box-shadow pulsado). Media query de visibilidad `@media (pointer: coarse), (max-width: 1024px)` reemplaza la de SPEC 11.
6. **Enganche en `GamePlayer`:** cambiar la condición de montaje de `entry.touchLayout` a `entry.touchActions`; actualizar la MQ a 1024 px; pasar `entry.touchActions` como `spec`. El comportamiento con el modal "GUARDAR PUNTUACIÓN" no cambia.
7. **Verificación con Playwright:** emular iPhone 13, Pixel 7 e iPad Mini/Pro (portrait + landscape) y recorrer los 4 juegos. Capturas en `.playwright-screenshots/spec12-*`. Jugar manualmente una partida corta de cada juego confirmando que A/B y las flechas disparan la acción correcta y que los slots inertes no responden.

### Nombres de commit

Al terminar cada paso con cambios, `/spec-impl` **propone** el nombre y **no commitea** hasta confirmación.

| Paso | Commit propuesto                                               |
| ---- | -------------------------------------------------------------- |
| 3    | `refactor: switch touch registry to fixed A/B gamepad mapping` |
| 4    | `feat: rewrite TouchControls as MK-II standard gamepad`        |
| 5    | `feat: port MK-II gamepad styling into globals.css`            |
| 6    | `feat: wire standard gamepad into GamePlayer up to 1024px`     |
| 7    | `test: verify MK-II gamepad across games with playwright`      |

Los pasos 1 y 2 no producen cambios.

---

## Criterios de aceptación

### Build y calidad

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `grep -rn "touchLayout\|TouchLayoutId" app components lib` no devuelve resultados (el símbolo fue eliminado).
- [ ] `grep -rn "navigator.vibrate" app components lib` no devuelve resultados.

### Silueta y estética

- [ ] En los 4 juegos (`/games/<id>/jugar`) a `(pointer: coarse)` o viewport ≤ 1024 px, el gamepad muestra siempre: D-pad con las 4 flechas visibles + hub central con "gema" pulsante + 2 botones circulares (B cyan a la izquierda, A magenta a la derecha).
- [ ] El gamepad es visualmente **idéntico** en los 4 juegos (el único diff entre capturas es qué slots están inertes).
- [ ] Las flechas y botones inertes se pintan apagados (opacidad reducida, sin hover, `cursor: default`) y **no** disparan `setInput` al pulsarlos.
- [ ] A pulsado se ilumina en magenta; B en cyan; una flecha activa pulsada se ilumina en cyan (igual que la referencia).

### Mapeo por juego

- [ ] **Asteroids:** ← rot-left, → rot-right, ↑ thrust, ↓ inerte, A dispara, B hiperespacio. Mantener ↑ aplica propulsión mientras se mantiene; A dispara una vez por pulsación; B lanza hiper una vez por pulsación.
- [ ] **Caída:** ← izq, → der, ↓ soft drop, ↑ inerte, A rota, B hard drop. A y B disparan una sola vez por pulsación.
- [ ] **Bloque Buster:** ← izq, → der, ↑ y ↓ inertes, A lanza, B inerte. A dispara una vez por pulsación.
- [ ] **Snake:** las 4 flechas giran la serpiente; A y B inertes.
- [ ] En los 4 juegos, pulsar un slot activo funciona con la partida en curso **y** desde el estado inicial.

### Visibilidad

- [ ] En viewport > 1024 px con puntero `fine` (escritorio), el gamepad no se monta.
- [ ] En iPad portrait (820 px) y landscape (1024 px) el gamepad aparece en banda bajo el marco CRT sin tapar el canvas.
- [ ] Con el modal "GUARDAR PUNTUACIÓN" abierto, el gamepad se oculta (mismo criterio que SPEC 11).

### Multi-touch y pointer

- [ ] Mantener una flecha con un dedo y pulsar A con otro no cancela el movimiento (verificado con `page.touchscreen` o `pointerdown`/`pointerup` con dos `pointerId` distintos en Playwright).
- [ ] Arrastrar el dedo fuera del botón sin levantar no deja el botón "pegado" (`setPointerCapture` + `pointercancel`).
- [ ] Al desmontar el componente o navegar fuera, se liberan todos los `pointerId` capturados y se emite `setInput(action, false)` para los slots activos.

### Sin regresiones

- [ ] El teclado en escritorio sigue funcionando igual que antes en los 4 juegos.
- [ ] `git diff` no toca `lib/games/*/engine.ts`, `lib/games/*/types.ts`, `components/*-canvas.tsx`, `lib/db/`, migraciones ni `refereences/`.
- [ ] `apply_migration` no se ejecuta (no hay cambios de BD).
- [ ] Las skins (`/salon`, selector en `GamePlayer`) siguen funcionando y **no** alteran el color del gamepad (siempre cyan/magenta).
- [ ] `/games`, `/games/[id]`, `/salon`, `/`, `/about` y `/login` sin regresión visual en escritorio ni móvil.

### Proceso

- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para el gamepad y los estados inertes, y sus recomendaciones quedaron aplicadas (o descartadas con motivo).
- [ ] Se leyó la documentación local de Next 16.4 antes de escribir código.
- [ ] Capturas de Playwright (iPhone 13 + Pixel 7 + iPad, portrait y landscape, los 4 juegos) en `.playwright-screenshots/spec12-*`.
- [ ] Nombres de commit propuestos en inglés (`feat: …` / `refactor: …` / `test: …`) y no ejecutados sin confirmación.

### Verificación manual recomendada (paso final)

1. `npm run lint && npm run build`.
2. `npm run dev` y abrir los 4 juegos desde DevTools emulando iPhone 13 y Pixel 7: silueta idéntica, slots inertes apagados, A/B y flechas disparan la acción correcta.
3. Emular iPad (portrait 820 px y landscape 1024 px): gamepad visible y jugable.
4. En escritorio ≥ 1025 px con `pointer: fine`: el gamepad no aparece y el teclado funciona en los 4 juegos.
5. Guardar puntuación desde móvil: el gamepad se oculta mientras el modal está abierto y vuelve al cerrarlo.
6. Cambiar skin de un juego: el color del gamepad no se altera.

---

## Decisiones tomadas y descartadas

- **Silueta fija (D-pad 4 flechas + A/B) en los 4 juegos, slots `null` como inertes.** _Descartado:_ ocultar slots no usados (rompe la silueta de la referencia); mantener etiquetas por juego (DISPARO/HIPER/DROP/LANZAR) tipo SPEC 11 (menos reconocible como gamepad).
- **Etiquetas siempre `A` y `B`.** El usuario aprende el mapeo por juego; la coherencia visual prima. _Descartado:_ A/B con leyenda explicativa debajo (añade ruido); seguir con etiquetas por juego.
- **Mapeo A = acción principal, B = secundaria.** En Caída, rotar pasa a A y la flecha ↑ queda inerte (más coherente: acciones en botones, movimiento en D-pad). _Descartado:_ dejar ↑ como rotar en Caída (fragmenta el patrón).
- **Reescribir `components/touch-controls.tsx` in-place.** _Descartado:_ crear componente nuevo y borrar el viejo (ruido en diff); feature flag con fallback (overengineering).
- **Banda bajo el marco CRT (ya es el estado actual tras `f5bbcc9`).** _Descartado:_ overlay sobre el canvas (regresión UX); híbrido portrait/landscape (complejidad).
- **Visibilidad hasta 1024 px.** iPad en portrait (820 px) también debe ver el gamepad. _Descartado:_ ≤ 768 px (deja iPad fuera); siempre visible (ruido en escritorio); toggle manual (SPEC 11 ya lo descartó).
- **Colores fijos cyan/magenta, no reactivos a la skin.** El gamepad es parte del "cabinet", no del juego. _Descartado:_ gamepad reactivo a la skin del juego.
- **Fuentes del proyecto, no añadir Google Fonts.** Press Start 2P + JetBrains Mono queda como referencia estética a aproximar con lo ya cargado. _Descartado:_ importar las dos fuentes de la referencia (peso de red extra).
- **No se tocan motores.** `setInput` de SPEC 11 ya cubre todas las acciones del mapeo. _Descartado:_ renombrar acciones (fuerza regresión en motores y teclado).
- **Se elimina `touchLayout`.** El único consumidor del tipo es `GamePlayer` y se actualiza en el mismo paso. _Descartado:_ mantener `touchLayout` como campo obsoleto marcado deprecated (deja basura en el registro).

---

## Riesgos identificados

| Riesgo                                                                            | Mitigación                                                                                           |
| --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Usuarios pulsan slots inertes y no entienden por qué no responden                 | Estilo claramente apagado (opacidad baja, sin hover, `cursor: default`) + `aria-label="…: inactivo"` |
| iPad landscape (1024 px) con teclado conectado muestra el gamepad sin necesitarlo | La MQ incluye `(pointer: coarse) or (max-width: 1024px)`; el teclado sigue funcionando en paralelo   |
| El CSS portado de la referencia colisiona con clases existentes                   | Prefijar todas las clases con `.touch-controls` como namespace                                       |
| Pulsar A/B al cerrar el modal "GUARDAR PUNTUACIÓN" dispara acción accidental      | Mismo criterio de SPEC 11: el gamepad no se monta mientras el modal está abierto                     |
| Desacoplar `touchLayout` rompe algún consumidor externo                           | `grep` previo del símbolo; único consumidor es `GamePlayer`, se actualiza en el mismo paso           |
| El cambio visual rompe las capturas de SPEC 11 en `.playwright-screenshots/`      | Capturas nuevas con prefijo `spec12-`; las antiguas se dejan como histórico                          |
| iPad con teclado físico detecta `pointer: fine` y oculta el gamepad               | La MQ es `or`, no `and`: ≤ 1024 px lo muestra aunque el puntero sea `fine`                           |
| Multi-touch rompe en navegadores sin `PointerEvent`                               | Supuesto iOS 13+ y Android 9+ (igual que SPEC 11); documentado en Decisiones                         |

---

## Lo que **no** entra en esta spec

- Nuevos juegos o cambios de mecánica.
- Haptics / `navigator.vibrate` / sonido del gamepad.
- Toggle manual del usuario para mostrar/ocultar.
- Modo zurdo (A/B a la izquierda, D-pad a la derecha).
- Gamepad reactivo a la skin del juego.
- Soporte de gamepad físico (`navigator.getGamepads`).
- Cambios en motores, tipos de motor, componentes canvas, Supabase o `lib/db/*`.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
