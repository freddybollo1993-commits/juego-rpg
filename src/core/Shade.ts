// Shade.ts - Oscurecido de sprites por niebla de guerra, pixel exacto y sin costuras.
//
// En vez de dibujar un poligono oscuro encima de cada casilla (sus bordes suavizados dejan
// lineas claras entre casillas vecinas), se generan UNA VEZ copias oscurecidas de cada atlas
// y se dibuja la copia que corresponde al estado de la casilla.

export type ShadeLevel = 0 | 1 | 2; // 0 = visible, 1 = explorada (recordada), 2 = sin explorar

/** Cuanto se oscurece cada nivel (0 = nada, 1 = negro total) */
export const SHADE_ALPHA: Record<ShadeLevel, number> = { 0: 0, 1: 0.5, 2: 0.8 };
export const SHADE_RGB = '5, 7, 12';

/** visibility de IsoTile (0 sin explorar, 1 explorada, 2 visible) -> nivel de oscurecido */
export function shadeForVisibility(visibility: number): ShadeLevel {
  return visibility >= 2 ? 0 : visibility === 1 ? 1 : 2;
}

/** [original, explorada, sin explorar] */
export function buildShadedSheets(img: HTMLImageElement): CanvasImageSource[] {
  const sheets: CanvasImageSource[] = [img];
  for (const level of [1, 2] as ShadeLevel[]) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-atop'; // solo pinta donde ya hay pixeles opacos
    ctx.fillStyle = `rgba(${SHADE_RGB}, ${SHADE_ALPHA[level]})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    sheets.push(canvas);
  }
  return sheets;
}
