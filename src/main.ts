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
  private assetsLoaded: boolean = false;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('No se encontró el elemento game-canvas');

    this.display = new Display(canvas);
    this.camera = new Camera(0, 0);
    this.input = new InputManager(canvas);

    // Entidades del Juego
    this.hero = new Hero(0, 80);
    this.wolf = new ShadowWolf(140, 20);
    this.golem = new Golem(-130, -30);
    this.environment = new WorldEnvironment();
    this.hud = new DebugHUD(this.hero, this.input);

    this.init();
  }

  private async init(): Promise<void> {
    // Carga asíncrona de texturas y spritesheets
    await AssetLoader.loadAll();
    this.assetsLoaded = true;

    // Iniciar loop principal
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number): void {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    this.input.update();

    // Actualizar Entidades
    this.hero.update(dt, this.input.state);
    this.wolf.update(dt, this.hero);
    this.golem.update(dt, this.hero);
    this.environment.update(dt, this.hero);

    // Cámara suave con seguimiento dinámico
    this.camera.follow(this.hero.x, this.hero.y);
    this.camera.update();

    // Actualizar HUD
    this.hud.update(this.hero);
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

    // 1. RENDERIZAR TERRENO MODULAR 2:1
    const viewW = this.display.width / (2 * zoom);
    const viewH = this.display.height / (2 * zoom);
    this.environment.renderTerrain(ctx, camX, camY, zoom, viewW, viewH);

    // 2. DEPTH SORTING UNIFICADO (Z-Ordering dinámico a 60 FPS)
    // zIndex = (gridX + gridY) * 1000 + (z * 10) + layerOffset
    const renderQueue: RenderableEntity[] = [];

    // Props ambientales
    for (const prop of this.environment.props) {
      const zIndex = Math.floor((prop.x / 32 + prop.y / 16) * 1000 + 4);
      renderQueue.push({
        zIndex,
        render: (c, cx, cy) => this.environment.renderProp(c, prop, cx, cy)
      });
    }

    // Criatura: Lobo de Sombra
    renderQueue.push({
      zIndex: this.wolf.getZIndex(),
      render: (c, cx, cy) => this.wolf.render(c, cx, cy)
    });

    // Criatura: Gólem Rúnico
    renderQueue.push({
      zIndex: this.golem.getZIndex(),
      render: (c, cx, cy) => this.golem.render(c, cx, cy)
    });

    // Protagonista: Héroe
    renderQueue.push({
      zIndex: this.hero.getZIndex(),
      render: (c, cx, cy) => this.hero.render(c, cx, cy)
    });

    // Ordenar por Z-Index ascendente
    renderQueue.sort((a, b) => a.zIndex - b.zIndex);

    // Dibujar todos los elementos ordenados
    for (const item of renderQueue) {
      item.render(ctx, camX, camY);
    }

    ctx.restore();

    // 3. JOYSTICK VIRTUAL TÁCTIL (Móvil)
    if (this.input.joystickActive) {
      this.renderVirtualJoystick();
    }
  }

  private renderVirtualJoystick(): void {
    const ctx = this.display.ctx;
    const { originX, originY, currX, currY } = this.input.joystickPos;

    ctx.save();
    // Base exterior translúcida
    ctx.beginPath();
    ctx.arc(originX, originY, 45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
    ctx.stroke();

    // Pomo interior
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
