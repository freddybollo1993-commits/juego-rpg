// Entorno y Mundo 2.5D: Solo Suelo Limpio (Sin Props ni Obstáculos)
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from '../entities/Hero';
import { TerrainTileGenerator } from '../graphics/TerrainTile';

export class WorldEnvironment {
  public static readonly TILE_W = 64;
  public static readonly TILE_H = 32;

  public mapRadius: number = 14; // Área de suelo amplia para pruebas de movimiento

  private fallbackGrassCanvas: HTMLCanvasElement;
  private fallbackStoneCanvas: HTMLCanvasElement;

  constructor() {
    this.fallbackGrassCanvas = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.GRASS_PALETTE);
    this.fallbackStoneCanvas = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.STONE_PALETTE);
  }

  public update(_dt: number, _hero: Hero): void {
    // Escena limpia: no hay props que actualizar
  }

  public renderTerrain(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, viewW: number, viewH: number): void {
    const tileSeamless = AssetLoader.getImage('TILE_GRASS_SEAMLESS');
    const tileCobble = AssetLoader.getImage('TILE_COBBLE');
    const tileDirt = AssetLoader.getImage('TILE_DIRT');

    const halfW = WorldEnvironment.TILE_W * 0.5;
    const halfH = WorldEnvironment.TILE_H * 0.5;

    for (let gy = -this.mapRadius; gy <= this.mapRadius; gy++) {
      for (let gx = -this.mapRadius; gx <= this.mapRadius; gx++) {
        const isoX = (gx - gy) * halfW;
        const isoY = (gx + gy) * halfH;

        const screenX = Math.round(isoX - camX);
        const screenY = Math.round(isoY - camY);

        const margin = 100;
        if (screenX < -viewW - margin || screenX > viewW + margin || screenY < -viewH - margin || screenY > viewH + margin) {
          continue;
        }

        const dist = Math.max(Math.abs(gx), Math.abs(gy));
        let tileImg: HTMLImageElement | HTMLCanvasElement | undefined = tileSeamless;

        // Pequeño círculo central decorativo para orientarse
        if (dist <= 1) {
          tileImg = tileCobble || this.fallbackStoneCanvas;
        } else if (dist === 2 && (gx === 0 || gy === 0)) {
          tileImg = tileDirt || this.fallbackGrassCanvas;
        } else {
          tileImg = tileSeamless || this.fallbackGrassCanvas;
        }

        if (tileImg) {
          const drawW = WorldEnvironment.TILE_W;
          const drawH = dist <= 2 ? 40 : WorldEnvironment.TILE_H;
          const offsetY = dist <= 2 ? 8 : 0;
          ctx.drawImage(tileImg, screenX - halfW, screenY - offsetY, drawW, drawH);
        }
      }
    }
  }
}
