// Entidad del Héroe Principal con Movilidad Libre 2.5D en 360°, Dash Direccional y Arco de Ataque Orientado
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

  // Escala compacta 1:1 con bloques de 64x32
  public static readonly BASE_W = 38;
  public static readonly BASE_H = 52;

  // Footprint Collision Sólido
  public colRadiusX: number = 10;
  public colRadiusY: number = 5;

  public walkSpeed: number = 100;
  public runSpeed: number = 175;
  public dashSpeed: number = 360;

  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';

  // Vector de orientación y puntería en 360°
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

  // Ataque
  public isAttacking: boolean = false;
  public attackTimer: number = 0;
  public attackHitboxActive: boolean = false;
  public attackAngle: number = 0; // Ángulo en radianes del tajo actual
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

    // Actualizar vector continuo de orientación en 360° (Aim Vector)
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

    // 1. FSM: ATAQUE MULTIDIRECCIONAL EN CUALQUIER DIRECCIÓN
    if (this.isAttacking) {
      this.attackTimer += dt;
      // 4 frames: 0 (0-0.08s), 1 (0.08-0.18s), 2 (0.18-0.28s), 3 (0.28-0.36s)
      if (this.attackTimer < 0.08) {
        this.currentFrame = 0;
        this.attackHitboxActive = false;
      } else if (this.attackTimer < 0.18) {
        this.currentFrame = 1;
        this.attackHitboxActive = true;
      } else if (this.attackTimer < 0.28) {
        this.currentFrame = 2;
        this.attackHitboxActive = true;
      } else if (this.attackTimer < 0.36) {
        this.currentFrame = 3;
        this.attackHitboxActive = false;
      } else {
        this.isAttacking = false;
        this.attackHitboxActive = false;
        this.fsmState = input.isMoving ? 'WALK' : 'IDLE';
        this.attackTimer = 0;
      }

      // Desplazamiento inercial del ataque hacia la dirección apuntada
      this.vx *= 0.82;
      this.vy *= 0.82;
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

      // Fijar el ángulo del ataque hacia la dirección exacta apuntada (input o último facing)
      let ax = input.isMoving ? input.dx : (this.facingX * 0.89);
      let ay = input.isMoving ? input.dy : (this.facingY * 0.45);
      const len = Math.hypot(ax, ay);
      if (len > 0) {
        ax /= len;
        ay /= len;
      }
      this.aimDirX = ax;
      this.aimDirY = ay;
      this.attackAngle = Math.atan2(ay * 2, ax); // Ángulo corregido a proporción 2:1

      // Calcular centro de impacto de la Hitbox
      this.attackHitX = this.x + this.aimDirX * 38;
      this.attackHitY = this.y + this.aimDirY * 22;

      // Paso inercial al lanzar el tajo
      this.vx = this.aimDirX * 65;
      this.vy = this.aimDirY * 45;

      this.scaleX = 1.18;
      this.scaleY = 0.86;
      this.spawnDust(3);
      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    // 2. FSM: DASH MULTIDIRECCIONAL EN 360°
    if (input.isDash && this.dashCooldown <= 0) {
      this.isDashing = true;
      this.dashTimer = 0.24;
      this.dashCooldown = 0.55;
      this.fsmState = 'DASH';

      // Impulso hacia el vector de dirección exacto (input activo o última orientación)
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
      if (this.afterImageSpawnTimer >= 0.032) {
        this.afterImageSpawnTimer = 0;
        this.spawnAfterImage();
      }

      if (this.dashTimer <= 0) {
        this.isDashing = false;
        this.fsmState = input.isMoving ? 'RUN' : 'IDLE';
      }
    } else {
      // 3. MOVILIDAD LIBRE CONTINUA (WALK / RUN / IDLE)
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
    if (this.fsmState === 'IDLE') {
      this.animTimer += dt;
      const frameDuration = 0.22;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 4;
    } else if (this.fsmState === 'WALK' || this.fsmState === 'RUN') {
      // Sincronización estricta de animSpeed con velocidad real para eliminar 'Moonwalking' (pixel-25d-master-animator)
      const currentSpeed = Math.hypot(this.vx, this.vy);
      const speedFactor = Math.max(0.5, currentSpeed / this.walkSpeed);
      this.animTimer += dt * speedFactor;

      const baseDuration = this.fsmState === 'RUN' ? 0.08 : 0.12;
      this.currentFrame = Math.floor(this.animTimer / baseDuration) % 6;

      // Partícula de polvo exactamente en el frame de contacto del pie (Contacto en frames 1 y 4)
      if (this.currentFrame === 1 || this.currentFrame === 4) {
        if (Math.random() < 0.25) this.spawnDust(1);
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
    if (!this.isDashing) return; // Solo durante el Dash
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
        ghost.alpha -= dt * 4.5; // Desvanecimiento rápido y elegante
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

    // 5. RENDERIZAR ARCO DE ENERGÍA CIAN DIRECCIONAL (Slash VFX en 360°)
    if (this.isAttacking && (this.currentFrame === 1 || this.currentFrame === 2)) {
      this.renderDirectionalSlashArc(ctx, screenX, screenY);
    }
  }

  // Dibuja el arco curvo de energía luminosa cian alineado exactamente con la dirección del ataque
  private renderDirectionalSlashArc(ctx: CanvasRenderingContext2D, sx: number, sy: number): void {
    ctx.save();
    ctx.translate(sx, sy - 20); // Altura del pecho/espada
    ctx.rotate(this.attackAngle);

    const arcRadius = 32;
    const progress = this.currentFrame === 1 ? 0.6 : 1.0;

    // Resplandor cian exterior
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, -Math.PI * 0.35 * progress, Math.PI * 0.35 * progress);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.stroke();

    // Núcleo brillante blanco-cian interior
    ctx.beginPath();
    ctx.arc(0, 0, arcRadius, -Math.PI * 0.30 * progress, Math.PI * 0.30 * progress);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }

  private drawSpriteTexture(ctx: CanvasRenderingContext2D): void {
    // Si ataca:
    if (this.fsmState === 'ATTACK') {
      const attackImg = AssetLoader.getImage('HERO_ATTACK');
      if (attackImg && attackImg.complete && attackImg.naturalWidth > 0) {
        // Si ataca hacia arriba/Norte, usamos la fila superior o postura de espaldas
        const useSwRow = this.facingX < 0;
        const attackFrames = useSwRow
          ? [
              { sx: 40, sy: 380, sw: 60, sh: 160, drawW: 38, drawH: 52, offX: 0 },
              { sx: 290, sy: 380, sw: 195, sh: 160, drawW: 68, drawH: 52, offX: 14 },
              { sx: 600, sy: 380, sw: 185, sh: 160, drawW: 65, drawH: 52, offX: 12 },
              { sx: 908, sy: 380, sw: 50, sh: 160, drawW: 38, drawH: 52, offX: 0 }
            ]
          : [
              { sx: 35, sy: 65, sw: 70, sh: 195, drawW: 38, drawH: 52, offX: 0 },
              { sx: 225, sy: 65, sw: 275, sh: 195, drawW: 75, drawH: 52, offX: 16 },
              { sx: 555, sy: 65, sw: 240, sh: 195, drawW: 70, drawH: 52, offX: 14 },
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
        colIndex = 5; // Vista de espaldas
      } else {
        rowIndex = 0;
        colIndex = this.currentFrame % 4;
      }
    } else if (this.fsmState === 'WALK') {
      if (this.facingY < 0) {
        rowIndex = 3; // Caminar hacia arriba
        colIndex = (this.currentFrame % 6);
      } else {
        rowIndex = 1; // Caminar hacia abajo
        colIndex = (this.currentFrame % 6);
      }
    } else if (this.fsmState === 'RUN') {
      rowIndex = this.facingY < 0 ? 1 : 0;
      colIndex = (this.currentFrame % 6);
    } else if (this.fsmState === 'DASH') {
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
