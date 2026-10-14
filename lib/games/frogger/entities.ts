/**
 * Tipos de dominio y lógica pura de Frogger: sin canvas, sin DOM, sin React.
 * El motor es el único que conoce el `ctx`; aquí todo es dato y función pura.
 */
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
