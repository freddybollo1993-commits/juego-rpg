import { describe, it, expect } from 'vitest';
import { IsometricGrid } from '../../core/IsometricGrid';
import { DecorLayer, DECOR_RULES } from '../../core/DecorLayer';
import { PROP_ATLAS_MANIFEST } from '../../core/PropAtlas';
import { REGIONS_DATA } from '../../data/regions';

function buildGrid(regionId: string) {
  const grid = new IsometricGrid();
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
      const blocked = new Set(['32,30', '33,32']);
      decor.generate(grid, region, blocked, [{ gx: 32, gy: 32 }, { gx: 50, gy: 32 }]);

      for (const p of decor.props) {
        expect(grid.tiles[p.gx][p.gy].passable).toBe(true);
        expect(blocked.has(`${p.gx},${p.gy}`)).toBe(false);
        expect(Math.abs(p.gx - 32) <= 1 && Math.abs(p.gy - 32) <= 1).toBe(false);
        expect(Math.abs(p.gx - 50) <= 1 && Math.abs(p.gy - 32) <= 1).toBe(false);
      }
    }
  });

  it('gives every biome a reasonable amount of scenery', () => {
    const seen = new Set<string>();
    for (const regionId of Object.keys(REGIONS_DATA)) {
      const region = REGIONS_DATA[regionId];
      const decor = new DecorLayer();
      decor.generate(buildGrid(regionId), region, new Set(), []);
      expect(decor.props.length, regionId).toBeGreaterThan(100);
      expect(decor.props.length, regionId).toBeLessThan(1500);
      seen.add(region.biomeType);
    }
    expect(seen.size).toBeGreaterThanOrEqual(7);
  });

  it('draws every prop in view, even in unexplored areas (fog darkens them, it does not hide them)', () => {
    const grid = buildGrid('beach');
    const decor = new DecorLayer();
    decor.generate(grid, REGIONS_DATA['beach'], new Set(), []);
    const bounds = { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 };
    const ctx = {} as CanvasRenderingContext2D;

    const unexplored: { y: number; draw: () => void }[] = [];
    decor.collectRenderables(ctx, grid, 'beach', bounds, 0, 0, unexplored);
    expect(unexplored.length).toBe(decor.props.length);

    grid.revealAll();
    const explored: { y: number; draw: () => void }[] = [];
    decor.collectRenderables(ctx, grid, 'beach', bounds, 0, 0, explored);
    expect(explored.length).toBe(decor.props.length);
  });

  it('sorts props by the y of their base so they line up with the player standing on the same row', () => {
    const grid = buildGrid('forest');
    const decor = new DecorLayer();
    decor.generate(grid, REGIONS_DATA['forest'], new Set(), []);
    const bounds = { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 };
    const out: { y: number; draw: () => void }[] = [];
    decor.collectRenderables({} as CanvasRenderingContext2D, grid, 'forest', bounds, 0, 0, out);
    expect(out.map(o => o.y)).toEqual(decor.props.map(p => p.y));
  });
});
