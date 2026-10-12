/** Canvas lógico; el CSS lo escala. */
export const W = 800;
export const H = 600;
export const INITIAL_LIVES = 3;
export const INITIAL_ASTEROIDS = 4;
/** Distancia mínima al centro (donde reaparece la nave) al colocar asteroides. */
export const SAFE_DIST = 130;
/** Límite de dt en segundos para evitar saltos tras perder el foco. */
export const MAX_DT = 0.05;
/** Radio, velocidad base y puntos por tamaño de asteroide (índices 1, 2 y 3). */
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];
export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const POWERUP_GUARANTEED_KILLS = 5;
export const TRIPLE_SPREAD = 0.18;
export const BULLET_SPEED = 520;
export const BULLET_TTL = 1.1;
export const SHOOT_COOLDOWN = 0.2;
/** Distancia de la nariz de la nave al centro, donde nacen las balas. */
export const SHIP_NOSE = 21;
export const SHIP_ROTATION = 3.5; // rad/s
export const SHIP_THRUST = 260; // px/s²
export const SHIP_DRAG = 0.987;
export const SHIP_RADIUS = 12;
export const SHIP_INVINCIBLE = 3;
/** Factor de "feel" en la colisión nave-asteroide. */
export const SHIP_COLLISION_FACTOR = 0.82;
export const RESPAWN_DELAY = 2;
