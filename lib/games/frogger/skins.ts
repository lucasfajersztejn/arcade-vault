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
/**
 * Neón: alta saturación sobre negro, con los tokens de la plataforma
 * (cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`, verde `#00ff88`).
 */
const neon: FroggerPalette = {
  safe: "#120a1e",
  road: "#05050a",
  river: "#001a2e",
  goalRow: "#1a0a26",
  roadLine: "#00f5ff",
  goalEmpty: "#0a0014",
  goalBorder: "#f5ff00",
  goalFilled: "#00ff88",
  carBodies: ["#ff006e", "#f5ff00", "#ff8a00"],
  carGlass: "#05050a",
  truckBody: "#e6f9ff",
  truckCab: "#00f5ff",
  wheel: "#1b0b2a",
  log: "#7b2cbf",
  logGrain: "#c77dff",
  turtleShell: "#00f5ff",
  turtleShellEdge: "#0088a8",
  turtleHead: "#aef7ff",
  turtleSubmerged: "rgba(0, 245, 255, 0.28)",
  frogBody: "#00ff88",
  frogBelly: "#ccffe8",
  frogLeg: "#00b35f",
  frogEye: "#ffffff",
  frogPupil: "#12002b",
  timeTrack: "rgba(0, 245, 255, 0.18)",
  timeHigh: "#00ff88",
  timeMid: "#f5ff00",
  timeLow: "#ff006e",
};
/** Retro: fósforo cálido y apagado (ámbar, verde CRT, cremas) sobre casi negro. */
const retro: FroggerPalette = {
  safe: "#141008",
  road: "#0b0a07",
  river: "#101a16",
  goalRow: "#12170d",
  roadLine: "#6b5a2a",
  goalEmpty: "#0d1109",
  goalBorder: "#c08b2a",
  goalFilled: "#5a7a3a",
  carBodies: ["#b5651d", "#c9a227", "#7f8c5a"],
  carGlass: "#0b0a07",
  truckBody: "#cbbd9a",
  truckCab: "#8a7f63",
  wheel: "#0e0d0a",
  log: "#6b4a24",
  logGrain: "#4a3217",
  turtleShell: "#6e9456",
  turtleShellEdge: "#3f5a30",
  turtleHead: "#8fb46f",
  turtleSubmerged: "rgba(110, 148, 86, 0.22)",
  frogBody: "#7ea832",
  frogBelly: "#c7d89a",
  frogLeg: "#4e6b22",
  frogEye: "#e8e2c8",
  frogPupil: "#100e08",
  timeTrack: "rgba(232, 226, 200, 0.1)",
  timeHigh: "#7ea832",
  timeMid: "#c9a227",
  timeLow: "#b5431d",
};
export const SKINS: Record<SkinId, FroggerPalette> = {
  clasico,
  neon,
  retro,
};
