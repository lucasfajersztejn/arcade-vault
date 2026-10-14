import {
  BLOCK,
  COLS,
  HARD_DROP_POINTS,
  MAX_DT,
  MAX_SCORE,
  NEXT_SIZE,
  ROWS,
  SOFT_DROP_POINTS,
} from "./constants";
import {
  clearLines,
  collide,
  drawBoard,
  drawGhost,
  drawGrid,
  drawNext,
  drawPiece,
  dropIntervalForLevel,
  ghostY,
  levelForLines,
  lineScore,
  merge,
  tryRotate,
} from "./entities";
import { DEFAULT_SKIN } from "@/lib/games/skins";
import { SKINS, type CaidaPalette } from "./skins";
import type {
  Board,
  CaidaCallbacks,
  CaidaEngine,
  CaidaOptions,
  Piece,
} from "./types";
import { createBoard, randomPiece } from "./utils";
type State = "playing" | "gameover";
/** Teclas que el juego consume (y cuyo comportamiento por defecto se evita). */
const CAPTURED = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "KeyX",
  "Space",
  "KeyP",
]);
/** Con el foco en un control, las teclas siguen siendo suyas (escribir, activar un botón). */
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName))
  );
}
export function createCaida(
  canvas: HTMLCanvasElement,
  callbacks: CaidaCallbacks,
  opts: CaidaOptions = {},
): CaidaEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return {
      pause: noop,
      resume: noop,
      restart: noop,
      end: noop,
      setPalette: noop,
      destroy: noop,
      setInput: noop,
    };
  }
  canvas.width = COLS * BLOCK;
  canvas.height = ROWS * BLOCK;
  const { nextCanvas } = opts;
  const nextCtx = nextCanvas?.getContext("2d") ?? null;
  let palette: CaidaPalette = opts.palette ?? SKINS[DEFAULT_SKIN];
  if (nextCanvas) {
    nextCanvas.width = NEXT_SIZE;
    nextCanvas.height = NEXT_SIZE;
  }
  // ── Estado del juego ────────────────────────────────────────────────────────
  let board: Board;
  let current: Piece;
  let next: Piece;
  let score: number;
  let lines: number;
  let level: number;
  let dropInterval: number;
  let dropAccum: number;
  let state: State;
  let paused = false;
  let destroyed = false;
  let running = false;
  let rafId = 0;
  let lastTime: number | null = null;
  const isOver = () => state === "gameover";
  const accepting = () => !destroyed && !paused && !isOver();
  function addScore(points: number) {
    if (points <= 0) return;
    score = Math.min(score + points, MAX_SCORE);
    callbacks.onScore(score);
  }
  function gameOver() {
    state = "gameover";
    stopLoop();
    callbacks.onGameOver(score);
  }
  function spawn() {
    current = next;
    next = randomPiece();
    if (nextCtx) drawNext(nextCtx, next, palette);
    if (collide(board, current.shape, current.x, current.y)) gameOver();
  }
  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      // Como en el original, la tanda se puntúa con el nivel previo a subirlo.
      addScore(lineScore(cleared, level));
      lines += cleared;
      level = levelForLines(lines);
      dropInterval = dropIntervalForLevel(level);
      callbacks.onLines(lines);
      callbacks.onLevel(level);
    }
    spawn();
  }
  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = dropIntervalForLevel(1);
    dropAccum = 0;
    state = "playing";
    next = randomPiece();
    spawn();
    callbacks.onScore(score);
    callbacks.onLines(lines);
    callbacks.onLevel(level);
  }
  // ── Acciones del jugador ────────────────────────────────────────────────────
  function move(dx: number) {
    if (!collide(board, current.shape, current.x + dx, current.y))
      current.x += dx;
  }
  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(SOFT_DROP_POINTS);
    } else {
      lockPiece();
    }
  }
  function hardDrop() {
    const gy = ghostY(board, current);
    addScore((gy - current.y) * HARD_DROP_POINTS);
    current.y = gy;
    lockPiece();
  }
  // ── Input ───────────────────────────────────────────────────────────────────
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!CAPTURED.has(e.code) || destroyed || state === "gameover") return;
    if (isInteractive(e.target)) return;
    e.preventDefault();
    if (e.code === "KeyP") {
      if (paused) {
        resume();
        callbacks.onPause?.(false);
      } else {
        pause();
        callbacks.onPause?.(true);
      }
      return;
    }
    if (paused) return;
    switch (e.code) {
      case "ArrowLeft":
        move(-1);
        break;
      case "ArrowRight":
        move(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate(board, current);
        break;
      case "Space":
        hardDrop();
        break;
    }
    // Una pieza fijada puede terminar la partida: el bucle ya está parado, repinta el final.
    if (isOver()) draw();
  };
  // ── Update y draw ───────────────────────────────────────────────────────────
  function update(dt: number) {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(board, current.shape, current.x, current.y + 1)) {
        current.y++;
      } else {
        lockPiece();
      }
    }
  }
  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid(ctx, palette);
    drawBoard(ctx, board, palette);
    drawGhost(ctx, board, current, palette);
    drawPiece(ctx, current, current.y, palette);
  }
  // ── Bucle principal ─────────────────────────────────────────────────────────
  function frame(ts: number) {
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
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
    stopLoop();
  }
  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    startLoop();
  }
  function restart() {
    if (destroyed) return;
    stopLoop();
    paused = false;
    initGame();
    draw();
    startLoop();
  }
  function end() {
    if (destroyed || state === "gameover") return;
    paused = false;
    gameOver();
    draw();
  }
  // Cambia la paleta en vivo y repinta al instante (tablero y vista previa),
  // sin tocar el estado del juego: funciona incluso en pausa o game over.
  function setPalette(p: CaidaPalette) {
    if (destroyed) return;
    palette = p;
    draw();
    if (nextCtx) drawNext(nextCtx, next, palette);
  }
  // Entrada táctil: cada acción equivale a una pulsación de tecla, por eso
  // ignoramos `pressed = false` y disparamos la acción al `true`.
  function setInput(action: string, pressed: boolean) {
    if (!pressed) return;
    if (!accepting()) return;
    switch (action) {
      case "left":
        move(-1);
        break;
      case "right":
        move(1);
        break;
      case "down":
        softDrop();
        break;
      case "rotate":
        tryRotate(board, current);
        break;
      case "drop":
        hardDrop();
        break;
      default:
        return;
    }
    if (isOver()) draw();
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopLoop();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("blur", onAutoPause);
    document.removeEventListener("visibilitychange", onVisibility);
  }
  // Pausa automática: pestaña oculta o ventana sin foco. Avisa a la plataforma.
  function onAutoPause() {
    if (!accepting()) return;
    pause();
    callbacks.onPause?.(true);
  }
  function onVisibility() {
    if (document.hidden) onAutoPause();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onAutoPause);
  document.addEventListener("visibilitychange", onVisibility);
  initGame();
  // Pinta el estado inicial de forma síncrona: si Chrome Android cancela el
  // primer `requestAnimationFrame`, el tablero no queda en negro.
  draw();
  startLoop();
  return { pause, resume, restart, end, setPalette, destroy, setInput };
}
