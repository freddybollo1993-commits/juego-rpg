// Game.ts - Bucle principal. Mundo base: mapa visto de frente por turnos, niebla de guerra,
// oscuridad, clima y escenografia. Cada accion del jugador avanza el reloj del mundo.

import { Player } from '../entities/Player';
import { REGIONS_DATA, RegionData, DEFAULT_REGION_ID } from '../data/regions';
import { WeatherSystem } from '../systems/WeatherSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { dayNightCycle } from '../systems/DayNightCycle';
import { HUD } from '../ui/HUD';
import { TileGrid } from './TileGrid';
import { TILE_SIZE } from './Metrics';
import { TurnSystem } from './TurnSystem';
import { tileAtlas } from './TileAtlas';
import { propAtlas } from './PropAtlas';
import { DecorLayer } from './DecorLayer';
import { soundManager } from '../audio/SoundManager';

const SIGHT_RADIUS = 4; // casillas que el jugador ve a su alrededor
// El halo de luz se queda un poco por dentro del radio de vision para que se funda con la niebla
// en vez de cortarse.
const LIGHT_RADIUS_PX = Math.round(SIGHT_RADIUS * TILE_SIZE * 0.95);
const BACKGROUND = '#05070b'; // mas alla del borde exterior del piso: oscuridad total

export class Game {
  public grid: TileGrid = new TileGrid();
  public turnSystem: TurnSystem = new TurnSystem(dayNightCycle);
  public player: Player = new Player();
  public decor: DecorLayer = new DecorLayer();
  public currentRegion: RegionData = REGIONS_DATA[DEFAULT_REGION_ID];
  public cameraX: number = 0;
  public cameraY: number = 0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private weather: WeatherSystem = new WeatherSystem();
  private hud: HUD = new HUD();
  private lastTime: number = 0;
  private lastDelta: number = 0.016;
  private isRunning: boolean = false;
  private notificationMessage: string = '';
  private notificationTimer: number = 0;
  private renderables: { y: number; draw: () => void }[] = [];

  constructor(canvas: HTMLCanvasElement, requestedRegionId?: string | null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    tileAtlas.preloadAll();
    propAtlas.preloadAll();

    const saved = SaveSystem.load();
    const requested = requestedRegionId && REGIONS_DATA[requestedRegionId] ? requestedRegionId : null;
    // La partida guardada solo se usa si no se pidio explicitamente otro bioma
    const resume = saved && REGIONS_DATA[saved.regionId] && (!requested || requested === saved.regionId) ? saved : null;

    if (resume) {
      dayNightCycle.setTime(resume.timeOfDay, resume.day);
      this.turnSystem.reset(resume.turn);
      this.loadRegion(resume.regionId, resume.player.gx, resume.player.gy);
      this.player.facing = resume.player.facing as Player['facing'];
    } else {
      this.loadRegion(requested ?? DEFAULT_REGION_ID);
    }
  }

  /** Carga un bioma completo: terreno, escenografia, niebla, clima y ambiente */
  public loadRegion(regionId: string, startGx?: number, startGy?: number) {
    const region = REGIONS_DATA[regionId];
    if (!region) return;
    this.currentRegion = region;

    this.grid.generateForRegion(region);

    const gx = startGx ?? Math.floor(this.grid.cols / 2);
    const gy = startGy ?? Math.floor(this.grid.rows / 2);
    this.player.placeAt(gx, gy);

    this.decor.generate(this.grid, region, new Set([`${gx},${gy}`]), [{ gx, gy }]);
    this.grid.updateFogOfWar(gx, gy, SIGHT_RADIUS);

    this.weather.setWeather(region.weatherType);
    soundManager.setBiomeMusic(region.biomeType);

    this.cameraX = this.player.x - this.canvas.width / 2;
    this.cameraY = this.player.y - this.player.height / 2 - this.canvas.height / 2;
  }

  // --- Acciones del jugador (cada una es un turno y consume tiempo) ---

  public stepPlayer(dx: number, dy: number) {
    const targetGx = this.player.gx + dx;
    const targetGy = this.player.gy + dy;

    this.player.setFacingFromStep(dx, dy);

    if (!this.grid.isPassable(targetGx, targetGy)) {
      this.showNotification('Terreno infranqueable');
      return;
    }

    this.player.stepTo(targetGx, targetGy);
    soundManager.playFootstep(this.currentRegion.biomeType === 'frost' ? 'snow' : this.currentRegion.biomeType === 'swamp' ? 'mud' : 'dirt');
    this.endTurn('move');
  }

  public waitPlayer() {
    this.endTurn('wait');
  }

  /** Tocar una casilla: la propia espera; una vecina o lejana da un paso hacia ella */
  public interactTile(gx: number, gy: number) {
    if (gx === this.player.gx && gy === this.player.gy) {
      this.waitPlayer();
      return;
    }
    const dx = Math.sign(gx - this.player.gx);
    const dy = Math.sign(gy - this.player.gy);
    this.stepPlayer(dx, dy);
  }

  private endTurn(action: 'move' | 'wait') {
    this.turnSystem.advanceTurn(action);
    this.grid.updateFogOfWar(this.player.gx, this.player.gy, SIGHT_RADIUS);
    this.save();
  }

  private save() {
    SaveSystem.save({
      regionId: this.currentRegion.id,
      player: { gx: this.player.gx, gy: this.player.gy, facing: this.player.facing },
      turn: this.turnSystem.turnCount,
      timeOfDay: dayNightCycle.timeOfDay,
      day: dayNightCycle.dayCount
    });
  }

  public showNotification(msg: string) {
    this.notificationMessage = msg;
    this.notificationTimer = 2.0;
  }

  // --- Entrada del canvas (coordenadas de pantalla -> casilla) ---

  public screenToTile(clientX: number, clientY: number): { gx: number; gy: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const worldX = (clientX - rect.left) * scaleX + this.cameraX;
    const worldY = (clientY - rect.top) * scaleY + this.cameraY;
    return TileGrid.screenToGrid(worldX, worldY);
  }

  public handleCanvasClick(clientX: number, clientY: number) {
    const tile = this.screenToTile(clientX, clientY);
    this.grid.targetTile = tile;
    this.interactTile(tile.gx, tile.gy);
  }

  public handleCanvasHover(clientX: number, clientY: number) {
    this.grid.hoveredTile = this.screenToTile(clientX, clientY);
  }

  // --- Bucle ---

  public start() {
    this.lastTime = performance.now();
    this.isRunning = true;
    requestAnimationFrame(this.loop);
  }

  private loop = (timestamp: number) => {
    if (!this.isRunning) return;
    const delta = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;
    this.lastDelta = delta;
    this.update(delta);
    this.render();
    requestAnimationFrame(this.loop);
  };

  private update(delta: number) {
    this.player.update(delta);
    this.turnSystem.updateFloatingTexts(delta);

    // La camara sigue suavemente al torso del jugador, a cualquier fps
    const a = 1 - Math.exp(-delta * 10);
    const targetCamX = this.player.x - this.canvas.width / 2;
    const targetCamY = this.player.y - this.player.height / 2 - this.canvas.height / 2;
    this.cameraX += (targetCamX - this.cameraX) * a;
    this.cameraY += (targetCamY - this.cameraY) * a;

    if (this.notificationTimer > 0) {
      this.notificationTimer -= delta;
      if (this.notificationTimer <= 0) this.notificationMessage = '';
    }
  }

  private render() {
    const { ctx } = this;
    const width = this.canvas.width;
    const height = this.canvas.height;

    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    // 1. Suelo
    this.grid.draw(ctx, this.cameraX, this.cameraY, this.currentRegion);

    // 2. Escenografia y jugador, ordenados por profundidad
    const margin = 80;
    const bounds = {
      minX: this.cameraX - margin,
      maxX: this.cameraX + width + margin,
      minY: this.cameraY - margin,
      maxY: this.cameraY + height + margin
    };
    const list = this.renderables;
    list.length = 0;
    this.decor.collectRenderables(ctx, this.grid, this.currentRegion.biomeType, bounds, this.cameraX, this.cameraY, list);
    list.push({
      y: this.player.y, // los pies: igual que la base de los props
      draw: () => this.player.draw(ctx, this.cameraX, this.cameraY)
    });
    list.sort((a, b) => a.y - b.y);
    for (const r of list) r.draw();

    // 3. Efectos
    this.turnSystem.drawFloatingTexts(ctx, this.cameraX, this.cameraY);
    this.drawLightingMask(width, height);
    this.weather.updateAndDraw(ctx, width, height, this.cameraX, this.cameraY, this.lastDelta);

    // 4. Interfaz
    this.hud.draw(ctx, width, this.currentRegion, dayNightCycle, this.turnSystem.turnCount);
    if (this.notificationMessage) this.drawNotification(width);
  }

  /** Oscuridad ambiental (bioma + hora) con un halo de luz alrededor del jugador */
  private drawLightingMask(width: number, height: number) {
    const { ctx } = this;
    const regionDarkness = 1.0 - this.currentRegion.ambientLight;
    const totalDarkness = Math.min(0.92, Math.max(regionDarkness, dayNightCycle.getAmbientDarkness()));
    if (totalDarkness <= 0.08) return;

    const px = this.player.x - this.cameraX;
    const py = this.player.y - this.player.height / 2 - this.cameraY;
    const grad = ctx.createRadialGradient(px, py, 10, px, py, LIGHT_RADIUS_PX);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(5, 5, 12, ${totalDarkness})`);

    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  private drawNotification(width: number) {
    const { ctx } = this;
    const boxW = Math.min(width - 40, 360);
    const boxX = (width - boxW) / 2;
    const boxY = 58;
    ctx.save();
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
    ctx.fillRect(boxX, boxY, boxW, 30);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, 29);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.notificationMessage, width / 2, boxY + 15);
    ctx.restore();
  }
}
