import { CELL, FRUIT_PADDING } from "./constants";
export type SpriteRect = { sx: number; sy: number; sw: number; sh: number };
/** Hoja de 3790×442; solo se usa la fila pixel-art (y = 136, alto 160). */
export const FRUITS_SRC = "/games/snake/fruits.png";
const SPRITE_Y = 136;
const SPRITE_H = 160;
function fruit(sx: number, sw: number): SpriteRect {
  return { sx, sy: SPRITE_Y, sw, sh: SPRITE_H };
}
/** Coordenadas tomadas de `refereences/source-assets/snake-assets/sprites.js`. */
export const FRUIT_SPRITES = {
  banana: fruit(34, 110),
  orange: fruit(186, 150),
  grape: fruit(378, 110),
  garlic: fruit(540, 130),
  eggplant: fruit(712, 130),
  strawberry: fruit(894, 110),
  cherry: fruit(1066, 110),
  carrot: fruit(1228, 130),
  mushroom: fruit(1400, 130),
  broccoli: fruit(1582, 110),
  watermelon: fruit(1734, 150),
  pepper: fruit(1906, 150),
  kiwi: fruit(2068, 170),
  lemon: fruit(2250, 140),
  peach: fruit(2432, 130),
  peanut: fruit(2604, 130),
  apple: fruit(2786, 110),
  tomato: fruit(2948, 130),
  berries: fruit(3110, 150),
  grapes2: fruit(3302, 110),
  pineapple: fruit(3454, 150),
  melon: fruit(3637, 130),
} satisfies Record<string, SpriteRect>;
export type FruitKind = keyof typeof FRUIT_SPRITES;
export const FRUIT_KINDS = Object.keys(FRUIT_SPRITES) as FruitKind[];
/** Carga la imagen de las frutas. Rechaza si no se puede cargar. */
export function loadFruits(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar las frutas"));
    img.src = FRUITS_SRC;
  });
}
/** Dibuja la fruta dentro de la celda (col, row), centrada, sin suavizado y conservando la proporción. */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLImageElement,
  kind: FruitKind,
  col: number,
  row: number,
) {
  const { sx, sy, sw, sh } = FRUIT_SPRITES[kind];
  const box = CELL - FRUIT_PADDING * 2;
  const scale = Math.min(box / sw, box / sh);
  const w = sw * scale;
  const h = sh * scale;
  const x = col * CELL + (CELL - w) / 2;
  const y = row * CELL + (CELL - h) / 2;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, sx, sy, sw, sh, x, y, w, h);
}
