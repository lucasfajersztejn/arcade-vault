import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  BLOCK_H,
  BLOCK_W,
  EXPLOSION_DURATION,
  EXPLOSION_FRAME_COUNT,
  H,
  PADDLE_BOUNCE_TOLERANCE,
  PADDLE_H,
  PADDLE_W,
  PADDLE_Y,
  W,
} from "./constants";
import type { BlockColor, Level } from "./levels";
import {
  BALL_SPRITE,
  BLOCK_SPRITES,
  EXPLOSION_FRAMES,
  PADDLE_SPRITE,
  drawSprite,
} from "./sprites";
export type Paddle = { x: number; y: number; w: number; h: number };
export type Ball = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
};
export type Block = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
};
export type Explosion = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  /** Milisegundos desde que explotó el bloque. */
  elapsed: number;
};
/** Pala centrada en el canvas. */
export function createPaddle(): Paddle {
  return { x: (W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
}
export function createBall(): Ball {
  return { x: 0, y: 0, w: BALL_SIZE, h: BALL_SIZE, vx: 0, vy: 0 };
}
/** Coloca la bola sobre la pala y le da la velocidad base del nivel. */
export function resetBall(ball: Ball, paddle: Paddle, speed: number) {
  ball.x = paddle.x + (paddle.w - ball.w) / 2;
  ball.y = paddle.y - ball.h;
  ball.vx = BASE_BALL_VX * speed;
  ball.vy = BASE_BALL_VY * speed;
}
/** Bloques de un nivel, colocados en la rejilla del original. */
export function createBlocks(level: Level): Block[] {
  return level.blocks.map((b) => ({
    x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
    y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
    w: BLOCK_W,
    h: BLOCK_H,
    color: b.color,
    alive: true,
  }));
}
export function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
/** Primer bloque vivo que toca la bola (uno por frame, como el original). */
export function findHitBlock(ball: Ball, blocks: Block[]): Block | undefined {
  return blocks.find((b) => b.alive && collideAABB(ball, b));
}
/** Rebote en paredes izquierda y derecha y en el techo. */
export function bounceWalls(ball: Ball) {
  if (ball.x <= 0) {
    ball.x = 0;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x + ball.w >= W) {
    ball.x = W - ball.w;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = Math.abs(ball.vy);
  }
}
/** Rebote en la pala: la bola siempre sube, sin efecto según el punto de impacto. */
export function bouncePaddle(ball: Ball, paddle: Paddle): boolean {
  if (
    ball.vy > 0 &&
    ball.x + ball.w > paddle.x &&
    ball.x < paddle.x + paddle.w &&
    ball.y + ball.h >= paddle.y &&
    ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_TOLERANCE
  ) {
    ball.y = paddle.y - ball.h;
    ball.vy = -Math.abs(ball.vy);
    return true;
  }
  return false;
}
export function isBallLost(ball: Ball): boolean {
  return ball.y > H;
}
/** Avanza las explosiones `dtMs` y descarta las terminadas. */
export function advanceExplosions(
  explosions: Explosion[],
  dtMs: number,
): Explosion[] {
  for (const e of explosions) e.elapsed += dtMs;
  return explosions.filter((e) => e.elapsed < EXPLOSION_DURATION);
}
export function drawBlocks(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  blocks: Block[],
) {
  for (const b of blocks)
    if (b.alive)
      drawSprite(ctx, sheet, BLOCK_SPRITES[b.color], b.x, b.y, b.w, b.h);
}
export function drawExplosions(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  explosions: Explosion[],
) {
  for (const e of explosions) {
    const frame = Math.min(
      Math.floor((e.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAME_COUNT),
      EXPLOSION_FRAME_COUNT - 1,
    );
    drawSprite(
      ctx,
      sheet,
      EXPLOSION_FRAMES[e.color][frame],
      e.x,
      e.y,
      e.w,
      e.h,
    );
  }
}
export function drawPaddle(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  paddle: Paddle,
) {
  drawSprite(ctx, sheet, PADDLE_SPRITE, paddle.x, paddle.y, paddle.w, paddle.h);
}
export function drawBall(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  ball: Ball,
) {
  drawSprite(ctx, sheet, BALL_SPRITE, ball.x, ball.y, ball.w, ball.h);
}
