// Entidad del Héroe Principal con Master Spritesheets: Combo 3 Golpes, Dash Supersónico y Locomoción 8 Direcciones
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
  facingY: number;
  comboStep: number;
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

  // Escala táctica compacta 1:1 con losetas
  public static readonly BASE_W = 40;
  public static readonly BASE_H = 54;

  // Footprint Collision
  public colRadiusX: number = 10;
  public colRadiusY: number = 5;

  public walkSpeed: number = 100;
  public runSpeed: number = 175;
  public dashSpeed: number = 380;

  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';

  // Orientación en 360° / 8 direcciones
  public aimDirX: number = 1;
  public aimDirY: number = 0.5;
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

  // Sistema de Combo de 3 Golpes (pixel-25d-master-animator)
  public isAttacking: boolean = false;
  public comboStep: number = 1; // 1 = Tajo, 2 = Estocada, 3 = Golpe Pesado
  public attackTimer: number = 0;
  public attackHitboxActive: boolean = false;
  public comboBuffer: boolean = false;
  public attackHitX: number = 0;
  public attackHitY: number = 0;

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
        facingY: 1,
        comboStep: 1,
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

    // Actualizar vector continuo de orientación en 360°
    if (input.isMoving && !this.isDashing && !this.isAttacking) {
      this.aimDirX = input.dx;
      this.aimDirY = input.dy;

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

    // Buffer de combo si pulsa atacar durante un golpe
    if (input.isAttack && this.isAttacking) {
      this.comboBuffer = true;
    }

    // 1. FSM: COMBO DE 3 GOLPES DE ESPADA
    if (this.isAttacking) {
      this.attackTimer += dt;
      const stepDuration = this.comboStep === 3 ? 0.38 : 0.28;

      // Hitbox activa en la fase de impacto
      this.attackHitboxActive = this.attackTimer >= 0.06 && this.attackTimer <= stepDuration * 0.75;

      if (this.attackTimer >= stepDuration) {
        // Encadenar siguiente golpe si se pulsó atacar en buffer
        if (this.comboBuffer && this.comboStep < 3) {
          this.comboStep++;
          this.attackTimer = 0;
          this.comboBuffer = false;
          this.executeComboImpact();
        } else {
          this.isAttacking = false;
          this.attackHitboxActive = false;
          this.comboStep = 1;
          this.fsmState = input.isMoving ? 'WALK' : 'IDLE';
          this.attackTimer = 0;
        }
      }

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
      this.comboStep = 1;
      this.attackTimer = 0;
      this.comboBuffer = false;
      this.fsmState = 'ATTACK';
      this.executeComboImpact();
      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    // 2. FSM: DASH SUPERSÓNICO (Cualquier dirección)
    if (input.isDash && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = 0.24;
      this.dashCooldown = 0.55;
      this.fsmState = 'DASH';

      let dirX = input.isMoving ? input.dx : (this.facingX * 0.89);
      let dirY = input.isMoving ? input.dy : (this.facingY * 0.45);
      const len = Math.hypot(dirX, dirY);
      if (len > 0) {
        dirX /= len;
        dirY /= len;
      }
      this.dashDirX = dirX;
      this.dashDirY = dirY;

      this.scaleX = 1.35;
      this.scaleY = 0.76;
      this.spawnDust(6);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * this.dashSpeed;
      this.vy = this.dashDirY * this.dashSpeed;

      this.afterImageSpawnTimer += dt;
      if (this.afterImageSpawnTimer >= 0.03) {
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

  private executeComboImpact(): void {
    // Proyectar el punto de impacto de la Hitbox
    let ax = this.aimDirX;
    let ay = this.aimDirY;
    const len = Math.hypot(ax, ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
    }
    this.attackHitX = this.x + ax * (this.comboStep === 2 ? 45 : 38);
    this.attackHitY = this.y + ay * (this.comboStep === 2 ? 26 : 22);

    // Impulso físico hacia adelante en cada golpe
    const pushSpeed = this.comboStep === 2 ? 75 : 50;
    this.vx = ax * pushSpeed;
    this.vy = ay * (pushSpeed * 0.5);

    if (this.comboStep === 1) {
      this.scaleX = 1.18;
      this.scaleY = 0.88;
      this.spawnDust(3);
    } else if (this.comboStep === 2) {
      this.scaleX = 1.25;
      this.scaleY = 0.82; // Estiramiento frontal de estocada
      this.spawnDust(4);
    } else {
      this.scaleX = 0.85;
      this.scaleY = 1.22; // Elevación de tajo pesado
      this.spawnDust(5);
    }
  }

  private updateAnimationFrames(dt: number): void {
    if (this.fsmState === 'IDLE') {
      this.animTimer += dt;
      const frameDuration = 0.22;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 4;
    } else if (this.fsmState === 'WALK' || this.fsmState === 'RUN') {
      const currentSpeed = Math.hypot(this.vx, this.vy);
      const speedFactor = Math.max(0.5, currentSpeed / this.walkSpeed);
      this.animTimer += dt * speedFactor;

      const baseDuration = this.fsmState === 'RUN' ? 0.075 : 0.12;
      const totalFrames = this.fsmState === 'RUN' ? 8 : 6;
      this.currentFrame = Math.floor(this.animTimer / baseDuration) % totalFrames;

      if (this.currentFrame === 1 || this.currentFrame === 4) {
        if (Math.random() < 0.25) this.spawnDust(1);
      }
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
    if (!this.isDashing) return;
    for (const ghost of this.afterImages) {
      if (!ghost.active) {
        ghost.active = true;
        ghost.x = this.x;
        ghost.y = this.y;
        ghost.anim = this.fsmState;
        ghost.facingX = this.facingX;
        ghost.facingY = this.facingY;
        ghost.comboStep = this.comboStep;
        ghost.scaleX = this.scaleX;
        ghost.scaleY = this.scaleY;
        ghost.alpha = 0.28;
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
        ghost.alpha -= dt * 4.5;
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
        this.drawMasterSprite(ctx, ghost.facingY, ghost.anim, ghost.comboStep);
        ctx.restore();
      }
    }

    // 2. Sombra Elíptica 2:1 Anclada en los Pies
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

    // 4. Renderizar Personaje
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);
    ctx.scale(this.facingX * this.scaleX, this.scaleY);
    this.drawMasterSprite(ctx, this.facingY, this.fsmState, this.comboStep);
    ctx.restore();
  }

  private drawMasterSprite(ctx: CanvasRenderingContext2D, facingY: number, state: AnimationState, comboStep: number): void {
    const isBack = facingY < 0; // ¿Mira hacia el Norte/Espalda?

    // 1. RENDERIZAR COMBATE (Combo de 3 Golpes de Espada Rúnica)
    if (state === 'ATTACK') {
      const combatImg = AssetLoader.getImage('HERO_COMBAT');
      if (combatImg) {
        // hero_combat_combo.png: 3 columnas y 2 filas
        const frameW = combatImg.width / 3;
        const frameH = combatImg.height / 2;
        const colIdx = Math.min(2, comboStep - 1);
        const rowIdx = isBack ? 1 : 0; // Fila 0: Frente, Fila 1: Espalda

        const sx = colIdx * frameW;
        const sy = rowIdx * frameH;

        // El golpe 1 tiene estela ancha, el golpe 2 es estocada extendida, el golpe 3 es tajo al suelo
        const drawW = comboStep === 1 ? 64 : (comboStep === 2 ? 68 : 56);
        const drawH = 56;
        const offX = comboStep === 2 ? 14 : (comboStep === 1 ? 12 : 6);

        ctx.drawImage(
          combatImg,
          sx,
          sy,
          frameW,
          frameH,
          -Hero.BASE_W * 0.5 + offX,
          -drawH * 0.90,
          drawW,
          drawH
        );
        return;
      }
    }

    // 2. RENDERIZAR DASH
    if (state === 'DASH') {
      const dashImg = AssetLoader.getImage('HERO_DASH');
      if (dashImg) {
        // hero_dash.png: Fila 0: Frente, Fila 1: Espalda
        const frameW = dashImg.width / 4;
        const frameH = dashImg.height / 2;
        const rowIdx = isBack ? 1 : 0;
        const colIdx = 1; // Pose de impulso supersónico

        ctx.drawImage(
          dashImg,
          colIdx * frameW,
          rowIdx * frameH,
          frameW,
          frameH,
          -Hero.BASE_W * 0.5 + 8,
          -Hero.BASE_H * 0.90,
          54,
          Hero.BASE_H
        );
        return;
      }
    }

    // 3. RENDERIZAR LOCOMOCIÓN (IDLE, WALK, RUN)
    const locoImg = AssetLoader.getImage('HERO_LOCOMOTION');
    if (locoImg) {
      // hero_locomotion.png: 10 columnas, 4 filas
      // Fila 0: Frente (Idle cols 0-3, Walk cols 4-9)
      // Fila 1: Espalda (Idle cols 0-3, Walk cols 4-9)
      // Fila 2: Carrera Frente (cols 0-7)
      // Fila 3: Carrera Espalda (cols 0-7)
      const frameW = locoImg.width / 10;
      const frameH = locoImg.height / 4;

      let rowIdx = 0;
      let colIdx = 0;

      if (state === 'IDLE') {
        rowIdx = isBack ? 1 : 0;
        colIdx = this.currentFrame % 4;
      } else if (state === 'WALK') {
        rowIdx = isBack ? 1 : 0;
        colIdx = 4 + (this.currentFrame % 6);
      } else if (state === 'RUN') {
        rowIdx = isBack ? 3 : 2;
        colIdx = this.currentFrame % 8;
      }

      ctx.drawImage(
        locoImg,
        colIdx * frameW,
        rowIdx * frameH,
        frameW,
        frameH,
        -Hero.BASE_W * 0.5,
        -Hero.BASE_H * 0.90,
        Hero.BASE_W,
        Hero.BASE_H
      );
      return;
    }

    // Fallback de emergencia
    const frame = this.fallbackSpriteSheet.getFrame(state, this.direction, this.currentFrame);
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
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}
