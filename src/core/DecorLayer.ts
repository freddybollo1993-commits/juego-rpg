// DecorLayer.ts - Purely visual scenery props (rocks, trees, crystals...) placed per region.
//
// Props never block movement and never interact: they only make the map feel alive. Placement
// is deterministic (same region -> same layout) and skips the player's start, chokepoints,
// impassable tiles and any tile already claimed by a gameplay object/NPC/enemy.

import { IsometricGrid } from './IsometricGrid';
import { propAtlas } from './PropAtlas';
import { RegionData } from '../data/regions';

export interface DecorRule {
  kind: string;
  density: number;      // chance (0..1) that an eligible tile gets this prop
  terrains?: string[];  // restrict to these terrain types (default: any allowed terrain)
}

// Terrains that must stay clear (hazards / boundaries / gaps the player reads as "not ground")
const NO_DECOR_TERRAIN = new Set([
  'deep_water', 'rock_cliff', 'boundary_cliff', 'abyssal_chasm', 'magma_fissure', 'levitation_ring'
]);

export const DECOR_RULES: Record<string, DecorRule[]> = {
  beach: [
    { kind: 'palm', density: 0.03, terrains: ['dry_sand'] },
    { kind: 'rock', density: 0.035 },
    { kind: 'driftwood', density: 0.03, terrains: ['dry_sand', 'wet_sand'] },
    { kind: 'grass_tuft', density: 0.06, terrains: ['dry_sand'] }
  ],
  frost: [
    { kind: 'ice_spike', density: 0.035, terrains: ['packed_snow', 'glacial_ice'] },
    { kind: 'snow_rock', density: 0.04 },
    { kind: 'dead_pine', density: 0.03, terrains: ['packed_snow'] },
    { kind: 'snow_mound', density: 0.05, terrains: ['packed_snow'] }
  ],
  forest: [
    { kind: 'pine', density: 0.09 },
    { kind: 'bush', density: 0.05 },
    { kind: 'mossy_rock', density: 0.03 },
    { kind: 'stump', density: 0.025 }
  ],
  swamp: [
    { kind: 'dead_tree', density: 0.045 },
    { kind: 'reeds', density: 0.07 },
    { kind: 'mushroom', density: 0.035 },
    { kind: 'bog_rock', density: 0.025 }
  ],
  canyon: [
    { kind: 'boulder', density: 0.04 },
    { kind: 'cactus', density: 0.03, terrains: ['red_sandstone'] },
    { kind: 'bones', density: 0.02 },
    { kind: 'rock_spire', density: 0.04 }
  ],
  caverns: [
    { kind: 'crystal', density: 0.05 },
    { kind: 'stalagmite', density: 0.05 },
    { kind: 'glow_mushroom', density: 0.035 },
    { kind: 'rubble', density: 0.04 }
  ],
  alien_core: [
    { kind: 'antenna', density: 0.025 },
    { kind: 'debris', density: 0.04 },
    { kind: 'pylon', density: 0.03 },
    { kind: 'plasma_vent', density: 0.02 }
  ]
};

export interface DecorProp {
  gx: number;
  gy: number;
  kind: string;
  variant: number; // 0..1 seed for the sprite variant
  x: number;       // screen-space base position (tile centre, elevation applied)
  y: number;
}

// Deterministic hash -> [0, 1)
function hash01(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function seedFromString(s: string): number {
  let h = 17;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

export class DecorLayer {
  public props: DecorProp[] = [];

  /**
   * Rebuild the prop list for a region.
   * @param blocked   tiles already occupied by gameplay entities ("gx,gy" keys)
   * @param keepClear tiles (and their 8 neighbours) that must stay free of props
   */
  public generate(
    grid: IsometricGrid,
    region: RegionData,
    blocked: Set<string>,
    keepClear: { gx: number; gy: number }[]
  ) {
    this.props = [];
    const rules = DECOR_RULES[region.biomeType];
    if (!rules) return;
    const seed = seedFromString(region.id);

    for (let gx = 0; gx < grid.cols; gx++) {
      for (let gy = 0; gy < grid.rows; gy++) {
        const tile = grid.tiles[gx]?.[gy];
        if (!tile || !tile.passable || NO_DECOR_TERRAIN.has(tile.terrainType)) continue;
        if (blocked.has(`${gx},${gy}`)) continue;
        if (keepClear.some(k => Math.abs(k.gx - gx) <= 1 && Math.abs(k.gy - gy) <= 1)) continue;

        const roll = hash01(gx, gy, seed);
        let acc = 0;
        for (const rule of rules) {
          if (rule.terrains && !rule.terrains.includes(tile.terrainType)) continue;
          acc += rule.density;
          if (roll < acc) {
            const iso = IsometricGrid.gridToScreen(gx, gy, tile.elevation);
            this.props.push({
              gx,
              gy,
              kind: rule.kind,
              variant: hash01(gx + 11, gy + 29, seed),
              x: iso.x,
              y: iso.y
            });
            break;
          }
        }
      }
    }
  }

  /**
   * Append the visible props to the shared depth-sorted render list.
   * `sortOffset` must match how entities are sorted (feet = y + height / 2; the player is 48px tall).
   */
  public collectRenderables(
    ctx: CanvasRenderingContext2D,
    grid: IsometricGrid,
    biome: string,
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    cameraX: number,
    cameraY: number,
    out: { y: number; draw: () => void }[],
    sortOffset: number = 24
  ) {
    for (const prop of this.props) {
      if (prop.x < bounds.minX || prop.x > bounds.maxX || prop.y < bounds.minY || prop.y > bounds.maxY) continue;
      const visibility = grid.tiles[prop.gx]?.[prop.gy]?.visibility ?? 0;
      if (visibility === 0) continue; // fog of war: unexplored props stay hidden

      out.push({
        y: prop.y + sortOffset,
        draw: () => {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          if (visibility === 1) ctx.globalAlpha = 0.45; // explored but out of sight
          propAtlas.draw(ctx, biome, prop.kind, prop.variant, prop.x - cameraX, prop.y - cameraY);
          ctx.restore();
        }
      });
    }
  }
}
