// Entidad del Héroe Principal con Dash Explosivo y Combo de Ataque Rúnico Completo
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

  // Escala táctica compacta
  public static readonly BASE_W = 38;
  public static readonly BASE_H = 52;

  // Footprint Collision
  public colRadiusX: number = 9;
  public colRadiusY: number = 4.5;

  public walkSpeed: number = 95;
  public runSpeed: number = 165;
  public dashSpeed: number = 340;

  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';
  public facingX: number = 1;
  public facingY: number = 1;

  public animTimer: number = 0;
  public currentFrame: number = 0;

  // Dash
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashCooldown: number = 0;
  private dashDirX: number = 1;
  private dashDirY: number = 0;

  // Ataque
  public isAttacking: boolean = false;
  public attackTimer: number = 0;
  public attackHitboxActive: boolean = false;

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
  private static readonly MAX_AFTERIMAGES = 12;
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

    // Actualizar Orientación
    if (input.isMoving && !this.isDashing && !this.isAttacking) {
      if (Math.abs(input.dx) > 0.08) {
        this.facingX = input.dx > 0 ? 1 : -1;
      }
      if (Math.abs(input.dy) > 0.08) {
        this.facingY = input.dy > 0 ? 1 : -1;
      }

      if (this.facingY >= 0) {
        this.direction = this.facingX >= 0 ? 'SE' : 'SO';
      } else {
        this.direction = this.facingX >= 0 ? 'NE' : 'NO';
      }
    }

    // 1. FSM: ATAQUE
    if (this.isAttacking) {
      this.attackTimer += dt;
      // 4 frames: 0 (0-0.09s), 1 (0.09-0.20s), 2 (0.20-0.31s), 3 (0.31-0.40s)
      if (this.attackTimer < 0.09) {
        this.currentFrame = 0;
        this.attackHitboxActive = false;
      } else if (this.attackTimer < 0.20) {
        this.currentFrame = 1;
        this.attackHitboxActive = true;
      } else if (this.attackTimer < 0.31) {
        this.currentFrame = 2;
        this.attackHitboxActive = true;
      } else if (this.attackTimer < 0.40) {
        this.currentFrame = 3;
        this.attackHitboxActive = false;
      } else {
        this.isAttacking = false;
        this.attackHitboxActive = false;
        this.fsmState = input.isMoving ? 'WALK' : 'IDLE';
        this.attackTimer = 0;
      }

      // Frenado durante el ataque
      this.vx *= 0.8;
      this.vy *= 0.8;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    if (input.isAttack && !this.isDashing) {
      this.isAttacking = true;
      this.fsmState = 'ATTACK';
      this.attackTimer = 0;
      this.currentFrame = 0;
      this.scaleX = 1.2;
      this.scaleY = 0.85;
      this.spawnDust(3);
      // Ligero paso hacia adelante al atacar
      this.vx = this.facingX * 35;
      this.vy = (this.facingY * 0.5) * 35;
      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    // 2. FSM: DASH (Activación en cualquier momento)
    if (input.isDash && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = 0.25;
      this.dashCooldown = 0.55;
      this.fsmState = 'DASH';

      // Dirección del impulso
      let dirX = input.isMoving ? input.dx : (this.facingX * 0.9);
      let dirY = input.isMoving ? input.dy : (this.facingY * 0.45);
      const len = Math.hypot(dirX, dirY);
      if (len > 0) {
        dirX /= len;
        dirY /= len;
      }
      this.dashDirX = dirX;
      this.dashDirY = dirY;

      this.scaleX = 1.35;
      this.scaleY = 0.78;
      this.spawnDust(6);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * this.dashSpeed;
      this.vy = this.dashDirY * this.dashSpeed;

      // Generación frecuente de Afterimages
      this.afterImageSpawnTimer += dt;
      if (this.afterImageSpawnTimer >= 0.035) {
        this.afterImageSpawnTimer = 0;
        this.spawnAfterImage();
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.fsmState = input.isMoving ? 'RUN' : 'IDLE';
      }
    } else {
      // 3. LOCOMOCIÓN NORMALIZADA
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
      const targetTilt = (this.vx / this.runSpeed) * 0.07;
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

    // 1. Afterimages de Dash
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

    // 2. Sombra Elíptica 2:1 Proporcionada
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

    // 4. Renderizar Personaje con Orientación
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);
    ctx.scale(this.facingX * this.scaleX, this.scaleY);
    this.drawSpriteTexture(ctx);
    ctx.restore();
  }

  private drawSpriteTexture(ctx: CanvasRenderingContext2D): void {
    // RENDERIZADO ESPECIAL PARA ATAQUE: Recorte exacto de los 4 frames con estela cian
    if (this.fsmState === 'ATTACK') {
      const attackImg = AssetLoader.getImage('HERO_ATTACK');
      if (attackImg && attackImg.complete && attackImg.naturalWidth > 0) {
        // Coordenadas medidas de los 4 frames en hero_attack.png
        const attackFrames = [
          { sx: 35, sy: 65, sw: 70, sh: 195, drawW: 38, drawH: 52, offX: 0 },
          { sx: 225, sy: 65, sw: 275, sh: 195, drawW: 75, drawH: 52, offX: 18 },
          { sx: 555, sy: 65, sw: 240, sh: 195, drawW: 70, drawH: 52, offX: 16 },
          { sx: 920, sy: 65, sw: 65, sh: 195, drawW: 38, drawH: 52, offX: 0 }
        ];

        const f = attackFrames[this.currentFrame] || attackFrames[0];
        ctx.drawImage(
          attackImg,
          f.sx,
          f.sy,
          f.sw,
          f.sh,
          -Hero.BASE_W * 0.5 + f.offX,
          -Hero.BASE_H * 0.90,
          f.drawW,
          f.drawH
        );
        return;
      }
    }

    // RENDERIZADO DE MOVIMIENTO / DASH / IDLE
    let imgKey = 'HERO_IDLE_WALK';
    if (this.fsmState === 'RUN' || this.fsmState === 'DASH') {
      imgKey = 'HERO_RUN_DASH';
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
        Hero.BASE_W,
        Hero.BASE_H
      );
      return;
    }

    const frameW = img.width / 10;
    const frameH = img.height / 4;

    let rowIndex = 0;
    let colIndex = 0;

    if (this.fsmState === 'IDLE') {
      if (this.facingY < 0) {
        rowIndex = 0;
        colIndex = 5;
      } else {
        rowIndex = 0;
        colIndex = this.currentFrame % 4;
      }
    } else if (this.fsmState === 'WALK') {
      if (this.facingY < 0) {
        rowIndex = 3;
        colIndex = (this.currentFrame % 6);
      } else {
        rowIndex = 1;
        colIndex = (this.currentFrame % 6);
      }
    } else if (this.fsmState === 'RUN') {
      rowIndex = this.facingY < 0 ? 1 : 0;
      colIndex = (this.currentFrame % 6);
    } else if (this.fsmState === 'DASH') {
      // Pose de Dash aerodinámica baja (Fila 2 en hero_run_dash)
      rowIndex = 2;
      colIndex = 1;
    }

    const sx = Math.floor(colIndex * frameW);
    const sy = Math.floor(rowIndex * frameH);

    ctx.drawImage(
      img,
      sx,
      sy,
      frameW,
      frameH,
      -Hero.BASE_W * 0.5,
      -Hero.BASE_H * 0.90,
      Hero.BASE_W,
      Hero.BASE_H
    );
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}
