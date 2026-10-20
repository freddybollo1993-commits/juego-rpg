// Generador de Bloques de Terreno Isométrico 2:1 según las reglas maestras de procedural-pixel-25d-architect
export interface TileColors {
  topLight: string;
  topBase: string;
  topDark: string;
  leftFace: string;
  leftShadow: string;
  rightFace: string;
  rightShadow: string;
  bevelHighlight: string;
}

export class TerrainTileGenerator {
  public static readonly TILE_W = 64;
  public static readonly TILE_H = 32;
  public static readonly BLOCK_DEPTH = 16; // Altura del bloque frontal

  // Paleta estilo Bosque Esmeralda / Tierra Fértil con regla tricolor a 45° y hue-shift
  public static readonly GRASS_PALETTE: TileColors = {
    topLight: '#7ecc49',
    topBase: '#58a032',
    topDark: '#3f7c22',
    leftFace: '#5c4e3b',
    leftShadow: '#42372a',
    rightFace: '#2d2538', // Hue-shift hacia púrpura/frío
    rightShadow: '#1c1626',
    bevelHighlight: '#9ceb5e'
  };

  public static readonly STONE_PALETTE: TileColors = {
    topLight: '#8a9bb0',
    topBase: '#657489',
    topDark: '#4a5668',
    leftFace: '#4e5663',
    leftShadow: '#373d47',
    rightFace: '#2b2c3d', // Hue-shift púrpura/índigo
    rightShadow: '#1a1a28',
    bevelHighlight: '#b3c4dc'
  };

  public static createBlockCanvas(palette: TileColors = this.GRASS_PALETTE): HTMLCanvasElement {
    const W = this.TILE_W;
    const H = this.TILE_H;
    const D = this.BLOCK_DEPTH;
    const totalH = H + D;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = totalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.imageSmoothingEnabled = false;

    const halfW = W / 2; // 32
    const halfH = H / 2; // 16

    // 1. CARA FRONTAL-IZQUIERDA (75-80% brillo, tono medio hacia frío)
    ctx.fillStyle = palette.leftFace;
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(halfW, H);
    ctx.lineTo(halfW, H + D);
    ctx.lineTo(0, halfH + D);
    ctx.closePath();
    ctx.fill();

    // Sombra de transición en la base izquierda
    ctx.fillStyle = palette.leftShadow;
    ctx.fillRect(0, halfH + D - 3, halfW, 3);

    // 2. CARA FRONTAL-DERECHA (50-60% brillo con hue-shift hacia púrpura/azul)
    ctx.fillStyle = palette.rightFace;
    ctx.beginPath();
    ctx.moveTo(halfW, H);
    ctx.lineTo(W, halfH);
    ctx.lineTo(W, halfH + D);
    ctx.lineTo(halfW, H + D);
    ctx.closePath();
    ctx.fill();

    // Sombra profunda inferior derecha
    ctx.fillStyle = palette.rightShadow;
    ctx.beginPath();
    ctx.moveTo(halfW, H + D - 4);
    ctx.lineTo(W, halfH + D - 4);
    ctx.lineTo(W, halfH + D);
    ctx.lineTo(halfW, H + D);
    ctx.closePath();
    ctx.fill();

    // 3. CARA SUPERIOR (Rombo Isométrico 2:1 a 100% de brillo)
    ctx.fillStyle = palette.topBase;
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(W, halfH);
    ctx.lineTo(halfW, H);
    ctx.lineTo(0, halfH);
    ctx.closePath();
    ctx.fill();

    // Textura y clusters de pixel art en la superficie superior
    // Resaltes sutiles según luz proveniente de arriba-izquierda
    ctx.fillStyle = palette.topLight;
    // Puntos de luz en cara superior
    const lightPixels = [
      [halfW - 8, 6], [halfW - 4, 8], [halfW - 12, 10], [halfW, 4],
      [halfW - 16, 12], [halfW - 6, 14], [halfW + 4, 10], [halfW - 2, 18],
      [14, 14], [22, 18], [28, 12]
    ];
    for (const [px, py] of lightPixels) {
      ctx.fillRect(px, py, 2, 2);
    }

    // Tonos medios/bajos de césped
    ctx.fillStyle = palette.topDark;
    const darkPixels = [
      [halfW + 10, 14], [halfW + 16, 18], [halfW + 6, 22], [halfW + 12, 24],
      [halfW + 2, 26], [halfW - 10, 24], [44, 20], [50, 22]
    ];
    for (const [px, py] of darkPixels) {
      ctx.fillRect(px, py, 2, 2);
    }

    // 4. BISEL ESPECULAR DE 1PX en las aristas frontales de cambio de plano
    // (Prohibido usar outlines negros en las aristas superiores para tiling perfecto)
    ctx.fillStyle = palette.bevelHighlight;
    // Línea de bisel en la cresta frontal-izquierda
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(halfW, H);
    ctx.strokeStyle = palette.bevelHighlight;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Pequeño realce en la arista vertical frontal central
    ctx.fillStyle = palette.bevelHighlight;
    ctx.fillRect(halfW - 1, H, 1, D);

    return canvas;
  }
}
