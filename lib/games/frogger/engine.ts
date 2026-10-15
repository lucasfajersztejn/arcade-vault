import {
  CANVAS_H,
  CANVAS_W,
  CELL,
  COLS,
  GOAL_COUNT,
  GOAL_WIDTH,
  JUMP_MS,
  LIVES_START,
  MAX_DT,
  MAX_SCORE,
  POINTS_FORWARD,
  POINTS_GOAL,
  POINTS_ROUND,
  ROW_GOALS,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_SAFE_MID,
  ROW_START,
  START_COL,
  TIME_BAR_H,
  TIME_BONUS_PER_SEC,
} from "@/lib/games/frogger/constants";
import {
  advanceLane,
  buildLanes,
  checkRoadCollision,
  createFrog,
  getSupport,
  goalColFor,
  goalIndexAt,
  insideBoard,
  isRiverRow,
  laneAt,
  roundMsFor,
  type Direction,
  type Entity,
  type Frog,
  type Lane,
} from "@/lib/games/frogger/entities";
import { SKINS, type FroggerPalette } from "@/lib/games/frogger/skins";
import type {
  FroggerCallbacks,
  FroggerEngine,
  FroggerOptions,
} from "@/lib/games/frogger/types";
const MOVE_KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};
const PAUSE_KEYS = new Set(["KeyP", "Escape"]);
const DELTAS: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};
/** No robamos el teclado si el jugador está escribiendo su nombre en el modal. */
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(
    target.tagName,
  );
}
function noop(): void {}
export function createFrogger(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
  options: FroggerOptions = {},
): FroggerEngine {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) {
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
  // Alias ya estrechado: TypeScript no conserva el estrechamiento de `ctx2d`
  // dentro de las funciones del closure.
  const ctx: CanvasRenderingContext2D = ctx2d;
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  // Canvas offscreen con el fondo estático (zonas + líneas de carretera + bocas vacías).
  // Se repinta sólo cuando cambia la paleta; el loop por frame lo copia con drawImage.
  const bgCanvas = document.createElement("canvas");
  bgCanvas.width = CANVAS_W;
  bgCanvas.height = CANVAS_H;
  const bgCtx = bgCanvas.getContext("2d") as CanvasRenderingContext2D;
  // Sprites prerrenderizados por `(kind, width, tint, dir)`. Se vacían con cada cambio
  // de paleta: `drawLanes` los repone perezosamente la primera vez que los necesita.
  const spriteCache = new Map<string, HTMLCanvasElement>();
  let palette: FroggerPalette = options.palette ?? SKINS.clasico;
  let lanes: Lane[] = [];
  let frog: Frog = createFrog();
  let goals: boolean[] = [];
  let level = 1;
  let score = 0;
  let lives = LIVES_START;
  /** Tiempo restante de la ronda, en ms. */
  let roundMs = 0;
  /** Fila más alta alcanzada en la ronda: cada fila nueva puntúa una sola vez. */
  let highestRow = ROW_START;
  let pendingDir: Direction | null = null;
  /**
   * El reloj de la ronda no corre hasta el primer movimiento de la partida: cargar la
   * página y leer los controles no debe costar las tres vidas. Una vez armado ya no se
   * desarma, así que esperar en la orilla sigue siendo mortal.
   */
  let started = false;
  let state: "playing" | "gameover" = "playing";
  let paused = false;
  let destroyed = false;
  let running = false;
  let rafId = 0;
  let lastTime: number | null = null;
  // Guardas para evitar re-renders redundantes del HUD compartido.
  // Se reinician a un valor imposible en `initGame()` para que el primer emit siempre pase.
  let lastEmittedScore = -1;
  let lastEmittedLives = -1;
  let lastEmittedLevel = -1;
  let lastEmittedPaused: boolean | null = null;
  // ---------------------------------------------------------------- estado
  function emitScore(): void {
    const next = Math.min(score, MAX_SCORE);
    if (next === lastEmittedScore) return;
    lastEmittedScore = next;
    callbacks.onScore(next);
  }
  function emitLives(): void {
    if (lives === lastEmittedLives) return;
    lastEmittedLives = lives;
    callbacks.onLives(lives);
  }
  function emitLevel(): void {
    if (level === lastEmittedLevel) return;
    lastEmittedLevel = level;
    callbacks.onLevel(level);
  }
  function emitPaused(next: boolean): void {
    if (next === lastEmittedPaused) return;
    lastEmittedPaused = next;
    callbacks.onPause?.(next);
  }
  function resetFrog(): void {
    frog = createFrog();
    pendingDir = null;
  }
  function startRound(nextLevel: number): void {
    level = nextLevel;
    lanes = buildLanes(level);
    goals = Array.from({ length: GOAL_COUNT }, () => false);
    roundMs = roundMsFor(level);
    highestRow = ROW_START;
    resetFrog();
  }
  function initGame(): void {
    score = 0;
    lives = LIVES_START;
    state = "playing";
    started = false;
    startRound(1);
    // Reset de las guardas: el reinicio sí debe propagar los valores al HUD aunque
    // coincidan con los del game anterior (p. ej. 3 vidas → 3 vidas).
    lastEmittedScore = -1;
    lastEmittedLives = -1;
    lastEmittedLevel = -1;
    lastEmittedPaused = null;
    emitScore();
    emitLives();
    emitLevel();
  }
  function gameOver(): void {
    state = "gameover";
    stopLoop();
    callbacks.onGameOver(Math.min(score, MAX_SCORE));
  }
  /** Una muerte: resta vida y devuelve la rana a la base, o acaba la partida. */
  function killFrog(): void {
    if (state === "gameover") return;
    lives = Math.max(0, lives - 1);
    emitLives();
    if (lives <= 0) {
      gameOver();
      return;
    }
    roundMs = roundMsFor(level);
    highestRow = ROW_START;
    resetFrog();
  }
  /** Las cinco bocas llenas: bonus, nivel nuevo y carriles más rápidos. */
  function completeRound(): void {
    score += POINTS_ROUND;
    emitScore();
    startRound(level + 1);
    emitLevel();
  }
  /** Aterrizaje en la fila de metas: boca libre puntúa, boca ocupada u orilla mata. */
  function resolveGoal(): void {
    const index = goalIndexAt(frog.col);
    if (index < 0 || goals[index]) {
      killFrog();
      return;
    }
    goals[index] = true;
    const bonus = Math.floor(roundMs / 1000) * TIME_BONUS_PER_SEC;
    score += POINTS_GOAL + bonus;
    emitScore();
    if (goals.every(Boolean)) {
      completeRound();
      return;
    }
    roundMs = roundMsFor(level);
    highestRow = ROW_START;
    resetFrog();
  }
  /** Se llama al completar un salto, con la rana ya en su celda destino. */
  function resolveLanding(): void {
    if (frog.row === ROW_GOALS) {
      resolveGoal();
      return;
    }
    if (frog.row < highestRow) {
      score += POINTS_FORWARD * (highestRow - frog.row);
      highestRow = frog.row;
      emitScore();
    }
    checkDeath();
  }
  /** Muerte por vehículo o por agua. Solo aplica con la rana posada. */
  function checkDeath(): void {
    if (state === "gameover" || frog.animating) return;
    if (checkRoadCollision(frog, lanes)) {
      killFrog();
      return;
    }
    if (isRiverRow(frog.row) && !getSupport(frog, lanes)) {
      killFrog();
    }
  }
  function startJump(dir: Direction): void {
    const { dc, dr } = DELTAS[dir];
    // La rana puede ir montada en un tronco: el salto parte de la celda más cercana.
    const baseCol = Math.round(frog.col);
    const targetCol = baseCol + dc;
    const targetRow = frog.row + dr;
    frog.facing = dir;
    if (!insideBoard(targetCol)) return;
    if (targetRow < ROW_GOALS || targetRow > ROW_START) return;
    frog.fromCol = frog.col;
    frog.fromRow = frog.row;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
    frog.animating = true;
    frog.animT = 0;
  }
  // ----------------------------------------------------------------- update
  function update(dtMs: number): void {
    if (state === "gameover") return;
    const dtSec = dtMs / 1000;
    for (const lane of lanes) advanceLane(lane, dtSec);
    if (frog.animating) {
      frog.animT += dtMs;
      if (frog.animT >= JUMP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        frog.animT = 0;
        resolveLanding();
      }
    } else if (pendingDir) {
      const dir = pendingDir;
      pendingDir = null;
      started = true;
      startJump(dir);
    }
    // Arrastre del río: la rana viaja con el tronco o las tortugas que la sostienen.
    if (state === "playing" && !frog.animating && isRiverRow(frog.row)) {
      const lane = laneAt(lanes, frog.row);
      const support = getSupport(frog, lanes);
      if (support && lane) {
        frog.col += lane.speed * lane.dir * dtSec;
        if (!insideBoard(frog.col)) {
          killFrog();
          return;
        }
      }
    }
    checkDeath();
    if (state !== "playing") return;
    if (!started) return;
    roundMs -= dtMs;
    if (roundMs <= 0) {
      roundMs = 0;
      killFrog();
    }
  }
  // ------------------------------------------------------------------- draw
  const px = (col: number) => col * CELL;
  const py = (row: number) => row * CELL;
  /**
   * Repinta `bgCanvas` con el fondo estático de la partida (zonas, líneas de carretera y
   * los 5 slots de meta vacíos). Se llama al crear el motor y cuando cambia la paleta;
   * el loop por frame copia este canvas con un solo `drawImage`.
   */
  function rebuildBackground(): void {
    bgCtx.fillStyle = palette.river;
    bgCtx.fillRect(0, py(ROW_GOALS), CANVAS_W, py(ROW_SAFE_MID));
    bgCtx.fillStyle = palette.goalRow;
    bgCtx.fillRect(0, py(ROW_GOALS), CANVAS_W, CELL);
    bgCtx.fillStyle = palette.safe;
    bgCtx.fillRect(0, py(ROW_SAFE_MID), CANVAS_W, CELL);
    bgCtx.fillRect(0, py(ROW_START), CANVAS_W, CELL);
    bgCtx.fillStyle = palette.road;
    bgCtx.fillRect(
      0,
      py(ROW_ROAD_TOP),
      CANVAS_W,
      (ROW_ROAD_BOT - ROW_ROAD_TOP + 1) * CELL,
    );
    // Líneas discontinuas entre carriles de carretera.
    bgCtx.strokeStyle = palette.roadLine;
    bgCtx.lineWidth = 2;
    bgCtx.setLineDash([12, 14]);
    for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOT; row += 1) {
      bgCtx.beginPath();
      bgCtx.moveTo(0, py(row));
      bgCtx.lineTo(CANVAS_W, py(row));
      bgCtx.stroke();
    }
    bgCtx.setLineDash([]);
    // Slots de meta vacíos: el relleno + silueta de la rana se dibujan encima en vivo.
    for (let i = 0; i < GOAL_COUNT; i += 1) {
      const x = px(goalColFor(i));
      const y = py(ROW_GOALS) + TIME_BAR_H + 2;
      const w = GOAL_WIDTH * CELL;
      const h = CELL - TIME_BAR_H - 4;
      bgCtx.fillStyle = palette.goalEmpty;
      bgCtx.fillRect(x, y, w, h);
      bgCtx.strokeStyle = palette.goalBorder;
      bgCtx.lineWidth = 2;
      bgCtx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    }
  }
  /** Overlay sobre `bgCanvas`: sólo las bocas con la rana ya alojada. */
  function drawGoalsFilled(): void {
    for (let i = 0; i < GOAL_COUNT; i += 1) {
      if (!goals[i]) continue;
      const x = px(goalColFor(i));
      const y = py(ROW_GOALS) + TIME_BAR_H + 2;
      const w = GOAL_WIDTH * CELL;
      const h = CELL - TIME_BAR_H - 4;
      ctx.fillStyle = palette.goalFilled;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = palette.goalBorder;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = palette.frogBody;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.frogEye;
      ctx.fillRect(x + w / 2 - 6, y + h / 2 - 6, 3, 3);
      ctx.fillRect(x + w / 2 + 3, y + h / 2 - 6, 3, 3);
    }
  }
  /**
   * Primitivas de dibujo relativas a `(offsetX, offsetY)`. El motor las llama en vivo
   * (paso 2) y, a partir del paso 4, las usará para prerrenderizar sprites una vez por
   * `(kind, width, tint, dir)` y pintar en el hot path con `drawImage`.
   */
  function paintCar(
    target: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    width: number,
    tint: number,
    dir: 1 | -1,
  ): void {
    const y = offsetY + 7;
    const w = width * CELL - 6;
    const h = CELL - 14;
    target.fillStyle = palette.carBodies[tint % 3];
    target.fillRect(offsetX + 3, y, w, h);
    // Parabrisas en el morro, para que se lea el sentido de la marcha.
    target.fillStyle = palette.carGlass;
    const glassW = Math.min(10, w / 3);
    target.fillRect(
      dir === 1 ? offsetX + 3 + w - glassW - 2 : offsetX + 5,
      y + 3,
      glassW,
      h - 6,
    );
    target.fillStyle = palette.wheel;
    target.fillRect(offsetX + 6, y - 3, 7, 3);
    target.fillRect(offsetX + w - 7, y - 3, 7, 3);
    target.fillRect(offsetX + 6, y + h, 7, 3);
    target.fillRect(offsetX + w - 7, y + h, 7, 3);
  }
  function paintTruck(
    target: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    width: number,
    dir: 1 | -1,
  ): void {
    const y = offsetY + 5;
    const w = width * CELL - 6;
    const h = CELL - 10;
    const cabW = CELL - 12;
    target.fillStyle = palette.truckBody;
    target.fillRect(offsetX + 3, y, w, h);
    target.fillStyle = palette.truckCab;
    target.fillRect(
      dir === 1 ? offsetX + 3 + w - cabW : offsetX + 3,
      y,
      cabW,
      h,
    );
    target.fillStyle = palette.wheel;
    target.fillRect(offsetX + 8, y + h, 8, 3);
    target.fillRect(offsetX + w - 10, y + h, 8, 3);
  }
  function paintLog(
    target: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    width: number,
  ): void {
    const y = offsetY + 8;
    const w = width * CELL;
    const h = CELL - 16;
    target.fillStyle = palette.log;
    target.fillRect(offsetX, y, w, h);
    target.strokeStyle = palette.logGrain;
    target.lineWidth = 2;
    for (let i = 1; i < width * 2; i += 1) {
      const lx = offsetX + (i * w) / (width * 2);
      target.beginPath();
      target.moveTo(lx, y + 3);
      target.lineTo(lx, y + h - 3);
      target.stroke();
    }
  }
  function paintTurtles(
    target: CanvasRenderingContext2D,
    offsetX: number,
    offsetY: number,
    width: number,
  ): void {
    for (let i = 0; i < width; i += 1) {
      const cx = offsetX + i * CELL + CELL / 2;
      const cy = offsetY + CELL / 2;
      target.fillStyle = palette.turtleShell;
      target.beginPath();
      target.arc(cx, cy, CELL / 2 - 5, 0, Math.PI * 2);
      target.fill();
      target.strokeStyle = palette.turtleShellEdge;
      target.lineWidth = 2;
      target.beginPath();
      target.arc(cx, cy, CELL / 2 - 9, 0, Math.PI * 2);
      target.stroke();
      target.fillStyle = palette.turtleHead;
      target.fillRect(cx - 3, cy - CELL / 2 + 3, 6, 5);
    }
  }
  /** Crea un canvas offscreen `width*CELL × CELL` listo para pintar un sprite dentro. */
  function makeSpriteCanvas(width: number): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const sprite = document.createElement("canvas");
    sprite.width = width * CELL;
    sprite.height = CELL;
    return {
      canvas: sprite,
      ctx: sprite.getContext("2d") as CanvasRenderingContext2D,
    };
  }
  /**
   * Devuelve el sprite cacheado para esta combinación, generándolo con `paint*` la primera
   * vez. Como `paint*` dibujan relativo a `(offsetX, offsetY)`, aquí llamamos con `(0, 0)`.
   */
  function getSprite(
    key: string,
    width: number,
    paint: (
      target: CanvasRenderingContext2D,
      offsetX: number,
      offsetY: number,
    ) => void,
  ): HTMLCanvasElement {
    const cached = spriteCache.get(key);
    if (cached) return cached;
    const { canvas: sprite, ctx: spriteCtx } = makeSpriteCanvas(width);
    paint(spriteCtx, 0, 0);
    spriteCache.set(key, sprite);
    return sprite;
  }
  function drawLanes(): void {
    for (const lane of lanes) {
      const dir = lane.dir;
      for (const entity of lane.entities) {
        const x = px(entity.col);
        const y = py(lane.row);
        let sprite: HTMLCanvasElement;
        if (entity.kind === "car") {
          const tint = (entity.tint ?? 0) % 3;
          sprite = getSprite(
            `car:${entity.width}:${tint}:${dir}`,
            entity.width,
            (c, ox, oy) => paintCar(c, ox, oy, entity.width, tint, dir),
          );
        } else if (entity.kind === "truck") {
          sprite = getSprite(
            `truck:${entity.width}:${dir}`,
            entity.width,
            (c, ox, oy) => paintTruck(c, ox, oy, entity.width, dir),
          );
        } else if (entity.kind === "log") {
          sprite = getSprite(`log:${entity.width}`, entity.width, (c, ox, oy) =>
            paintLog(c, ox, oy, entity.width),
          );
        } else {
          sprite = getSprite(
            `turtle:${entity.width}`,
            entity.width,
            (c, ox, oy) => paintTurtles(c, ox, oy, entity.width),
          );
        }
        ctx.drawImage(sprite, x, y);
      }
    }
  }
  function drawFrog(): void {
    const t = frog.animating ? Math.min(frog.animT / JUMP_MS, 1) : 1;
    const col = frog.animating
      ? frog.fromCol + (frog.targetCol - frog.fromCol) * t
      : frog.col;
    const row = frog.animating
      ? frog.fromRow + (frog.targetRow - frog.fromRow) * t
      : frog.row;
    const cx = px(col) + CELL / 2;
    const cy = py(row) + CELL / 2;
    // El salto se lee por el estirón de las patas, no por un cambio de tamaño.
    const stretch = frog.animating ? Math.sin(t * Math.PI) : 0;
    ctx.save();
    ctx.translate(cx, cy);
    if (frog.facing === "down") ctx.rotate(Math.PI);
    else if (frog.facing === "left") ctx.rotate(-Math.PI / 2);
    else if (frog.facing === "right") ctx.rotate(Math.PI / 2);
    ctx.fillStyle = palette.frogLeg;
    const legOut = 9 + stretch * 5;
    ctx.fillRect(-legOut - 3, -2, 6, 5);
    ctx.fillRect(legOut - 3, -2, 6, 5);
    ctx.fillRect(-9, legOut - 4, 5, 6);
    ctx.fillRect(4, legOut - 4, 5, 6);
    ctx.fillStyle = palette.frogBody;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.frogBelly;
    ctx.beginPath();
    ctx.ellipse(0, 3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.frogEye;
    ctx.beginPath();
    ctx.arc(-6, -7, 4, 0, Math.PI * 2);
    ctx.arc(6, -7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.frogPupil;
    ctx.beginPath();
    ctx.arc(-6, -8, 2, 0, Math.PI * 2);
    ctx.arc(6, -8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  /**
   * Único HUD que pinta el canvas: la barra de tiempo de la ronda.
   * Score, vidas y nivel son cosa del HUD de la plataforma.
   */
  function drawTimeBar(): void {
    const total = roundMsFor(level);
    const ratio = Math.max(0, Math.min(1, roundMs / total));
    ctx.fillStyle = palette.timeTrack;
    ctx.fillRect(0, 0, CANVAS_W, TIME_BAR_H);
    ctx.fillStyle =
      ratio > 0.5
        ? palette.timeHigh
        : ratio > 0.25
          ? palette.timeMid
          : palette.timeLow;
    ctx.fillRect(0, 0, CANVAS_W * ratio, TIME_BAR_H);
  }
  function draw(): void {
    ctx.drawImage(bgCanvas, 0, 0);
    drawLanes();
    drawGoalsFilled();
    drawFrog();
    drawTimeBar();
  }
  // ------------------------------------------------------------------- loop
  function frame(ts: number): void {
    const dtMs = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT);
    lastTime = ts;
    update(dtMs);
    draw();
    if (running) rafId = requestAnimationFrame(frame);
  }
  function startLoop(): void {
    if (running || destroyed || state === "gameover") return;
    running = true;
    lastTime = null;
    rafId = requestAnimationFrame(frame);
  }
  function stopLoop(): void {
    running = false;
    cancelAnimationFrame(rafId);
  }
  // ------------------------------------------------------------------ input
  function pause(): void {
    if (destroyed || paused || state === "gameover") return;
    paused = true;
    pendingDir = null;
    stopLoop();
  }
  function resume(): void {
    if (destroyed || !paused) return;
    paused = false;
    startLoop();
  }
  function togglePause(): void {
    if (paused) {
      resume();
      emitPaused(false);
    } else {
      pause();
      emitPaused(true);
    }
  }
  function onAutoPause(): void {
    if (destroyed || paused || state === "gameover") return;
    pause();
    emitPaused(true);
  }
  function onVisibility(): void {
    if (document.hidden) onAutoPause();
  }
  function onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (destroyed || state === "gameover") return;
    if (isInteractive(e.target)) return;
    if (PAUSE_KEYS.has(e.code)) {
      if (!e.repeat) togglePause();
      return;
    }
    const dir = MOVE_KEYS[e.code];
    if (!dir) return;
    e.preventDefault();
    if (paused) return;
    pendingDir = dir;
  }
  /** El gamepad táctil es por flanco: solo la pulsación encola un salto. */
  function setInput(action: string, pressed: boolean): void {
    if (!pressed) return;
    if (destroyed || paused || state === "gameover") return;
    if (
      action === "up" ||
      action === "down" ||
      action === "left" ||
      action === "right"
    ) {
      pendingDir = action;
    }
  }
  function restart(): void {
    if (destroyed) return;
    stopLoop();
    initGame();
    paused = false;
    draw();
    startLoop();
  }
  function end(): void {
    if (destroyed || state === "gameover") return;
    gameOver();
    paused = false;
    draw();
  }
  function setPalette(next: FroggerPalette): void {
    palette = next;
    spriteCache.clear();
    rebuildBackground();
    draw();
  }
  function destroy(): void {
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
  rebuildBackground();
  initGame();
  draw();
  startLoop();
  return { pause, resume, restart, end, destroy, setPalette, setInput };
}
/** Columna de salida, expuesta para los tests manuales desde consola. */
export const FROGGER_START_COL = START_COL;
/** Ancho del tablero en celdas, por si el canvas necesita escalarse. */
export const FROGGER_COLS = COLS;
