export type BlockColor =
  "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";
export type LevelBlock = { col: number; row: number; color: BlockColor };
export type Level = { speed: number; blocks: LevelBlock[] };
const ROW_COLORS_1: BlockColor[] = [
  "red",
  "yellow",
  "cyan",
  "magenta",
  "hotpink",
  "green",
];
const ROW_COLORS_2: BlockColor[] = [
  "gray",
  "cyan",
  "hotpink",
  "yellow",
  "magenta",
  "green",
];
const ROW_COLORS_4: BlockColor[] = [
  "cyan",
  "magenta",
  "green",
  "yellow",
  "hotpink",
  "red",
];
/** Nivel 1: rejilla completa de 6 × 10. */
function buildLevel1(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      blocks.push({ col, row, color: ROW_COLORS_1[row] });
  return blocks;
}
/** Nivel 2: pirámide invertida. */
function buildLevel2(): LevelBlock[] {
  const start = [4, 3, 2, 1, 0, 0];
  const end = [5, 6, 7, 8, 9, 9];
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = start[row]; col <= end[row]; col++)
      blocks.push({ col, row, color: ROW_COLORS_2[row] });
  return blocks;
}
/** Nivel 3: tablero de ajedrez. */
function buildLevel3(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        blocks.push({ col, row, color: row < 3 ? "yellow" : "magenta" });
  return blocks;
}
/** Nivel 4: rejilla con huecos. */
function buildLevel4(): LevelBlock[] {
  const gaps = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps[row].includes(col))
        blocks.push({ col, row, color: ROW_COLORS_4[row] });
  return blocks;
}
/** Nivel 5: marco con cruz. */
function buildLevel5(): LevelBlock[] {
  const blocks: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        blocks.push({
          col,
          row,
          color: isCross && !isFrame ? "hotpink" : "cyan",
        });
    }
  return blocks;
}
/** Los 5 niveles del original; `speed` multiplica la velocidad base de la bola. */
export const LEVELS: Level[] = [
  { speed: 1.0, blocks: buildLevel1() },
  { speed: 1.1, blocks: buildLevel2() },
  { speed: 1.21, blocks: buildLevel3() },
  { speed: 1.33, blocks: buildLevel4() },
  { speed: 1.46, blocks: buildLevel5() },
];
