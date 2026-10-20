// Guardián Rúnico de Piedra: Mini-Boss / Tanque con Ground Slam Punch
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from './Hero';

export type GolemState = 'IDLE' | 'STOMP_WALK' | 'GROUND_SLAM';

export class Golem {
  public x: number;
  public y: number;
  public state: GolemState = 'IDLE';
  public facing: 'SE' | 'SW' = 'SW';
  public health: number = 250;
  public maxHealth: number = 250;

  private animTimer: number = 0;
  private currentFrame: number = 0;
  private slamTimer: number = 0;
  public slamImpactActive: boolean = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public update(dt: number, hero: Hero): void {
    this.animTimer += dt;
    const dx = hero.x - this.x;
    const dy = (hero.y - this.y) * 2;
    const dist = Math.hypot(dx, dy);

    this.facing = dx >= 0 ? 'SE' : 'SW';

    if (this.state === 'GROUND_SLAM') {
      this.slamTimer += dt;
      // 3 frames: Wind-up (0.0-0.3s), Impact (0.3-0.6s), Recovery (0.6-0.9s)
      if (this.slamTimer < 0.3) {
        this.currentFrame = 0; // Wind-up
        this.slamImpactActive = false;
      } else if (this.slamTimer < 0.6) {
        this.currentFrame = 1; // Impact
        this.slamImpactActive = true;
      } else if (this.slamTimer < 0.9) {
        this.currentFrame = 2; // Recovery
        this.slamImpactActive = false;
      } else {
        this.state = 'IDLE';
        this.slamTimer = 0;
        this.slamImpactActive = false;
      }
      return;
    }

    // Trigger de Ground Slam si el héroe está cerca
    if (dist < 80 && Math.random() < 0.03) {
      this.state = 'GROUND_SLAM';
      this.slamTimer = 0;
      this.currentFrame = 0;
      return;
    }

    // Idle o Stomp leve
    if (dist < 180) {
      this.state = 'STOMP_WALK';
      const frameDuration = 0.22;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 4;
      // Movimiento pesado hacia el héroe
      const moveSpeed = 25;
      const len = Math.hypot(dx, dy);
      if (len > 50) {
        this.x += (dx / len) * moveSpeed * dt;
        this.y += ((hero.y - this.y) / len) * moveSpeed * dt;
      }
    } else {
      this.state = 'IDLE';
      this.currentFrame = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const screenX = Math.round(this.x - camX);
    const screenY = Math.round(this.y - camY);

    // 1. Sombra Grande Elíptica 2:1 Desacoplada
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.42;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 2, 38, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Renderizar Sprite de Gólem
    const img = AssetLoader.getImage('GOLEM');
    if (!img) return;

    // golem_creature.png tiene 2 secciones:
    // Lado izq (X: 0 a 512): Stomp Walk (4 columnas, 4 filas)
    // Lado der (X: 512 a 1024): Ground Slam (3 columnas, 4 filas)
    const totalW = img.width;
    const totalH = img.height;

    let sx = 0;
    let sy = 0;
    let frameW = 0;
    let frameH = 0;

    if (this.state === 'GROUND_SLAM') {
      const halfW = totalW * 0.5;
      frameW = halfW / 3;
      frameH = totalH / 4;
      sx = halfW + (this.currentFrame % 3) * frameW;
      sy = 0;
    } else {
      const halfW = totalW * 0.5;
      frameW = halfW / 4;
      frameH = totalH / 4;
      sx = (this.currentFrame % 4) * frameW;
      sy = 0;
    }

    ctx.save();
    ctx.translate(screenX, screenY);
    if (this.facing === 'SW') {
      ctx.scale(-1, 1);
    }

    const drawW = 90;
    const drawH = 90;
    ctx.drawImage(
      img,
      sx,
      sy,
      frameW,
      frameH,
      -drawW * 0.5,
      -drawH * 0.88,
      drawW,
      drawH
    );
    ctx.restore();

    // Barra de Vida de Mini-Boss
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(screenX - 25, screenY - 86, 50, 5);
    ctx.fillStyle = '#38bdf8'; // Barra cian rúnica
    ctx.fillRect(screenX - 25, screenY - 86, (this.health / this.maxHealth) * 50, 5);
    ctx.restore();
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}
