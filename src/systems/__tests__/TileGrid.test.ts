import { describe, it, expect } from 'vitest';
import { TileGrid } from '../../core/TileGrid';
import { TILE_SIZE, MAP_SIZE } from '../../core/Metrics';
import { TILE_ATLAS_MANIFEST } from '../../core/TileAtlas';
import { REGIONS_DATA } from '../../data/regions';

describe('Cuadricula vista de frente: cuadrados perfectos', () => {
  it('usa mapas de 64x64 casillas cuadradas de 64 px', () => {
    const grid = new TileGrid();
    expect(grid.cols).toBe(MAP_SIZE);
    expect(grid.rows).toBe(MAP_SIZE);
    expect(MAP_SIZE).toBe(64);
    expect(TILE_SIZE).toBe(64);
    expect(TileGrid.TILE_SIZE).toBe(TILE_SIZE);
  });

  it('cada casilla mide lo mismo de ancho que de alto y las vecinas se tocan exactamente', () => {
    const a = TileGrid.tileOrigin(10, 20);
    const right = TileGrid.tileOrigin(11, 20);
    const below = TileGrid.tileOrigin(10, 21);
    expect(right.x - a.x).toBe(TILE_SIZE);
    expect(right.y).toBe(a.y);
    expect(below.y - a.y).toBe(TILE_SIZE);
    expect(below.x).toBe(a.x);
    expect(right.x - a.x).toBe(below.y - a.y); // ancho == alto
  });

  it('un punto del mundo cae en la casilla que le toca, incluidos los bordes', () => {
    expect(TileGrid.screenToGrid(0, 0)).toEqual({ gx: 0, gy: 0 });
    expect(TileGrid.screenToGrid(TILE_SIZE - 1, TILE_SIZE - 1)).toEqual({ gx: 0, gy: 0 });
    expect(TileGrid.screenToGrid(TILE_SIZE, TILE_SIZE)).toEqual({ gx: 1, gy: 1 });
    expect(TileGrid.screenToGrid(-1, -1)).toEqual({ gx: -1, gy: -1 });

    for (const [gx, gy] of [[0, 0], [10, 12], [63, 63], [5, 40]]) {
      const o = TileGrid.tileOrigin(gx, gy);
      expect(TileGrid.screenToGrid(o.x, o.y)).toEqual({ gx, gy });
      expect(TileGrid.screenToGrid(o.x + TILE_SIZE / 2, o.y + TILE_SIZE / 2)).toEqual({ gx, gy });
      const foot = TileGrid.tileFoot(gx, gy);
      expect(TileGrid.screenToGrid(foot.x, foot.y)).toEqual({ gx, gy }); // los pies quedan dentro de su casilla
    }
  });

  it('genera un terreno completo con bordes infranqueables y centro transitable', () => {
    for (const region of Object.values(REGIONS_DATA)) {
      const grid = new TileGrid();
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
    const a = new TileGrid();
    const b = new TileGrid();
    a.generateForRegion(REGIONS_DATA['forest']);
    b.generateForRegion(REGIONS_DATA['forest']);
    expect(a.tiles.map(col => col.map(t => t.terrainType)))
      .toEqual(b.tiles.map(col => col.map(t => t.terrainType)));
  });

  it('cada bioma mezcla varios terrenos y todos tienen sprite en el atlas', () => {
    for (const region of Object.values(REGIONS_DATA)) {
      const grid = new TileGrid();
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

  it('el piso cubre toda la pantalla: dentro del mapa y en un borde exterior', () => {
    const grid = new TileGrid();
    grid.generateForRegion(REGIONS_DATA['beach']);

    // Fuera del mapa hay una casilla de piso infranqueable en lugar de un vacio
    const outside = grid.getTile(-5, 200);
    expect(outside.passable).toBe(false);
    expect(outside.terrainType).toBe('deep_water');
    expect(grid.getTile(10, 10)).toBe(grid.tiles[10][10]);

    // Una pantalla grande centrada en cualquier punto transitable no se sale del piso dibujado
    const edge = TileGrid.tileOrigin(2, 2); // lo mas cerca del borde a lo que se puede llegar
    const r = TileGrid.visibleRange(edge.x - 960, edge.y - 540, 1920, 1080, 0);
    expect(-r.gxMin).toBeLessThanOrEqual(TileGrid.OUTSIDE_PAD);
    expect(-r.gyMin).toBeLessThanOrEqual(TileGrid.OUTSIDE_PAD);
  });

  it('el rango visible abarca exactamente las casillas de la pantalla (mas el margen)', () => {
    const r = TileGrid.visibleRange(0, 0, TILE_SIZE * 10, TILE_SIZE * 6, 0);
    expect(r).toEqual({ gxMin: 0, gxMax: 10, gyMin: 0, gyMax: 6 });

    const m = TileGrid.visibleRange(TILE_SIZE * 3.5, TILE_SIZE * 2.5, TILE_SIZE * 10, TILE_SIZE * 6, 1);
    expect(m.gxMin).toBe(3 - 1);
    expect(m.gyMin).toBe(2 - 1);
    expect(m.gxMax).toBe(13 + 1);
    expect(m.gyMax).toBe(8 + 1);
  });

  it('la niebla de guerra revela un circulo y recuerda lo explorado', () => {
    const grid = new TileGrid();
    grid.generateForRegion(REGIONS_DATA['beach']);

    expect(grid.tiles[32][32].visibility).toBe(0);
    grid.updateFogOfWar(32, 32, 4);
    expect(grid.tiles[32][32].visibility).toBe(2);
    expect(grid.tiles[35][32].visibility).toBe(2);
    expect(grid.tiles[40][32].visibility).toBe(0);

    grid.updateFogOfWar(40, 32, 4);
    expect(grid.tiles[40][32].visibility).toBe(2);
    expect(grid.tiles[32][32].visibility).toBe(1); // explorada pero ya fuera de la vista
  });
});
