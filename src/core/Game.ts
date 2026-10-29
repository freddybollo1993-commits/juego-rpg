// Game.ts - Bucle principal. Mundo base: mapa isometrico por turnos, niebla de guerra,
// oscuridad, clima y escenografia. Cada accion del jugador avanza el reloj del mundo.
//
// Camara: no sigue al personaje paso a paso. Se queda quieta mientras el personaje se mueve dentro
// de una zona comoda y solo se desliza a recentrarlo cuando se acerca a los bordes. Se puede
// arrastrar, acercar y alejar (zoom).

import { Player } from '../entities/Player';
import { REGIONS_DATA, RegionData, DEFAULT_REGION_ID } from '../data/regions';
import { WeatherSystem } from '../systems/WeatherSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { dayNightCycle } from '../systems/DayNightCycle';
import { HUD } from '../ui/HUD';
import { TileGrid } from './TileGrid';
import { TILE_WIDTH, TILE_HEIGHT } from './Metrics';
import { findPath, GridPoint } from './Pathfinding';
import { TurnSystem } from './TurnSystem';
import { tileAtlas } from './TileAtlas';
import { propAtlas } from './PropAtlas';
import { DecorLayer } from './DecorLayer';
import { soundManager } from '../audio/SoundManager';

const SIGHT_RADIUS = 4; // casillas que el jugador ve a su alrededor
// El halo de luz se queda un poco por dentro del radio de vision para que se funda con la niebla
// en vez de cortarse. Un circulo de la cuadricula se ve como una elipse del doble de ancho que de alto.
const LIGHT_RADIUS_PX = Math.round(SIGHT_RADIUS * Math.SQRT2 * (TILE_WIDTH / 2) * 0.95);
const LIGHT_SQUASH = TILE_HEIGHT / TILE_WIDTH;
const BACKGROUND = '#05070b'; // mas alla del borde exterior del piso: oscuridad total

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;
const FOLLOW_ZONE = 0.3;   // la camara solo se mueve si el personaje se aleja del centro mas de esta fraccion de la pantalla
const STEP_SECONDS = 0.17; // tiempo entre pasos al caminar hacia una casilla tocada

export class Game {
  public grid: TileGrid = new TileGrid();
  public turnSystem: TurnSystem = new TurnSystem(dayNightCycle);
  public player: Player = new Player();
  public decor: DecorLayer = new DecorLayer();
  public currentRegion: RegionData = REGIONS_DATA[DEFAULT_REGION_ID];
  /** Esquina superior izquierda de la vista en el mundo (se calcula desde el centro de la camara y el zoom) */
  public cameraX: number = 0;
  public cameraY: number = 0;
  public zoom: number = 1;

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

  private camCenterX: number = 0;
  private camCenterY: number = 0;
  private followingPlayer: boolean = false;
  private followSuspended: boolean = false; // la vista se movio a mano: no recentrar hasta el proximo paso
  private path: GridPoint[] = [];
  private pathTimer: number = 0;

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

    this.cancelPath();
    this.recenterCamera(true);
  }

  // --- Acciones del jugador (cada una es un turno y consume tiempo) ---

  /** Un paso manual (D-Pad, teclado): interrumpe cualquier camino en curso */
  public stepPlayer(dx: number, dy: number) {
    this.cancelPath();
    this.takeStep(dx, dy);
  }

  public waitPlayer() {
    this.cancelPath();
    this.followSuspended = false;
    this.endTurn('wait');
  }

  /** Da un paso (un turno). Devuelve false si el terreno no deja pasar. */
  private takeStep(dx: number, dy: number): boolean {
    const targetGx = this.player.gx + dx;
    const targetGy = this.player.gy + dy;

    this.player.setFacingFromStep(dx, dy);

    if (!this.grid.isPassable(targetGx, targetGy)) {
      this.showNotification('Terreno infranqueable');
      return false;
    }

    this.followSuspended = false;
    this.player.stepTo(targetGx, targetGy);
    soundManager.playFootstep(this.currentRegion.biomeType === 'frost' ? 'snow' : this.currentRegion.biomeType === 'swamp' ? 'mud' : 'dirt');
    this.endTurn('move');
    return true;
  }

  /** Tocar una casilla: la propia espera; cualquier otra: el personaje camina hasta ella, un turno por paso */
  public interactTile(gx: number, gy: number) {
    if (gx === this.player.gx && gy === this.player.gy) {
      this.waitPlayer();
      return;
    }
    this.walkTo(gx, gy);
  }

  public walkTo(gx: number, gy: number) {
    this.cancelPath();
    const path = findPath(this.grid, { gx: this.player.gx, gy: this.player.gy }, { gx, gy });
    if (!path || path.length === 0) {
      this.showNotification(this.grid.isPassable(gx, gy) ? 'No hay camino hasta ahi' : 'Terreno infranqueable');
      return;
    }
    this.grid.targetTile = { gx, gy };
    this.path = path;
    this.advancePath(); // el primer paso es inmediato; el resto sigue el ritmo de STEP_SECONDS
  }

  /** Detiene el camino en curso (un toque nuevo, un paso manual, cambiar de mapa) */
  public cancelPath() {
    this.path = [];
    this.grid.targetTile = null;
  }

  public get isWalking(): boolean {
    return this.path.length > 0;
  }

  private advancePath() {
    const next = this.path.shift();
    if (!next) return;
    const ok = this.takeStep(next.gx - this.player.gx, next.gy - this.player.gy);
    if (!ok || this.path.length === 0) this.cancelPath();
    else this.pathTimer = STEP_SECONDS;
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

  /** Posicion del cursor/dedo en pixeles del lienzo */
  public clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  public screenToTile(clientX: number, clientY: number): { gx: number; gy: number } {
    const p = this.clientToCanvas(clientX, clientY);
    return TileGrid.screenToGrid(p.x / this.zoom + this.cameraX, p.y / this.zoom + this.cameraY);
  }

  public handleCanvasClick(clientX: number, clientY: number) {
    const tile = this.screenToTile(clientX, clientY);
    this.interactTile(tile.gx, tile.gy);
  }

  public handleCanvasHover(clientX: number, clientY: number) {
    this.grid.hoveredTile = this.screenToTile(clientX, clientY);
  }

  // --- Camara: zoom, arrastre y recentrado ---

  /** Acerca/aleja multiplicando el zoom; el punto bajo (anchorX, anchorY) del lienzo se queda en su sitio */
  public zoomBy(factor: number, anchorX: number = this.canvas.width / 2, anchorY: number = this.canvas.height / 2) {
    const old = this.zoom;
    const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, old * factor));
    if (next === old) return;
    const offX = anchorX - this.canvas.width / 2;
    const offY = anchorY - this.canvas.height / 2;
    const worldX = this.camCenterX + offX / old;
    const worldY = this.camCenterY + offY / old;
    this.zoom = next;
    this.camCenterX = worldX - offX / next;
    this.camCenterY = worldY - offY / next;
    this.followingPlayer = false;
    this.followSuspended = true;
    this.syncCamera();
  }

  /** Arrastra la vista (dx, dy en pixeles del lienzo) */
  public panBy(dx: number, dy: number) {
    this.camCenterX -= dx / this.zoom;
    this.camCenterY -= dy / this.zoom;
    this.followingPlayer = false;
    this.followSuspended = true;
    this.syncCamera();
  }

  /** Vuelve a centrar la vista en el personaje (de golpe o deslizando) */
  public recenterCamera(instant: boolean = false) {
    this.followSuspended = false;
    if (instant) {
      this.camCenterX = this.player.x;
      this.camCenterY = this.player.y - this.player.height / 2;
      this.followingPlayer = false;
      this.syncCamera();
    } else {
      this.followingPlayer = true;
    }
  }

  private syncCamera() {
    this.cameraX = this.camCenterX - this.canvas.width / this.zoom / 2;
    this.cameraY = this.camCenterY - this.canvas.height / this.zoom / 2;
  }

  private updateCamera(delta: number) {
    const viewW = this.canvas.width / this.zoom;
    const viewH = this.canvas.height / this.zoom;
    const dx = this.player.x - this.camCenterX;
    const dy = this.player.y - this.player.height / 2 - this.camCenterY;

    // Solo se recentra al acercarse a los bordes: dentro de la zona comoda la camara no se mueve
    if (!this.followSuspended && !this.followingPlayer && (Math.abs(dx) > viewW * FOLLOW_ZONE || Math.abs(dy) > viewH * FOLLOW_ZONE)) {
      this.followingPlayer = true;
    }
    if (this.followingPlayer) {
      const a = 1 - Math.exp(-delta * 6);
      this.camCenterX += dx * a;
      this.camCenterY += dy * a;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) this.followingPlayer = false;
    }
    this.syncCamera();
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

    // Caminar hacia la casilla tocada: un paso (un turno) cada STEP_SECONDS
    if (this.path.length > 0) {
      this.pathTimer -= delta;
      if (this.pathTimer <= 0) this.advancePath();
    }

    this.updateCamera(delta);

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

    // El mundo se dibuja escalado por el zoom; la luz, el clima y la interfaz van en pixeles de pantalla
    const viewW = width / this.zoom;
    const viewH = height / this.zoom;
    ctx.save();
    ctx.scale(this.zoom, this.zoom);

    // 1. Suelo
    this.grid.draw(ctx, this.cameraX, this.cameraY, viewW, viewH, this.currentRegion);
    this.drawPathPreview(ctx);

    // 2. Escenografia y jugador, ordenados por profundidad
    const margin = 80;
    const bounds = {
      minX: this.cameraX - margin,
      maxX: this.cameraX + viewW + margin,
      minY: this.cameraY - margin,
      maxY: this.cameraY + viewH + margin
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

    this.turnSystem.drawFloatingTexts(ctx, this.cameraX, this.cameraY);
    ctx.restore();

    // 3. Efectos
    this.drawLightingMask(width, height);
    this.weather.updateAndDraw(ctx, width, height, this.cameraX, this.cameraY, this.lastDelta);

    // 4. Interfaz
    this.hud.draw(ctx, width, this.currentRegion, dayNightCycle, this.turnSystem.turnCount);
    if (this.notificationMessage) this.drawNotification(width);
  }

  /** Puntos sobre las casillas que faltan por recorrer */
  private drawPathPreview(ctx: CanvasRenderingContext2D) {
    if (this.path.length === 0) return;
    ctx.fillStyle = 'rgba(0, 245, 212, 0.55)';
    for (const step of this.path) {
      const c = TileGrid.tileCenter(step.gx, step.gy);
      this.grid.diamondPath(ctx, Math.round(c.x - this.cameraX), Math.round(c.y - this.cameraY), TILE_WIDTH * 0.11, TILE_HEIGHT * 0.11);
      ctx.fill();
    }
  }

  /** Oscuridad ambiental (bioma + hora) con un halo de luz alrededor del jugador */
  private drawLightingMask(width: number, height: number) {
    const { ctx } = this;
    const regionDarkness = 1.0 - this.currentRegion.ambientLight;
    const totalDarkness = Math.min(0.92, Math.max(regionDarkness, dayNightCycle.getAmbientDarkness()));
    if (totalDarkness <= 0.08) return;

    // Halo elipse (un circulo del suelo en isometrico) centrado en el torso del jugador, escalado por el zoom
    const px = (this.player.x - this.cameraX) * this.zoom;
    const py = (this.player.y - this.player.height / 2 - this.cameraY) * this.zoom;
    const radius = LIGHT_RADIUS_PX * this.zoom;
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, `rgba(5, 5, 12, ${totalDarkness})`);

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(1, LIGHT_SQUASH);
    ctx.fillStyle = grad;
    ctx.fillRect(-px, -py / LIGHT_SQUASH, width, height / LIGHT_SQUASH);
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
