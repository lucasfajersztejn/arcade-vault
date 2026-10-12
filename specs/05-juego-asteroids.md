# SPEC 05 — Añadir el juego Asteroids como juego nuevo del catálogo

**Estado:** Aprobado
**Depende de:** SPEC 02 (`specs/02-mover-biblioteca-a-games-y-404.md`, Implementado) por las rutas `/games/[id]/jugar`; SPEC 01 (`specs/01-mvp-pantallas-visuales.md`, Implementado) por `GamePlayer`, el marco CRT y `av_scores`
**Fecha:** 2026-10-12
**Objetivo:** Añadir al catálogo un juego nuevo `asteroids` (id `asteroids`) con el Asteroids real de `refereences/started-games/02-asteroids`, portado a un motor TypeScript con canvas montado en `GamePlayer`, con HUD, pausa y guardado de puntuación de la plataforma, dejando `rocas` intacto.

---

## Por qué existe esta spec

Hoy todos los juegos del catálogo usan una puntuación simulada (`setInterval`). Asteroids es el primer juego real y fija el patrón que seguirán Tetris, Arkanoid, etc.: un **motor sin dependencias de React** que emite eventos, y un componente cliente que lo monta y lo conecta al HUD y al modal de fin de partida existentes.

---

## Alcance

### Dentro

- Reescribir `refereences/started-games/02-asteroids/game.js` (510 líneas, script global) a **módulos TypeScript** en `lib/games/asteroids/`, sin `document.getElementById` ni globales: el motor recibe el `<canvas>` y callbacks.
- Conservar la mecánica original: nave con inercia y rozamiento, envolvimiento toroidal, asteroides de 3 tamaños que se parten, partículas, 3 vidas con invencibilidad de 3 s al reaparecer, niveles (`3 + level` asteroides), power-up de disparo triple «3x» (15 % de drop, garantizado a las 5 destrucciones, 5 s de duración, 12 s de vida en pantalla).
- **Componente cliente** `components/asteroids-canvas.tsx` que crea el motor en `useEffect` y lo destruye al desmontar (compatible con el doble montaje de React Strict Mode).
- **Nueva entrada `asteroids` en `GAMES`** (`lib/data.ts`) y **nueva portada** `cover-asteroids` en `app/globals.css`, para que aparezca en la biblioteca (9 tarjetas), tenga detalle en `/games/asteroids` y reproductor en `/games/asteroids/jugar`. `rocas` **no se toca**: sigue siendo un juego simulado, con su texto y su portada actuales.
- **Integración en `GamePlayer`** solo para el juego `asteroids`: el resto de juegos (incluido `rocas`) conservan la simulación actual sin cambios.
  - HUD de la plataforma con datos reales: puntuación, vidas y nivel (el HUD dibujado en canvas se elimina; solo se mantiene en canvas el indicador «3x» con su cuenta atrás, por ser un efecto propio del juego).
  - **PAUSA** congela el motor de verdad; se pausa sola al ocultar la pestaña o perder el foco la ventana.
  - **FIN** fuerza el game over.
  - Al perder la 3.ª vida se abre el modal «FIN DEL JUEGO» existente con la puntuación final y guardado en `av_scores` con `game: "asteroids"`.
  - **JUGAR DE NUEVO** reinicia el motor. Se elimina el «ESPACIO PARA REINICIAR» del canvas.
- Controles de teclado del original: `←` `→` rotar, `↑` propulsar, `Espacio` disparar. Se evita el scroll de la página con flechas y Espacio solo mientras el motor está activo y el foco no está en un `input`.
- Canvas lógico fijo 800×600 escalado por CSS (proporción 4:3) dentro de `.crt-screen`; estilo vectorial blanco sobre negro original, power-up en cian.
- **Aviso «requiere teclado»** en dispositivos táctiles / pantallas estrechas (media query `(pointer: coarse)`), sin controles táctiles.
- Diseño: **usar SIEMPRE y obligatoriamente `/frontend-design` y `/ui-ux-pro-max`** (CLAUDE.md) en el trabajo visual de esta spec: integración del canvas en el marco CRT, aviso de teclado, estado de pausa y escalado responsive. No se escribe ni modifica UI sin haberlos invocado antes.
- Revisión de la documentación local de Next 16.4 antes de escribir código (regla de CLAUDE.md).
- Verificación visual con Playwright: capturas en `.playwright-screenshots/`, artefactos del MCP en `.playwright-mcp/`.

### Fuera (explícito)

- **Controles táctiles** (D-pad virtual, botón de disparo): spec propia.
- **Los demás juegos** (Tetris, Arkanoid y el resto del catálogo): siguen simulados; cada uno tendrá su spec.
- **Modificar, reemplazar o eliminar `rocas`**: el juego ROCAS (datos, portada, texto con OVNIs y simulación) se mantiene tal cual.
- **Refactor genérico de un «registro de motores»** (`GAME_ENGINES[id]`): solo se hace lo mínimo para `asteroids`; se generalizará cuando haya un segundo motor real.
- **Sonido / música.**
- **Recolor neón** del juego: se mantiene el estilo vectorial blanco original.
- **Persistencia en Supabase** de puntuaciones: siguen en `av_scores` (localStorage); spec propia.
- **Enemigos nuevos (OVNIs), nuevas mecánicas o cambios de balance** respecto al original.
- **Soporte para pantallas HiDPI** (escalado por `devicePixelRatio`): no se hace; el canvas se escala por CSS.
- **Tests automatizados** (sigue sin runner; el motor queda en módulos puros para testearlos en una spec futura).
- Cambios en sesión (`av_user`), rutas, `proxy.ts` o Supabase.

---

## Modelo de datos

No introduce tablas ni persistencia nueva: se reutiliza `saveScore({ game: "asteroids", score, name })` de `lib/scores.ts`. Se añade una entrada al array `GAMES` (tipo `Game` existente, sin cambios en `lib/types.ts`):

```ts
// lib/data.ts — nueva entrada (valores propuestos; el texto se puede ajustar al revisar la spec)
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Pilota tu nave y pulveriza el campo de asteroides.",
  long: "Una nave con inercia flota en un espacio sin bordes. Rota, propulsa y dispara para partir asteroides grandes en fragmentos cada vez más pequeños. Recoge el power-up 3x para disparar en abanico. Tienes tres vidas: úsalas bien.",
  cat: "SHOOTER",
  cover: "cover-asteroids",
  color: "cyan",
  best: 0,
  plays: "0",
}
```

Contratos TypeScript del motor:

```ts
// lib/games/asteroids/types.ts
export type AsteroidsCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void; // 3.ª vida perdida o FIN forzado
};

export type AsteroidsEngine = {
  pause: () => void;
  resume: () => void;
  restart: () => void; // estado inicial: 3 vidas, nivel 1, puntuación 0
  end: () => void; // fuerza game over (botón FIN)
  destroy: () => void; // cancela rAF y quita todos los listeners
};

// lib/games/asteroids/engine.ts
export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine;
```

Constantes y fórmulas del original que se conservan tal cual: `W=800`, `H=600`, `RADII=[0,16,30,50]`, `SPEEDS=[0,85,55,32]`, `POINTS=[0,100,50,20]` (indexados por tamaño 1/2/3), `dt` máximo 50 ms, colisión nave-asteroide con `radius * 0.82`.

---

## Archivos a crear / modificar

| Archivo                                   | Acción                                                                                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/games/asteroids/types.ts`            | crear: `AsteroidsCallbacks`, `AsteroidsEngine`                                                                                            |
| `lib/games/asteroids/constants.ts`        | crear: dimensiones, `RADII`, `SPEEDS`, `POINTS`, constantes de power-up                                                                   |
| `lib/games/asteroids/utils.ts`            | crear: `wrap`, `dist`, `rand`, `randInt`                                                                                                  |
| `lib/games/asteroids/entities.ts`         | crear: clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle` (reciben `ctx` o el input en el método `draw`/`update`, sin globales)   |
| `lib/games/asteroids/engine.ts`           | crear: `createAsteroids` (estado, input con `keys`/`justPressed`, `update`, `draw`, bucle rAF, pausa, restart, end, destroy)              |
| `components/asteroids-canvas.tsx`         | crear: componente cliente que monta el motor y expone `pause/resume/restart/end` a `GamePlayer`                                           |
| `components/game-player.tsx`              | modificar: para `game.id === "asteroids"` usa el motor real (score/vidas/nivel reales, sin `setInterval`); el resto de juegos sin cambios |
| `lib/data.ts`                             | modificar: **añadir** la entrada `asteroids` a `GAMES` (`rocas` sin cambios)                                                              |
| `app/globals.css`                         | modificar: solo clases nuevas (`cover-asteroids`, canvas escalado en `.crt-screen`, aviso de teclado, overlay de pausa si hace falta)     |
| `refereences/started-games/02-asteroids/` | **no se modifica** (queda como referencia)                                                                                                |

---

## Plan de implementación

Cada paso deja la app compilando (`npm run build`) y navegable.

1. **Leer la documentación de Next 16.4** en `node_modules/next/dist/docs/` sobre componentes cliente, `"use client"` y el comportamiento con `cacheComponents: true` al montar APIs de navegador (`canvas`, `requestAnimationFrame`) solo dentro de `useEffect`.
2. **Invocar `/frontend-design` y `/ui-ux-pro-max`** antes de tocar UI y volver a aplicarlos en cada paso posterior que modifique estilos o componentes visuales (pasos 6, 7 y 8).
3. **Utilidades y constantes:** crear `lib/games/asteroids/{types,constants,utils}.ts` portando literalmente los valores del original.
4. **Entidades:** crear `entities.ts` con las clases `Bullet`, `Asteroid`, `PowerUp`, `Ship`, `Particle`, eliminando dependencias de variables globales (`ctx`, `keys`, `W/H` pasan como parámetro o import de constantes).
5. **Motor:** crear `engine.ts` con `createAsteroids`: estado interno, input por listeners en `window` (con `preventDefault` en flechas/Espacio solo cuando el motor está activo y el foco no es un `input`), `update`/`draw`, bucle con `dt` limitado a 50 ms, emisión de callbacks, `pause/resume/restart/end/destroy`, pausa automática por `visibilitychange` y `blur`. El HUD en canvas se omite salvo el indicador «3x». Sin overlay «GAME OVER» ni reinicio con Espacio.
6. **Componente canvas:** crear `components/asteroids-canvas.tsx` (800×600 lógico, escalado por CSS dentro de `.crt-screen`, `aria-label` descriptivo), con limpieza en el `return` del `useEffect`; añadir estilos y aviso «requiere teclado» en `app/globals.css`.
7. **Registrar el juego en el catálogo:** añadir la entrada `asteroids` a `GAMES` en `lib/data.ts` y la clase `cover-asteroids` (portada: nave triangular y rocas poligonales en trazo, coherente con las demás portadas) en `app/globals.css`. Hasta integrar el motor, `/games/asteroids/jugar` usaría la simulación genérica, por lo que la app sigue funcional.
8. **Integrar en `GamePlayer`:** para `asteroids` sustituir `.game-arena` por el canvas, conectar `onScore/onLives/onLevel` al HUD (vidas dinámicas), PAUSA/FIN/JUGAR DE NUEVO al motor, `onGameOver` → `setOver(true)` con la puntuación final. El resto de juegos (incluido `rocas`) mantiene el `setInterval` simulado.
9. **Verificación y cierre:** `npm run lint`, `npm run build`; jugar con `npm run dev`; recorrido con Playwright (MCP `mcp__playwright__*`) de `/games`, `/games/asteroids`, `/games/asteroids/jugar` en escritorio y a ≤ 768 px, y de `/games/rocas/jugar` y `/games/caida/jugar` para comprobar que la simulación sigue igual; capturas en `.playwright-screenshots/`; recorrer los criterios de aceptación.

---

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` terminan sin errores.
- [ ] `/games` muestra 9 tarjetas, incluida «ASTEROIDS» con su portada (`cover-asteroids`) y la categoría SHOOTER; «ROCAS» sigue presente con su portada y datos originales. El filtro SHOOTER lista ambos.
- [ ] `/games/asteroids` muestra el detalle y «JUGAR AHORA» lleva a `/games/asteroids/jugar`.
- [ ] `/games/asteroids/jugar` muestra el canvas del juego dentro del marco CRT; no aparece la arena simulada ni el `setInterval` de puntuación para `asteroids`.
- [ ] Con el teclado, `←` `→` rotan la nave, `↑` propulsa con inercia y `Espacio` dispara con 0,2 s de cadencia; la nave y los disparos atraviesan los bordes y reaparecen por el lado opuesto.
- [ ] Un asteroide grande (3) destruido suma 20 puntos y se parte en dos medianos; un mediano suma 50 y se parte en dos pequeños; un pequeño suma 100 y no se parte. El HUD de la plataforma refleja la puntuación al instante.
- [ ] El HUD muestra las vidas reales (3 al inicio, baja al chocar) y el nivel real (sube al destruir todos los asteroides, con `3 + nivel` asteroides nuevos); tras chocar la nave reaparece a los ~2 s con 3 s de invencibilidad parpadeante.
- [ ] El power-up «3x» aparece, al recogerlo se disparan 3 balas en abanico durante 5 s y el canvas muestra la cuenta atrás en cian.
- [ ] PAUSA congela asteroides, balas y nave (el estado no cambia durante la pausa) y REANUDAR continúa sin saltos; ocultar la pestaña o perder el foco de la ventana pausa el juego.
- [ ] Al perder la 3.ª vida, o al pulsar FIN, se abre el modal «FIN DEL JUEGO» con la puntuación final correcta; el canvas no muestra «ESPACIO PARA REINICIAR».
- [ ] «GUARDAR PUNTUACIÓN» guarda una entrada con `game: "asteroids"` en `av_scores` y aparece en `/salon`.
- [ ] Escribir un nombre con la barra espaciadora o las flechas dentro del input del modal no dispara ni mueve la nave, y no hace scroll de la página.
- [ ] «JUGAR DE NUEVO» reinicia con 3 vidas, nivel 1 y puntuación 0 sin duplicar el bucle (la velocidad del juego no aumenta tras varios reinicios).
- [ ] Salir con SALIR / navegar a otra ruta y volver no deja listeners ni bucles activos: tras desmontar, `Espacio` y las flechas vuelven a hacer scroll normal en otras páginas.
- [ ] El canvas se ve nítido a escala y sin scroll horizontal a ancho ≤ 768 px; en pantalla táctil / ancho estrecho se muestra el aviso «requiere teclado».
- [ ] `/games/rocas/jugar`, `/games/caida/jugar` y el resto de juegos conservan la simulación actual (puntuación que sube sola, vidas = 3).
- [ ] En `lib/data.ts` la entrada `rocas` no tiene ningún cambio (`git diff` solo añade la entrada `asteroids`).
- [ ] `refereences/started-games/02-asteroids/` sin cambios en `git status`.
- [ ] Se invocaron `/frontend-design` y `/ui-ux-pro-max` para el trabajo visual de esta spec y sus recomendaciones quedaron aplicadas (o descartadas con motivo anotado).
- [ ] Las capturas de Playwright están en `.playwright-screenshots/` y los artefactos del MCP en `.playwright-mcp/`.
- [ ] La sesión (`av_user`) y las puntuaciones previas (`av_scores`) siguen funcionando.

---

## Decisiones tomadas y descartadas

- **Asteroids es un juego nuevo (`asteroids`); `rocas` se mantiene.** Son juegos distintos para la plataforma (decisión del usuario, revisión de esta spec). _Descartado:_ reutilizar/reemplazar `rocas` (decisión inicial, revertida) y retocar su texto o su portada.
- **Valores de la entrada `asteroids`** (SHOOTER, color cian, `best: 0`, `plays: "0"`): propuesta por defecto, al ser un juego nuevo sin historial; el usuario puede ajustarlos al revisar. `cover-asteroids` es una portada nueva en CSS, no una imagen externa.
- **Motor TypeScript independiente de React + componente cliente.** Permite pausa/destroy limpios, comunicar puntuación a la plataforma y reutilizar el patrón en los siguientes juegos. _Descartado:_ iframe con `public/` (no comunica puntuación, vidas ni pausa) y copiar `game.js` como script global (estado global, listeners sin limpiar, incompatible con el montaje/desmontaje de React).
- **HUD de la plataforma, no del canvas.** Una sola fuente de verdad visual y reutiliza el HUD, la pausa y el modal ya existentes. _Descartado:_ mantener el HUD en canvas (duplicado). Se conserva en canvas solo el indicador «3x».
- **Fin de partida por el modal de la plataforma.** Se quita el reinicio con Espacio del original para no tener dos flujos de game over. _Descartado:_ conservar el overlay del canvas.
- **PAUSA real y pausa automática por visibilidad/foco.** Evita morir con la pestaña oculta y respeta que el `dt` del original ya se limita a 50 ms. _Descartado:_ pausa solo visual.
- **Estilo vectorial blanco original.** Fiel al clásico y baratísimo de mantener. _Descartado:_ recolor a la paleta neón.
- **Solo teclado.** Los controles táctiles son una funcionalidad aparte que afectará a todos los juegos. _Descartado:_ D-pad virtual en esta spec.
- **Sin registro genérico de motores.** `GamePlayer` ramifica por `game.id === "asteroids"`; se generaliza con el segundo motor. _Descartado:_ abstracción anticipada con un único caso.
- **Canvas lógico 800×600 escalado por CSS.** Mantiene intactas las constantes físicas del original. _Descartado:_ canvas con tamaño variable (cambiaría la física) y soporte HiDPI.
- **Sin tests automatizados.** Coherente con las specs previas; verificación manual + Playwright. El motor en módulos puros facilita añadirlos después. _Descartado:_ Vitest ahora (dependencia y configuración sin runner previo).
- **Puntuación en `av_scores`.** Su migración a Supabase es de otra spec.

---

## Riesgos identificados

| Riesgo                                                                                                                    | Mitigación                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| React Strict Mode monta el efecto dos veces → dos bucles rAF y listeners duplicados (el juego iría al doble de velocidad) | `destroy()` cancela rAF y quita todos los listeners; el `useEffect` siempre lo devuelve; criterio de aceptación de reinicios y de desmontaje     |
| Captura de teclas (`preventDefault`) rompe la escritura del nombre en el modal o el scroll de otras páginas               | Solo se captura con el motor activo y el foco fuera de un `input`; `destroy()` quita los listeners; criterios específicos                        |
| `cacheComponents: true` y APIs de navegador en el render                                                                  | `canvas`, rAF y `window` solo dentro de `useEffect`; el paso 1 lee la doc local                                                                  |
| Desfase de estado React ↔ motor (p. ej. `over` y motor activo a la vez)                                                   | El motor es la fuente de verdad del juego; `GamePlayer` solo refleja callbacks y llama a `pause/resume/restart/end`; `onGameOver` pausa el bucle |
| `dt` enorme tras volver de una pestaña oculta                                                                             | Pausa automática por `visibilitychange`/`blur` y `dt` limitado a 50 ms como en el original; al reanudar se reinicia `lastTime`                   |
| El canvas escalado por CSS se ve borroso en pantallas HiDPI                                                               | Aceptado y fuera de alcance (ver Fuera); estilo de líneas finas tolera el escalado                                                               |
| Regresión en los otros juegos simulados (incl. `rocas`) al tocar `GamePlayer`                                             | Cambio ramificado por `game.id`; criterio explícito de `/games/rocas/jugar` y `/games/caida/jugar` y verificación con Playwright                 |
| Confusión en la biblioteca por dos juegos de temática parecida (ROCAS y ASTEROIDS)                                        | Títulos, textos y portadas distintos; `rocas` queda como juego simulado hasta que tenga su propia spec                                           |
| Código que asume 8 juegos (p. ej. rejilla o textos de la biblioteca)                                                      | Paso 9 recorre `/games` y los filtros por categoría con 9 tarjetas                                                                               |

---

## Lo que **no** entra en esta spec

- Cualquier cambio en el juego `rocas`.
- Controles táctiles.
- Los demás juegos reales (Tetris, Arkanoid…).
- Registro genérico de motores.
- Sonido.
- Persistencia de puntuaciones en Supabase.
- OVNIs, nuevas mecánicas o cambios de balance.
- Tests automatizados.

Cada uno, si llega, va en su propia spec.
