// Entidad del Héroe Principal conectada a los Spritesheets de Producción
import { Direction4, AnimationState, HeroSpriteSheet } from '../graphics/HeroSpriteSheet';
import { InputState } from '../input/InputManager';
import { AssetLoader } from '../core/AssetLoader';

export interface DustParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxLife: number;
  life: number;
}

export interface AfterImage {
  active: boolean;
  x: number;
  y: number;
  anim: AnimationState;
  dir: Direction4;
  frameIndex: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
}

export class Hero {
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  public vx: number = 0;
  public vy: number = 0;

  public walkSpeed: number = 105;
  public runSpeed: number = 180;
  public dashSpeed: number = 360;

  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';
  public animTimer: number = 0;
  public currentFrame: number = 0;

  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashCooldown: number = 0;
  public attackTimer: number = 0;
  public hitStopFrames: number = 0;

  // Juice & Polish Procedural (pixel-25d-kinematics-animator)
  public scaleX: number = 1.0;
  public scaleY: number = 1.0;
  public targetScaleX: number = 1.0;
  public targetScaleY: number = 1.0;
  public tiltAngle: number = 0;
  public idleTime: number = 0;

  // Object Pooling
  private dustPool: DustParticle[] = [];
  private static readonly MAX_DUST = 40;

  private afterImages: AfterImage[] = [];
  private static readonly MAX_AFTERIMAGES = 12;
  private afterImageSpawnTimer: number = 0;

  // Fallback Procedural
  public fallbackSpriteSheet: HeroSpriteSheet;

  constructor(initialX: number = 0, initialY: number = 0) {
    this.x = initialX;
    this.y = initialY;
    this.fallbackSpriteSheet = new HeroSpriteSheet();

    for (let i = 0; i < Hero.MAX_DUST; i++) {
      this.dustPool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2,
        alpha: 0,
        maxLife: 0.35,
        life: 0
      });
    }

    for (let i = 0; i < Hero.MAX_AFTERIMAGES; i++) {
      this.afterImages.push({
        active: false,
        x: 0,
        y: 0,
        anim: 'IDLE',
        dir: 'SE',
        frameIndex: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 0
      });
    }
  }

  public update(dt: number, input: InputState): void {
    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      return;
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // FSM: Ataque
    if (this.fsmState === 'ATTACK') {
      this.attackTimer += dt;
      this.currentFrame = Math.min(2, Math.floor(this.attackTimer / 0.12));
      if (this.attackTimer >= 0.36) {
        this.fsmState = 'IDLE';
        this.attackTimer = 0;
      }
      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    if (input.isAttack && this.fsmState !== 'DASH') {
      this.fsmState = 'ATTACK';
      this.attackTimer = 0;
      this.currentFrame = 0;
      this.scaleX = 1.18;
      this.scaleY = 0.88;
      this.spawnDust(3);
      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    // FSM: Dash
    if (input.isDash && this.dashCooldown <= 0 && (input.isMoving || this.fsmState === 'RUN' || this.fsmState === 'WALK')) {
      this.isDashing = true;
      this.dashTimer = 0.22;
      this.dashCooldown = 0.65;
      this.fsmState = 'DASH';
      this.scaleX = 1.25;
      this.scaleY = 0.8;
      this.spawnDust(5);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      const speed = this.dashSpeed;
      this.vx = input.dx * speed;
      this.vy = input.dy * speed;

      this.afterImageSpawnTimer += dt;
      if (this.afterImageSpawnTimer >= 0.04) {
        this.afterImageSpawnTimer = 0;
        this.spawnAfterImage();
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.fsmState = input.isMoving ? 'RUN' : 'IDLE';
      }
    } else {
      // Locomoción Normalizada 2:1
      if (input.isMoving) {
        const isRun = input.isRun;
        const currentSpeed = isRun ? this.runSpeed : this.walkSpeed;
        this.vx = input.dx * currentSpeed;
        this.vy = input.dy * currentSpeed;

        const prevState = this.fsmState;
        this.fsmState = isRun ? 'RUN' : 'WALK';

        if (prevState === 'IDLE') {
          this.spawnDust(4);
          this.scaleX = 0.9;
          this.scaleY = 1.15;
        }

        this.updateIsometricDirection(input.dx, input.dy);
      } else {
        this.vx *= 0.72;
        this.vy *= 0.72;
        if (Math.hypot(this.vx, this.vy) < 5) {
          this.vx = 0;
          this.vy = 0;
        }
        if (this.fsmState !== 'IDLE' && this.vx === 0 && this.vy === 0) {
          this.fsmState = 'IDLE';
          this.scaleX = 1.08;
          this.scaleY = 0.94;
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.updateAnimationFrames(dt);
    this.updateJuice(dt, input.isMoving);
    this.updateParticles(dt);
  }

  private updateIsometricDirection(dx: number, dy: number): void {
    if (dy >= 0) {
      this.direction = dx >= 0 ? 'SE' : 'SO';
    } else {
      this.direction = dx >= 0 ? 'NE' : 'NO';
    }
  }

  private updateAnimationFrames(dt: number): void {
    this.animTimer += dt;

    if (this.fsmState === 'IDLE') {
      const frameDuration = 0.24;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 4;
    } else if (this.fsmState === 'WALK') {
      const frameDuration = 0.12;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
      if (this.currentFrame === 1 || this.currentFrame === 4) {
        if (Math.random() < 0.25) this.spawnDust(1);
      }
    } else if (this.fsmState === 'RUN') {
      const frameDuration = 0.08;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
      if (this.currentFrame === 1 || this.currentFrame === 4) {
        this.spawnDust(1);
      }
    } else if (this.fsmState === 'DASH') {
      this.currentFrame = 0;
    }
  }

  private updateJuice(dt: number, isMoving: boolean): void {
    if (this.fsmState === 'IDLE') {
      this.idleTime += dt;
      this.targetScaleY = 1.0 + Math.sin(this.idleTime * 4.0) * 0.035;
      this.targetScaleX = 1.0 - Math.sin(this.idleTime * 4.0) * 0.02;
      this.tiltAngle = 0;
    } else {
      this.idleTime = 0;
      this.targetScaleX = 1.0;
      this.targetScaleY = 1.0;
      const targetTilt = (this.vx / this.runSpeed) * 0.08;
      this.tiltAngle += (targetTilt - this.tiltAngle) * 0.2;
    }

    const springSpeed = 12.0;
    this.scaleX += (this.targetScaleX - this.scaleX) * Math.min(1, springSpeed * dt);
    this.scaleY += (this.targetScaleY - this.scaleY) * Math.min(1, springSpeed * dt);
  }

  public spawnDust(count: number): void {
    let spawned = 0;
    for (const p of this.dustPool) {
      if (!p.active) {
        p.active = true;
        p.x = this.x + (Math.random() - 0.5) * 8;
        p.y = this.y + (Math.random() - 0.5) * 4;
        p.vx = -this.vx * 0.15 + (Math.random() - 0.5) * 20;
        p.vy = -this.vy * 0.15 + (Math.random() - 0.5) * 10 - 5;
        p.radius = 2 + Math.random() * 2;
        p.maxLife = 0.35 + Math.random() * 0.15;
        p.life = p.maxLife;
        p.alpha = 0.6;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private spawnAfterImage(): void {
    for (const ghost of this.afterImages) {
      if (!ghost.active) {
        ghost.active = true;
        ghost.x = this.x;
        ghost.y = this.y;
        ghost.anim = this.fsmState;
        ghost.dir = this.direction;
        ghost.frameIndex = this.currentFrame;
        ghost.scaleX = this.scaleX;
        ghost.scaleY = this.scaleY;
        ghost.alpha = 0.45;
        break;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.dustPool) {
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = (p.life / p.maxLife) * 0.6;
        }
      }
    }

    for (const ghost of this.afterImages) {
      if (ghost.active) {
        ghost.alpha -= dt * 2.8;
        if (ghost.alpha <= 0) {
          ghost.active = false;
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const screenX = Math.round(this.x - camX);
    const screenY = Math.round(this.y - camY);

    // 1. Afterimages de Dash
    for (const ghost of this.afterImages) {
      if (ghost.active) {
        const gx = Math.round(ghost.x - camX);
        const gy = Math.round(ghost.y - camY);
        ctx.save();
        ctx.globalAlpha = ghost.alpha;
        ctx.translate(gx, gy);
        ctx.scale(ghost.scaleX, ghost.scaleY);
        this.drawHeroSprite(ctx);
        ctx.restore();
      }
    }

    // 2. Sombra Elíptica 2:1 Desacoplada
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 2, 16 * this.scaleX, 8 * this.scaleY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Partículas de Polvo
    for (const p of this.dustPool) {
      if (p.active) {
        ctx.save();
        ctx.fillStyle = '#c7b299';
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(Math.round(p.x - camX), Math.round(p.y - camY), p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // 4. Renderizar Personaje
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);
    ctx.scale(this.scaleX, this.scaleY);
    this.drawHeroSprite(ctx);
    ctx.restore();
  }

  private drawHeroSprite(ctx: CanvasRenderingContext2D): void {
    let imgKey = 'HERO_IDLE_WALK';
    if (this.fsmState === 'RUN' || this.fsmState === 'DASH') {
      imgKey = 'HERO_RUN_DASH';
    } else if (this.fsmState === 'ATTACK') {
      imgKey = 'HERO_ATTACK';
    }

    const img = AssetLoader.getImage(imgKey);
    if (!img) {
      // Fallback si la imagen aún se está cargando
      const frame = this.fallbackSpriteSheet.getFrame(this.fsmState, this.direction, this.currentFrame);
      ctx.drawImage(
        this.fallbackSpriteSheet.canvas,
        frame.sx,
        frame.sy,
        HeroSpriteSheet.FRAME_W,
        HeroSpriteSheet.FRAME_H,
        -HeroSpriteSheet.ANCHOR_X,
        -HeroSpriteSheet.ANCHOR_Y,
        HeroSpriteSheet.FRAME_W,
        HeroSpriteSheet.FRAME_H
      );
      return;
    }

    // El spritesheet de producción tiene 10 columnas y 4 filas
    const frameW = img.width / 10;
    const frameH = img.height / 4;

    let rowIndex = 0;
    if (this.direction === 'SE') rowIndex = 0;
    else if (this.direction === 'SO') rowIndex = 1;
    else if (this.direction === 'NE') rowIndex = 2;
    else if (this.direction === 'NO') rowIndex = 3;

    let colIndex = 0;
    if (this.fsmState === 'IDLE') {
      colIndex = this.currentFrame % 4;
    } else if (this.fsmState === 'WALK' || this.fsmState === 'RUN') {
      colIndex = (this.currentFrame % 6);
    } else if (this.fsmState === 'DASH') {
      rowIndex = 2; // Fila de Dash bajo
      colIndex = 1;
    } else if (this.fsmState === 'ATTACK') {
      rowIndex = this.direction === 'SE' ? 0 : 1;
      colIndex = this.currentFrame % 4;
    }

    const sx = Math.floor(colIndex * frameW);
    const sy = Math.floor(rowIndex * frameH);

    const drawW = 52;
    const drawH = 70;

    ctx.drawImage(
      img,
      sx,
      sy,
      frameW,
      frameH,
      -drawW * 0.5,
      -drawH * 0.90, // Anchor en los pies
      drawW,
      drawH
    );
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}
