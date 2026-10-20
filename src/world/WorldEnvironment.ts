// Entorno y Mundo 2.5D conforme a procedural-pixel-25d-architect y pixel-25d-ambient-asset-specialist
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from '../entities/Hero';

export interface PropInstance {
  type: 'TREE' | 'ROCK' | 'MONOLITH';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  alpha: number;
  targetAlpha: number;
  phase: number;
  stiffness: number;
}

export class WorldEnvironment {
  public static readonly TILE_W = 64;
  public static readonly TILE_H = 32;

  public mapRadius: number = 12; // 25x25 tiles de extensión
  public props: PropInstance[] = [];
  public windTime: number = 0;

  constructor() {
    this.setupProps();
  }

  private setupProps(): void {
    // 1. Tier 1 Landmark: Monolito Rúnico en el centro exacto
    this.props.push({
      type: 'MONOLITH',
      x: 0,
      y: 0,
      z: 0,
      width: 140,
      height: 120,
      anchorX: 0.5,
      anchorY: 0.88,
      alpha: 1.0,
      targetAlpha: 1.0,
      phase: 0,
      stiffness: 0
    });

    // 2. Tier 2: Árboles Ancestrales distribuidos en los márgenes (con Poisson/radio de exclusión)
    const treePositions = [
      { x: -180, y: -90 },
      { x: 190, y: -80 },
      { x: -160, y: 120 },
      { x: 210, y: 110 },
      { x: -280, y: 0 },
      { x: 280, y: 10 },
      { x: 0, y: -190 },
      { x: -80, y: 220 },
      { x: 120, y: 230 }
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
        alpha: 1.0,
        targetAlpha: 1.0,
        phase: i * 0.8,
        stiffness: 0.045
      });
    }

    // 3. Tier 2/3: Rocas de Musgo
    const rockPositions = [
      { x: -90, y: -60 },
      { x: 110, y: -50 },
      { x: -100, y: 90 },
      { x: 90, y: 100 },
      { x: -220, y: -140 },
      { x: 230, y: -130 }
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
        alpha: 1.0,
        targetAlpha: 1.0,
        phase: 0,
        stiffness: 0
      });
    }
  }

  public update(dt: number, hero: Hero): void {
    this.windTime += dt * 2.2;

    // Oclusión Inteligente Suave (pixel-25d-ambient-asset-specialist)
    // Si el jugador está detrás del prop y cerca de su tronco/base, el prop se vuelve translúcido
    for (const prop of this.props) {
      const isBehind = hero.y < prop.y && Math.abs(hero.x - prop.x) < prop.width * 0.42;
      const isCloseY = prop.y - hero.y < prop.height * 0.7 && prop.y - hero.y > -10;

      if (isBehind && isCloseY) {
        prop.targetAlpha = 0.42; // Oclusión suave activa
      } else {
        prop.targetAlpha = 1.0;
      }

      // Interpolación suave del canal alfa
      prop.alpha += (prop.targetAlpha - prop.alpha) * 0.15;
    }
  }

  public renderTerrain(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, viewW: number, viewH: number): void {
    const tileGrass = AssetLoader.getImage('TILE_GRASS');
    const tileCobble = AssetLoader.getImage('TILE_COBBLE');
    const tileDirt = AssetLoader.getImage('TILE_DIRT');

    const halfW = WorldEnvironment.TILE_W * 0.5; // 32
    const halfH = WorldEnvironment.TILE_H * 0.5; // 16

    // Dibujamos las losetas en orden isométrico (Z-Sort)
    for (let gy = -this.mapRadius; gy <= this.mapRadius; gy++) {
      for (let gx = -this.mapRadius; gx <= this.mapRadius; gx++) {
        const isoX = (gx - gy) * halfW;
        const isoY = (gx + gy) * halfH;

        const screenX = Math.round(isoX - camX);
        const screenY = Math.round(isoY - camY);

        // Frustum Culling
        const margin = 120;
        if (screenX < -viewW - margin || screenX > viewW + margin || screenY < -viewH - margin || screenY > viewH + margin) {
          continue;
        }

        // Selección de textura según distancia al centro (Plaza de piedra rúnica -> Senda -> Césped)
        const dist = Math.max(Math.abs(gx), Math.abs(gy));
        let tileImg = tileGrass;
        if (dist <= 2) {
          tileImg = tileCobble;
        } else if (dist <= 4 && (gx === 0 || gy === 0 || Math.abs(gx) === Math.abs(gy))) {
          tileImg = tileDirt;
        }

        if (tileImg) {
          // Bloques isométricos de 64x64/64x32 proyectados
          const drawW = WorldEnvironment.TILE_W;
          const drawH = WorldEnvironment.TILE_W; // Bloque con altura de acantilado
          ctx.drawImage(
            tileImg,
            screenX - halfW,
            screenY - halfH,
            drawW,
            drawH
          );
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
    const shadowRy = shadowRx * 0.5; // Relación 2:1 exacta
    ctx.ellipse(screenX, screenY - 2, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Renderizar Prop con Viento por Vértices (skew.x) y Oclusión
    let imgKey = 'TREE';
    if (prop.type === 'ROCK') imgKey = 'ROCK';
    if (prop.type === 'MONOLITH') imgKey = 'MONOLITH';

    const img = AssetLoader.getImage(imgKey);
    if (!img) return;

    ctx.save();
    ctx.globalAlpha = prop.alpha;
    ctx.translate(screenX, screenY);

    // Animación de Viento por Vértices (pixel-25d-ambient-asset-specialist)
    if (prop.stiffness > 0) {
      const windSkew = Math.sin(this.windTime + prop.phase) * prop.stiffness;
      ctx.transform(1, 0, windSkew, 1, 0, 0);
    }

    ctx.drawImage(
      img,
      -prop.width * prop.anchorX,
      -prop.height * prop.anchorY,
      prop.width,
      prop.height
    );

    ctx.restore();
  }
}
