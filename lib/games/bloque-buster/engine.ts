import {
  BLOCK_POINTS,
  H,
  INITIAL_LIVES,
  MAX_DT,
  MAX_SCORE,
  PADDLE_SPEED,
  W,
} from "./constants";
import {
  advanceExplosions,
  bounceWalls,
  bouncePaddle,
  createBall,
  createBlocks,
  createPaddle,
  drawBall,
  drawBlocks,
  drawExplosions,
  drawPaddle,
  findHitBlock,
  isBallLost,
  resetBall,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from "./entities";
import { LEVELS } from "./levels";
import { loadSpritesheet } from "./sprites";
import type { BloqueBusterCallbacks, BloqueBusterEngine } from "./types";
type State = "playing" | "gameover";
/** Flechas: el juego las consume (y evita su comportamiento por defecto, el scroll). */
const MOVE_KEYS = new Set(["ArrowLeft", "ArrowRight"]);
const PAUSE_KEYS = new Set(["KeyP", "Escape"]);
/** Con el foco en un control, las teclas siguen siendo suyas (escribir, activar un botón). */
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName))
  );
}
export function createBloqueBuster(
  canvas: HTMLCanvasElement,
  callbacks: BloqueBusterCallbacks,
): BloqueBusterEngine {
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
  // ── Input ───────────────────────────────────────────────────────────────────
  const keys = { left: false, right: false };
  const clearInput = () => {
    keys.left = false;
    keys.right = false;
  };
  // ── Estado del juego ────────────────────────────────────────────────────────
  const paddle: Paddle = createPaddle();
  const ball: Ball = createBall();
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  /** Nivel del juego, de 1 a LEVELS.length. */
  let level = 1;
  let state: State = "playing";
  let sheet: HTMLImageElement | null = null;
  let paused = false;
  let destroyed = false;
  let running = false;
  let rafId = 0;
  let lastTime: number | null = null;
  const emitScore = () => callbacks.onScore(Math.min(score, MAX_SCORE));
  function loadLevel(n: number) {
    level = n;
    const lv = LEVELS[n - 1];
    blocks = createBlocks(lv);
    explosions = [];
    resetBall(ball, paddle, lv.speed);
  }
  function initGame() {
    const fresh = createPaddle();
    paddle.x = fresh.x;
    score = 0;
    lives = INITIAL_LIVES;
    state = "playing";
    loadLevel(1);
    emitScore();
    callbacks.onLives(lives);
    callbacks.onLevel(level);
  }
  function gameOver() {
    state = "gameover";
    clearInput();
    stopLoop();
    callbacks.onGameOver(Math.min(score, MAX_SCORE));
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (state === "gameover") return;
    // Pala
    if (keys.left) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (keys.right)
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);
    // Bola
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    bounceWalls(ball);
    bouncePaddle(ball, paddle);
    // Bloques: uno por frame
    const hit = findHitBlock(ball, blocks);
    if (hit) {
      hit.alive = false;
      explosions.push({
        x: hit.x,
        y: hit.y,
        w: hit.w,
        h: hit.h,
        color: hit.color,
        elapsed: 0,
      });
      score += BLOCK_POINTS;
      ball.vy = -ball.vy;
      emitScore();
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) {
          loadLevel(level + 1);
          callbacks.onLevel(level);
        } else {
          gameOver();
          return;
        }
      }
    }
    explosions = advanceExplosions(explosions, dt * 1000);
    // Bola perdida
    if (isBallLost(ball)) {
      lives = Math.max(0, lives - 1);
      callbacks.onLives(lives);
      if (lives <= 0) {
        gameOver();
      } else {
        resetBall(ball, paddle, LEVELS[level - 1].speed);
      }
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    if (!sheet) return;
    drawBlocks(ctx, sheet, blocks);
    drawExplosions(ctx, sheet, explosions);
    drawPaddle(ctx, sheet, paddle);
    drawBall(ctx, sheet, ball);
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
    // Sin spritesheet no hay nada que dibujar: el bucle arranca al terminar la carga.
    if (running || destroyed || !sheet) return;
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
    draw();
    startLoop();
  }
  function end() {
    if (destroyed || state === "gameover") return;
    gameOver();
    paused = false;
    draw();
  }
  function togglePause() {
    if (paused) {
      resume();
      callbacks.onPause?.(false);
    } else {
      pause();
      callbacks.onPause?.(true);
    }
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
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (destroyed || state === "gameover" || isInteractive(e.target)) return;
    if (MOVE_KEYS.has(e.code)) {
      e.preventDefault();
      if (paused) return;
      if (e.code === "ArrowLeft") keys.left = true;
      else keys.right = true;
    } else if (PAUSE_KEYS.has(e.code) && !e.repeat) {
      togglePause();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft") keys.left = false;
    else if (e.code === "ArrowRight") keys.right = false;
  };
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopLoop();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onAutoPause);
    document.removeEventListener("visibilitychange", onVisibility);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onAutoPause);
  document.addEventListener("visibilitychange", onVisibility);
  initGame();
  // El bucle arranca cuando termina la carga; si el motor se destruyó antes, no arranca.
  loadSpritesheet()
    .then((img) => {
      if (destroyed) return;
      sheet = img;
      draw();
      if (!paused && state !== "gameover") startLoop();
    })
    .catch((err) => {
      if (!destroyed) console.error(err);
    });
  return { pause, resume, restart, end, destroy };
}
