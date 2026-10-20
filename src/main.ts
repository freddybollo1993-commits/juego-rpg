import './style.css';
import { Display } from './renderer/Display';
import { Camera } from './renderer/Camera';
import { InputManager } from './input/InputManager';
import { Hero } from './entities/Hero';
import { ShadowWolf } from './entities/ShadowWolf';
import { Golem } from './entities/Golem';
import { WorldEnvironment } from './world/WorldEnvironment';
import { AssetLoader } from './core/AssetLoader';
import { DebugHUD } from './ui/DebugHUD';

interface RenderableEntity {
  zIndex: number;
  render: (ctx: CanvasRenderingContext2D, camX: number, camY: number) => void;
}

class GameEngine {
  private display: Display;
  private camera: Camera;
  private input: InputManager;
  private hero: Hero;
  private wolf: ShadowWolf;
  private golem: Golem;
  private environment: WorldEnvironment;
  private hud: DebugHUD;

  private lastTimestamp: number = 0;
  private attackHitProcessed: boolean = false;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('No se encontró el elemento game-canvas');

    this.display = new Display(canvas);
    this.camera = new Camera(0, 0);
    this.input = new InputManager(canvas);

    this.hero = new Hero(0, 80);
    this.wolf = new ShadowWolf(140, 30);
    this.golem = new Golem(-130, -30);
    this.environment = new WorldEnvironment();
    this.hud = new DebugHUD(this.hero, this.input);

    this.init();
  }

  private async init(): Promise<void> {
    requestAnimationFrame((t) => this.loop(t));

    try {
      await AssetLoader.loadAll();
    } catch (e) {
      console.warn('AssetLoader background init:', e);
    }
  }

  private loop(timestamp: number): void {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    try {
      this.update(dt);
      this.render();
    } catch (err) {
      console.error('Error en loop:', err);
    }

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    this.input.update();

    // Actualizar Entidades
    this.hero.update(dt, this.input.state);
    this.wolf.update(dt, this.hero);
    this.golem.update(dt, this.hero);
    this.environment.update(dt, this.hero);

    // Cinemática de Combate: Hitbox Activa con Eje Z (pixel-25d-collision-physics-specialist)
    if (this.hero.attackHitboxActive) {
      if (!this.attackHitProcessed) {
        this.processHeroAttackHit();
        this.attackHitProcessed = true;
      }
    } else {
      this.attackHitProcessed = false;
    }

    // Separación física suave de masas entre entidades
    this.resolveEntitySeparation(this.hero, this.wolf);
    this.resolveEntitySeparation(this.hero, this.golem);
    this.resolveEntitySeparation(this.wolf, this.golem);

    // Cámara suave
    this.camera.follow(this.hero.x, this.hero.y);
    this.camera.update();

    // Actualizar HUD
    this.hud.update(this.hero);
  }

  // Comprobación de Hitbox de Espada con Knockback y Hit-Stop
  private processHeroAttackHit(): void {
    const attackRange = 55;
    const targets = [this.wolf, this.golem];

    for (const target of targets) {
      const dx = target.x - this.hero.x;
      const dy = target.y - this.hero.y;
      const dist = Math.hypot(dx, dy * 2);

      // Verificar si el objetivo está en el arco frontal del ataque
      const inFront = (this.hero.facingX > 0 && dx > -10) || (this.hero.facingX < 0 && dx < 10);

      if (dist < attackRange && inFront) {
        // Impacto exitoso
        target.health = Math.max(0, target.health - 25);
        if (target.health <= 0) {
          target.health = target.maxHealth; // Respawn instantáneo
        }

        // Knockback elástico
        const len = Math.max(1, Math.hypot(dx, dy));
        target.vx = (dx / len) * 220;
        target.vy = (dy / len) * 110;

        // Hit-Stop (Micro-congelación para peso físico del golpe)
        this.hero.hitStopFrames = 3;
        this.hero.spawnDust(4);
      }
    }
  }

  private resolveEntitySeparation(
    a: { x: number; y: number; colRadiusX?: number; colRadiusY?: number },
    b: { x: number; y: number; colRadiusX?: number; colRadiusY?: number }
  ): void {
    const rAx = a.colRadiusX || 9;
    const rAy = a.colRadiusY || 4.5;
    const rBx = b.colRadiusX || 16;
    const rBy = b.colRadiusY || 8;

    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const combinedRx = rAx + rBx;
    const combinedRy = rAy + rBy;

    const nx = dx / combinedRx;
    const ny = (dy * 2) / combinedRx;
    const distSq = nx * nx + ny * ny;

    if (distSq < 1.0 && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = 1.0 - dist;
      const pushX = (nx / dist) * overlap * combinedRx * 0.5;
      const pushY = (ny / dist) * overlap * combinedRy * 0.25;

      a.x += pushX;
      a.y += pushY;
      b.x -= pushX;
      b.y -= pushY;
    }
  }

  private render(): void {
    this.display.clear('#0c0e17');

    const ctx = this.display.ctx;
    const camX = this.camera.roundX;
    const camY = this.camera.roundY;
    const zoom = this.display.scale;

    ctx.save();
    ctx.translate(Math.floor(this.display.width / 2), Math.floor(this.display.height / 2));
    ctx.scale(zoom, zoom);

    // 1. TERRENO MODULAR 2:1
    const viewW = this.display.width / (2 * zoom);
    const viewH = this.display.height / (2 * zoom);
    this.environment.renderTerrain(ctx, camX, camY, zoom, viewW, viewH);

    // 2. DEPTH SORTING UNIFICADO (Z-Ordering 2:1)
    const renderQueue: RenderableEntity[] = [];

    // Props
    for (const prop of this.environment.props) {
      const zIndex = Math.floor((prop.x / 32 + prop.y / 16) * 1000 + 4);
      renderQueue.push({
        zIndex,
        render: (c, cx, cy) => this.environment.renderProp(c, prop, cx, cy)
      });
    }

    // Lobo
    renderQueue.push({
      zIndex: this.wolf.getZIndex(),
      render: (c, cx, cy) => this.wolf.render(c, cx, cy)
    });

    // Gólem
    renderQueue.push({
      zIndex: this.golem.getZIndex(),
      render: (c, cx, cy) => this.golem.render(c, cx, cy)
    });

    // Héroe
    renderQueue.push({
      zIndex: this.hero.getZIndex(),
      render: (c, cx, cy) => this.hero.render(c, cx, cy)
    });

    renderQueue.sort((a, b) => a.zIndex - b.zIndex);

    for (const item of renderQueue) {
      item.render(ctx, camX, camY);
    }

    ctx.restore();

    // 3. JOYSTICK VIRTUAL TÁCTIL
    if (this.input.joystickActive) {
      this.renderVirtualJoystick();
    }
  }

  private renderVirtualJoystick(): void {
    const ctx = this.display.ctx;
    const { originX, originY, currX, currY } = this.input.joystickPos;

    ctx.save();
    ctx.beginPath();
    ctx.arc(originX, originY, 45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.stroke();

    const maxRadius = 45;
    const dx = currX - originX;
    const dy = currY - originY;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const knobX = originX + Math.cos(angle) * clampedDist;
    const knobY = originY + Math.sin(angle) * clampedDist;

    ctx.beginPath();
    ctx.arc(knobX, knobY, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
