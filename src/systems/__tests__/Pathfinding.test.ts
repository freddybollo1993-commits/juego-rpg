import { describe, it, expect } from 'vitest';
import { TileGrid } from '../../core/TileGrid';
import { findPath } from '../../core/Pathfinding';
import { REGIONS_DATA } from '../../data/regions';

function openGrid(): TileGrid {
  const grid = new TileGrid();
  grid.generateForRegion(REGIONS_DATA['beach']);
  for (const col of grid.tiles) for (const t of col) if (t.gx > 1 && t.gx < 62 && t.gy > 1 && t.gy < 62) t.passable = true;
  return grid;
}

describe('Tocar y caminar: busqueda de camino', () => {
  it('en campo abierto usa el minimo de pasos (un paso en diagonal avanza en ambos ejes)', () => {
    const grid = openGrid();
    const path = findPath(grid, { gx: 10, gy: 10 }, { gx: 15, gy: 13 })!;
    expect(path.length).toBe(5);
    expect(path[path.length - 1]).toEqual({ gx: 15, gy: 13 });
  });

  it('cada paso es a una casilla vecina y transitable', () => {
    const grid = openGrid();
    let at = { gx: 5, gy: 5 };
    for (const step of findPath(grid, at, { gx: 40, gy: 22 })!) {
      expect(Math.max(Math.abs(step.gx - at.gx), Math.abs(step.gy - at.gy))).toBe(1);
      expect(grid.isPassable(step.gx, step.gy)).toBe(true);
      at = step;
    }
  });

  it('rodea un muro y no corta esquinas en diagonal', () => {
    const grid = openGrid();
    for (let gy = 5; gy <= 20; gy++) grid.tiles[20][gy].passable = false; // muro de 16 casillas
    const path = findPath(grid, { gx: 18, gy: 12 }, { gx: 22, gy: 12 })!;
    expect(path).not.toBeNull();
    expect(path.length).toBeGreaterThan(4);
    let at = { gx: 18, gy: 12 };
    for (const step of path) {
      if (step.gx !== at.gx && step.gy !== at.gy) {
        expect(grid.isPassable(step.gx, at.gy)).toBe(true);
        expect(grid.isPassable(at.gx, step.gy)).toBe(true);
      }
      at = step;
    }
  });

  it('devuelve null si el destino es infranqueable o esta aislado, y [] si ya esta ahi', () => {
    const grid = openGrid();
    expect(findPath(grid, { gx: 10, gy: 10 }, { gx: 0, gy: 0 })).toBeNull();
    expect(findPath(grid, { gx: 10, gy: 10 }, { gx: 10, gy: 10 })).toEqual([]);
    for (const [dx, dy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]) {
      grid.tiles[30 + dx][30 + dy].passable = false;
    }
    expect(findPath(grid, { gx: 10, gy: 10 }, { gx: 30, gy: 30 })).toBeNull();
  });
});
