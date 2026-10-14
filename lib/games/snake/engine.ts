import { CELL, FRUIT_POINTS, GRID, MAX_DT, MAX_SCORE, SIZE } from "./constants";
import {
  createSegments,
  levelFor,
  queueTurn,
  spawnFruit,
  stepMsFor,
  stepSnake,
  type Cell,
  type Dir,
  type Fruit,
} from "./entities";
import { SKINS, type SnakePalette } from "./skins";
import { drawFruit, loadFruits } from "./sprites";
import type { SnakeCallbacks, SnakeEngine, SnakeOptions } from "./types";
type State = "playing" | "gameover";
/** Teclas de giro: el juego las consume (y evita su comportamiento por defecto, el scroll). */
const TURN_KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};
const PAUSE_KEYS = new Set(["KeyP", "Escape"]);
const FORWARD: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};
/** Con el foco en un control, las teclas siguen siendo suyas (escribir, activar un botón). */
function isInteractive(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(target.tagName))
  );
}
export function createSnake(
  canvas: HTMLCanvasElement,
  callbacks: SnakeCallbacks,
  options?: SnakeOptions,
): SnakeEngine {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const noop = () => {};
    return {
      pause: noop,
      resume: noop,
      restart: noop,
      end: noop,
      destroy: noop,
      setPalette: noop,
      setInput: noop,
    };
  }
  let palette: SnakePalette = options?.palette ?? SKINS.clasico;
  canvas.width = SIZE;
  canvas.height = SIZE;
  // ── Estado del juego ────────────────────────────────────────────────────────
  let segments: Cell[] = [];
  /** Dirección del último paso dado. */
  let dir: Dir = "right";
  let queue: Dir[] = [];
  let fruit: Fruit | null = null;
  let fruitsEaten = 0;
  let score = 0;
  let level = 1;
  let state: State = "playing";
  /** Milisegundos acumulados desde el último paso. */
  let acc = 0;
  let sheet: HTMLImageElement | null = null;
  let paused = false;
  let destroyed = false;
  let running = false;
  let rafId = 0;
  let lastTime: number | null = null;
  const emitScore = () => callbacks.onScore(Math.min(score, MAX_SCORE));
  function initGame() {
    segments = createSegments();
    dir = "right";
    queue = [];
    fruitsEaten = 0;
    score = 0;
    level = 1;
    acc = 0;
    state = "playing";
    fruit = spawnFruit(segments, null, Math.random);
    emitScore();
    callbacks.onLevel(level);
  }
  function gameOver() {
    state = "gameover";
    stopLoop();
    callbacks.onGameOver(Math.min(score, MAX_SCORE));
  }
  // ── Update ──────────────────────────────────────────────────────────────────
  function step() {
    if (queue.length > 0) dir = queue.shift()!;
    const result = stepSnake(segments, dir, fruit);
    if (result.status === "dead") {
      gameOver();
      return;
    }
    segments = result.segments;
    if (!result.ate) return;
    fruitsEaten += 1;
    score += FRUIT_POINTS;
    emitScore();
    const nextLevel = levelFor(fruitsEaten);
    if (nextLevel !== level) {
      level = nextLevel;
      callbacks.onLevel(level);
    }
    // Sin celda libre para la fruta: la serpiente llena el tablero.
    fruit = spawnFruit(segments, fruit?.kind ?? null, Math.random);
    if (!fruit) gameOver();
  }
  function update(dtMs: number) {
    if (state === "gameover") return;
    acc += dtMs;
    while (acc >= stepMsFor(level) && state === "playing") {
      acc -= stepMsFor(level);
      step();
    }
  }
  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBoard(c: CanvasRenderingContext2D) {
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        c.fillStyle =
          (row + col) % 2 === 0 ? palette.tileDark : palette.tileLight;
        c.fillRect(col * CELL, row * CELL, CELL, CELL);
      }
    }
    // Las paredes matan: el borde del tablero se ve siempre.
    c.strokeStyle = palette.border;
    c.lineWidth = 2;
    c.strokeRect(1, 1, SIZE - 2, SIZE - 2);
  }
  /** Baldosa oscura bajo la fruta: las frutas verdes no se pierden contra la serpiente. */
  function drawFruitTile(c: CanvasRenderingContext2D, f: Fruit) {
    c.fillStyle = palette.fruitTile;
    c.fillRect(f.col * CELL + 1, f.row * CELL + 1, CELL - 2, CELL - 2);
    c.strokeStyle = palette.fruitTileEdge;
    c.lineWidth = 1;
    c.strokeRect(f.col * CELL + 1.5, f.row * CELL + 1.5, CELL - 3, CELL - 3);
  }
  function drawSnake(c: CanvasRenderingContext2D) {
    const last = segments.length - 1;
    // De la cola a la cabeza, para que la cabeza quede encima.
    for (let i = last; i >= 0; i--) {
      const s = segments[i];
      const lightness = i === 0 ? 72 : 50 - 20 * (i / Math.max(last, 1));
      c.fillStyle = `hsl(${palette.snakeHue} ${palette.snakeSat}% ${lightness}%)`;
      c.fillRect(s.col * CELL + 2, s.row * CELL + 2, CELL - 4, CELL - 4);
    }
    const head = segments[0];
    const cx = head.col * CELL + CELL / 2;
    const cy = head.row * CELL + CELL / 2;
    const f = FORWARD[dir];
    c.fillStyle = palette.eye;
    for (const side of [-1, 1]) {
      // Ojos hacia delante y a cada lado de la cabeza.
      const ex = cx + f.col * 6 + -f.row * 6 * side;
      const ey = cy + f.row * 6 + f.col * 6 * side;
      c.fillRect(ex - 2.5, ey - 2.5, 5, 5);
    }
  }
  function draw() {
    if (!ctx) return;
    drawBoard(ctx);
    if (fruit && sheet) {
      drawFruitTile(ctx, fruit);
      drawFruit(ctx, sheet, fruit.kind, fruit.col, fruit.row);
    }
    drawSnake(ctx);
  }
  // ── Bucle principal ─────────────────────────────────────────────────────────
  function frame(ts: number) {
    const dtMs = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dtMs);
    draw();
    if (running) rafId = requestAnimationFrame(frame);
  }
  function startLoop() {
    // Sin imagen de frutas no hay nada que dibujar: el bucle arranca al terminar la carga.
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
    stopLoop();
  }
  function resume() {
    if (destroyed || !paused) return;
    paused = false;
    startLoop();
  }
  function restart() {
    if (destroyed) return;
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
    const turn = TURN_KEYS[e.code];
    if (turn) {
      e.preventDefault();
      if (paused) return;
      queue = queueTurn(queue, dir, turn);
    } else if (PAUSE_KEYS.has(e.code) && !e.repeat) {
      togglePause();
    }
  };
  function setPalette(p: SnakePalette) {
    palette = p;
    // Repinta aun en pausa / game over: cambiar skin no debe tocar el estado.
    draw();
  }
  /** Entrada táctil: encola un giro al pulsar (edge), igual que una tecla. */
  function setInput(action: string, pressed: boolean) {
    if (!pressed) return;
    if (destroyed || paused || state === "gameover") return;
    if (
      action === "up" ||
      action === "down" ||
      action === "left" ||
      action === "right"
    ) {
      queue = queueTurn(queue, dir, action);
    }
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    stopLoop();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("blur", onAutoPause);
    document.removeEventListener("visibilitychange", onVisibility);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onAutoPause);
  document.addEventListener("visibilitychange", onVisibility);
  initGame();
  // El bucle arranca cuando termina la carga; si el motor se destruyó antes, no arranca.
  loadFruits()
    .then((img) => {
      if (destroyed) return;
      sheet = img;
      draw();
      if (!paused && state !== "gameover") startLoop();
    })
    .catch((err) => {
      if (!destroyed) console.error(err);
    });
  return { pause, resume, restart, end, destroy, setPalette, setInput };
}
