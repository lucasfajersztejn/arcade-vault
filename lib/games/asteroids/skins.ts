import type { SkinId } from "@/lib/games/skins";
/**
 * Paleta de color del juego Asteroids. Un slot por cada literal del render
 * original. Solo color: no cambia formas, grosores, física ni puntuación.
 */
export type AsteroidsPalette = {
  /** Fondo del canvas (fillRect por cada frame). */
  bg: string;
  /** Relleno de las balas. */
  bullet: string;
  /** Trazo del polígono del asteroide. */
  asteroid: string;
  /** Trazo del casco de la nave. */
  ship: string;
  /** Trazo de la llama del propulsor (incluye alpha). */
  thrust: string;
  /** Tripleta `r,g,b` para los trazos de partículas (el alpha varía con la vida). */
  particleRgb: string;
  /** Trazo y texto `3x` del power-up flotante. */
  powerUp: string;
  /** Texto del HUD interno `3x  Ns` que vive en el canvas. */
  hudTriple: string;
};
export const SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    bg: "#000",
    bullet: "#fff",
    asteroid: "#fff",
    ship: "#fff",
    thrust: "rgba(255, 130, 0, 0.85)",
    particleRgb: "255,255,255",
    powerUp: "#0ff",
    hudTriple: "#0ff",
  },
  neon: {
    bg: "#05070f",
    bullet: "#f5ff00",
    asteroid: "#00f5ff",
    ship: "#00f5ff",
    thrust: "rgba(255, 0, 110, 0.9)",
    particleRgb: "255,0,110",
    powerUp: "#ff006e",
    hudTriple: "#ff006e",
  },
  retro: {
    bg: "#0d0b08",
    bullet: "#ffd9a0",
    asteroid: "#d9c27a",
    ship: "#d9c27a",
    thrust: "rgba(255, 120, 40, 0.8)",
    particleRgb: "255,200,140",
    powerUp: "#6fb98f",
    hudTriple: "#6fb98f",
  },
};
