// Entorno y Mundo 2.5D con Masa Física Real para Obstáculos y Reactividad a Impactos
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from '../entities/Hero';
import { TerrainTileGenerator } from '../graphics/TerrainTile';

export interface PropParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  isLeaf?: boolean;
}

export interface PropInstance {
  id: number;
  type: 'TREE' | 'ROCK' | 'MONOLITH';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  anchorX: number;
  anchorY: number;
  // Footprint Collision Sólido (pixel-25d-collision-physics-specialist)
  colRadiusX: number;
  colRadiusY: number;
  // Oclusión
  alpha: number;
  targetAlpha: number;
  phase: number;
  stiffness: number;
  // Reactividad a Impactos
  shakeTimer: number;
  shakeIntensity: number;
  hitFlashTimer: number;
  runeGlowTimer: number;
}

export class WorldEnvironment {
  public static readonly TILE_W = 64;
  public static readonly TILE_H = 32;

  public mapRadius: number = 11;
  public props: PropInstance[] = [];
  public windTime: number = 0;

  private propParticles: PropParticle[] = [];
  private static readonly MAX_PROP_PARTICLES = 60;

  private fallbackGrassCanvas: HTMLCanvasElement;
  private fallbackStoneCanvas: HTMLCanvasElement;

  constructor() {
    this.fallbackGrassCanvas = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.GRASS_PALETTE);
    this.fallbackStoneCanvas = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.STONE_PALETTE);

    for (let i = 0; i < WorldEnvironment.MAX_PROP_PARTICLES; i++) {
      this.propParticles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: '#4ade80',
        size: 3,
        alpha: 0,
        life: 0,
        maxLife: 0.6
      });
    }

    this.setupProps();
  }

  private setupProps(): void {
    let idCounter = 1;

    // 1. Monolito Rúnico Central (Masa de Piedra Impenetrable)
    this.props.push({
      id: idCounter++,
      type: 'MONOLITH',
      x: 0,
      y: 0,
      z: 0,
      width: 140,
      height: 120,
      anchorX: 0.5,
      anchorY: 0.88,
      colRadiusX: 48,
      colRadiusY: 24, // Elipse masiva 2:1
      alpha: 1.0,
      targetAlpha: 1.0,
      phase: 0,
      stiffness: 0,
      shakeTimer: 0,
      shakeIntensity: 0,
      hitFlashTimer: 0,
      runeGlowTimer: 0
    });

    // 2. Árboles Ancestrales (Troncos con Masa Rígida)
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
        id: idCounter++,
        type: 'TREE',
        x: treePositions[i].x,
        y: treePositions[i].y,
        z: 0,
        width: 130,
        height: 150,
        anchorX: 0.5,
        anchorY: 0.92,
        colRadiusX: 24,
        colRadiusY: 12, // Masa sólida en la base del tronco
        alpha: 1.0,
        targetAlpha: 1.0,
        phase: i * 0.8,
        stiffness: 0.04,
        shakeTimer: 0,
        shakeIntensity: 0,
        hitFlashTimer: 0,
        runeGlowTimer: 0
      });
    }

    // 3. Rocas con Musgo (Masa Mineral Sólida)
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
        id: idCounter++,
        type: 'ROCK',
        x: rockPositions[i].x,
        y: rockPositions[i].y,
        z: 0,
        width: 95,
        height: 76,
        anchorX: 0.5,
        anchorY: 0.85,
        colRadiusX: 30,
        colRadiusY: 15, // Masa sólida en la roca
        alpha: 1.0,
        targetAlpha: 1.0,
        phase: 0,
        stiffness: 0,
        shakeTimer: 0,
        shakeIntensity: 0,
        hitFlashTimer: 0,
        runeGlowTimer: 0
      });
    }
  }

  // FÍSICA DE MASA RÍGIDA: Impide que cualquier entidad atraviese las estructuras sólidas
  public resolveSolidCollisions(entity: { x: number; y: number; colRadiusX: number; colRadiusY: number }): void {
    for (const prop of this.props) {
      const dx = entity.x - prop.x;
      const dy = entity.y - prop.y;

      const combinedRx = prop.colRadiusX + entity.colRadiusX;
      const combinedRy = prop.colRadiusY + entity.colRadiusY;

      // Distancia normalizada en espacio elíptico 2:1
      const nx = dx / combinedRx;
      const ny = dy / combinedRy;
      const distSq = nx * nx + ny * ny;

      // Si hay penetración física dentro de la masa del obstáculo
      if (distSq < 1.0 && distSq > 0.00001) {
        const dist = Math.sqrt(distSq);
        const overlap = 1.0 - dist;

        // Vector normal de expulsión hacia el exterior de la elipse
        const pushDirX = nx / dist;
        const pushDirY = ny / dist;

        // Desplazamiento rígido directo sobre la entidad
        entity.x += pushDirX * overlap * combinedRx;
        entity.y += pushDirY * overlap * combinedRy;
      }
    }
  }

  // Detección de Ataque y Reacción de Elementos del Entorno
  public checkAttackHit(hitX: number, hitY: number, hitRadius: number, hitDirX: number): boolean {
    let hitAny = false;

    for (const prop of this.props) {
      const dx = prop.x - hitX;
      const dy = prop.y - hitY;
      // Proyección isométrica 2:1
      const dist = Math.hypot(dx, dy * 2);

      if (dist < hitRadius + prop.colRadiusX) {
        hitAny = true;
        this.triggerPropImpact(prop, hitDirX);
      }
    }

    return hitAny;
  }

  private triggerPropImpact(prop: PropInstance, hitDirX: number): void {
    prop.shakeTimer = 0.32;
    prop.shakeIntensity = 7.0;
    prop.hitFlashTimer = 0.14;

    if (prop.type === 'TREE') {
      this.spawnPropParticles(prop.x, prop.y - prop.height * 0.5, 'LEAF', 10, hitDirX);
    } else if (prop.type === 'ROCK') {
      this.spawnPropParticles(prop.x, prop.y - prop.height * 0.35, 'SPARK', 8, hitDirX);
    } else if (prop.type === 'MONOLITH') {
      prop.runeGlowTimer = 0.65;
      this.spawnPropParticles(prop.x, prop.y - prop.height * 0.45, 'RUNE', 12, hitDirX);
    }
  }

  private spawnPropParticles(x: number, y: number, type: 'LEAF' | 'SPARK' | 'RUNE', count: number, hitDirX: number): void {
    let spawned = 0;
    for (const p of this.propParticles) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 20;
        p.y = y + (Math.random() - 0.5) * 20;
        p.isLeaf = type === 'LEAF';

        if (type === 'LEAF') {
          p.color = Math.random() < 0.5 ? '#65a30d' : '#84cc16';
          p.vx = hitDirX * 35 + (Math.random() - 0.5) * 60;
          p.vy = -45 + Math.random() * 20;
          p.size = 2.5 + Math.random() * 2;
          p.maxLife = 0.75 + Math.random() * 0.3;
        } else if (type === 'SPARK') {
          p.color = Math.random() < 0.5 ? '#fcd34d' : '#94a3b8';
          p.vx = hitDirX * 65 + (Math.random() - 0.5) * 90;
          p.vy = -65 + (Math.random() - 0.5) * 45;
          p.size = 2;
          p.maxLife = 0.38;
        } else {
          p.color = '#38bdf8';
          const angle = Math.random() * Math.PI * 2;
          const speed = 45 + Math.random() * 65;
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.size = 3;
          p.maxLife = 0.55;
        }

        p.life = p.maxLife;
        p.alpha = 1.0;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  public update(dt: number, hero: Hero): void {
    this.windTime += dt * 2.0;

    // Actualizar estados dinámicos de los props
    for (const prop of this.props) {
      if (prop.shakeTimer > 0) {
        prop.shakeTimer -= dt;
        prop.shakeIntensity *= 0.88;
      }

      if (prop.hitFlashTimer > 0) prop.hitFlashTimer -= dt;
      if (prop.runeGlowTimer > 0) prop.runeGlowTimer -= dt;

      // Oclusión suave cuando el héroe está detrás del tronco/base
      const isBehind = hero.y < prop.y && Math.abs(hero.x - prop.x) < prop.width * 0.45;
      const isCloseY = prop.y - hero.y < prop.height * 0.75 && prop.y - hero.y > -10;

      if (isBehind && isCloseY) {
        prop.targetAlpha = 0.42;
      } else {
        prop.targetAlpha = 1.0;
      }

      prop.alpha += (prop.targetAlpha - prop.alpha) * 0.15;
    }

    // Actualizar partículas
    for (const p of this.propParticles) {
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;

          if (p.isLeaf) {
            p.vy += 45 * dt;
            p.vx += Math.sin(p.life * 10) * 12 * dt;
          } else {
            p.vy += 90 * dt;
          }

          p.alpha = Math.max(0, p.life / p.maxLife);
        }
      }
    }
  }

  public renderTerrain(ctx: CanvasRenderingContext2D, camX: number, camY: number, zoom: number, viewW: number, viewH: number): void {
    const tileGrass = AssetLoader.getImage('TILE_GRASS');
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
        let tileImg: HTMLImageElement | HTMLCanvasElement | undefined = tileGrass;

        if (dist <= 2) {
          tileImg = tileCobble || this.fallbackStoneCanvas;
        } else if (dist <= 4 && (gx === 0 || gy === 0 || Math.abs(gx) === Math.abs(gy))) {
          tileImg = tileDirt || this.fallbackGrassCanvas;
        } else {
          tileImg = tileGrass || this.fallbackGrassCanvas;
        }

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
    let screenX = Math.round(prop.x - camX);
    let screenY = Math.round(prop.y - camY);

    if (prop.shakeTimer > 0) {
      const shakeOffset = Math.sin(prop.shakeTimer * 50) * prop.shakeIntensity;
      screenX += Math.round(shakeOffset);
    }

    // Sombra Elíptica 2:1 Desacoplada
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    const shadowRx = prop.width * 0.38;
    const shadowRy = shadowRx * 0.5;
    ctx.ellipse(screenX, screenY - 2, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

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

      // Flash de Impacto
      if (prop.hitFlashTimer > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(
          -prop.width * prop.anchorX,
          -prop.height * prop.anchorY,
          prop.width,
          prop.height
        );
      }

      // Resplandor Rúnico
      if (prop.type === 'MONOLITH' && prop.runeGlowTimer > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(56, 189, 248, ${(prop.runeGlowTimer / 0.65) * 0.65})`;
        ctx.beginPath();
        ctx.arc(0, -prop.height * 0.5, 45, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = prop.type === 'TREE' ? '#3f7c22' : '#657489';
      ctx.beginPath();
      ctx.arc(0, -prop.height * 0.45, prop.width * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public renderParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of this.propParticles) {
      if (p.active) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        const px = Math.round(p.x - camX);
        const py = Math.round(p.y - camY);
        ctx.beginPath();
        if (p.isLeaf) {
          ctx.ellipse(px, py, p.size * 1.5, p.size * 0.8, 0.4, 0, Math.PI * 2);
        } else {
          ctx.arc(px, py, p.size, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
