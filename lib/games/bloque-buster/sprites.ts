import { EXPLOSION_FRAME_COUNT } from "./constants";
import type { BlockColor } from "./levels";
export type SpriteRect = { sx: number; sy: number; sw: number; sh: number };
export const SPRITESHEET_SRC = "/games/bloque-buster/spritesheet-breakout.png";
/** La pala fuente mide 162×14; se dibuja escalada al tamaño lógico de la pala. */
export const PADDLE_SPRITE: SpriteRect = { sx: 32, sy: 112, sw: 162, sh: 14 };
export const BALL_SPRITE: SpriteRect = { sx: 32, sy: 32, sw: 16, sh: 16 };
export const BLOCK_SPRITES: Record<BlockColor, SpriteRect> = {
  gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
  red: { sx: 32, sy: 176, sw: 32, sh: 16 },
  yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
  cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
  magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
  hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
  green: { sx: 32, sy: 208, sw: 32, sh: 16 },
};
/** Fila (sy) de los frames de explosión; el gris reutiliza los del rojo, como el original. */
const EXPLOSION_ROWS: Record<BlockColor, number> = {
  red: 176,
  cyan: 192,
  green: 208,
  magenta: 224,
  yellow: 240,
  hotpink: 256,
  gray: 176,
};
function explosionFrames(color: BlockColor): SpriteRect[] {
  return Array.from({ length: EXPLOSION_FRAME_COUNT }, (_, i) => ({
    sx: 256 + i * 32,
    sy: EXPLOSION_ROWS[color],
    sw: 32,
    sh: 16,
  }));
}
export const EXPLOSION_FRAMES: Record<BlockColor, SpriteRect[]> = {
  red: explosionFrames("red"),
  cyan: explosionFrames("cyan"),
  green: explosionFrames("green"),
  magenta: explosionFrames("magenta"),
  yellow: explosionFrames("yellow"),
  hotpink: explosionFrames("hotpink"),
  gray: explosionFrames("gray"),
};
/** Carga la imagen del spritesheet. Rechaza si no se puede cargar. */
export function loadSpritesheet(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar el spritesheet"));
    img.src = SPRITESHEET_SRC;
  });
}
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  rect: SpriteRect,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(sheet, rect.sx, rect.sy, rect.sw, rect.sh, x, y, w, h);
}
