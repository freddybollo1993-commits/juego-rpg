// TileGrid.ts - Suelo: una cuadricula de cuadrados perfectos GIRADOS 45 grados (rombos 1:1).
// El piso es un plano continuo que cubre toda la pantalla (mas alla del mapa se extiende un
// borde exterior) y la niebla de guerra lo oscurece en vez de ocultarlo. Asi nunca hay una
// "vista vacia" y cualquier toque cae sobre una casilla.
//
//   pantalla x = (gx - gy) * TILE_SIZE / 2
//   pantalla y = (gx + gy) * TILE_SIZE / 2
//
// Es una rotacion de 45 grados (con escala), no un aplastado: no se pierde la forma cuadrada.

import { RegionData } from '../data/regions';
import { tileAtlas } from './TileAtlas';
import { TILE_SIZE, TILE_SIDE, MAP_SIZE } from './Metrics';

const HALF = TILE_SIZE / 2;
import { SHADE_ALPHA, SHADE_RGB, ShadeLevel, shadeForVisibility } from './Shade';

export interface Tile {
  gx: number;
  gy: number;
  terrainType: string;
  passable: boolean;
  visibility: number; // 0: sin explorar, 1: explorada (recordada), 2: visible ahora
  accentVariant: number;
}

/** Hash determinista de reticula -> [0, 1) */
function hash2(ix: number, iy: number, seed: number): number {
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Ruido de valor suave en [0, 1] */
function valueNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/** Ruido fractal de dos octavas, centrado y escalado a ~[-1, 1] */
function terrainNoise(gx: number, gy: number, seed: number): number {
  const v = valueNoise(gx * 0.085, gy * 0.085, seed) * 0.68 + valueNoise(gx * 0.21, gy * 0.21, seed + 101) * 0.32;
  return (v - 0.5) * 2.4;
}

function seedFromString(s: string): number {
  let h = 17;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

/** Mezcla un color '#rrggbb' con la oscuridad de la niebla (respaldo cuando no hay sprite) */
function shadeColor(hex: string, level: ShadeLevel): string {
  const a = SHADE_ALPHA[level];
  if (a === 0) return hex;
  const [dr, dg, db] = SHADE_RGB.split(',').map(Number);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const mix = (c: number, d: number) => Math.round(c * (1 - a) + d * a);
  return `rgb(${mix(r, dr)}, ${mix(g, dg)}, ${mix(b, db)})`;
}

export class TileGrid {
  public static readonly TILE_SIZE = TILE_SIZE;
  public static readonly TILE_SIDE = TILE_SIDE;
  public static readonly DEFAULT_SIZE = MAP_SIZE;
  /** Casillas de piso extra dibujadas alrededor del mapa para no dejar nunca el borde a la vista */
  public static readonly OUTSIDE_PAD = 24;

  public cols: number = TileGrid.DEFAULT_SIZE;
  public rows: number = TileGrid.DEFAULT_SIZE;
  public tiles: Tile[][] = [];
  public hoveredTile: { gx: number; gy: number } | null = null;
  public targetTile: { gx: number; gy: number } | null = null;

  /** Casilla que se dibuja fuera del mapa (infranqueable y siempre oscura) */
  private outsideTile: Tile = { gx: -1, gy: -1, terrainType: 'boundary_cliff', passable: false, visibility: 0, accentVariant: 0.5 };

  constructor(cols: number = TileGrid.DEFAULT_SIZE, rows: number = TileGrid.DEFAULT_SIZE) {
    this.cols = cols;
    this.rows = rows;
  }

  /** Centro de una casilla (el centro del rombo) en el mundo */
  public static tileCenter(gx: number, gy: number): { x: number; y: number } {
    return { x: (gx - gy) * HALF, y: (gx + gy) * HALF };
  }

  /** Donde pisa quien esta en la casilla: su centro (de ahi se dibuja hacia arriba) */
  public static tileFoot(gx: number, gy: number): { x: number; y: number } {
    return TileGrid.tileCenter(gx, gy);
  }

  /** Punto del mundo -> casilla (rombo) que lo contiene */
  public static screenToGrid(worldX: number, worldY: number): { gx: number; gy: number } {
    // "|| 0" evita devolver -0 al redondear valores como -0.3
    return {
      gx: Math.round((worldX + worldY) / TILE_SIZE) || 0,
      gy: Math.round((worldY - worldX) / TILE_SIZE) || 0
    };
  }

  /** Rango de casillas que toca una ventana del mundo (con margen), para dibujar solo lo visible */
  public static visibleRange(cameraX: number, cameraY: number, width: number, height: number, margin: number = 2) {
    let gxMin = Infinity, gxMax = -Infinity, gyMin = Infinity, gyMax = -Infinity;
    for (const x of [cameraX, cameraX + width]) {
      for (const y of [cameraY, cameraY + height]) {
        const gx = (x + y) / TILE_SIZE;
        const gy = (y - x) / TILE_SIZE;
        gxMin = Math.min(gxMin, gx);
        gxMax = Math.max(gxMax, gx);
        gyMin = Math.min(gyMin, gy);
        gyMax = Math.max(gyMax, gy);
      }
    }
    return {
      gxMin: Math.floor(gxMin) - margin,
      gxMax: Math.ceil(gxMax) + margin,
      gyMin: Math.floor(gyMin) - margin,
      gyMax: Math.ceil(gyMax) + margin
    };
  }

  /** Genera el terreno de un bioma: determinista (mismo bioma = mismo mapa) */
  public generateForRegion(region: RegionData) {
    this.tiles = [];
    const biome = region.biomeType;
    const seed = seedFromString(region.id);
    const borderTerrain = biome === 'beach' ? 'deep_water' : 'boundary_cliff';
    this.outsideTile = { ...this.outsideTile, terrainType: borderTerrain };

    for (let gx = 0; gx < this.cols; gx++) {
      this.tiles[gx] = [];
      for (let gy = 0; gy < this.rows; gy++) {
        const noise = terrainNoise(gx, gy, seed);
        const edgeDist = Math.min(gx, this.cols - 1 - gx, gy, this.rows - 1 - gy);

        let terrainType = 'primary';
        let passable = true;

        if (edgeDist <= 1) {
          // Borde del mapa: agua profunda o roca infranqueable
          terrainType = borderTerrain;
          passable = false;
        } else if (biome === 'beach') {
          terrainType = noise > 0.25 ? 'wet_sand' : noise < -0.3 ? 'coastal_pebbles' : 'dry_sand';
        } else if (biome === 'frost') {
          terrainType = noise > 0.3 ? 'glacial_ice' : noise < -0.2 ? 'frost_rock' : 'packed_snow';
        } else if (biome === 'swamp') {
          terrainType = noise > 0.35 ? 'toxic_slime' : noise < -0.25 ? 'deep_mire' : 'mud_moss';
        } else if (biome === 'canyon') {
          terrainType = noise > 0.3 ? 'magma_fissure' : noise < -0.25 ? 'basalt_gravel' : 'red_sandstone';
        } else if (biome === 'caverns') {
          terrainType = noise > 0.3 ? 'crystal_cluster' : noise < -0.2 ? 'abyssal_chasm' : 'dark_slate';
        } else if (biome === 'alien_core') {
          terrainType = noise > 0.25 ? 'plasma_circuit' : noise < -0.2 ? 'levitation_ring' : 'precursor_alloy';
        } else {
          terrainType = noise > 0.3 ? 'ancient_moss' : noise < -0.2 ? 'root_cluster' : 'pine_humus';
        }

        this.tiles[gx][gy] = {
          gx,
          gy,
          terrainType,
          passable,
          visibility: 0,
          accentVariant: Math.abs(Math.sin(gx * 7 + gy * 13))
        };
      }
    }
  }

  /** Casilla del mapa, o la casilla exterior si esta fuera */
  public getTile(gx: number, gy: number): Tile {
    return this.tiles[gx]?.[gy] ?? this.outsideTile;
  }

  /** Niebla de guerra: lo visto el turno anterior pasa a "explorado" y se revela el nuevo circulo de vision */
  public updateFogOfWar(playerGx: number, playerGy: number, sightRadius: number) {
    for (let gx = 0; gx < this.cols; gx++) {
      for (let gy = 0; gy < this.rows; gy++) {
        if (this.tiles[gx][gy].visibility === 2) {
          this.tiles[gx][gy].visibility = 1;
        }
      }
    }
    this.revealCircle(playerGx, playerGy, sightRadius);
  }

  private revealCircle(centerX: number, centerY: number, radius: number) {
    const radSq = radius * radius;
    const minX = Math.max(0, Math.floor(centerX - radius));
    const maxX = Math.min(this.cols - 1, Math.ceil(centerX + radius));
    const minY = Math.max(0, Math.floor(centerY - radius));
    const maxY = Math.min(this.rows - 1, Math.ceil(centerY + radius));

    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const dx = gx - centerX;
        const dy = gy - centerY;
        if (dx * dx + dy * dy <= radSq) {
          this.tiles[gx][gy].visibility = 2;
        }
      }
    }
  }

  /** Revela todo el mapa (pruebas / depuracion) */
  public revealAll() {
    for (let gx = 0; gx < this.cols; gx++) {
      for (let gy = 0; gy < this.rows; gy++) {
        this.tiles[gx][gy].visibility = 2;
      }
    }
  }

  /** Casilla dentro del mapa y transitable */
  public isPassable(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return false;
    return this.tiles[gx][gy].passable;
  }

  /** Dibuja el piso visible: todas las casillas de la pantalla, oscurecidas segun la niebla */
  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number, region: RegionData) {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const pad = TileGrid.OUTSIDE_PAD;

    const r = TileGrid.visibleRange(cameraX, cameraY, width, height);
    const gxMin = Math.max(-pad, r.gxMin);
    const gxMax = Math.min(this.cols - 1 + pad, r.gxMax);
    const gyMin = Math.max(-pad, r.gyMin);
    const gyMax = Math.min(this.rows - 1 + pad, r.gyMax);

    ctx.imageSmoothingEnabled = false; // pixel art nitido

    // Diagonal por diagonal (suma gx+gy): los rombos vecinos solo comparten el borde
    for (let sum = gxMin + gyMin; sum <= gxMax + gyMax; sum++) {
      const start = Math.max(gxMin, sum - gyMax);
      const end = Math.min(gxMax, sum - gyMin);
      for (let gx = start; gx <= end; gx++) {
        const gy = sum - gx;
        // Centro del rombo en pantalla, en pixeles enteros: los vecinos quedan exactamente pegados
        const cx = Math.round((gx - gy) * HALF - cameraX);
        const cy = Math.round((gx + gy) * HALF - cameraY);
        if (cx < -TILE_SIZE || cx > width + TILE_SIZE || cy < -TILE_SIZE || cy > height + TILE_SIZE) continue;
        this.drawTile(ctx, cx, cy, this.getTile(gx, gy), region);
      }
    }

    // Resaltes de la casilla bajo el cursor y de la ultima tocada
    for (const [tile, color, line] of [
      [this.hoveredTile, 'rgba(255, 215, 0, 0.8)', 2],
      [this.targetTile, 'rgba(0, 245, 212, 0.9)', 3]
    ] as const) {
      if (!tile) continue;
      const c = TileGrid.tileCenter(tile.gx, tile.gy);
      this.diamondPath(ctx, Math.round(c.x - cameraX), Math.round(c.y - cameraY), HALF - line);
      ctx.strokeStyle = color;
      ctx.lineWidth = line;
      ctx.stroke();
    }
  }

  private diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, half: number) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - half);
    ctx.lineTo(cx + half, cy);
    ctx.lineTo(cx, cy + half);
    ctx.lineTo(cx - half, cy);
    ctx.closePath();
  }

  /** cx, cy = centro del rombo en pantalla */
  private drawTile(ctx: CanvasRenderingContext2D, cx: number, cy: number, tile: Tile, region: RegionData) {
    const shade = shadeForVisibility(tile.visibility);
    if (tileAtlas.draw(ctx, region.biomeType, tile.terrainType, tile.accentVariant, cx - HALF, cy - HALF, shade)) return;

    // Respaldo sin imagen: rombo plano del color del terreno (el borde del mismo color tapa las costuras)
    const color = shadeColor(this.getTileColor(tile.terrainType, region, tile.accentVariant), shade);
    this.diamondPath(ctx, cx, cy, HALF);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }

  private getTileColor(terrain: string, region: RegionData, variant: number): string {
    const alt = variant > 0.5;
    switch (terrain) {
      // Playa
      case 'dry_sand': return alt ? '#b8b087' : '#b0a880';
      case 'wet_sand': return '#9e9570';
      case 'coastal_pebbles': return '#7d7a71';
      case 'deep_water': return '#2b4353';
      case 'rock_cliff': return '#5a5750';
      // Meseta helada
      case 'packed_snow': return alt ? '#e2edf5' : '#d6e6f2';
      case 'glacial_ice': return '#7bc8e2';
      case 'frost_rock': return '#5d6b79';
      // Cienaga
      case 'mud_moss': return alt ? '#2b3a27' : '#33442e';
      case 'toxic_slime': return '#426b2b';
      case 'deep_mire': return '#1c2219';
      // Canon
      case 'red_sandstone': return alt ? '#964b28' : '#884323';
      case 'magma_fissure': return '#4a1e12';
      case 'basalt_gravel': return '#50443e';
      // Abismo
      case 'dark_slate': return alt ? '#211d33' : '#1a162b';
      case 'crystal_cluster': return '#3f37c9';
      case 'abyssal_chasm': return '#0a0812';
      // Nucleo
      case 'precursor_alloy': return alt ? '#162834' : '#12212b';
      case 'plasma_circuit': return '#0e3846';
      case 'levitation_ring': return '#23395b';
      // Taiga
      case 'pine_humus': return alt ? '#2e4225' : '#273820';
      case 'ancient_moss': return '#3b552f';
      case 'root_cluster': return '#423326';
      case 'boundary_cliff':
        return ({ frost: '#6c7a88', forest: '#3a3d33', swamp: '#2f3529', canyon: '#6a3a22', caverns: '#2a2440', alien_core: '#16303d' } as Record<string, string>)[region.biomeType] ?? '#333333';
      default:
        return region.groundColor;
    }
  }
}
