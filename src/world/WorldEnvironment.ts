// Entorno y Mundo 2.5D con Terreno Modular, Props con Oclusión y Físicas de Colisión 2:1
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from '../entities/Hero';
import { TerrainTileGenerator } from '../graphics/TerrainTile';

export interface PropInstance {
  type: 'TREE' | 'ROCK' | 'MONOLITH';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  // Footprint Collision (pixel-25d-collision-physics-specialist)
  colRadiusX: number;
  colRadiusY: number;
  alpha: number;
  targetAlpha: number;
  phase: number;
  stiffness: number;
}

export class WorldEnvironment {
  public static readonly TILE_W = 64;
  public static readonly TILE_H = 32;

  public mapRadius: number = 11;
  public props: PropInstance[] = [];
  public windTime: number = 0;

  // Fallbacks de bloques horneados por procedural-pixel-25d-architect
  private fallbackGrassCanvas: HTMLCanvasElement;
  private fallbackStoneCanvas: HTMLCanvasElement;

  constructor() {
    this.fallbackGrassCanvas = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.GRASS_PALETTE);
    this.fallbackStoneCanvas = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.STONE_PALETTE);
    this.setupProps();
  }

  private setupProps(): void {
    // 1. Landmark Monumental: Monolito Rúnico Central
    this.props.push({
      type: 'MONOLITH',
      x: 0,
      y: 0,
      z: 0,
      width: 140,
      height: 120,
      anchorX: 0.5,
      anchorY: 0.88,
      colRadiusX: 42,
      colRadiusY: 21, // Ratio 2:1 estricto
      alpha: 1.0,
      targetAlpha: 1.0,
      phase: 0,
      stiffness: 0
    });

    // 2. Árboles Ancestrales con Footprint sólido en el tronco
    const treePositions = [
      { x: -180, y: -90 },
      { x: 190, y: -80 },
      { x: -160, y: 120 },
      { x: 210, y: 110 },
      { x: -260, y: 0 },
      { x: 260, y: 10 },
      { x: 0, y: -180 },
      { x: -90, y: 200 },
      { x: 110, y: 210 }
    ];

    for (let i = 0; i < treePositions.length; i++) {
      this.props.push({
        type: 'TREE',
        x: treePositions[i].x,
        y: treePositions[i].y,
        z: 0,
        width: 130,
        height: 150,
        anchorX: 0.5,
        anchorY: 0.92,
        colRadiusX: 18,
        colRadiusY: 9, // Elipse en la base del tronco
        alpha: 1.0,
        targetAlpha: 1.0,
        phase: i * 0.8,
        stiffness: 0.04
      });
    }

    // 3. Rocas de Musgo
    const rockPositions = [
      { x: -90, y: -60 },
      { x: 110, y: -50 },
      { x: -100, y: 90 },
      { x: 90, y: 100 },
      { x: -220, y: -130 },
      { x: 220, y: -120 }
    ];

    for (let i = 0; i < rockPositions.length; i++) {
      this.props.push({
        type: 'ROCK',
        x: rockPositions[i].x,
        y: rockPositions[i].y,
        z: 0,
        width: 95,
        height: 76,
        anchorX: 0.5,
        anchorY: 0.85,
        colRadiusX: 24,
        colRadiusY: 12,
        alpha: 1.0,
        targetAlpha: 1.0,
        phase: 0,
        stiffness: 0
      });
    }
  }

  // Resolución de colisiones físicas contra props sólidos (pixel-25d-collision-physics-specialist)
  public resolveSolidCollisions(entity: { x: number; y: number; colRadiusX: number; colRadiusY: number }): void {
    for (const prop of this.props) {
      const dx = entity.x - prop.x;
      const dy = entity.y - prop.y;

      // Transformación al espacio normalizado 2:1
      const nx = dx / (prop.colRadiusX + entity.colRadiusX);
      const ny = (dy * 2) / (prop.colRadiusX + entity.colRadiusX); // Normalizar eje Y 2:1
      const distSq = nx * nx + ny * ny;

      if (distSq < 1.0 && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = 1.0 - dist;
        const pushX = (nx / dist) * overlap * (prop.colRadiusX + entity.colRadiusX);
        const pushY = (ny / dist) * overlap * (prop.colRadiusY + entity.colRadiusY);

        entity.x += pushX;
        entity.y += pushY;
      }
    }
  }

  public update(dt: number, hero: Hero): void {
    this.windTime += dt * 2.0;

    // Resolver colisión del héroe con los props sólidos
    this.resolveSolidCollisions({
      x: hero.x,
      y: hero.y,
      colRadiusX: 12,
      colRadiusY: 6
    });

    // Oclusión suave progresiva (alpha = 0.42)
    for (const prop of this.props) {
      const isBehind = hero.y < prop.y && Math.abs(hero.x - prop.x) < prop.width * 0.45;
      const isCloseY = prop.y - hero.y < prop.height * 0.75 && prop.y - hero.y > -10;

      if (isBehind && isCloseY) {
        prop.targetAlpha = 0.42;
      } else {
        prop.targetAlpha = 1.0;
      }

      prop.alpha += (prop.targetAlpha - prop.alpha) * 0.15;
    }
  }

  public renderTerrain(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, viewW: number, viewH: number): void {
    const tileGrass = AssetLoader.getImage('TILE_GRASS');
    const tileCobble = AssetLoader.getImage('TILE_COBBLE');
    const tileDirt = AssetLoader.getImage('TILE_DIRT');

    const halfW = WorldEnvironment.TILE_W * 0.5; // 32
    const halfH = WorldEnvironment.TILE_H * 0.5; // 16

    for (let gy = -this.mapRadius; gy <= this.mapRadius; gy++) {
      for (let gx = -this.mapRadius; gx <= this.mapRadius; gx++) {
        const isoX = (gx - gy) * halfW;
        const isoY = (gx + gy) * halfH;

        const screenX = Math.round(isoX - camX);
        const screenY = Math.round(isoY - camY);

        // Frustum Culling
        const margin = 100;
        if (screenX < -viewW - margin || screenX > viewW + margin || screenY < -viewH - margin || screenY > viewH + margin) {
          continue;
        }

        const dist = Math.max(Math.abs(gx), Math.abs(gy));
        let tileImg: HTMLImageElement | HTMLCanvasElement | undefined = tileGrass;

        if (dist <= 2) {
          tileImg = tileCobble || this.fallbackStoneCanvas;
        } else if (dist <= 4 && (gx === 0 || gy === 0 || Math.abs(gx) === Math.abs(gy))) {
          tileImg = tileDirt || this.fallbackGrassCanvas;
        } else {
          tileImg = tileGrass || this.fallbackGrassCanvas;
        }

        // Renderizado blindado con fallback
        if (tileImg) {
          const drawW = WorldEnvironment.TILE_W;
          const drawH = WorldEnvironment.TILE_W;
          ctx.drawImage(tileImg, screenX - halfW, screenY - halfH, drawW, drawH);
        } else {
          ctx.drawImage(this.fallbackGrassCanvas, screenX - halfW, screenY - halfH, WorldEnvironment.TILE_W, 48);
        }
      }
    }
  }

  public renderProp(ctx: CanvasRenderingContext2D, prop: PropInstance, camX: number, camY: number): void {
    const screenX = Math.round(prop.x - camX);
    const screenY = Math.round(prop.y - camY);

    // 1. Sombra Elíptica 2:1 Desacoplada
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    const shadowRx = prop.width * 0.38;
    const shadowRy = shadowRx * 0.5;
    ctx.ellipse(screenX, screenY - 2, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Renderizar Prop
    let imgKey = 'TREE';
    if (prop.type === 'ROCK') imgKey = 'ROCK';
    if (prop.type === 'MONOLITH') imgKey = 'MONOLITH';

    const img = AssetLoader.getImage(imgKey);

    ctx.save();
    ctx.globalAlpha = prop.alpha;
    ctx.translate(screenX, screenY);

    if (prop.stiffness > 0) {
      const windSkew = Math.sin(this.windTime + prop.phase) * prop.stiffness;
      ctx.transform(1, 0, windSkew, 1, 0, 0);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(
        img,
        -prop.width * prop.anchorX,
        -prop.height * prop.anchorY,
        prop.width,
        prop.height
      );
    } else {
      // Fallback estilizado si la imagen no está lista
      ctx.fillStyle = prop.type === 'TREE' ? '#3f7c22' : '#657489';
      ctx.beginPath();
      ctx.arc(0, -prop.height * 0.45, prop.width * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
