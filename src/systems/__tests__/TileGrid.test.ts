import { describe, it, expect } from 'vitest';
import { TileGrid } from '../../core/TileGrid';
import { TILE_WIDTH, TILE_HEIGHT, MAP_SIZE } from '../../core/Metrics';
import { TILE_ATLAS_MANIFEST } from '../../core/TileAtlas';
import { REGIONS_DATA } from '../../data/regions';

describe('Cuadricula isometrica 2:1', () => {
  it('usa mapas de 64x64 casillas y un rombo de 96x48', () => {
    const grid = new TileGrid();
    expect(grid.cols).toBe(MAP_SIZE);
    expect(grid.rows).toBe(MAP_SIZE);
    expect(MAP_SIZE).toBe(64);
    expect(TILE_WIDTH).toBe(96);
    expect(TILE_HEIGHT).toBe(48);
    expect(TileGrid.TILE_WIDTH).toBe(TILE_WIDTH);
    expect(TileGrid.TILE_HEIGHT).toBe(TILE_HEIGHT);
  });

  it('el rombo es 2:1: el doble de ancho que de alto', () => {
    expect(TILE_WIDTH / TILE_HEIGHT).toBe(2);
    const o = TileGrid.tileCenter(5, 5);
    const across = TileGrid.tileCenter(6, 4); // vecino en horizontal de pantalla
    const down = TileGrid.tileCenter(6, 6); // vecino en vertical de pantalla
    expect(across.x - o.x).toBe(TILE_WIDTH);
    expect(across.y - o.y).toBe(0);
    expect(down.y - o.y).toBe(TILE_HEIGHT);
    expect(down.x - o.x).toBe(0);
  });

  it('los ejes de la cuadricula bajan en diagonal con la pendiente 2:1', () => {
    const o = TileGrid.tileCenter(10, 10);
    const ex = TileGrid.tileCenter(11, 10);
    const ey = TileGrid.tileCenter(10, 11);
    expect(ex.x - o.x).toBe(TILE_WIDTH / 2);
    expect(ex.y - o.y).toBe(TILE_HEIGHT / 2);
    expect(ey.x - o.x).toBe(-TILE_WIDTH / 2);
    expect(ey.y - o.y).toBe(TILE_HEIGHT / 2);
  });

  it('un punto del mundo cae en el rombo que le toca', () => {
    for (const [gx, gy] of [[0, 0], [10, 12], [63, 63], [5, 40], [-3, 7]]) {
      const c = TileGrid.tileCenter(gx, gy);
      expect(TileGrid.screenToGrid(c.x, c.y)).toEqual({ gx, gy });
      // Dentro del rombo (|dx|/ancho + |dy|/alto < 1/2) sigue siendo la misma casilla
      expect(TileGrid.screenToGrid(c.x + 30, c.y + 5)).toEqual({ gx, gy });
      expect(TileGrid.screenToGrid(c.x - 20, c.y + 12)).toEqual({ gx, gy });
      expect(TileGrid.screenToGrid(c.x + 5, c.y - 20)).toEqual({ gx, gy });
      // Fuera, en la casilla vecina que toca
      expect(TileGrid.screenToGrid(c.x + 30, c.y + 20)).toEqual({ gx: gx + 1, gy });
      expect(TileGrid.screenToGrid(c.x - 30, c.y + 20)).toEqual({ gx, gy: gy + 1 });
      expect(TileGrid.screenToGrid(c.x + 30, c.y - 20)).toEqual({ gx, gy: gy - 1 });
      expect(TileGrid.screenToGrid(c.x - 30, c.y - 20)).toEqual({ gx: gx - 1, gy });
    }
  });

  it('los pies quedan dentro de su propia casilla', () => {
    for (const [gx, gy] of [[0, 0], [32, 32], [63, 10]]) {
      const f = TileGrid.tileFoot(gx, gy);
      expect(TileGrid.screenToGrid(f.x, f.y)).toEqual({ gx, gy });
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

    // Una pantalla grande centrada lo mas cerca del borde al que se puede llegar no se sale del piso dibujado
    const c = TileGrid.tileCenter(2, 2);
    const r = TileGrid.visibleRange(c.x - 960, c.y - 540, 1920, 1080, 0);
    expect(-r.gxMin).toBeLessThanOrEqual(TileGrid.OUTSIDE_PAD);
    expect(-r.gyMin).toBeLessThanOrEqual(TileGrid.OUTSIDE_PAD);
  });

  it('el rango visible contiene todas las casillas cuyo rombo toca la pantalla', () => {
    const cam = { x: 1000, y: 500, w: 1280, h: 720 };
    const r = TileGrid.visibleRange(cam.x, cam.y, cam.w, cam.h, 0);
    const inRange = (gx: number, gy: number) => gx >= r.gxMin && gx <= r.gxMax && gy >= r.gyMin && gy <= r.gyMax;

    for (let gx = -10; gx < 60; gx++) {
      for (let gy = -10; gy < 60; gy++) {
        const c = TileGrid.tileCenter(gx, gy);
        // el centro dentro de la pantalla -> la casilla esta dentro del rango
        if (c.x >= cam.x && c.x <= cam.x + cam.w && c.y >= cam.y && c.y <= cam.y + cam.h) {
          expect(inRange(gx, gy), `${gx},${gy}`).toBe(true);
        }
      }
    }
    // y el margen lo ensancha
    const wider = TileGrid.visibleRange(cam.x, cam.y, cam.w, cam.h, 3);
    expect(wider.gxMin).toBe(r.gxMin - 3);
    expect(wider.gyMax).toBe(r.gyMax + 3);
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

  it('un circulo de vision en la cuadricula se ve como una elipse del doble de ancho que de alto', () => {
    const o = TileGrid.tileCenter(32, 32);
    // 4 pasos por un eje de la cuadricula: la mitad del ancho y la mitad del alto de 4 rombos
    const c = TileGrid.tileCenter(36, 32);
    expect(c.x - o.x).toBe(4 * TILE_WIDTH / 2);
    expect(c.y - o.y).toBe(4 * TILE_HEIGHT / 2);
  });
});
