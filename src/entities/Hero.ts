// Entidad del Héroe Principal con Escala Compacta y Orientación Multidireccional Completa
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
  facingX: number;
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

  // Escala reducida y compacta para integración 1:1 con bloques de 64x32
  public static readonly DRAW_W = 38;
  public static readonly DRAW_H = 52;

  // Footprint Collision (pixel-25d-collision-physics-specialist)
  public colRadiusX: number = 9;
  public colRadiusY: number = 4.5;

  public walkSpeed: number = 95;
  public runSpeed: number = 165;
  public dashSpeed: number = 330;

  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';
  // Orientaciones continuas: facingX (1 = Derecha/Este, -1 = Izquierda/Oeste), facingY (1 = Sur, -1 = Norte)
  public facingX: number = 1;
  public facingY: number = 1;

  public animTimer: number = 0;
  public currentFrame: number = 0;

  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashCooldown: number = 0;
  public attackTimer: number = 0;
  public hitStopFrames: number = 0;

  // Juice Procedural
  public scaleX: number = 1.0;
  public scaleY: number = 1.0;
  public targetScaleX: number = 1.0;
  public targetScaleY: number = 1.0;
  public tiltAngle: number = 0;
  public idleTime: number = 0;

  // Object Pooling
  private dustPool: DustParticle[] = [];
  private static readonly MAX_DUST = 35;

  private afterImages: AfterImage[] = [];
  private static readonly MAX_AFTERIMAGES = 10;
  private afterImageSpawnTimer: number = 0;

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
        radius: 1.5,
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
        facingX: 1,
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

    // Actualizar Orientación siempre que haya entrada
    if (input.isMoving) {
      if (Math.abs(input.dx) > 0.08) {
        this.facingX = input.dx > 0 ? 1 : -1;
      }
      if (Math.abs(input.dy) > 0.08) {
        this.facingY = input.dy > 0 ? 1 : -1;
      }

      // Mapeo a las 4 direcciones isométricas
      if (this.facingY >= 0) {
        this.direction = this.facingX >= 0 ? 'SE' : 'SO';
      } else {
        this.direction = this.facingX >= 0 ? 'NE' : 'NO';
      }
    }

    // FSM: Ataque
    if (this.fsmState === 'ATTACK') {
      this.attackTimer += dt;
      this.currentFrame = Math.min(2, Math.floor(this.attackTimer / 0.11));
      if (this.attackTimer >= 0.33) {
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
      this.scaleX = 1.15;
      this.scaleY = 0.88;
      this.spawnDust(2);
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
      this.scaleY = 0.82;
      this.spawnDust(4);
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
      if (input.isMoving) {
        const isRun = input.isRun;
        const currentSpeed = isRun ? this.runSpeed : this.walkSpeed;
        this.vx = input.dx * currentSpeed;
        this.vy = input.dy * currentSpeed;

        const prevState = this.fsmState;
        this.fsmState = isRun ? 'RUN' : 'WALK';

        if (prevState === 'IDLE') {
          this.spawnDust(3);
          this.scaleX = 0.92;
          this.scaleY = 1.12;
        }
      } else {
        this.vx *= 0.72;
        this.vy *= 0.72;
        if (Math.hypot(this.vx, this.vy) < 4) {
          this.vx = 0;
          this.vy = 0;
        }
        if (this.fsmState !== 'IDLE' && this.vx === 0 && this.vy === 0) {
          this.fsmState = 'IDLE';
          this.scaleX = 1.06;
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

  private updateAnimationFrames(dt: number): void {
    this.animTimer += dt;

    if (this.fsmState === 'IDLE') {
      const frameDuration = 0.22;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 4;
    } else if (this.fsmState === 'WALK') {
      const frameDuration = 0.11;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
      if (this.currentFrame === 1 || this.currentFrame === 4) {
        if (Math.random() < 0.2) this.spawnDust(1);
      }
    } else if (this.fsmState === 'RUN') {
      const frameDuration = 0.075;
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
      const targetTilt = (this.vx / this.runSpeed) * 0.06;
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
        p.x = this.x + (Math.random() - 0.5) * 6;
        p.y = this.y + (Math.random() - 0.5) * 3;
        p.vx = -this.vx * 0.15 + (Math.random() - 0.5) * 16;
        p.vy = -this.vy * 0.15 + (Math.random() - 0.5) * 8 - 4;
        p.radius = 1.5 + Math.random() * 1.5;
        p.maxLife = 0.32 + Math.random() * 0.12;
        p.life = p.maxLife;
        p.alpha = 0.55;
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
        ghost.facingX = this.facingX;
        ghost.frameIndex = this.currentFrame;
        ghost.scaleX = this.scaleX;
        ghost.scaleY = this.scaleY;
        ghost.alpha = 0.42;
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
          p.alpha = (p.life / p.maxLife) * 0.55;
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

    // 1. Afterimages de Dash con soporte de volteo horizontal
    for (const ghost of this.afterImages) {
      if (ghost.active) {
        const gx = Math.round(ghost.x - camX);
        const gy = Math.round(ghost.y - camY);
        ctx.save();
        ctx.globalAlpha = ghost.alpha;
        ctx.translate(gx, gy);
        ctx.scale(ghost.facingX * ghost.scaleX, ghost.scaleY);
        this.drawSpriteTexture(ctx);
        ctx.restore();
      }
    }

    // 2. Sombra Elíptica 2:1 Proporcionada (ancho 22px, alto 11px)
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 2, 11 * this.scaleX, 5.5 * this.scaleY, 0, 0, Math.PI * 2);
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

    // 4. Renderizar Personaje con Escala e Inversión Horizontal según Movimiento
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);

    // Volteo horizontal estricto: facingX = 1 (Derecha/SE/NE) o -1 (Izquierda/SO/NO)
    ctx.scale(this.facingX * this.scaleX, this.scaleY);

    this.drawSpriteTexture(ctx);
    ctx.restore();
  }

  private drawSpriteTexture(ctx: CanvasRenderingContext2D): void {
    let imgKey = 'HERO_IDLE_WALK';
    if (this.fsmState === 'RUN' || this.fsmState === 'DASH') {
      imgKey = 'HERO_RUN_DASH';
    } else if (this.fsmState === 'ATTACK') {
      imgKey = 'HERO_ATTACK';
    }

    const img = AssetLoader.getImage(imgKey);
    if (!img) {
      const frame = this.fallbackSpriteSheet.getFrame(this.fsmState, this.direction, this.currentFrame);
      ctx.drawImage(
        this.fallbackSpriteSheet.canvas,
        frame.sx,
        frame.sy,
        HeroSpriteSheet.FRAME_W,
        HeroSpriteSheet.FRAME_H,
        -HeroSpriteSheet.ANCHOR_X,
        -HeroSpriteSheet.ANCHOR_Y,
        Hero.DRAW_W,
        Hero.DRAW_H
      );
      return;
    }

    const frameW = img.width / 10;
    const frameH = img.height / 4;

    let rowIndex = 0;
    let colIndex = 0;

    if (this.fsmState === 'IDLE') {
      // Si mira hacia el norte (arriba), usamos el frame de espaldas con capa (columna 5, fila 0)
      if (this.facingY < 0) {
        rowIndex = 0;
        colIndex = 5;
      } else {
        rowIndex = 0;
        colIndex = this.currentFrame % 4;
      }
    } else if (this.fsmState === 'WALK') {
      if (this.facingY < 0) {
        // Caminar hacia arriba/norte: fila 3 con frames de espalda
        rowIndex = 3;
        colIndex = (this.currentFrame % 6);
      } else {
        // Caminar hacia abajo/sur: fila 1 con ciclo de marcha
        rowIndex = 1;
        colIndex = (this.currentFrame % 6);
      }
    } else if (this.fsmState === 'RUN') {
      rowIndex = this.facingY < 0 ? 1 : 0;
      colIndex = (this.currentFrame % 6);
    } else if (this.fsmState === 'DASH') {
      rowIndex = 2; // Fila de Dash
      colIndex = 1;
    } else if (this.fsmState === 'ATTACK') {
      rowIndex = 0;
      colIndex = this.currentFrame % 4;
    }

    const sx = Math.floor(colIndex * frameW);
    const sy = Math.floor(rowIndex * frameH);

    ctx.drawImage(
      img,
      sx,
      sy,
      frameW,
      frameH,
      -Hero.DRAW_W * 0.5,
      -Hero.DRAW_H * 0.90, // Anclaje preciso en los pies (anchor 0.5, 0.90)
      Hero.DRAW_W,
      Hero.DRAW_H
    );
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}
