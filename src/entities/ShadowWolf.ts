// Criatura Ágil: Lobo de Sombra Acechante con IA de pixel-25d-ai-behavior-director
import { AssetLoader } from '../core/AssetLoader';
import { Hero } from './Hero';

export type WolfState = 'PATROL' | 'ALERT' | 'CHASE' | 'ATTACK' | 'HURT';

export class ShadowWolf {
  public x: number;
  public y: number;
  public z: number = 0;
  public vx: number = 0;
  public vy: number = 0;

  public state: WolfState = 'PATROL';
  public facing: 'SE' | 'SW' = 'SE';
  public health: number = 60;
  public maxHealth: number = 60;

  // Parámetros de velocidad
  public patrolSpeed: number = 55;
  public chaseSpeed: number = 135;
  public attackLungeSpeed: number = 260;

  // Animación
  public animTimer: number = 0;
  public currentFrame: number = 0;

  // Staggered Ticks (pixel-25d-ai-behavior-director)
  private aiTickTimer: number = 0;
  private readonly AI_TICK_INTERVAL: number = 0.1; // 10 Hz para máximo ahorro de CPU en móvil

  // Territorio y patrulla
  private spawnX: number;
  private spawnY: number;
  private targetPatrolX: number;
  private targetPatrolY: number;
  private patrolWaitTimer: number = 0;

  // Sombra 2:1 y Juice
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
    this.targetPatrolY = this.spawnY + Math.sin(angle) * (dist * 0.5); // Radio elíptico 2:1
    this.patrolWaitTimer = 1.2 + Math.random() * 1.5;
  }

  public update(dt: number, hero: Hero): void {
    // 1. Evaluación de IA Escalonada por Ticks (Utility AI)
    this.aiTickTimer += dt;
    if (this.aiTickTimer >= this.AI_TICK_INTERVAL) {
      this.aiTickTimer = 0;
      this.evaluateUtilityAI(hero);
    }

    // 2. FSM de Movimiento y Animación
    this.executeBehavior(dt, hero);

    // 3. Integración de Movimiento
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Orientación según velocidad
    if (Math.abs(this.vx) > 5) {
      this.facing = this.vx > 0 ? 'SE' : 'SW';
    }

    // 4. Actualización de Frames
    this.updateAnimation(dt);
  }

  private evaluateUtilityAI(hero: Hero): void {
    if (this.state === 'ATTACK' || this.state === 'HURT') return;

    // Distancia Euclidiana en el plano
    const dx = hero.x - this.x;
    const dy = (hero.y - this.y) * 2; // Ajuste para ratio 2:1
    const distToHero = Math.hypot(dx, dy);

    const visionRadius = 240;
    const attackRadius = 60;

    // Sistema de Percepción Isométrica (Cono de Visión 2:1)
    if (distToHero < attackRadius) {
      this.state = 'ATTACK';
      this.attackTimer = 0.45;
      // Impulso hacia el jugador
      const len = Math.hypot(dx, dy);
      this.vx = (dx / len) * this.attackLungeSpeed;
      this.vy = ((hero.y - this.y) / len) * this.attackLungeSpeed;
      this.scaleX = 1.2;
      this.scaleY = 0.85; // Squash de salto
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
      // Pose de salto/mordisco
      this.currentFrame = 2;
    } else if (speed > 80) {
      // Carrera (Fila 2 en spritesheet)
      const frameDuration = 0.1;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
    } else if (speed > 10) {
      // Acecho / Prowl (Fila 1)
      const frameDuration = 0.16;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
    } else {
      // Idle
      this.currentFrame = 0;
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const screenX = Math.round(this.x - camX);
    const screenY = Math.round(this.y - camY);

    // 1. Sombra Elíptica 2:1 Desacoplada
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 2, 24 * this.scaleX, 12 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Renderizar Sprite de Criatura
    const img = AssetLoader.getImage('SHADOW_WOLF');
    if (!img) return;

    // El spritesheet tiene 6 columnas y 4 filas
    const frameW = img.width / 6;
    const frameH = img.height / 4;

    const rowIndex = this.state === 'ATTACK' || Math.hypot(this.vx, this.vy) > 80 ? 1 : 0;
    const colIndex = this.currentFrame % 6;

    const sx = colIndex * frameW;
    const sy = rowIndex * frameH;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(this.scaleX, this.scaleY);

    // Si mira a la izquierda (SW), invertimos horizontalmente
    if (this.facing === 'SW') {
      ctx.scale(-1, 1);
    }

    const drawW = 72;
    const drawH = 46;
    ctx.drawImage(
      img,
      sx,
      sy,
      frameW,
      frameH,
      -drawW * 0.5,
      -drawH * 0.88, // Anclaje en las patas
      drawW,
      drawH
    );

    ctx.restore();

    // Barra de Vida de Criatura (Sutil)
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
