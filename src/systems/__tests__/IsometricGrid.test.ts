import { describe, it, expect } from 'vitest';
import { IsometricGrid } from '../../core/IsometricGrid';
import { TILE_ATLAS_MANIFEST } from '../../core/TileAtlas';
import { REGIONS_DATA } from '../../data/regions';

describe('Cuadricula isometrica 64x64', () => {
  it('usa mapas de 64x64 casillas y casillas de 80x40', () => {
    const grid = new IsometricGrid();
    expect(grid.cols).toBe(64);
    expect(grid.rows).toBe(64);
    expect(IsometricGrid.TILE_WIDTH).toBe(80);
    expect(IsometricGrid.TILE_HEIGHT).toBe(40);
  });

  it('convierte coordenadas de cuadricula a pantalla y de vuelta', () => {
    const screen = IsometricGrid.gridToScreen(10, 12, 0);
    expect(screen.x).toBe((10 - 12) * (IsometricGrid.TILE_WIDTH / 2));
    expect(screen.y).toBe((10 + 12) * (IsometricGrid.TILE_HEIGHT / 2));

    for (const [gx, gy] of [[0, 0], [10, 12], [63, 63], [5, 40]]) {
      const s = IsometricGrid.gridToScreen(gx, gy, 0);
      expect(IsometricGrid.screenToGrid(s.x, s.y)).toEqual({ gx, gy });
    }
  });

  it('genera un terreno completo con bordes infranqueables y centro transitable', () => {
    for (const region of Object.values(REGIONS_DATA)) {
      const grid = new IsometricGrid();
      grid.generateForRegion(region);

      expect(grid.tiles.length).toBe(64);
      expect(grid.tiles[0].length).toBe(64);
      expect(grid.isPassable(32, 32), region.id).toBe(true);
      expect(grid.isPassable(0, 0), region.id).toBe(false);
      expect(grid.isPassable(63, 63), region.id).toBe(false);
      expect(grid.isPassable(-1, 5)).toBe(false);
      expect(grid.isPassable(5, 64)).toBe(false);
    }
  });

  it('es determinista: la misma region genera siempre el mismo terreno', () => {
    const a = new IsometricGrid();
    const b = new IsometricGrid();
    a.generateForRegion(REGIONS_DATA['forest']);
    b.generateForRegion(REGIONS_DATA['forest']);
    expect(a.tiles.map(col => col.map(t => `${t.terrainType}/${t.elevation}`)))
      .toEqual(b.tiles.map(col => col.map(t => `${t.terrainType}/${t.elevation}`)));
  });

  it('cada bioma mezcla varios terrenos y todos tienen sprite en el atlas', () => {
    for (const region of Object.values(REGIONS_DATA)) {
      const grid = new IsometricGrid();
      grid.generateForRegion(region);
      const kinds = new Set<string>();
      for (const col of grid.tiles) for (const t of col) kinds.add(t.terrainType);

      expect(kinds.size, region.id).toBeGreaterThanOrEqual(3);
      const atlas = TILE_ATLAS_MANIFEST[region.biomeType];
      for (const kind of kinds) {
        expect(atlas.terrains[kind], `${region.id}/${kind}`).toBeDefined();
      }
    }
  });

  it('la niebla de guerra revela un circulo y recuerda lo explorado', () => {
    const grid = new IsometricGrid();
    grid.generateForRegion(REGIONS_DATA['beach']);

    expect(grid.tiles[32][32].visibility).toBe(0);
    grid.updateFogOfWar(32, 32, 5);
    expect(grid.tiles[32][32].visibility).toBe(2);
    expect(grid.tiles[35][32].visibility).toBe(2);
    expect(grid.tiles[40][32].visibility).toBe(0);

    grid.updateFogOfWar(40, 32, 5);
    expect(grid.tiles[40][32].visibility).toBe(2);
    expect(grid.tiles[32][32].visibility).toBe(1); // explorada pero ya fuera de la vista
  });
});
