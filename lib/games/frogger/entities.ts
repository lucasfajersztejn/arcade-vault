/**
 * Tipos de dominio y lógica pura de Frogger: sin canvas, sin DOM, sin React.
 * El motor es el único que conoce el `ctx`; aquí todo es dato y función pura.
 */
import {
  COLS,
  GOAL_COUNT,
  GOAL_FIRST_COL,
  GOAL_STRIDE,
  GOAL_WIDTH,
  LEVEL_SPEED_FACTOR,
  ROUND_MS_MIN,
  ROUND_MS_PER_LEVEL,
  ROUND_MS_START,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_START,
  START_COL,
  TURTLE_SUBMERGED_MS,
  TURTLE_VISIBLE_MS,
  TURTLE_WARN_MS,
} from "@/lib/games/frogger/constants";
export type Direction = "up" | "down" | "left" | "right";
export type EntityKind = "car" | "truck" | "log" | "turtle";
export type Entity = {
  /** Columna izquierda, en celdas. Es un flotante: las entidades se mueven en continuo. */
  col: number;
  /** Ancho en celdas. */
  width: number;
  kind: EntityKind;
  /** Solo para `turtle`: desfase dentro del ciclo de inmersión, en ms. */
  phase?: number;
  /** Solo para `car`: índice de carrocería dentro de la paleta. */
  tint?: number;
};
export type LaneKind = "road" | "river";
export type Lane = {
  row: number;
  kind: LaneKind;
  /** Celdas por segundo. Siempre positiva; el sentido lo da `dir`. */
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
};
export type Frog = {
  /** Columna, en celdas. Flotante mientras la arrastra un tronco. */
  col: number;
  row: number;
  /** Hacia dónde mira, para dibujarla orientada. */
  facing: Direction;
  animating: boolean;
  /** Progreso de la animación de salto, en ms. */
  animT: number;
  fromCol: number;
  fromRow: number;
  targetCol: number;
  targetRow: number;
};
/**
 * Longitud del circuito de un carril, en celdas. Es más ancha que el tablero para que una
 * entidad salga del todo antes de reaparecer por el lado contrario. Como cada entidad recorre
 * exactamente `LANE_SPAN` antes de dar la vuelta, los huecos entre ellas nunca se degradan.
 */
export const LANE_SPAN = COLS + 4;
/** Receta de un carril, antes de aplicarle el nivel. */
type LaneSpec = {
  row: number;
  kind: LaneKind;
  /** Celdas por segundo en el nivel 1. */
  speed: number;
  dir: 1 | -1;
  entityKind: EntityKind;
  width: number;
  count: number;
};
/**
 * Carretera (filas 8-12, de abajo arriba) y río (filas 1-6).
 * Sentidos alternos y velocidades crecientes a medida que se sube: la fila 8 es la trampa.
 * El hueco de cada carril es `LANE_SPAN / count - width`, siempre ≥ 1 celda.
 */
const LANE_SPECS: LaneSpec[] = [
  // Carretera
  {
    row: 12,
    kind: "road",
    speed: 2.4,
    dir: -1,
    entityKind: "car",
    width: 1,
    count: 4,
  },
  {
    row: 11,
    kind: "road",
    speed: 2.0,
    dir: 1,
    entityKind: "truck",
    width: 3,
    count: 3,
  },
  {
    row: 10,
    kind: "road",
    speed: 3.6,
    dir: -1,
    entityKind: "car",
    width: 1,
    count: 5,
  },
  {
    row: 9,
    kind: "road",
    speed: 2.8,
    dir: 1,
    entityKind: "car",
    width: 2,
    count: 3,
  },
  {
    row: 8,
    kind: "road",
    speed: 5.0,
    dir: -1,
    entityKind: "truck",
    width: 3,
    count: 2,
  },
  // Río
  {
    row: 6,
    kind: "river",
    speed: 1.6,
    dir: 1,
    entityKind: "log",
    width: 3,
    count: 3,
  },
  {
    row: 5,
    kind: "river",
    speed: 2.0,
    dir: -1,
    entityKind: "turtle",
    width: 2,
    count: 4,
  },
  {
    row: 4,
    kind: "river",
    speed: 2.6,
    dir: 1,
    entityKind: "log",
    width: 4,
    count: 2,
  },
  {
    row: 3,
    kind: "river",
    speed: 1.4,
    dir: -1,
    entityKind: "log",
    width: 2,
    count: 4,
  },
  {
    row: 2,
    kind: "river",
    speed: 2.2,
    dir: 1,
    entityKind: "turtle",
    width: 3,
    count: 3,
  },
  {
    row: 1,
    kind: "river",
    speed: 1.8,
    dir: -1,
    entityKind: "log",
    width: 3,
    count: 3,
  },
];
/** Velocidad de un carril en un nivel dado: +15 % acumulativo por ronda. */
export function speedFor(base: number, level: number): number {
  return base * Math.pow(LEVEL_SPEED_FACTOR, Math.max(0, level - 1));
}
/** Duración de la ronda en ms: 15 s que se acortan 1 s por nivel, con suelo en 7 s. */
export function roundMsFor(level: number): number {
  return Math.max(
    ROUND_MS_MIN,
    ROUND_MS_START - (Math.max(1, level) - 1) * ROUND_MS_PER_LEVEL,
  );
}
/**
 * Construye los once carriles del nivel. Las entidades se reparten equiespaciadas sobre
 * `LANE_SPAN`, así que todo carril nace con huecos atravesables y sin solapes.
 */
export function buildLanes(level: number): Lane[] {
  return LANE_SPECS.map((spec) => {
    const stride = LANE_SPAN / spec.count;
    const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
    const entities: Entity[] = Array.from({ length: spec.count }, (_, i) => {
      const entity: Entity = {
        col: i * stride,
        width: spec.width,
        kind: spec.entityKind,
      };
      if (spec.entityKind === "turtle") {
        // Cada grupo entra en el ciclo desfasado: nunca se hunden todos a la vez.
        entity.phase = (i * cycle) / spec.count;
      }
      if (spec.entityKind === "car") {
        entity.tint = i % 3;
      }
      return entity;
    });
    return {
      row: spec.row,
      kind: spec.kind,
      speed: speedFor(spec.speed, level),
      dir: spec.dir,
      entities,
    };
  });
}
/** Avanza un carril `dtSec` segundos, dando la vuelta al circuito sin perder el espaciado. */
export function advanceLane(lane: Lane, dtSec: number): void {
  const delta = lane.speed * lane.dir * dtSec;
  for (const entity of lane.entities) {
    entity.col += delta;
    // El wrap mira el sentido del carril: si mirase ambos bordes, una entidad
    // reintroducida por la derecha volvería a saltar en el frame siguiente.
    if (lane.dir === 1) {
      if (entity.col >= COLS) entity.col -= LANE_SPAN;
    } else if (entity.col <= -entity.width) {
      entity.col += LANE_SPAN;
    }
  }
}
/** Posición dentro del ciclo de inmersión de un grupo de tortugas, en ms. */
function turtlePhase(entity: Entity, elapsedMs: number): number {
  const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGED_MS;
  return (elapsedMs + (entity.phase ?? 0)) % cycle;
}
/** Bajo el agua: ni se dibuja sólida ni sostiene a la rana. */
export function isSubmerged(entity: Entity, elapsedMs: number): boolean {
  if (entity.kind !== "turtle") return false;
  return turtlePhase(entity, elapsedMs) >= TURTLE_VISIBLE_MS;
}
/** A punto de hundirse: parpadea, pero todavía sostiene. Solo es un aviso visual. */
export function isSinking(entity: Entity, elapsedMs: number): boolean {
  if (entity.kind !== "turtle") return false;
  const t = turtlePhase(entity, elapsedMs);
  return t >= TURTLE_VISIBLE_MS - TURTLE_WARN_MS && t < TURTLE_VISIBLE_MS;
}
/** Columna izquierda de la boca destino `index` (0-4). */
export function goalColFor(index: number): number {
  return GOAL_FIRST_COL + index * GOAL_STRIDE;
}
/** Boca que cubre esa columna, o -1 si la rana ha aterrizado en la orilla entre bocas. */
export function goalIndexAt(col: number): number {
  const centre = Math.floor(col) + 0.5;
  for (let i = 0; i < GOAL_COUNT; i += 1) {
    const left = goalColFor(i);
    if (centre > left && centre < left + GOAL_WIDTH) return i;
  }
  return -1;
}
export function createFrog(): Frog {
  return {
    col: START_COL,
    row: ROW_START,
    facing: "up",
    animating: false,
    animT: 0,
    fromCol: START_COL,
    fromRow: ROW_START,
    targetCol: START_COL,
    targetRow: ROW_START,
  };
}
/** La rana nunca sale por los lados del tablero. */
export function insideBoard(col: number): boolean {
  return col >= 0 && col <= COLS - 1;
}
/** Carril de esa fila, si lo hay. Las filas seguras y la de metas no tienen. */
export function laneAt(lanes: Lane[], row: number): Lane | null {
  return lanes.find((lane) => lane.row === row) ?? null;
}
/** Cualquier solape con un vehículo es mortal. */
export function checkRoadCollision(frog: Frog, lanes: Lane[]): boolean {
  const lane = laneAt(lanes, frog.row);
  if (!lane || lane.kind !== "road") return false;
  return lane.entities.some(
    (entity) =>
      entity.col < frog.col + 1 && frog.col < entity.col + entity.width,
  );
}
/**
 * Entidad del río que sostiene a la rana, o `null` si está sobre el agua.
 * Se mide con el centro de la rana: medio cuerpo fuera del tronco todavía flota.
 */
export function getSupport(
  frog: Frog,
  lanes: Lane[],
  elapsedMs: number,
): Entity | null {
  const lane = laneAt(lanes, frog.row);
  if (!lane || lane.kind !== "river") return null;
  const centre = frog.col + 0.5;
  const support = lane.entities.find(
    (entity) => centre >= entity.col && centre < entity.col + entity.width,
  );
  if (!support) return null;
  return isSubmerged(support, elapsedMs) ? null : support;
}
/** ¿Esta fila es agua? Las filas del río matan sin soporte. */
export function isRiverRow(row: number): boolean {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}
