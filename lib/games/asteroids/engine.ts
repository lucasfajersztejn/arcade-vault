import {
  H,
  INITIAL_ASTEROIDS,
  INITIAL_LIVES,
  MAX_DT,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  POWERUP_GUARANTEED_KILLS,
  RESPAWN_DELAY,
  SAFE_DIST,
  SHIP_COLLISION_FACTOR,
  W,
} from "./constants";
import {
  Asteroid,
  Bullet,
  Particle,
  PowerUp,
  Ship,
  type Keys,
} from "./entities";
import type { AsteroidsCallbacks, AsteroidsEngine } from "./types";
import { dist, rand } from "./utils";
type State = "playing" | "dead" | "gameover";
/** Teclas que el juego consume (y cuyo comportamiento por defecto se evita). */
const CAPTURED = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);
/** Con el foco en un control, las teclas siguen siendo suyas (escribir, activar un botón). */
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName))
  );
}
export function createAsteroids(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return {
      pause: noop,
      resume: noop,
      restart: noop,
      end: noop,
      destroy: noop,
    };
  }
  canvas.width = W;
  canvas.height = H;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // ── Input ───────────────────────────────────────────────────────────────────
  const keys: Keys = {};
  const justPressed: Keys = {};
  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return val;
  };
  const clearInput = () => {
    for (const code of Object.keys(keys)) keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
  };
  // ── Estado del juego ────────────────────────────────────────────────────────
  let ship: Ship;
  let bullets: Bullet[];
  let asteroids: Asteroid[];
  let particles: Particle[];
  let powerUps: PowerUp[];
  let score: number;
  let lives: number;
  let level: number;
  let state: State;
  let deadTimer = 0;
  let powerUpSpawned: boolean;
  let killsSinceSpawn: number;
  let paused = false;
  let destroyed = false;
  let running = false;
  let rafId = 0;
  let lastTime: number | null = null;
  const accepting = () => !destroyed && !paused && state !== "gameover";
  const onKeyDown = (e: KeyboardEvent) => {
    if (!CAPTURED.has(e.code) || !accepting() || isInteractive(e.target))
      return;
    e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const wasHeld = keys[e.code];
    keys[e.code] = false;
    // Algunos navegadores activan un botón enfocado al soltar Espacio.
    if (wasHeld && CAPTURED.has(e.code)) e.preventDefault();
  };
  function spawnAsteroids(count: number) {
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }
  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    state = "playing";
    spawnAsteroids(INITIAL_ASTEROIDS);
    callbacks.onScore(score);
    callbacks.onLives(lives);
    callbacks.onLevel(level);
  }
  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
    callbacks.onLevel(level);
  }
  function explode(x: number, y: number, count = 8) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  }
  function gameOver() {
    state = "gameover";
    clearInput();
    callbacks.onGameOver(score);
  }
  function killShip() {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    lives--;
    callbacks.onLives(lives);
    if (lives <= 0) {
      gameOver();
    } else {
      state = "dead";
      deadTimer = RESPAWN_DELAY;
    }
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") {
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      return;
    }
    if (state === "dead") {
      deadTimer -= dt;
      particles.forEach((p) => p.update(dt));
      particles = particles.filter((p) => !p.dead);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }
    // Disparar
    if (pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }
    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));
    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);
    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }
    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    let scored = false;
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          scored = true;
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= POWERUP_GUARANTEED_KILLS;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);
    if (scored) callbacks.onScore(score);
    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * SHIP_COLLISION_FACTOR) {
          killShip();
          break;
        }
      }
    }
    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx, reducedMotion.matches));
    bullets.forEach((b) => b.draw(ctx));
    ship.draw(ctx);
    // Único elemento del HUD que se queda en el canvas: la cuenta atrás del 3x.
    if (ship.tripleShot > 0) {
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#0ff";
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    }
  }
  // ── Bucle principal ─────────────────────────────────────────────────────────
  function frame(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw();
    if (running) rafId = requestAnimationFrame(frame);
  }
  function startLoop() {
    if (running || destroyed) return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop() {
    running = false;
    cancelAnimationFrame(rafId);
  }
  // ── API pública ─────────────────────────────────────────────────────────────
  function pause() {
    if (destroyed || paused || state === "gameover") return;
    paused = true;
    clearInput();
    stopLoop();
  }
  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    startLoop();
  }
  function restart() {
    if (destroyed) return;
    clearInput();
    initGame();
    paused = false;
    stopLoop();
    startLoop();
  }
  function end() {
    if (destroyed || state === "gameover") return;
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    gameOver();
    // Si estaba en pausa, el bucle parado no animaría la explosión ni repintaría.
    paused = false;
    startLoop();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopLoop();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onAutoPause);
    document.removeEventListener("visibilitychange", onVisibility);
  }
  // Pausa automática: pestaña oculta o ventana sin foco. Avisa a la plataforma.
  function onAutoPause() {
    if (destroyed || paused || state === "gameover") return;
    pause();
    callbacks.onPause?.(true);
  }
  function onVisibility() {
    if (document.hidden) onAutoPause();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onAutoPause);
  document.addEventListener("visibilitychange", onVisibility);
  initGame();
  startLoop();
  return { pause, resume, restart, end, destroy };
}
