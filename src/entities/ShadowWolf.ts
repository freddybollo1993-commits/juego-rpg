// Criatura Ágil: Lobo de Sombra Acechante con IA y Físicas Blindadas
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from './Hero';

export type WolfState = 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'HURT';

export class ShadowWolf {
  public x: number;
  public y: number;
  public z: number = 0;
  public vx: number = 0;
  public vy: number = 0;

  // Footprint Collision
  public colRadiusX: number = 16;
  public colRadiusY: number = 8;

  public state: WolfState = 'PATROL';
  public facing: 'SE' | 'SW' = 'SE';
  public health: number = 60;
  public maxHealth: number = 60;

  public patrolSpeed: number = 55;
  public chaseSpeed: number = 135;
  public attackLungeSpeed: number = 260;

  public animTimer: number = 0;
  public currentFrame: number = 0;

  private aiTickTimer: number = 0;
  private readonly AI_TICK_INTERVAL: number = 0.1;

  private spawnX: number;
  private spawnY: number;
  private targetPatrolX: number;
  private targetPatrolY: number;
  private patrolWaitTimer: number = 0;

  public scaleX: number = 1.0;
  public scaleY: number = 1.0;
  public attackTimer: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.spawnX = x;
    this.spawnY = y;
    this.targetPatrolX = x;
    this.targetPatrolY = y;
    this.pickNewPatrolPoint();
  }

  private pickNewPatrolPoint(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 80;
    this.targetPatrolX = this.spawnX + Math.cos(angle) * dist;
    this.targetPatrolY = this.spawnY + Math.sin(angle) * (dist * 0.5);
    this.patrolWaitTimer = 1.2 + Math.random() * 1.5;
  }

  public update(dt: number, hero: Hero): void {
    this.aiTickTimer += dt;
    if (this.aiTickTimer >= this.AI_TICK_INTERVAL) {
      this.aiTickTimer = 0;
      this.evaluateUtilityAI(hero);
    }

    this.executeBehavior(dt, hero);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (Math.abs(this.vx) > 5) {
      this.facing = this.vx > 0 ? 'SE' : 'SW';
    }

    this.updateAnimation(dt);
  }

  private evaluateUtilityAI(hero: Hero): void {
    if (this.state === 'ATTACK' || this.state === 'HURT') return;

    const dx = hero.x - this.x;
    const dy = (hero.y - this.y) * 2;
    const distToHero = Math.hypot(dx, dy);

    const visionRadius = 240;
    const attackRadius = 60;

    if (distToHero < attackRadius) {
      this.state = 'ATTACK';
      this.attackTimer = 0.45;
      const len = Math.hypot(dx, dy);
      this.vx = (dx / len) * this.attackLungeSpeed;
      this.vy = ((hero.y - this.y) / len) * this.attackLungeSpeed;
      this.scaleX = 1.2;
      this.scaleY = 0.85;
    } else if (distToHero < visionRadius) {
      this.state = 'CHASE';
    } else {
      this.state = 'PATROL';
    }
  }

  private executeBehavior(dt: number, hero: Hero): void {
    if (this.state === 'ATTACK') {
      this.attackTimer -= dt;
      this.vx *= 0.92;
      this.vy *= 0.92;
      if (this.attackTimer <= 0) {
        this.state = 'CHASE';
        this.scaleX = 1.0;
        this.scaleY = 1.0;
      }
      return;
    }

    if (this.state === 'CHASE') {
      const dx = hero.x - this.x;
      const dy = hero.y - this.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        this.vx = (dx / len) * this.chaseSpeed;
        this.vy = (dy / len) * this.chaseSpeed;
      }
    } else if (this.state === 'PATROL') {
      if (this.patrolWaitTimer > 0) {
        this.patrolWaitTimer -= dt;
        this.vx *= 0.8;
        this.vy *= 0.8;
      } else {
        const dx = this.targetPatrolX - this.x;
        const dy = this.targetPatrolY - this.y;
        const len = Math.hypot(dx, dy);
        if (len < 10) {
          this.pickNewPatrolPoint();
        } else {
          this.vx = (dx / len) * this.patrolSpeed;
          this.vy = (dy / len) * this.patrolSpeed;
        }
      }
    }
  }

  private updateAnimation(dt: number): void {
    this.animTimer += dt;
    const speed = Math.hypot(this.vx, this.vy);

    if (this.state === 'ATTACK') {
      this.currentFrame = 2;
    } else if (speed > 80) {
      this.currentFrame = Math.floor(this.animTimer / 0.1) % 6;
    } else if (speed > 10) {
      this.currentFrame = Math.floor(this.animTimer / 0.16) % 6;
    } else {
      this.currentFrame = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const screenX = Math.round(this.x - camX);
    const screenY = Math.round(this.y - camY);

    // Sombra Elíptica 2:1
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 2, 24 * this.scaleX, 12 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const img = AssetLoader.getImage('SHADOW_WOLF');
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(this.scaleX, this.scaleY);

    if (this.facing === 'SW') {
      ctx.scale(-1, 1);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const frameW = img.width / 6;
      const frameH = img.height / 4;
      const rowIndex = this.state === 'ATTACK' || Math.hypot(this.vx, this.vy) > 80 ? 1 : 0;
      const colIndex = this.currentFrame % 6;
      const sx = colIndex * frameW;
      const sy = rowIndex * frameH;
      const drawW = 72;
      const drawH = 46;

      ctx.drawImage(img, sx, sy, frameW, frameH, -drawW * 0.5, -drawH * 0.88, drawW, drawH);
    } else {
      // Fallback estilizado si la imagen no está lista
      ctx.fillStyle = '#1e1b2e';
      ctx.beginPath();
      ctx.ellipse(0, -18, 22, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      // Ojos de ámbar
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(8, -20, 3, 3);
    }

    ctx.restore();

    if (this.health < this.maxHealth) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(screenX - 16, screenY - 48, 32, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(screenX - 16, screenY - 48, (this.health / this.maxHealth) * 32, 4);
      ctx.restore();
    }
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}
