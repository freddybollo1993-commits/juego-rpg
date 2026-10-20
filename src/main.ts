import './style.css';
import { Display } from './renderer/Display';
import { Camera } from './renderer/Camera';
import { InputManager } from './input/InputManager';
import { Hero } from './entities/Hero';
import { WorldEnvironment } from './world/WorldEnvironment';
import { AssetLoader } from './core/AssetLoader';
import { DebugHUD } from './ui/DebugHUD';

class GameEngine {
  private display: Display;
  private camera: Camera;
  private input: InputManager;
  private hero: Hero;
  private environment: WorldEnvironment;
  private hud: DebugHUD;

  private lastTimestamp: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('No se encontró el elemento game-canvas');

    this.display = new Display(canvas);
    this.camera = new Camera(0, 0);
    this.input = new InputManager(canvas);

    // Solo el personaje principal y el entorno de suelo limpio
    this.hero = new Hero(0, 0);
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

    // Actualizar únicamente el héroe y la cámara
    this.hero.update(dt, this.input.state);
    this.environment.update(dt, this.hero);

    // Seguimiento suave de la cámara
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

    // 1. RENDERIZAR ÚNICAMENTE EL SUELO
    const viewW = this.display.width / (2 * zoom);
    const viewH = this.display.height / (2 * zoom);
    this.environment.renderTerrain(ctx, camX, camY, zoom, viewW, viewH);

    // 2. RENDERIZAR ÚNICAMENTE AL PERSONAJE PRINCIPAL
    this.hero.render(ctx, camX, camY);

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
