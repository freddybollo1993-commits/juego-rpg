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
  dashFrame: number;
  scaleX: number;
  scaleY: number;
  alpha: number;
}

export interface AttackVFX {
  active: boolean;
  type: 'SLASH' | 'THRUST' | 'SLAM';
  x: number;
  y: number;
  angle: number;
  progress: number;
  duration: number;
  facingX: number;
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

  // Footprint Collision 2.5D elíptico en los pies
  public colRadiusX: number = 10;
  public colRadiusY: number = 5;

  public walkSpeed: number = 100;
  public runSpeed: number = 175;
  public dashSpeed: number = 420;

  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';

  // Orientación continua en 360° / 8 direcciones
  public aimDirX: number = 1;
  public aimDirY: number = 0.5;
  public facingX: number = 1;
  public facingY: number = 1;

  public animTimer: number = 0;
  public currentFrame: number = 0;

  // Dash Supersónico Ultra-Responsivo con Buffer
  public isDashing: boolean = false;
  public dashTimer: number = 0;
  public dashTotalDuration: number = 0.22;
  public dashCooldown: number = 0;
  public dashCooldownMax: number = 0.28;
  public dashDirX: number = 1;
  public dashDirY: number = 0;
  public dashFrame: number = 0;
  private dashBufferTimer: number = 0;

  // Sistema de Combo de 3 Golpes de Espada Rúnica (pixel-25d-master-animator)
  public isAttacking: boolean = false;
  public comboStep: number = 1; // 1 = Tajo Curvo, 2 = Estocada, 3 = Golpe Pesado al Suelo
  public attackTimer: number = 0;
  public attackDuration: number = 0.26;
  public attackHitboxActive: boolean = false;
  public comboBuffer: boolean = false;
  private attackBufferTimer: number = 0;
  public attackHitX: number = 0;
  public attackHitY: number = 0;

  public hitStopFrames: number = 0;

  // Juice Procedural a 60 FPS
  public scaleX: number = 1.0;
  public scaleY: number = 1.0;
  public targetScaleX: number = 1.0;
  public targetScaleY: number = 1.0;
  public tiltAngle: number = 0;
  public idleTime: number = 0;

  // Object Pooling para 60 FPS estables sin Garbage Collection
  private dustPool: DustParticle[] = [];
  private static readonly MAX_DUST = 35;

  private afterImages: AfterImage[] = [];
  private static readonly MAX_AFTERIMAGES = 14;
  private afterImageSpawnTimer: number = 0;

  private attackVfxPool: AttackVFX[] = [];
  private static readonly MAX_VFX = 6;

  public fallbackSpriteSheet: HeroSpriteSheet;

  // Tablas de anclaje de pies exactas medidas al pixel para estabilidad absoluta
  // Locomotion cell: 102.4 x 139.5 -> BASE_W(40) x BASE_H(54) => factor 0.3888
  private static readonly PIXEL_SCALE = 54 / 139.5; // ~0.3871

  // COMBAT: Cell 341.33 x 279
  private static readonly COMBAT_FEET: { [key: string]: { x: number; y: number } } = {
    'F_0': { x: 194, y: 231 },
    'F_1': { x: 185, y: 226 },
    'F_2': { x: 171, y: 235 },
    'B_0': { x: 181, y: 230 },
    'B_1': { x: 191, y: 226 },
    'B_2': { x: 168, y: 234 }
  };

  // DASH: Cell 256 x 279
  private static readonly DASH_FEET: { [key: string]: { x: number; y: number } } = {
    'F_0': { x: 134, y: 227 },
    'F_1': { x: 158, y: 226 },
    'F_2': { x: 105, y: 227 },
    'F_3': { x: 149, y: 236 },
    'B_0': { x: 136, y: 224 },
    'B_1': { x: 125, y: 223 },
    'B_2': { x: 120, y: 225 },
    'B_3': { x: 110, y: 225 }
  };

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
        dashFrame: 0,
        scaleX: 1,
        scaleY: 1,
        alpha: 0
      });
    }

    for (let i = 0; i < Hero.MAX_VFX; i++) {
      this.attackVfxPool.push({
        active: false,
        type: 'SLASH',
        x: 0,
        y: 0,
        angle: 0,
        progress: 0,
        duration: 0.22,
        facingX: 1
      });
    }
  }

  public update(dt: number, input: InputState): void {
    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      return;
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashBufferTimer > 0) this.dashBufferTimer -= dt;
    if (this.attackBufferTimer > 0) this.attackBufferTimer -= dt;

    // Capturar triggers de input en buffers para cero pérdida de pulsaciones
    if (input.isDash) {
      this.dashBufferTimer = 0.18; // buffer de 180ms
    }
    if (input.isAttack) {
      this.attackBufferTimer = 0.20; // buffer de 200ms
      if (this.isAttacking) {
        this.comboBuffer = true;
      }
    }

    // 1. DASH CANCELLATION & ACTIVATION (Prioridad de evasión inmediata)
    if (this.dashBufferTimer > 0 && this.dashCooldown <= 0) {
      // Dash puede cancelar ataque inmediatamente después del impacto para agilidad total
      this.startDash(input);
      this.dashBufferTimer = 0;
    }

    // Manejo de estado DASH activo
    if (this.isDashing) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * this.dashSpeed;
      this.vy = this.dashDirY * this.dashSpeed;

      // Animar las 4 fases biomecánicas del dash
      const dashProgress = 1.0 - Math.max(0, this.dashTimer / this.dashTotalDuration);
      if (dashProgress < 0.20) {
        this.dashFrame = 0; // Carga / Anticipación
      } else if (dashProgress < 0.55) {
        this.dashFrame = 1; // Impulso supersónico
      } else if (dashProgress < 0.80) {
        this.dashFrame = 2; // Deslizamiento / Estela
      } else {
        this.dashFrame = 3; // Frenado / Recuperación
      }

      this.afterImageSpawnTimer += dt;
      if (this.afterImageSpawnTimer >= 0.028) {
        this.afterImageSpawnTimer = 0;
        this.spawnAfterImage();
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.fsmState = input.isMoving ? (input.isRun ? 'RUN' : 'WALK') : 'IDLE';
        this.scaleX = 0.90;
        this.scaleY = 1.15; // Rebote elástico de aterrizaje
      }

      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.updateJuice(dt, false);
      this.updateParticles(dt);
      this.updateVFX(dt);
      return;
    }

    // 2. ACTUALIZACIÓN DE ORIENTACIÓN CONTINUA (8 DIRECCIONES Y 360°)
    if (input.isMoving && !this.isDashing) {
      this.updateOrientation(input.dx, input.dy);
    }

    // 3. FSM: COMBO DE 3 GOLPES DE ESPADA
    if (this.isAttacking) {
      this.attackTimer += dt;

      // Hitbox activa en la fase media de impacto
      this.attackHitboxActive = this.attackTimer >= 0.05 && this.attackTimer <= this.attackDuration * 0.75;

      if (this.attackTimer >= this.attackDuration) {
        // Encadenar siguiente golpe del combo si hubo buffer de ataque
        if ((this.comboBuffer || this.attackBufferTimer > 0) && this.comboStep < 3) {
          this.comboStep++;
          this.attackTimer = 0;
          this.comboBuffer = false;
          this.attackBufferTimer = 0;

          // Si el jugador redirige con el joystick o teclas, reorientar el siguiente golpe del combo
          if (input.isMoving) {
            this.updateOrientation(input.dx, input.dy);
          }

          this.executeComboImpact();
        } else {
          // Fin del combo, volver a locomoción o reposo
          this.isAttacking = false;
          this.attackHitboxActive = false;
          this.comboStep = 1;
          this.fsmState = input.isMoving ? (input.isRun ? 'RUN' : 'WALK') : 'IDLE';
          this.attackTimer = 0;
        }
      }

      // Desaceleración suave del avance del ataque
      this.vx *= 0.82;
      this.vy *= 0.82;
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      this.updateJuice(dt, false);
      this.updateParticles(dt);
      this.updateVFX(dt);
      return;
    }

    // Iniciar nuevo ataque si el buffer de ataque está activo
    if (this.attackBufferTimer > 0 && !this.isDashing) {
      if (input.isMoving) {
        this.updateOrientation(input.dx, input.dy);
      }
      this.isAttacking = true;
      this.comboStep = 1;
      this.attackTimer = 0;
      this.comboBuffer = false;
      this.attackBufferTimer = 0;
      this.fsmState = 'ATTACK';
      this.executeComboImpact();

      this.updateJuice(dt, false);
      this.updateParticles(dt);
      this.updateVFX(dt);
      return;
    }

    // 4. LOCOMOCIÓN NORMALIZADA
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

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.updateAnimationFrames(dt);
    this.updateJuice(dt, input.isMoving);
    this.updateParticles(dt);
    this.updateVFX(dt);
  }

  private updateOrientation(dx: number, dy: number): void {
    const len = Math.hypot(dx, dy);
    if (len < 0.05) return;

    this.aimDirX = dx / len;
    this.aimDirY = dy / len;

    // Eje X: Espejo horizontal (1 = Derecha / Este, -1 = Izquierda / Oeste)
    if (Math.abs(dx) > 0.05) {
      this.facingX = dx > 0 ? 1 : -1;
    }

    // Eje Y: Perspectiva 2.5D
    // Si apunta claramente hacia arriba (Norte/Espalda)
    if (dy < -0.15) {
      this.facingY = -1;
    } else if (dy > 0.15) {
      this.facingY = 1; // Frente/Sur
    } else {
      // Movimiento puramente horizontal: mirar al frente lateral
      this.facingY = 1;
    }

    // Clasificación 2.5D en 4 direcciones base
    if (this.facingY >= 0) {
      this.direction = this.facingX >= 0 ? 'SE' : 'SO';
    } else {
      this.direction = this.facingX >= 0 ? 'NE' : 'NO';
    }
  }

  private startDash(input: InputState): void {
    this.isDashing = true;
    this.isAttacking = false;
    this.attackHitboxActive = false;
    this.comboBuffer = false;
    this.attackTimer = 0;

    this.dashTimer = this.dashTotalDuration;
    this.dashCooldown = this.dashCooldownMax;
    this.fsmState = 'DASH';

    // Determinar vector de dash: si se mueve, dash hacia el input; si no, hacia donde mira
    let dirX = input.isMoving ? input.dx : this.aimDirX;
    let dirY = input.isMoving ? input.dy : this.aimDirY;
    const len = Math.hypot(dirX, dirY);
    if (len > 0.05) {
      dirX /= len;
      dirY /= len;
    } else {
      dirX = this.facingX * 0.89;
      dirY = this.facingY * 0.45;
    }
    this.dashDirX = dirX;
    this.dashDirY = dirY;

    // Actualizar orientación acorde al dash para sincronía perfecta
    if (Math.abs(dirX) > 0.05) {
      this.facingX = dirX > 0 ? 1 : -1;
    }
    if (dirY < -0.15) {
      this.facingY = -1;
    } else {
      this.facingY = 1;
    }
    this.direction = this.facingY >= 0 ? (this.facingX >= 0 ? 'SE' : 'SO') : (this.facingX >= 0 ? 'NE' : 'NO');

    this.scaleX = 1.38;
    this.scaleY = 0.72;
    this.spawnDust(6);
  }

  private executeComboImpact(): void {
    let ax = this.aimDirX;
    let ay = this.aimDirY;
    const len = Math.hypot(ax, ay);
    if (len > 0) {
      ax /= len;
      ay /= len;
    }

    // Duraciones calibradas por golpe
    if (this.comboStep === 1) {
      this.attackDuration = 0.26;
      this.attackHitX = this.x + ax * 38;
      this.attackHitY = this.y + ay * 22;
      this.vx = ax * 65;
      this.vy = ay * 35;
      this.scaleX = 1.18;
      this.scaleY = 0.88;
      this.spawnDust(3);
      this.spawnAttackVFX('SLASH', this.attackHitX, this.attackHitY, Math.atan2(ay, ax), 0.22);
    } else if (this.comboStep === 2) {
      this.attackDuration = 0.24;
      this.attackHitX = this.x + ax * 48;
      this.attackHitY = this.y + ay * 28;
      this.vx = ax * 95; // Estocada frontal con mayor penetración
      this.vy = ay * 45;
      this.scaleX = 1.28;
      this.scaleY = 0.80;
      this.spawnDust(4);
      this.spawnAttackVFX('THRUST', this.attackHitX, this.attackHitY, Math.atan2(ay, ax), 0.20);
    } else {
      this.attackDuration = 0.36; // Finisher pesado al suelo
      this.attackHitX = this.x + ax * 42;
      this.attackHitY = this.y + ay * 24;
      this.vx = ax * 40;
      this.vy = ay * 20;
      this.scaleX = 0.82;
      this.scaleY = 1.24;
      this.spawnDust(7);
      this.spawnAttackVFX('SLAM', this.attackHitX, this.attackHitY, Math.atan2(ay, ax), 0.32);
    }
  }

  private spawnAttackVFX(type: 'SLASH' | 'THRUST' | 'SLAM', x: number, y: number, angle: number, duration: number): void {
    for (const vfx of this.attackVfxPool) {
      if (!vfx.active) {
        vfx.active = true;
        vfx.type = type;
        vfx.x = x;
        vfx.y = y;
        vfx.angle = angle;
        vfx.progress = 0;
        vfx.duration = duration;
        vfx.facingX = this.facingX;
        break;
      }
    }
  }

  private updateVFX(dt: number): void {
    for (const vfx of this.attackVfxPool) {
      if (vfx.active) {
        vfx.progress += dt / vfx.duration;
        if (vfx.progress >= 1.0) {
          vfx.active = false;
        }
      }
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
        ghost.dashFrame = this.dashFrame;
        ghost.scaleX = this.scaleX;
        ghost.scaleY = this.scaleY;
        ghost.alpha = 0.35;
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
        ghost.alpha -= dt * 4.2;
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
        this.drawMasterSprite(ctx, ghost.facingY, ghost.anim, ghost.comboStep, ghost.dashFrame);
        ctx.restore();
      }
    }

    // 2. Sombra Elíptica 2:1 Anclada en el Suelo
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    ctx.ellipse(screenX, screenY - 2, 12 * this.scaleX, 6 * this.scaleY, 0, 0, Math.PI * 2);
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

    // 4. Renderizar Personaje Principal
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.tiltAngle);
    ctx.scale(this.facingX * this.scaleX, this.scaleY);
    this.drawMasterSprite(ctx, this.facingY, this.fsmState, this.comboStep, this.dashFrame);
    ctx.restore();

    // 5. Renderizar Efectos Visuales de Ataque Rúnico (VFX)
    this.renderAttackVFX(ctx, camX, camY);
  }

  private drawMasterSprite(
    ctx: CanvasRenderingContext2D,
    facingY: number,
    state: AnimationState,
    comboStep: number,
    dashFrame: number = 0
  ): void {
    const isBack = facingY < 0; // ¿Mira hacia la Espalda/Norte?

    // 1. RENDERIZAR COMBATE (Combo de 3 Golpes de Espada Rúnica)
    if (state === 'ATTACK') {
      const combatImg = AssetLoader.getImage('HERO_COMBAT');
      if (combatImg) {
        const frameW = combatImg.width / 3; // 341.33 px
        const frameH = combatImg.height / 2; // 279 px
        const colIdx = Math.min(2, Math.max(0, comboStep - 1));
        const rowIdx = isBack ? 1 : 0; // Fila 0: Frente, Fila 1: Espalda

        const sx = colIdx * frameW;
        const sy = rowIdx * frameH;

        // Escala idéntica a la locomoción para cero desproporción
        const drawW = frameW * Hero.PIXEL_SCALE; // ~132.2 px
        const drawH = frameH * Hero.PIXEL_SCALE; // ~108.0 px

        // Buscar anclaje medido del pie en el fotograma para estabilidad absoluta
        const key = `${isBack ? 'B' : 'F'}_${colIdx}`;
        const foot = Hero.COMBAT_FEET[key] || { x: 185, y: 230 };

        const drawX = -foot.x * Hero.PIXEL_SCALE;
        const drawY = -foot.y * Hero.PIXEL_SCALE;

        ctx.drawImage(combatImg, sx, sy, frameW, frameH, drawX, drawY, drawW, drawH);
        return;
      }
    }

    // 2. RENDERIZAR DASH (4 Fases Biomecánicas)
    if (state === 'DASH') {
      const dashImg = AssetLoader.getImage('HERO_DASH');
      if (dashImg) {
        const frameW = dashImg.width / 4; // 256 px
        const frameH = dashImg.height / 2; // 279 px
        const rowIdx = isBack ? 1 : 0;
        const colIdx = Math.min(3, Math.max(0, dashFrame));

        const sx = colIdx * frameW;
        const sy = rowIdx * frameH;

        const drawW = frameW * Hero.PIXEL_SCALE; // ~99.1 px
        const drawH = frameH * Hero.PIXEL_SCALE; // ~108.0 px

        const key = `${isBack ? 'B' : 'F'}_${colIdx}`;
        const foot = Hero.DASH_FEET[key] || { x: 130, y: 226 };

        const drawX = -foot.x * Hero.PIXEL_SCALE;
        const drawY = -foot.y * Hero.PIXEL_SCALE;

        ctx.drawImage(dashImg, sx, sy, frameW, frameH, drawX, drawY, drawW, drawH);
        return;
      }
    }

    // 3. RENDERIZAR LOCOMOCIÓN (IDLE, WALK, RUN)
    const locoImg = AssetLoader.getImage('HERO_LOCOMOTION');
    if (locoImg) {
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

  private renderAttackVFX(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const vfx of this.attackVfxPool) {
      if (!vfx.active) continue;

      const sx = Math.round(vfx.x - camX);
      const sy = Math.round(vfx.y - camY);
      const p = vfx.progress;
      const alpha = Math.sin(p * Math.PI);

      ctx.save();
      ctx.translate(sx, sy);

      if (vfx.type === 'SLASH') {
        // Tajo curvo de energía rúnica cian
        ctx.rotate(vfx.angle);
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4 * (1 - p * 0.5);
        ctx.shadowColor = '#0284c7';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const startAng = -Math.PI * 0.45;
        const endAng = Math.PI * 0.45;
        const currentEnd = startAng + (endAng - startAng) * Math.min(1, p * 1.5);
        ctx.arc(0, 0, 22 + p * 12, startAng, currentEnd);
        ctx.stroke();

        // Destello interior blanco
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      } else if (vfx.type === 'THRUST') {
        // Estocada lineal perforante
        ctx.rotate(vfx.angle);
        ctx.globalAlpha = alpha * 0.90;
        ctx.strokeStyle = '#67e8f9';
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(26 + p * 16, 0);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(26 + p * 16, 0, 3 * (1 - p), 0, Math.PI * 2);
        ctx.fill();
      } else if (vfx.type === 'SLAM') {
        // Impacto radial en el suelo 2:1
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3.2 * (1 - p);
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 12;

        const rx = 16 + p * 28;
        const ry = (16 + p * 28) * 0.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#e9d5ff';
        ctx.lineWidth = 1.5 * (1 - p);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  public getZIndex(): number {
    return Math.floor((this.x / 32 + this.y / 16) * 1000 + 5);
  }
}