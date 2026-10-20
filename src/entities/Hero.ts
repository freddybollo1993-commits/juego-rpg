// Entidad del Héroe construida bajo las especificaciones de pixel-25d-kinematics-animator
import { HeroSpriteSheet, Direction4, AnimationState } from '../graphics/HeroSpriteSheet';
import { InputState } from '../input/InputManager';

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
  // Posición continua en el plano del mundo 2.5D
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;

  // Velocidades continuas
  public vx: number = 0;
  public vy: number = 0;

  // Parámetros de velocidad
  public walkSpeed: number = 110; // px/segundo
  public runSpeed: number = 190;
  public dashSpeed: number = 380;

  // FSM y Orientación
  public fsmState: AnimationState = 'IDLE';
  public direction: Direction4 = 'SE';
  public animTimer: number = 0;
  public currentFrame: number = 0;

  // Temporizadores y estados especiales
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
  public tiltAngle: number = 0; // Inclinación por inercia
  public idleTime: number = 0;

  // Object Pooling: Partículas de Polvo
  private dustPool: DustParticle[] = [];
  private static readonly MAX_DUST = 40;

  // Object Pooling: Afterimages (Ghosting)
  private afterImages: AfterImage[] = [];
  private static readonly MAX_AFTERIMAGES = 12;
  private afterImageSpawnTimer: number = 0;

  // SpriteSheet horneado
  public spriteSheet: HeroSpriteSheet;

  constructor(initialX: number = 0, initialY: number = 0) {
    this.x = initialX;
    this.y = initialY;
    this.spriteSheet = new HeroSpriteSheet();

    // Inicializar Object Pool de Polvo
    for (let i = 0; i < Hero.MAX_DUST; i++) {
      this.dustPool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2,
        alpha: 0,
        maxLife: 0.4,
        life: 0
      });
    }

    // Inicializar Object Pool de Afterimages
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
    // 1. Manejo de Hit-Stop (Impact Freeze)
    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      return;
    }

    // Actualizar Cooldowns
    if (this.dashCooldown > 0) this.dashCooldown -= dt;

    // 2. Transición y FSM de Ataque
    if (this.fsmState === 'ATTACK') {
      this.attackTimer += dt;
      this.currentFrame = Math.min(2, Math.floor(this.attackTimer / 0.1));
      if (this.attackTimer >= 0.3) {
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
      // Squash elástico en inicio de ataque
      this.scaleX = 1.15;
      this.scaleY = 0.88;
      this.spawnDust(3);
      this.updateJuice(dt, false);
      this.updateParticles(dt);
      return;
    }

    // 3. Manejo de Dash (Esquiva Cinética)
    if (input.isDash && this.dashCooldown <= 0 && (input.isMoving || this.fsmState === 'RUN' || this.fsmState === 'WALK')) {
      this.isDashing = true;
      this.dashTimer = 0.22; // 220ms de impulso
      this.dashCooldown = 0.65;
      this.fsmState = 'DASH';
      // Squash & Stretch dinámico: estiramiento frontal y compresión vertical
      this.scaleX = 1.25;
      this.scaleY = 0.8;
      this.spawnDust(6);
    }

    if (this.isDashing) {
      this.dashTimer -= dt;
      const speed = this.dashSpeed;
      this.vx = input.dx * speed;
      this.vy = input.dy * speed;

      // Generar Afterimages con frecuencia
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
      // 4. Locomoción Normalizada (Walk / Run / Idle)
      if (input.isMoving) {
        const isRun = input.isRun;
        const currentSpeed = isRun ? this.runSpeed : this.walkSpeed;
        this.vx = input.dx * currentSpeed;
        this.vy = input.dy * currentSpeed;

        const prevState = this.fsmState;
        this.fsmState = isRun ? 'RUN' : 'WALK';

        // Polvo en cambio brusco o arranque
        if (prevState === 'IDLE') {
          this.spawnDust(4);
          this.scaleX = 0.9;
          this.scaleY = 1.15; // Estirón vertical al arrancar
        }

        // Mapeo a las 4 direcciones isométricas 2:1
        this.updateIsometricDirection(input.dx, input.dy);
      } else {
        // Frenado suave
        this.vx *= 0.7;
        this.vy *= 0.7;
        if (Math.hypot(this.vx, this.vy) < 5) {
          this.vx = 0;
          this.vy = 0;
        }
        if (this.fsmState !== 'IDLE' && this.vx === 0 && this.vy === 0) {
          this.fsmState = 'IDLE';
          // Rebote suave al detenerse
          this.scaleX = 1.08;
          this.scaleY = 0.94;
        }
      }
    }

    // Aplicar desplazamiento
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 5. Ciclo de Animación
    this.updateAnimationFrames(dt);

    // 6. Juice & Polish Procedural (Squash, Stretch, Respiración, Inclinación)
    this.updateJuice(dt, input.isMoving);

    // 7. Actualizar pools de partículas
    this.updateParticles(dt);
  }

  // Mapeo vectorial estricto a las 4 direcciones isométricas (2:1)
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
      const frameDuration = 0.22;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 4;
    } else if (this.fsmState === 'WALK') {
      const frameDuration = 0.12;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
      // Pequeño polvo en la pisada
      if (this.currentFrame === 1 || this.currentFrame === 4) {
        if (Math.random() < 0.25) this.spawnDust(1);
      }
    } else if (this.fsmState === 'RUN') {
      const frameDuration = 0.085;
      this.currentFrame = Math.floor(this.animTimer / frameDuration) % 6;
      if (this.currentFrame === 1 || this.currentFrame === 4) {
        this.spawnDust(1);
      }
    } else if (this.fsmState === 'DASH') {
      this.currentFrame = 0;
    }
  }

  // Juicing procedural: Squash & Stretch, respiración Idle e inclinación dinámica
  private updateJuice(dt: number, isMoving: boolean): void {
    // 1. Respiración sutil en IDLE: scaleY = 1.0 + Math.sin(time * 4) * 0.03
    if (this.fsmState === 'IDLE') {
      this.idleTime += dt;
      this.targetScaleY = 1.0 + Math.sin(this.idleTime * 4.0) * 0.035;
      this.targetScaleX = 1.0 - Math.sin(this.idleTime * 4.0) * 0.02;
      this.tiltAngle = 0;
    } else {
      this.idleTime = 0;
      this.targetScaleX = 1.0;
      this.targetScaleY = 1.0;

      // Inclinación aerodinámica (Lean) en X según velocidad lateral
      const maxTilt = 0.08;
      const targetTilt = (this.vx / this.runSpeed) * maxTilt;
      this.tiltAngle += (targetTilt - this.tiltAngle) * 0.2;
    }

    // Amortiguación elástica de retorno hacia los valores objetivo
    const springSpeed = 12.0;
    this.scaleX += (this.targetScaleX - this.scaleX) * Math.min(1, springSpeed * dt);
    this.scaleY += (this.targetScaleY - this.scaleY) * Math.min(1, springSpeed * dt);
  }

  // Object Pooling: Generar Polvo cinético
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

  // Object Pooling: Generar Afterimages (Estelas de sombra)
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
    // Actualizar partículas de polvo
    for (const p of this.dustPool) {
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = (p.life / p.maxLife) * 0.6;
          p.radius *= 1.01; // Ligera expansión
        }
      }
    }

    // Actualizar afterimages
    for (const ghost of this.afterImages) {
      if (ghost.active) {
        ghost.alpha -= dt * 2.8;
        if (ghost.alpha <= 0) {
          ghost.active = false;
        }
      }
    }
  }

  // Renderizado del Personaje con Sombra 2:1 desacoplada y transformaciones elásticas
  public render(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const screenX = Math.round(this.x - camX);
    const screenY = Math.round(this.y - camY);

    // 1. RENDERIZAR AFTERIMAGES (Estelas de Dash)
    for (const ghost of this.afterImages) {
      if (ghost.active) {
        const gx = Math.round(ghost.x - camX);
        const gy = Math.round(ghost.y - camY);
        const frame = this.spriteSheet.getFrame(ghost.anim, ghost.dir, ghost.frameIndex);

        ctx.save();
        ctx.globalAlpha = ghost.alpha;
        ctx.translate(gx, gy);
        ctx.scale(ghost.scaleX, ghost.scaleY);
        // Dibujar silueta tintada
        ctx.drawImage(
          this.spriteSheet.canvas,
          frame.sx,
          frame.sy,
          HeroSpriteSheet.FRAME_W,
          HeroSpriteSheet.FRAME_H,
          -HeroSpriteSheet.ANCHOR_X,
          -HeroSpriteSheet.ANCHOR_Y,
          HeroSpriteSheet.FRAME_W,
          HeroSpriteSheet.FRAME_H
        );
        ctx.restore();
      }
    }

    // 2. SOMBRA ELÍPTICA 2:1 DESACOPLADA (pixel-25d-ambient-asset-specialist)
    // Sombra en el suelo con ratio 2:1 (ancho = 26px, alto = 13px), alpha = 0.38
    ctx.save();
    ctx.fillStyle = '#0b0c14';
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    // La sombra se escala ligeramente con el squash
    const shadowRx = 13 * this.scaleX;
    const shadowRy = 6.5 * this.scaleY;
    ctx.ellipse(screenX, screenY - 2, shadowRx, shadowRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. RENDERIZAR PARTÍCULAS DE POLVO BAJO LOS PIES
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

    // 4. RENDERIZAR SPRITE DEL PERSONAJE CON JUICE PROCEDURAL
    const frame = this.spriteSheet.getFrame(this.fsmState, this.direction, this.currentFrame);

    ctx.save();
    ctx.translate(screenX, screenY);
    // Aplicar inclinación dinámica y squash & stretch
    ctx.rotate(this.tiltAngle);
    ctx.scale(this.scaleX, this.scaleY);

    // Dibujar frame pixel-perfect anclado exactamente en los pies (anchor 0.5, 0.92)
    ctx.drawImage(
      this.spriteSheet.canvas,
      frame.sx,
      frame.sy,
      HeroSpriteSheet.FRAME_W,
      HeroSpriteSheet.FRAME_H,
      -HeroSpriteSheet.ANCHOR_X,
      -HeroSpriteSheet.ANCHOR_Y,
      HeroSpriteSheet.FRAME_W,
      HeroSpriteSheet.FRAME_H
    );

    ctx.restore();
  }

  // Cálculo de Z-Index Dinámico Sincronizado conforme a la regla:
  // zIndex = (gridX + gridY) * 1000 + (z * 10) + 5
  public getZIndex(tileW: number = 64, tileH: number = 32): number {
    const gridX = (this.x / (tileW * 0.5) + this.y / (tileH * 0.5)) * 0.5;
    const gridY = (this.y / (tileH * 0.5) - this.x / (tileW * 0.5)) * 0.5;
    return Math.floor((gridX + gridY) * 1000 + this.z * 10 + 5);
  }
}
