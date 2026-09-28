import { describe, it, expect } from 'vitest';
import { IsometricGrid } from '../../core/IsometricGrid';
import { DecorLayer, DECOR_RULES } from '../../core/DecorLayer';
import { PROP_ATLAS_MANIFEST } from '../../core/PropAtlas';
import { REGIONS_DATA } from '../../data/regions';

function buildGrid(regionId: string) {
  const grid = new IsometricGrid(24, 24);
  grid.generateForRegion(REGIONS_DATA[regionId]);
  return grid;
}

describe('DecorLayer (visual scenery props)', () => {
  it('has an atlas row for every kind used by the placement rules', () => {
    for (const [biome, rules] of Object.entries(DECOR_RULES)) {
      for (const rule of rules) {
        expect(PROP_ATLAS_MANIFEST[biome]?.kinds[rule.kind], `${biome}/${rule.kind}`).toBeDefined();
      }
    }
  });

  it('places props deterministically for the same region', () => {
    const grid = buildGrid('beach');
    const a = new DecorLayer();
    const b = new DecorLayer();
    a.generate(grid, REGIONS_DATA['beach'], new Set(), []);
    b.generate(grid, REGIONS_DATA['beach'], new Set(), []);
    expect(a.props.length).toBeGreaterThan(0);
    expect(a.props).toEqual(b.props);
  });

  it('only uses passable tiles and respects blocked and keep-clear tiles', () => {
    for (const regionId of Object.keys(REGIONS_DATA)) {
      const region = REGIONS_DATA[regionId];
      const grid = buildGrid(regionId);
      const decor = new DecorLayer();
      const blocked = new Set(['12,10', '13,12']);
      decor.generate(grid, region, blocked, [{ gx: 12, gy: 12 }, { gx: 22, gy: 12 }]);

      for (const p of decor.props) {
        expect(grid.tiles[p.gx][p.gy].passable).toBe(true);
        expect(blocked.has(`${p.gx},${p.gy}`)).toBe(false);
        expect(Math.abs(p.gx - 12) <= 1 && Math.abs(p.gy - 12) <= 1).toBe(false);
        expect(Math.abs(p.gx - 22) <= 1 && Math.abs(p.gy - 12) <= 1).toBe(false);
      }
    }
  });

  it('gives every biome a reasonable amount of scenery', () => {
    const seen = new Set<string>();
    for (const regionId of Object.keys(REGIONS_DATA)) {
      const region = REGIONS_DATA[regionId];
      const decor = new DecorLayer();
      decor.generate(buildGrid(regionId), region, new Set(), []);
      expect(decor.props.length, regionId).toBeGreaterThan(15);
      expect(decor.props.length, regionId).toBeLessThan(160);
      seen.add(region.biomeType);
    }
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });

  it('only shows props on tiles the player has explored and skips them under fog', () => {
    const grid = buildGrid('beach');
    const decor = new DecorLayer();
    decor.generate(grid, REGIONS_DATA['beach'], new Set(), []);
    const bounds = { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 };
    const ctx = {} as CanvasRenderingContext2D;

    const hidden: { y: number; draw: () => void }[] = [];
    decor.collectRenderables(ctx, grid, 'beach', bounds, 0, 0, hidden);
    expect(hidden.length).toBe(0); // everything unexplored

    grid.revealAll();
    const shown: { y: number; draw: () => void }[] = [];
    decor.collectRenderables(ctx, grid, 'beach', bounds, 0, 0, shown);
    expect(shown.length).toBe(decor.props.length);
  });
});
