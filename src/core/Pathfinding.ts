// Pathfinding.ts - Camino mas corto entre dos casillas para "tocar y caminar".
// Cada paso es un turno y cuesta lo mismo (diagonal o no), asi que se minimizan los pasos.
// Es A* de 8 direcciones sin cortar esquinas; entre caminos igual de cortos prefiere el de menos giros.

import { TileGrid } from './TileGrid';

export interface GridPoint {
  gx: number;
  gy: number;
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const TURN_PENALTY = 0.001;

/**
 * Casillas a recorrer desde `from` (sin incluirla) hasta `to`, o null si no hay camino.
 * Devuelve [] si ya esta en destino.
 */
export function findPath(grid: TileGrid, from: GridPoint, to: GridPoint): GridPoint[] | null {
  if (!grid.isPassable(to.gx, to.gy)) return null;
  if (from.gx === to.gx && from.gy === to.gy) return [];

  const h = grid.rows;
  const total = grid.cols * h;
  const key = (gx: number, gy: number) => gx * h + gy;
  const cost = new Float64Array(total).fill(Infinity);
  const parent = new Int32Array(total).fill(-1);
  const dirTaken = new Int8Array(total).fill(-1);
  const closed = new Uint8Array(total);

  // Cola de prioridad (monticulo binario) de [f, casilla]
  const heapF: number[] = [];
  const heapK: number[] = [];
  const push = (f: number, k: number) => {
    let i = heapF.length;
    heapF.push(f);
    heapK.push(k);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heapF[p] <= heapF[i]) break;
      [heapF[p], heapF[i]] = [heapF[i], heapF[p]];
      [heapK[p], heapK[i]] = [heapK[i], heapK[p]];
      i = p;
    }
  };
  const pop = (): number => {
    const top = heapK[0];
    const lastF = heapF.pop()!;
    const lastK = heapK.pop()!;
    if (heapF.length > 0) {
      heapF[0] = lastF;
      heapK[0] = lastK;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < heapF.length && heapF[l] < heapF[m]) m = l;
        if (r < heapF.length && heapF[r] < heapF[m]) m = r;
        if (m === i) break;
        [heapF[m], heapF[i]] = [heapF[i], heapF[m]];
        [heapK[m], heapK[i]] = [heapK[i], heapK[m]];
        i = m;
      }
    }
    return top;
  };

  const heuristic = (gx: number, gy: number) => Math.max(Math.abs(to.gx - gx), Math.abs(to.gy - gy));
  const start = key(from.gx, from.gy);
  const goal = key(to.gx, to.gy);
  cost[start] = 0;
  push(heuristic(from.gx, from.gy), start);

  while (heapF.length > 0) {
    const cur = pop();
    if (closed[cur]) continue;
    closed[cur] = 1;
    if (cur === goal) break;

    const cgx = Math.floor(cur / h);
    const cgy = cur - cgx * h;
    for (let d = 0; d < DIRS.length; d++) {
      const [dx, dy] = DIRS[d];
      const nx = cgx + dx;
      const ny = cgy + dy;
      if (!grid.isPassable(nx, ny)) continue;
      // Sin cortar esquinas: en diagonal, las dos casillas laterales tambien deben ser transitables
      if (dx !== 0 && dy !== 0 && (!grid.isPassable(cgx + dx, cgy) || !grid.isPassable(cgx, cgy + dy))) continue;

      const nk = key(nx, ny);
      if (closed[nk]) continue;
      const next = cost[cur] + 1 + (dirTaken[cur] !== -1 && dirTaken[cur] !== d ? TURN_PENALTY : 0);
      if (next < cost[nk]) {
        cost[nk] = next;
        parent[nk] = cur;
        dirTaken[nk] = d;
        push(next + heuristic(nx, ny), nk);
      }
    }
  }

  if (parent[goal] === -1) return null;

  const path: GridPoint[] = [];
  for (let k = goal; k !== start; k = parent[k]) {
    const gx = Math.floor(k / h);
    path.push({ gx, gy: k - gx * h });
  }
  return path.reverse();
}
