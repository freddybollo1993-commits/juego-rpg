import { describe, it, expect } from 'vitest';
import { TileGrid } from '../../core/TileGrid';
import { TILE_SIZE, TILE_SIDE, MAP_SIZE } from '../../core/Metrics';
import { TILE_ATLAS_MANIFEST } from '../../core/TileAtlas';
import { REGIONS_DATA } from '../../data/regions';

const HALF = TILE_SIZE / 2;

describe('Cuadricula de cuadrados perfectos girados 45 grados', () => {
  it('usa mapas de 64x64 casillas y un rombo de 96x96', () => {
    const grid = new TileGrid();
    expect(grid.cols).toBe(MAP_SIZE);
    expect(grid.rows).toBe(MAP_SIZE);
    expect(MAP_SIZE).toBe(64);
    expect(TILE_SIZE).toBe(96);
    expect(TileGrid.TILE_SIZE).toBe(TILE_SIZE);
  });

  it('cada casilla es un cuadrado perfecto: lados iguales, perpendiculares y a 45 grados', () => {
    const o = TileGrid.tileCenter(10, 10);
    const ex = TileGrid.tileCenter(11, 10); // un paso por el eje x de la cuadricula
    const ey = TileGrid.tileCenter(10, 11); // un paso por el eje y
    const vx = { x: ex.x - o.x, y: ex.y - o.y };
    const vy = { x: ey.x - o.x, y: ey.y - o.y };

    expect(Math.hypot(vx.x, vx.y)).toBeCloseTo(TILE_SIDE); // lado
    expect(Math.hypot(vy.x, vy.y)).toBeCloseTo(TILE_SIDE); // mismo lado
    expect(vx.x * vy.x + vx.y * vy.y).toBeCloseTo(0); // perpendiculares (90 grados)
    expect(Math.abs(vx.x)).toBeCloseTo(Math.abs(vx.y)); // girados exactamente 45 grados
    expect(Math.abs(vy.x)).toBeCloseTo(Math.abs(vy.y));
  });

  it('el rombo mide lo mismo de ancho que de alto (proporcion 1:1)', () => {
    const o = TileGrid.tileCenter(5, 5);
    const across = TileGrid.tileCenter(6, 4); // vecino en horizontal de pantalla
    const down = TileGrid.tileCenter(6, 6); // vecino en vertical de pantalla
    expect(across.x - o.x).toBe(TILE_SIZE);
    expect(across.y - o.y).toBe(0);
    expect(down.y - o.y).toBe(TILE_SIZE);
    expect(down.x - o.x).toBe(0);
  });

  it('un punto del mundo cae en el rombo que le toca', () => {
    for (const [gx, gy] of [[0, 0], [10, 12], [63, 63], [5, 40], [-3, 7]]) {
      const c = TileGrid.tileCenter(gx, gy);
      expect(TileGrid.screenToGrid(c.x, c.y)).toEqual({ gx, gy });
      // Dentro del rombo (|dx| + |dy| < mitad) sigue siendo la misma casilla
      expect(TileGrid.screenToGrid(c.x + 30, c.y + 10)).toEqual({ gx, gy });
      expect(TileGrid.screenToGrid(c.x - 20, c.y + 25)).toEqual({ gx, gy });
      expect(TileGrid.screenToGrid(c.x + 5, c.y - 40)).toEqual({ gx, gy });
      // Al cruzar la arista se pasa a la casilla vecina
      expect(TileGrid.screenToGrid(c.x + 60, c.y + 30)).toEqual({ gx: gx + 1, gy });
      expect(TileGrid.screenToGrid(c.x - 60, c.y + 30)).toEqual({ gx, gy: gy + 1 });
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

  it('la rotacion de 45 grados conserva los circulos: la vision se ve redonda en pantalla', () => {
    const o = TileGrid.tileCenter(32, 32);
    // casillas a la misma distancia en la cuadricula (4 pasos de eje) quedan a la misma distancia en pantalla
    for (const [dx, dy] of [[4, 0], [0, 4], [-4, 0], [0, -4]]) {
      const c = TileGrid.tileCenter(32 + dx, 32 + dy);
      expect(Math.hypot(c.x - o.x, c.y - o.y)).toBeCloseTo(4 * TILE_SIDE);
    }
    void HALF;
  });
});
