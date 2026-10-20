import './style.css';
import { Display } from './renderer/Display';
import { Camera } from './renderer/Camera';
import { InputManager } from './input/InputManager';
import { Hero } from './entities/Hero';
import { TerrainTileGenerator } from './graphics/TerrainTile';
import { DebugHUD } from './ui/DebugHUD';

class GameEngine {
  private display: Display;
  private camera: Camera;
  private input: InputManager;
  private hero: Hero;
  private hud: DebugHUD;

  // Tiles horneados para el entorno de prueba
  private grassTile: HTMLCanvasElement;
  private stoneTile: HTMLCanvasElement;

  // Mapa de terreno de prueba 2.5D (grid de bloques isométricos)
  private mapRadius: number = 10; // 21x21 tiles isométricos
  private lastTimestamp: number = 0;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('No se encontró el elemento game-canvas');

    this.display = new Display(canvas);
    this.camera = new Camera(0, 0);
    this.input = new InputManager(canvas);
    this.hero = new Hero(0, 0);
    this.hud = new DebugHUD(this.hero, this.input);

    // Hornear tiles procedurales según las reglas de procedural-pixel-25d-architect
    this.grassTile = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.GRASS_PALETTE);
    this.stoneTile = TerrainTileGenerator.createBlockCanvas(TerrainTileGenerator.STONE_PALETTE);

    // Iniciar loop principal
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(timestamp: number): void {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1); // Capping para evitar saltos enormes
    this.lastTimestamp = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    // 1. Actualizar Inputs
    this.input.update();

    // 2. Actualizar Entidad Héroe con Cinemática e Inercia
    this.hero.update(dt, this.input.state);

    // 3. Seguimiento Suave de Cámara (Lerp)
    this.camera.follow(this.hero.x, this.hero.y);
    this.camera.update();

    // 4. Actualizar HUD
    this.hud.update(this.hero);
  }

  private render(): void {
    // Limpiar canvas con tono crepuscular profundo
    this.display.clear('#0e111a');

    const ctx = this.display.ctx;
    const camX = this.camera.roundX;
    const camY = this.camera.roundY;
    const zoom = this.display.scale;

    ctx.save();
    // Centrar en pantalla y aplicar escala Pixel-Art
    ctx.translate(Math.floor(this.display.width / 2), Math.floor(this.display.height / 2));
    ctx.scale(zoom, zoom);

    // 1. RENDERIZAR TERRENO ISOMÉTRICO 2:1
    // Fórmula de conversión isométrica:
    // screenX = (gridX - gridY) * (TILE_W * 0.5)
    // screenY = (gridX + gridY) * (TILE_H * 0.5)
    const tileW = TerrainTileGenerator.TILE_W; // 64
    const tileH = TerrainTileGenerator.TILE_H; // 32
    const halfW = tileW * 0.5; // 32
    const halfH = tileH * 0.5; // 16

    // Dibujamos el terreno ordenado por profundidad isométrica
    for (let gy = -this.mapRadius; gy <= this.mapRadius; gy++) {
      for (let gx = -this.mapRadius; gx <= this.mapRadius; gx++) {
        const isoX = (gx - gy) * halfW;
        const isoY = (gx + gy) * halfH;

        const screenX = Math.round(isoX - camX);
        const screenY = Math.round(isoY - camY);

        // Frustum Culling rápido: omitir si está fuera de la pantalla
        const margin = 100;
        const viewHalfW = this.display.width / (2 * zoom) + margin;
        const viewHalfH = this.display.height / (2 * zoom) + margin;
        if (screenX < -viewHalfW || screenX > viewHalfW || screenY < -viewHalfH || screenY > viewHalfH) {
          continue;
        }

        // Variación de losetas: plaza central de adoquín de piedra y campo de césped
        const distFromOrigin = Math.max(Math.abs(gx), Math.abs(gy));
        const tile = distFromOrigin <= 2 ? this.stoneTile : this.grassTile;

        // Dibujar el bloque base anclado en su centro superior
        ctx.drawImage(tile, screenX - halfW, screenY);
      }
    }

    // 2. RENDERIZAR HÉROE (con sombra 2:1, afterimages, partículas y squash)
    this.hero.render(ctx, camX, camY);

    ctx.restore();

    // 3. RENDERIZAR JOYSTICK VIRTUAL FLOTANTE (Si está activo en móvil)
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
    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.stroke();

    // Pomo interior que sigue el dedo
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
    ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }
}

// Iniciar motor al cargar el DOM
window.addEventListener('DOMContentLoaded', () => {
  new GameEngine();
});
