import type { SkinId } from "@/lib/games/skins";
/**
 * Paleta de Frogger. Solo color: ninguna entrada cambia formas, física ni puntuación.
 * `clasico` es el aspecto de referencia; `skin-designer` añade el resto.
 */
export type FroggerPalette = {
  /** Fondos por zona. */
  safe: string;
  road: string;
  river: string;
  goalRow: string;
  /** Líneas discontinuas entre carriles de carretera. */
  roadLine: string;
  /** Bocas destino. */
  goalEmpty: string;
  goalBorder: string;
  goalFilled: string;
  /** Vehículos: tres carrocerías que rotan por carril, más camión y ruedas. */
  carBodies: [string, string, string];
  carGlass: string;
  truckBody: string;
  truckCab: string;
  wheel: string;
  /** Río. */
  log: string;
  logGrain: string;
  turtleShell: string;
  turtleShellEdge: string;
  turtleHead: string;
  turtleSubmerged: string;
  /** Rana. */
  frogBody: string;
  frogBelly: string;
  frogLeg: string;
  frogEye: string;
  frogPupil: string;
  /** Barra de tiempo: tres tramos según lo que queda. */
  timeTrack: string;
  timeHigh: string;
  timeMid: string;
  timeLow: string;
};
const clasico: FroggerPalette = {
  safe: "#0d2818",
  road: "#101014",
  river: "#06183a",
  goalRow: "#0a1f14",
  roadLine: "#3a3a42",
  goalEmpty: "#071b10",
  goalBorder: "#d9a520",
  goalFilled: "#1d5c33",
  carBodies: ["#ff3b30", "#f5d020", "#2f8fff"],
  carGlass: "#0b1220",
  truckBody: "#b8bdc7",
  truckCab: "#6b7280",
  wheel: "#15151a",
  log: "#7a4a24",
  logGrain: "#5d3519",
  turtleShell: "#2fbf6a",
  turtleShellEdge: "#17753f",
  turtleHead: "#48d97f",
  turtleSubmerged: "rgba(47, 191, 106, 0.22)",
  frogBody: "#39e65c",
  frogBelly: "#9cf7a8",
  frogLeg: "#22a63c",
  frogEye: "#ffffff",
  frogPupil: "#0a0a0a",
  timeTrack: "rgba(255, 255, 255, 0.12)",
  timeHigh: "#39e65c",
  timeMid: "#f5d020",
  timeLow: "#ff3b30",
};
export const SKINS: Record<SkinId, FroggerPalette> = {
  clasico,
  neon: clasico,
  retro: clasico,
};
