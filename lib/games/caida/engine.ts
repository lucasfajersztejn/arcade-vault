import {
  BLOCK,
  COLS,
  GHOST_ALPHA,
  HARD_DROP_POINTS,
  MAX_DT,
  MAX_SCORE,
  NEXT_GRID,
  NEXT_SIZE,
  ROWS,
  SOFT_DROP_POINTS,
} from "./constants";
import {
  clearLines,
  collide,
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
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
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
  // Alias ya estrechado: TypeScript no conserva el narrow dentro del closure.
  const ctx: CanvasRenderingContext2D = ctx2d;
  canvas.width = COLS * BLOCK;
  canvas.height = ROWS * BLOCK;
  const { nextCanvas } = opts;
  const nextCtx = nextCanvas?.getContext("2d") ?? null;
  let palette: CaidaPalette = opts.palette ?? SKINS[DEFAULT_SKIN];
  if (nextCanvas) {
    nextCanvas.width = NEXT_SIZE;
    nextCanvas.height = NEXT_SIZE;
  }
  // ── Fondo offscreen cacheado (patrón SPEC 13) ──────────────────────────────
  // Pinta fondo + rejilla una sola vez por paleta; el loop lo copia con un
  // drawImage por frame en lugar de repintar strokes línea a línea.
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = COLS * BLOCK;
  bgCanvas.height = ROWS * BLOCK;
  const bgCtx = bgCanvas.getContext("2d") as CanvasRenderingContext2D;
  function rebuildBackground(): void {
    bgCtx.fillStyle = palette.bg;
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgCtx.strokeStyle = palette.grid;
    bgCtx.lineWidth = 0.5;
    for (let c = 1; c < COLS; c++) {
      bgCtx.beginPath();
      bgCtx.moveTo(c * BLOCK, 0);
      bgCtx.lineTo(c * BLOCK, ROWS * BLOCK);
      bgCtx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, r * BLOCK);
      bgCtx.lineTo(COLS * BLOCK, r * BLOCK);
      bgCtx.stroke();
    }
  }
  // ── Sprite cache perezoso (patrón SPEC 13) ─────────────────────────────────
  // Un sprite BLOCK×BLOCK por índice de color de pieza. Se invalida con
  // `spriteCache.clear()` sólo en `setPalette`.
  const spriteCache = new Map<string, HTMLCanvasElement>();
  function getBlockSprite(colorIndex: number): HTMLCanvasElement {
    const key = `block:${colorIndex}`;
    const hit = spriteCache.get(key);
    if (hit) return hit;
    const sprite = document.createElement("canvas");
    sprite.width = BLOCK;
    sprite.height = BLOCK;
    const sctx = sprite.getContext("2d") as CanvasRenderingContext2D;
    sctx.fillStyle = palette.pieceColors[colorIndex] as string;
    sctx.fillRect(1, 1, BLOCK - 2, BLOCK - 2);
    sctx.fillStyle = palette.gloss;
    sctx.fillRect(1, 1, BLOCK - 2, 4);
    spriteCache.set(key, sprite);
    return sprite;
  }
  function drawCell(
    target: CanvasRenderingContext2D,
    col: number,
    row: number,
    colorIndex: number,
    alpha: number,
  ): void {
    if (!colorIndex) return;
    const sprite = getBlockSprite(colorIndex);
    if (alpha !== 1) target.globalAlpha = alpha;
    target.drawImage(sprite, col * BLOCK, row * BLOCK);
    if (alpha !== 1) target.globalAlpha = 1;
  }
  function drawBoardCached(): void {
    for (let r = 0; r < ROWS; r++) {
      const row = board[r];
      for (let c = 0; c < COLS; c++) {
        const v = row[c];
        if (v) drawCell(ctx, c, r, v, 1);
      }
    }
  }
  function drawPieceCached(piece: Piece, y: number, alpha: number): void {
    const { shape } = piece;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        const v = shape[r][c];
        if (v) drawCell(ctx, piece.x + c, y + r, v, alpha);
      }
    }
  }
  function drawGhostCached(piece: Piece): void {
    drawPieceCached(piece, ghostY(board, piece), GHOST_ALPHA);
  }
  function drawNextCached(piece: Piece): void {
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, NEXT_SIZE, NEXT_SIZE);
    nextCtx.fillStyle = palette.bg;
    nextCtx.fillRect(0, 0, NEXT_SIZE, NEXT_SIZE);
    const { shape } = piece;
    const offX = Math.floor((NEXT_GRID - shape[0].length) / 2);
    const offY = Math.floor((NEXT_GRID - shape.length) / 2);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        const v = shape[r][c];
        if (v) {
          const sprite = getBlockSprite(v);
          nextCtx.drawImage(sprite, (offX + c) * BLOCK, (offY + r) * BLOCK);
        }
      }
    }
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
  // ── Guardas de emisión al HUD (patrón SPEC 13) ──────────────────────────────
  // Evitan re-renders en React cuando el valor no cambió. `onGameOver` NUNCA
  // se filtra: es terminal y lo lee el modal.
  let lastEmittedScore = -1;
  let lastEmittedLines = -1;
  let lastEmittedLevel = -1;
  let lastEmittedPaused: boolean | null = null;
  function emitScore(next: number): void {
    if (next === lastEmittedScore) return;
    lastEmittedScore = next;
    callbacks.onScore(next);
  }
  function emitLines(next: number): void {
    if (next === lastEmittedLines) return;
    lastEmittedLines = next;
    callbacks.onLines(next);
  }
  function emitLevel(next: number): void {
    if (next === lastEmittedLevel) return;
    lastEmittedLevel = next;
    callbacks.onLevel(next);
  }
  function emitPaused(next: boolean): void {
    if (next === lastEmittedPaused) return;
    lastEmittedPaused = next;
    callbacks.onPause?.(next);
  }
  const isOver = () => state === "gameover";
  const accepting = () => !destroyed && !paused && !isOver();
  function addScore(points: number) {
    if (points <= 0) return;
    score = Math.min(score + points, MAX_SCORE);
    emitScore(score);
  }
  function gameOver() {
    state = "gameover";
    stopLoop();
    callbacks.onGameOver(score);
  }
  function spawn() {
    current = next;
    next = randomPiece();
    drawNextCached(next);
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
      emitLines(lines);
      emitLevel(level);
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
    // Reset de guardas ANTES de los primeros emits: un restart propaga aunque
    // los valores coincidan con los de la partida anterior.
    lastEmittedScore = -1;
    lastEmittedLines = -1;
    lastEmittedLevel = -1;
    lastEmittedPaused = null;
    next = randomPiece();
    spawn();
    emitScore(score);
    emitLines(lines);
    emitLevel(level);
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
        emitPaused(false);
      } else {
        pause();
        emitPaused(true);
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
    // Fondo + rejilla ya horneados en bgCanvas; un drawImage por frame.
    ctx.drawImage(bgCanvas, 0, 0);
    drawBoardCached();
    drawGhostCached(current);
    drawPieceCached(current, current.y, 1);
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
    // Invalidar cachés dependientes de color ANTES del próximo draw: si no,
    // la primera frame tras cambiar skin mezcla fondo viejo con sprites nuevos.
    spriteCache.clear();
    rebuildBackground();
    draw();
    drawNextCached(next);
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
    emitPaused(true);
  }
  function onVisibility() {
    if (document.hidden) onAutoPause();
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onAutoPause);
  document.addEventListener("visibilitychange", onVisibility);
  rebuildBackground();
  initGame();
  // Pinta el estado inicial de forma síncrona: si Chrome Android cancela el
  // primer `requestAnimationFrame`, el tablero no queda en negro.
  draw();
  startLoop();
  return { pause, resume, restart, end, setPalette, destroy, setInput };
}
