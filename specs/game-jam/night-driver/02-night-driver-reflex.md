# SPEC — NIGHT DRIVER (variante B: Velocidad Fija / Puro Reflex)

**Estado:** Borrador  
**Agente:** game-jam  
**Fecha:** 2026-10-15  
**Juego base:** Night Driver (id: `night-driver`, cat: `ARCADE`, color: `yellow`)  
**Variante:** `02` — Velocidad Fija / Puro Reflex  
**Branch sugerido:** `spec-02-night-driver-reflex`

---

## Por qué existe esta spec

La variante A (`01-night-driver-velocidad`) centra la mecánica en la *gestión de velocidad*: el jugador controla aceleración y freno además del volante; el riesgo/recompensa nace de decidir cuánta velocidad sostener. Eso requiere coordinación de tres ejes simultáneos.

Esta variante B apuesta por lo opuesto: **velocidad automática, control mínimo**. El juego exige un solo skill: tiempo de reacción. La velocidad sube sola con cada nivel; el jugador solo mueve el volante izquierda/derecha. El resultado es una experiencia más inmediata, más arcade, y accesible desde el primer segundo — pero que escala hasta ser brutalmente rápida. La dificultad es el tiempo, no la coordinación.

Diferencia clave en el diseño de puntuación: la var. A puntúa metros conducidos (velocidad × tiempo); la var. B también usa esa fórmula, pero como la velocidad es fija y automática, la puntuación refleja tiempo de supervivencia, no habilidad de conducción. El bonus de "near-miss" introduce un incentivo para acercarse peligrosamente a los coches sin chocar.

---

## 1. Visión y objetivos

### 1.1 Propuesta de valor en una frase

> "Sobrevive el mayor tiempo posible mientras la noche se vuelve un tunel de coches; el volante es todo lo que tienes."

### 1.2 Pilares de diseño

| Pilar | Descripción |
|---|---|
| **Control mínimo** | Solo ← → — máxima accesibilidad, mínima curva de aprendizaje |
| **Escalada automática** | La velocidad sube sola; el jugador no puede elegir ir más despacio |
| **Near-miss como meta** | Pasar rozando un coche sin chocar da bonus — riesgo voluntario |
| **Tensión acumulada** | Cada nivel hace la reacción necesaria más corta; el tablero se llena de coches |

### 1.3 Diferencia respecto a la variante A

| Aspecto | Var. A (Velocidad) | Var. B (Reflex) |
|---|---|---|
| Controles | ←→ + ↑ (acelerar) + ↓ (frenar) | Solo ← → |
| Velocidad | Controlada por el jugador | Automática, fija por nivel |
| Coches rivales | Desde nivel 2 | Desde nivel 1 |
| Umbral de nivel | Cada 500 pts | Cada 1 000 pts |
| Near-miss bonus | No | Sí (+25 pts por near-miss) |
| Dificultad percibida | Gestión de riesgo/recompensa | Puro tiempo de reacción |

---

## 2. Mecánicas principales

### 2.1 Control

```
Acción           Tecla        setInput action   Tipo
──────────────────────────────────────────────────────
Girar izquierda  ←            "left"            sostenido
Girar derecha    →            "right"           sostenido
```

- `setInput("left", true/false)` y `setInput("right", true/false)` — sostenido (held keys).
- No existe `"accel"` ni `"brake"` en esta variante.
- En móvil (mobile-porter): dos zonas táctiles, mitad izquierda / mitad derecha del canvas.

### 2.2 Velocidad por nivel

```ts
const SPEED_TABLE = [120, 150, 180, 210, 240, 270, 300]; // km/h equivalente
```

- `nivel = floor(score / LEVEL_SCORE) + 1`, con `LEVEL_SCORE = 1000`.
- Velocidad activa: `SPEED_TABLE[Math.min(nivel - 1, 6)]`.
- Niveles 7+ mantienen la velocidad máxima de 300.
- No hay frenado ni aceleración por parte del jugador.

### 2.3 Puntuación

```ts
score += Math.floor(SPEED_TABLE[Math.min(nivel - 1, 6)] * dt / 1000);
```

- `dt` en milisegundos por frame.
- Bonus near-miss: `+NEAR_MISS_BONUS` (25 pts) cuando un coche rival pasa junto al jugador sin colisión, a distancia horizontal ≤ `NEAR_MISS_DIST` (60 px) en el instante en que el coche supera la posición Y del jugador.
- Un mismo coche solo puede otorgar el bonus una vez.

### 2.4 Vidas

- `LIVES_START = 3`.
- Colisión → `lives--`; si `lives === 0` → game over.
- Tras colisión: 1.5 s de invulnerabilidad (parpadeo del coche del jugador).

### 2.5 Coches rivales

- Aparecen desde nivel 1 (a diferencia de la var. A que empieza desde nivel 2).
- Spawn en X aleatorio dentro del ancho de la carretera visible, con separación mínima de `ONCOMING_SPACING = 1.2 s` entre spawns sucesivos.
- Velocidad de aproximación: `SPEED_TABLE[min(nivel-1,6)] + ONCOMING_SPEED_OFFSET` donde `ONCOMING_SPEED_OFFSET = 60`.
- Máximo simultáneo: `MAX_CARS = 6` (uno más que var. A por ausencia de gestión de velocidad).
- Cada nivel incrementa la densidad: `intervalActual = ONCOMING_INTERVAL_BASE - (nivel-1) * ONCOMING_INTERVAL_STEP`, mínimo `ONCOMING_INTERVAL_MIN`.

### 2.6 Carretera y perspectiva

Idéntica a la variante A. Proyección de perspectiva lineal:

```
scale(d)   = d / DEPTH
screenY(d) = HORIZON_Y + scale(d) × (HEIGHT - HORIZON_Y)
halfRoad(d) = lerp(HALF_ROAD_FAR, HALF_ROAD_NEAR, d / DEPTH)
```

Los segmentos de carretera y postes reflectantes se renderizan de atrás hacia adelante (mayor profundidad primero).

### 2.7 Estados del juego

```
IDLE → PLAYING → PAUSED → PLAYING
                         ↘ DEAD (anim 1.5s) → PLAYING (si vidas > 0)
                                             → GAME_OVER
GAME_OVER → IDLE (al llamar restart())
```

- `IDLE`: pantalla negra con prompt "Press ← → to start".
- `DEAD`: coche del jugador parpadea; se resta una vida; se resetea posición X al centro.
- `GAME_OVER`: `onGameOver(finalScore)` emitido; canvas muestra "GAME OVER".

---

## 3. Controles completos

### 3.1 Teclado

```
←          Girar izquierda (sostenido)
→          Girar derecha (sostenido)
P / Esc    Pausar / Reanudar
```

- Primera pulsación de ← o → desde `IDLE` inicia el juego.
- P y Esc también pausan desde mobile (si el contenedor recibe el evento).

### 3.2 `setInput` — contrato

```ts
engine.setInput("left",  pressed: boolean)  // sostener para girar
engine.setInput("right", pressed: boolean)  // sostener para girar
```

El motor escribe `keys["left"]` / `keys["right"]` en un mapa; en cada frame aplica:

```ts
if (keys["left"])  playerX -= STEER * speed * dt / 1000;
if (keys["right"]) playerX += STEER * speed * dt / 1000;
playerX = clamp(playerX, -MAX_X, MAX_X);  // MAX_X = 1.0 (unidades normalizadas)
```

`false` siempre se acepta (precondición del contrato "sostenido").

---

## 4. Scoring y leaderboard

### 4.1 Fórmula

```ts
// Cada frame:
score += Math.floor(SPEED_TABLE[Math.min(nivel - 1, 6)] * dt / 1000);

// Near-miss (una vez por coche):
if (!car.nearMissAwarded && distHoriz <= NEAR_MISS_DIST && car.passedPlayer) {
  score += NEAR_MISS_BONUS;  // 25
  car.nearMissAwarded = true;
  // Mostrar "+25" flotante en canvas durante 0.8s
}
```

### 4.2 Leaderboard

- Score enviado en `onGameOver(finalScore)` → `GamePlayer` llama `submitScore(supabase, { gameId: "night-driver", playerName, score: finalScore })`.
- Score es entero, rango 0–99 999 999 (CHECK de BD).
- Orden DESC (mayor puntuación = más tiempo sobrevivido y/o más near-misses).

### 4.3 Display en canvas durante juego

```
Score:  012 345     (top-left)
Lvl:    3           (junto al score)
Vidas:  ♥ ♥ ○       (top-right, llenas/vacías)
```

---

## 5. Constantes

```ts
// Canvas
const WIDTH  = 800;
const HEIGHT = 600;

// Perspectiva
const HORIZON_Y      = 200;
const DEPTH          = 200;   // unidades de profundidad
const HALF_ROAD_NEAR = 20;    // px en horizonte
const HALF_ROAD_FAR  = 340;   // px en base del canvas
const N_SEGS         = 200;
const SEG_LEN        = 10;    // unidades de longitud por segmento
const POLE_STEP      = 20;    // cada cuántos segmentos hay poste reflectante

// Velocidad (km/h equivalentes → px/s con factor de escala)
const SPEED_TABLE    = [120, 150, 180, 210, 240, 270, 300];

// Dirección del jugador
const STEER          = 1.4;   // unidades normalizadas / s
const MAX_X          = 1.0;   // límite del carril normalizado

// Coches rivales
const ONCOMING_SPEED_OFFSET   = 60;
const ONCOMING_INTERVAL_BASE  = 3.5;  // segundos entre spawns (nivel 1)
const ONCOMING_INTERVAL_STEP  = 0.3;  // reducción por nivel
const ONCOMING_INTERVAL_MIN   = 0.8;  // mínimo entre spawns
const ONCOMING_SPACING        = 1.2;  // separación mínima forzada (s)
const MAX_CARS                = 6;

// Vidas y nivel
const LIVES_START      = 3;
const LEVEL_SCORE      = 1000;  // pts para subir de nivel

// Near-miss
const NEAR_MISS_DIST   = 60;   // px de distancia horizontal máxima
const NEAR_MISS_BONUS  = 25;   // pts por near-miss

// Invulnerabilidad post-crash
const INVULN_MS        = 1500;

// Carretera (PRNG)
const ROAD_SEG_MIN     = 20;   // segmentos de tramo recto mínimo
const ROAD_SEG_MAX     = 40;   // segmentos de tramo recto máximo
const CURVE_AMPLITUDE  = 0.4;  // curva máxima (unidades normalizadas)
```

---

## 6. Render canvas

### 6.1 Pipeline por frame

```
1. clearRect(0, 0, WIDTH, HEIGHT)  → fondo negro (PALETTE.bg)
2. Cielo                           → fillRect(0, 0, WIDTH, HORIZON_Y) con PALETTE.sky
3. Suelo (más allá del horizonte)  → degradado vertical hasta horizonte
4. Segmentos de carretera          → de atrás hacia adelante (d = DEPTH..0)
5. Postes reflectantes             → junto a cada segmento POLE_STEP
6. Coches rivales                  → proyectados a su profundidad
7. Coche del jugador               → posición fija Y ≈ HEIGHT - 80, X variable
8. HUD                             → score, nivel, vidas (sin transformaciones)
9. Overlay near-miss "+25"         → texto flotante con alpha en fade-out
10. Overlay PAUSED / GAME OVER     → si aplica
```

### 6.2 Proyección

```ts
function project(worldX: number, depth: number) {
  const scale   = depth / DEPTH;
  const screenX = WIDTH / 2 + worldX * scale * HALF_ROAD_FAR;
  const screenY = HORIZON_Y + scale * (HEIGHT - HORIZON_Y);
  const roadHW  = HALF_ROAD_NEAR + (HALF_ROAD_FAR - HALF_ROAD_NEAR) * (1 - scale);
  return { screenX, screenY, scale, roadHW };
}
```

### 6.3 Coches rivales en perspectiva

- Cada coche tiene `(worldX, depth)`.
- Se proyectan con `project(car.worldX, car.depth)`.
- Tamaño del sprite escala con `scale`: `w = CAR_W * scale`, `h = CAR_H * scale`.
- Solo se renderizan los coches con `depth > 0` y `depth < DEPTH`.

### 6.4 Paleta

```ts
// lib/games/night-driver/skins.ts
export type NightDriverPalette = {
  bg:          string;  // fondo pista
  sky:         string;  // cielo nocturno
  road:        string;  // asfalto
  roadLine:    string;  // línea central
  pole:        string;  // poste reflectante
  poleLight:   string;  // luz del poste
  playerCar:   string;  // coche jugador
  enemyCar:    string;  // coches rivales
  hudText:     string;  // HUD score/level
  hudLife:     string;  // corazón lleno
  hudLifeEmpty:string;  // corazón vacío
  nearMiss:    string;  // texto "+25"
  overlay:     string;  // fondo semitransparente overlay
};

export const CLASICO_PALETTE: NightDriverPalette = {
  bg:           "#000000",
  sky:          "#0a0a1a",
  road:         "#1a1a1a",
  roadLine:     "#ffff00",
  pole:         "#ffffff",
  poleLight:    "#ffff88",
  playerCar:    "#00ffff",
  enemyCar:     "#ff4444",
  hudText:      "#ffffff",
  hudLife:      "#ff0000",
  hudLifeEmpty: "#333333",
  nearMiss:     "#ffff00",
  overlay:      "rgba(0,0,0,0.65)",
};
```

---

## 7. Tipos TypeScript y firma pública del motor

```ts
// lib/games/night-driver/types.ts
// (compartidos con variante A — mismos tipos, distinto comportamiento interno)

export type NightDriverCallbacks = {
  onScore:    (score: number) => void;
  onLives:    (lives: number) => void;
  onLevel:    (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onPause?:   (paused: boolean) => void;
};

export type NightDriverOptions = {
  palette?: NightDriverPalette;
  mode?: "velocidad" | "reflex";  // distingue variante A vs B en runtime
};

export type NightDriverEngine = {
  pause:      () => void;
  resume:     () => void;
  restart:    () => void;
  end:        () => void;
  destroy:    () => void;
  setPalette: (p: NightDriverPalette) => void;
  setInput:   (action: string, pressed: boolean) => void;
};

export function createNightDriver(
  canvas:  HTMLCanvasElement,
  cb:      NightDriverCallbacks,
  options?: NightDriverOptions,
): NightDriverEngine;
```

> **Nota de implementación:** `options.mode` determina si el motor usa la tabla de velocidad fija (reflex) o la gestión dinámica (velocidad). El flag evita duplicar todo el motor; las diferencias son: (a) no procesar `"accel"`/`"brake"` en `setInput`, (b) calcular velocidad activa desde `SPEED_TABLE` en vez del estado mutable de velocidad.

### 7.1 Contrato del motor (7 keys obligatorias)

```
pause()      → pausa el loop; NO emite onPause
resume()     → reanuda el loop; NO emite onPause
restart()    → reinicia estado completo; score=0, vidas=LIVES_START, nivel=1
end()        → lleva a GAME_OVER si no está ya; emite onGameOver(score)
destroy()    → cancela rAF, libera listeners; idempotente
setPalette() → actualiza paleta; efecto inmediato en próximo frame
setInput()   → registra tecla sostenida en keys map; false siempre aceptado
```

`onPause` se emite **únicamente** desde P/Esc, blur y visibilitychange — nunca desde `pause()`/`resume()` públicos (para evitar el loop con `GamePlayer`).

### 7.2 ctx narrowing (obligatorio)

```ts
const ctx2d = canvas.getContext("2d");
if (!ctx2d) return noopEngine;
const ctx: CanvasRenderingContext2D = ctx2d;
```

TypeScript pierde el narrowing dentro de closures; la asignación a `ctx` es obligatoria.

---

## 8. Integración con la plataforma

### 8.1 Entrada en el registro

```ts
// lib/games/registry.ts — añadir:
{
  id:     "night-driver",
  create: (canvas, cb, opts) => createNightDriver(canvas, cb, { ...opts, mode: "reflex" }),
  // skins y touchActions: añadidos por skin-designer y mobile-porter
}
```

> El `mode: "reflex"` se inyecta como opción en la entrada del registro de esta variante. La variante A tendría `mode: "velocidad"`. Si se implementan ambas como juegos separados se usan IDs distintos; si se implementan como un solo juego con toggle, el modo puede exponerse como opción de `GamePlayer`.

### 8.2 Migración SQL

```sql
-- Igual que variante A; el juego comparte row en public.games
-- Solo se inserta una vez. Si ya existe la row de variante A, NO reinsertar.
insert into public.games (id, title, short, long, cat, cover, color, sort_order)
values (
  'night-driver',
  'NIGHT DRIVER',
  'Conduce de noche. Más rápido, más puntos.',
  'Pisa el acelerador y esquiva los coches que vienen de frente en la oscuridad total. Solo los postes reflectantes marcan la carretera. Cada segundo a fondo suma metros; cada choque te cuesta una vida.',
  'ARCADE',
  'cover-night-driver',
  'yellow',
  6  -- provisional; confirmar con: select max(sort_order)+1 from public.games
)
on conflict (id) do nothing;
```

### 8.3 Ficheros a crear (al implementar)

```
lib/games/night-driver/
  engine.ts          Motor completo (createNightDriver, lógica velocidad/reflex)
  types.ts           NightDriverCallbacks, NightDriverOptions, NightDriverEngine
  skins.ts           NightDriverPalette, CLASICO_PALETTE  [skin-designer]
  index.ts           Re-exporta createNightDriver
app/(games)/night-driver/
  page.tsx           GamePlayer wrapping night-driver engine
supabase/migrations/
  YYYYMMDD_night_driver.sql  Insert en public.games
public/images/covers/
  cover-night-driver.webp    Cover 640×360 (generado por diseño)
```

---

## 9. Criterios de aceptación

### 9.1 Flujo básico

- [ ] El canvas arranca en negro; primera pulsación ← o → inicia el juego.
- [ ] El coche del jugador solo responde a ← y →; accel/brake no tienen efecto.
- [ ] La velocidad de la carretera corresponde al nivel actual según `SPEED_TABLE`.
- [ ] Al llegar a `nivel = 2` (score ≥ 1000), la velocidad sube visiblemente.
- [ ] Los coches rivales aparecen desde el primer nivel (nivel 1).
- [ ] Colisión → parpadeo 1.5 s → vida restada → juego continúa si vidas > 0.
- [ ] Al llegar a 0 vidas → GAME OVER → `onGameOver(score)` emitido.
- [ ] `restart()` reinicia score, vidas y nivel desde cero.

### 9.2 Near-miss

- [ ] Pasar a ≤ 60 px horizontal de un coche rival sin colisión otorga +25.
- [ ] El mismo coche no puede otorgar el bonus más de una vez.
- [ ] El texto "+25" aparece y desaparece en 0.8 s con fade.
- [ ] El bonus se suma al score antes de emitir `onScore`.

### 9.3 Controles

- [ ] `setInput("left", false)` nunca lanza excepción.
- [ ] `setInput("right", false)` nunca lanza excepción.
- [ ] Acciones desconocidas (`"accel"`, `"brake"`, `"foo"`) son ignoradas silenciosamente.
- [ ] Girar izquierda + derecha simultáneamente → movimiento neutro (se cancelan).

### 9.4 Motor contract

- [ ] `destroy()` es idempotente (segunda llamada no lanza).
- [ ] `pause()` no emite `onPause`; solo detiene el loop.
- [ ] `resume()` no emite `onPause`; solo reanuda el loop.
- [ ] `onPause(true)` se emite al presionar P/Esc o al perder el foco.
- [ ] `onPause(false)` se emite al reanudar desde P/Esc.
- [ ] `setPalette()` cambia colores en el siguiente frame sin reiniciar estado.
- [ ] `createNightDriver` con canvas sin contexto 2D devuelve `noopEngine` sin lanzar.

### 9.5 Render

- [ ] La carretera se estrecha hacia el horizonte (proyección perspectiva).
- [ ] Los postes reflectantes aparecen a ambos lados de la carretera.
- [ ] Los coches rivales escalan correctamente con la profundidad.
- [ ] El HUD muestra score actualizado cada frame.
- [ ] Las vidas se muestran como ♥ llenos / ♥ vacíos según estado.
- [ ] El overlay PAUSED aparece al pausar; desaparece al reanudar.

### 9.6 Scoring y leaderboard

- [ ] Score es entero no negativo, max 99 999 999.
- [ ] `onScore` se llama al menos una vez por segundo durante juego activo.
- [ ] `onLevel` se emite exactamente una vez al cruzar cada umbral de nivel.
- [ ] `submitScore` recibe el score final entero; no recibe decimales.

### 9.7 Strict Mode / React 19

- [ ] El engine se crea y destruye dos veces en StrictMode sin side-effects.
- [ ] Todos los accesos a canvas/rAF/window están dentro de `useEffect`.
- [ ] No hay `forwardRef`; la ref del canvas se pasa como prop.

---

## 10. Decisiones de diseño

| Decisión | Alternativa considerada | Razón elegida |
|---|---|---|
| `mode` como opción en lugar de dos engines | Dos ficheros engine separados | Reduce duplicación; las diferencias son <50 líneas |
| Near-miss bonus en lugar de combo | Multiplicador de puntuación | Más fácil de comunicar visualmente; no requiere contador |
| Coches desde nivel 1 | Desde nivel 2 (como var. A) | Sin gestión de velocidad el jugador necesita adversarios desde el inicio |
| `MAX_CARS = 6` | 5 (igual que var. A) | La velocidad fija deja más tiempo de reacción; más coches compensan |
| Umbral nivel 1 000 pts | 500 pts (igual que var. A) | La velocidad sube rápido sola; el umbral más alto alarga la zona confortable |
| `ONCOMING_SPEED_OFFSET = 60` | Sin offset (misma vel que jugador) | Los coches deben parecer que se acercan, no que flotan en el mismo sitio |

---

## 11. Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Near-miss detección inconsistente | Media | Medio | Detectar en el frame donde la Y del coche cruza la Y del jugador; +/- 1 frame de tolerancia |
| Velocidad máxima incontrolable | Alta (diseño explícito) | Medio | Testear que nivel 7 (300 km/h) es exigente pero no imposible; ajustar `STEER` si el juego se vuelve injusto |
| Percepción de aleatoriedad en spawn | Baja | Bajo | `ONCOMING_SPACING` garantiza separación mínima; el PRNG xorshift32 garantiza variedad |
| Two instances (Strict Mode) | Media | Bajo | `destroy()` idempotente y cancelación de rAF/listeners probada |
| `mode` flag olvidado en el registry | Media | Alto | Añadir test: `registry["night-driver"].create(...)` en modo reflex no debe tener `"accel"` en su `setInput` |
