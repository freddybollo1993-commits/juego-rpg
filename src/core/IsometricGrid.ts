// IsometricGrid.ts - 2.5D Axonometric Diorama Engine, Biome Slabs & Fog of War (The Wild Darkness style)

import { RegionData } from '../data/regions';

export interface IsoTile {
  gx: number;
  gy: number;
  terrainType: string;
  elevation: number; // 0: ground, 1: raised cliff/plateau
  passable: boolean;
  visibility: number; // 0: Unexplored, 1: Explored (fogged), 2: Visible (active light)
  accentVariant: number;
}

export class IsometricGrid {
  public static readonly TILE_WIDTH = 72;
  public static readonly TILE_HEIGHT = 36;
  public static readonly TILE_DEPTH = 14; // 2.5D prism block height

  public cols: number = 24;
  public rows: number = 24;
  public tiles: IsoTile[][] = [];
  public hoveredTile: { gx: number; gy: number } | null = null;
  public targetTile: { gx: number; gy: number } | null = null;
  public dangerTiles: { gx: number; gy: number; label: string }[] = [];

  constructor(cols: number = 24, rows: number = 24) {
    this.cols = cols;
    this.rows = rows;
  }

  /** Convert logical grid coordinates to screen pixel coordinates */
  public static gridToScreen(gx: number, gy: number, elevation: number = 0): { x: number; y: number } {
    const halfW = IsometricGrid.TILE_WIDTH / 2;
    const halfH = IsometricGrid.TILE_HEIGHT / 2;
    const x = (gx - gy) * halfW;
    const y = (gx + gy) * halfH - elevation * IsometricGrid.TILE_DEPTH;
    return { x, y };
  }

  /** Convert screen pixel coordinates to logical grid coordinates with high precision */
  public static screenToGrid(screenX: number, screenY: number): { gx: number; gy: number } {
    const halfW = IsometricGrid.TILE_WIDTH / 2;
    const halfH = IsometricGrid.TILE_HEIGHT / 2;
    const gx = Math.round((screenX / halfW + screenY / halfH) / 2);
    const gy = Math.round((screenY / halfH - screenX / halfW) / 2);
    return { gx, gy };
  }

  /** Generate biome-specific 2.5D tiles for a region */
  public generateForRegion(region: RegionData) {
    this.tiles = [];
    const biome = region.biomeType;

    for (let gx = 0; gx < this.cols; gx++) {
      this.tiles[gx] = [];
      for (let gy = 0; gy < this.rows; gy++) {
        // Deterministic pseudo-random terrain generation based on coordinates
        const noise = Math.sin(gx * 0.45) * Math.cos(gy * 0.45);
        const edgeDist = Math.min(gx, this.cols - 1 - gx, gy, this.rows - 1 - gy);

        let terrainType = 'primary';
        let elevation = 0;
        let passable = true;

        if (edgeDist <= 1) {
          // Perimeter borders: cliffs, deep water or impassable boundaries
          if (biome === 'beach') {
            terrainType = gx === 0 || gy === 0 ? 'deep_water' : 'rock_cliff';
            passable = false;
          } else {
            terrainType = 'boundary_cliff';
            elevation = 1;
            passable = false;
          }
        } else {
          // Inner regional terrain
          if (noise > 0.45 && edgeDist < 6) {
            elevation = 1; // 2.5D raised plateau
          }

          if (biome === 'beach') {
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
            // forest / taiga
            terrainType = noise > 0.3 ? 'ancient_moss' : noise < -0.2 ? 'root_cluster' : 'pine_humus';
          }
        }

        this.tiles[gx][gy] = {
          gx,
          gy,
          terrainType,
          elevation,
          passable,
          visibility: 0, // Unexplored initially
          accentVariant: Math.abs(Math.sin(gx * 7 + gy * 13))
        };
      }
    }
  }

  /** Update Fog of War based on player position, torch and campfires */
  public updateFogOfWar(
    playerGx: number,
    playerGy: number,
    sightRadius: number,
    campfires: { gx: number; gy: number; isLit: boolean }[] = []
  ) {
    // 1. Demote previous visible tiles to explored
    for (let gx = 0; gx < this.cols; gx++) {
      for (let gy = 0; gy < this.rows; gy++) {
        if (this.tiles[gx][gy].visibility === 2) {
          this.tiles[gx][gy].visibility = 1;
        }
      }
    }

    // 2. Reveal player sight circle
    this.revealCircle(playerGx, playerGy, sightRadius);

    // 3. Reveal campfires radius
    for (const fire of campfires) {
      if (fire.isLit) {
        this.revealCircle(fire.gx, fire.gy, 4.5);
      }
    }
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
          this.tiles[gx][gy].visibility = 2; // Visible
        }
      }
    }
  }

  /** Reveal all tiles (for sandbox / test mode) */
  public revealAll() {
    for (let gx = 0; gx < this.cols; gx++) {
      for (let gy = 0; gy < this.rows; gy++) {
        this.tiles[gx][gy].visibility = 2;
      }
    }
  }

  /** Check if a grid tile is in bounds and passable */
  public isPassable(gx: number, gy: number): boolean {
    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return false;
    return this.tiles[gx][gy].passable;
  }

  /** Render the 2.5D Isometric Diamond Grid with Block Depth */
  public draw(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    region: RegionData
  ) {
    const halfW = IsometricGrid.TILE_WIDTH / 2;
    const halfH = IsometricGrid.TILE_HEIGHT / 2;
    const depth = IsometricGrid.TILE_DEPTH;

    // Draw row by row from top to bottom (isometric natural sorting)
    for (let sum = 0; sum < this.cols + this.rows - 1; sum++) {
      for (let gx = 0; gx < this.cols; gx++) {
        const gy = sum - gx;
        if (gy < 0 || gy >= this.rows) continue;

        const tile = this.tiles[gx][gy];
        if (tile.visibility === 0) continue; // Unexplored: completely black

        const screen = IsometricGrid.gridToScreen(gx, gy, tile.elevation);
        const px = screen.x - cameraX;
        const py = screen.y - cameraY;

        // Culling: check if tile is visible on screen
        if (px + halfW < -80 || px - halfW > ctx.canvas.width + 80 || py + halfH + depth < -80 || py - halfH > ctx.canvas.height + 80) {
          continue;
        }

        const isDim = tile.visibility === 1; // Explored but not in current sight
        this.drawTileSlab(ctx, px, py, halfW, halfH, depth, tile, region, isDim);

        // Highlight Telegraphed Danger Tile (Turn-based enemy warning)
        const isDanger = this.dangerTiles.find(d => d.gx === gx && d.gy === gy);
        if (isDanger) {
          const pulseAlpha = Math.sin(Date.now() * 0.008) * 0.25 + 0.6;
          this.drawTileOutline(ctx, px, py, halfW, halfH, `rgba(239, 68, 68, ${pulseAlpha})`, 3);
          ctx.fillStyle = `rgba(239, 68, 68, ${pulseAlpha * 0.35})`;
          this.fillDiamond(ctx, px, py, halfW, halfH);
          ctx.fillStyle = '#fee2e2';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`⚠️ ${isDanger.label}`, px, py + 3);
        }

        // Highlight hovered tile
        if (this.hoveredTile && this.hoveredTile.gx === gx && this.hoveredTile.gy === gy) {
          this.drawTileOutline(ctx, px, py, halfW, halfH, 'rgba(255, 215, 0, 0.8)', 2.5);
        }

        // Highlight selected target tile
        if (this.targetTile && this.targetTile.gx === gx && this.targetTile.gy === gy) {
          this.drawTileOutline(ctx, px, py, halfW, halfH, 'rgba(0, 245, 212, 0.9)', 3);
        }
      }
    }
  }

  private fillDiamond(ctx: CanvasRenderingContext2D, px: number, py: number, halfW: number, halfH: number) {
    ctx.beginPath();
    ctx.moveTo(px, py - halfH);
    ctx.lineTo(px + halfW, py);
    ctx.lineTo(px, py + halfH);
    ctx.lineTo(px - halfW, py);
    ctx.closePath();
    ctx.fill();
  }

  /** Draw an individual 2.5D Isometric Tile Block (Top Diamond + Left/Right Shaded Facets) */
  private drawTileSlab(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    halfW: number,
    halfH: number,
    depth: number,
    tile: IsoTile,
    region: RegionData,
    isDim: boolean
  ) {
    const colors = this.getTileColors(tile.terrainType, region, tile.accentVariant);

    // 1. Right Slab Face (Shaded dark)
    ctx.beginPath();
    ctx.moveTo(px, py + halfH);
    ctx.lineTo(px + halfW, py);
    ctx.lineTo(px + halfW, py + depth);
    ctx.lineTo(px, py + halfH + depth);
    ctx.closePath();
    ctx.fillStyle = isDim ? '#0d1520' : colors.rightFace;
    ctx.fill();

    // 2. Left Slab Face (Shaded medium)
    ctx.beginPath();
    ctx.moveTo(px, py + halfH);
    ctx.lineTo(px - halfW, py);
    ctx.lineTo(px - halfW, py + depth);
    ctx.lineTo(px, py + halfH + depth);
    ctx.closePath();
    ctx.fillStyle = isDim ? '#121b2a' : colors.leftFace;
    ctx.fill();

    // 3. Top Isometric Diamond Surface
    ctx.beginPath();
    ctx.moveTo(px, py - halfH);
    ctx.lineTo(px + halfW, py);
    ctx.lineTo(px, py + halfH);
    ctx.lineTo(px - halfW, py);
    ctx.closePath();
    ctx.fillStyle = isDim ? '#1e293b' : colors.top;
    ctx.fill();

    // Subtle tile grid borders
    ctx.strokeStyle = isDim ? 'rgba(15, 23, 42, 0.4)' : 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Biome-specific surface details
    if (!isDim) {
      this.drawTileDetails(ctx, px, py, tile);
    }
  }

  private drawTileOutline(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    halfW: number,
    halfH: number,
    color: string,
    lineWidth: number
  ) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(px, py - halfH);
    ctx.lineTo(px + halfW, py);
    ctx.lineTo(px, py + halfH);
    ctx.lineTo(px - halfW, py);
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  private drawTileDetails(ctx: CanvasRenderingContext2D, px: number, py: number, tile: IsoTile) {
    if (tile.terrainType === 'toxic_slime') {
      // Slime bubble gleam
      ctx.fillStyle = '#70e000';
      ctx.beginPath();
      ctx.arc(px + 4, py - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (tile.terrainType === 'magma_fissure') {
      // Glowing lava crack
      ctx.strokeStyle = '#ff5400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px - 10, py);
      ctx.lineTo(px + 2, py + 4);
      ctx.lineTo(px + 12, py - 2);
      ctx.stroke();
    } else if (tile.terrainType === 'glacial_ice') {
      // Ice gleam reflection
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 6, py - 3);
      ctx.lineTo(px + 6, py + 3);
      ctx.stroke();
    } else if (tile.terrainType === 'plasma_circuit') {
      // Alien glowing cyan trace
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px - 12, py + 2);
      ctx.lineTo(px, py - 4);
      ctx.lineTo(px + 12, py + 2);
      ctx.stroke();
    }
  }

  private getTileColors(
    terrain: string,
    region: RegionData,
    variant: number
  ): { top: string; leftFace: string; rightFace: string } {
    switch (terrain) {
      // Beach
      case 'dry_sand':
        return { top: variant > 0.5 ? '#b8b087' : '#b0a880', leftFace: '#8e8663', rightFace: '#6d6749' };
      case 'wet_sand':
        return { top: '#9e9570', leftFace: '#787152', rightFace: '#5c563c' };
      case 'coastal_pebbles':
        return { top: '#7d7a71', leftFace: '#5f5d56', rightFace: '#45433d' };
      case 'deep_water':
        return { top: '#2b4353', leftFace: '#1d2e3a', rightFace: '#121d25' };

      // Frost
      case 'packed_snow':
        return { top: variant > 0.5 ? '#e2edf5' : '#d6e6f2', leftFace: '#9ab3c4', rightFace: '#758d9e' };
      case 'glacial_ice':
        return { top: '#7bc8e2', leftFace: '#4e9ab3', rightFace: '#347083' };
      case 'frost_rock':
        return { top: '#5d6b79', leftFace: '#424d58', rightFace: '#2e363d' };

      // Swamp
      case 'mud_moss':
        return { top: variant > 0.5 ? '#2b3a27' : '#33442e', leftFace: '#1d261a', rightFace: '#141a12' };
      case 'toxic_slime':
        return { top: '#426b2b', leftFace: '#2d4c1c', rightFace: '#1f3513' };
      case 'deep_mire':
        return { top: '#1c2219', leftFace: '#121610', rightFace: '#0a0d09' };

      // Canyon
      case 'red_sandstone':
        return { top: variant > 0.5 ? '#964b28' : '#884323', leftFace: '#6a341b', rightFace: '#4f2613' };
      case 'magma_fissure':
        return { top: '#4a1e12', leftFace: '#31140c', rightFace: '#220e08' };
      case 'basalt_gravel':
        return { top: '#50443e', leftFace: '#382f2b', rightFace: '#27201d' };

      // Caverns
      case 'dark_slate':
        return { top: variant > 0.5 ? '#211d33' : '#1a162b', leftFace: '#131020', rightFace: '#0d0b16' };
      case 'crystal_cluster':
        return { top: '#3f37c9', leftFace: '#2c268f', rightFace: '#1f1b66' };
      case 'abyssal_chasm':
        return { top: '#0a0812', leftFace: '#06050b', rightFace: '#030206' };

      // Alien Core
      case 'precursor_alloy':
        return { top: variant > 0.5 ? '#162834' : '#12212b', leftFace: '#0d1820', rightFace: '#091117' };
      case 'plasma_circuit':
        return { top: '#0e3846', leftFace: '#092731', rightFace: '#061a21' };
      case 'levitation_ring':
        return { top: '#23395b', leftFace: '#18273f', rightFace: '#101b2c' };

      // Forest / Taiga
      case 'pine_humus':
        return { top: variant > 0.5 ? '#2e4225' : '#273820', leftFace: '#1b2716', rightFace: '#121b0f' };
      case 'ancient_moss':
        return { top: '#3b552f', leftFace: '#27391f', rightFace: '#1a2715' };
      case 'root_cluster':
        return { top: '#423326', leftFace: '#2f241b', rightFace: '#201812' };

      default:
        return { top: region.groundColor, leftFace: '#333333', rightFace: '#222222' };
    }
  }
}
