import type { SpriteRect } from "./sprites";
/**
 * Cache de sprites tintados. Clave: "sx,sy,sw,sh|tint". El tinte se construye
 * perezosamente la primera vez que se pide: se dibuja el sprite original en
 * un canvas offscreen del tamaño nativo del recorte, se le aplica `multiply`
 * con el color objetivo (preserva luces/sombras del PNG) y se recorta al alfa
 * del sprite con `destination-in` (evita teñir los píxeles transparentes).
 *
 * Si el tinte es `null`, el llamador debe usar el sprite original (ruta
 * rápida = aspecto `clasico`, idéntico pixel a pixel al PNG).
 */
const cache = new Map<string, HTMLCanvasElement>();
function keyOf(rect: SpriteRect, tint: string): string {
  return `${rect.sx},${rect.sy},${rect.sw},${rect.sh}|${tint}`;
}
/**
 * Devuelve el canvas offscreen con el sprite tintado. Si `tint` es `null`,
 * devuelve `null` para que el llamador use el sprite original.
 */
export function getTintedSprite(
  sheet: HTMLImageElement,
  rect: SpriteRect,
  tint: string | null,
): HTMLCanvasElement | null {
  if (tint === null) return null;
  const key = keyOf(rect, tint);
  const cached = cache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = rect.sw;
  canvas.height = rect.sh;
  const cx = canvas.getContext("2d");
  if (!cx) return null;
  // 1) sprite original
  cx.drawImage(
    sheet,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    rect.sw,
    rect.sh,
  );
  // 2) multiply con el tinte: cambia el color conservando luces/sombras
  cx.globalCompositeOperation = "multiply";
  cx.fillStyle = tint;
  cx.fillRect(0, 0, rect.sw, rect.sh);
  // 3) recorta al alfa real del sprite (no teñir transparencias)
  cx.globalCompositeOperation = "destination-in";
  cx.drawImage(
    sheet,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    rect.sw,
    rect.sh,
  );
  cx.globalCompositeOperation = "source-over";
  cache.set(key, canvas);
  return canvas;
}
/** Vacía la cache. Lo invoca `setPalette` del motor al cambiar de skin. */
export function clearTintCache(): void {
  cache.clear();
}
