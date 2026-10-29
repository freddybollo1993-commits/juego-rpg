/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { TILE_ATLAS_MANIFEST } from '../../core/TileAtlas';
import { PROP_ATLAS_MANIFEST } from '../../core/PropAtlas';
import { TILE_WIDTH, TILE_HEIGHT } from '../../core/Metrics';
import { Player } from '../../entities/Player';
import { SHADE_ALPHA, shadeForVisibility } from '../../core/Shade';

function readPublic(publicPath: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`../../../public${publicPath}`, import.meta.url)));
}

/** Lee ancho y alto del encabezado de un PNG */
function pngSize(publicPath: string): { w: number; h: number } {
  const buf = readPublic(publicPath);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Alfa de un pixel de un PNG RGBA de 8 bits sin filtros (el formato que escriben tools/generate-placeholder-*.mjs) */
function pngAlphaReader(publicPath: string): (x: number, y: number) => number {
  const buf = readPublic(publicPath);
  const w = buf.readUInt32BE(16);
  const idat: Buffer[] = [];
  for (let off = 8; off < buf.length; ) {
    const len = buf.readUInt32BE(off);
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4 + 1;
  return (x, y) => raw[y * stride + 1 + x * 4 + 3];
}

describe('Atlas de arte: los PNG deben coincidir con sus manifiestos', () => {
  it('las hojas de suelo miden (celda x variantes) por (celda x filas)', () => {
    for (const [biome, def] of Object.entries(TILE_ATLAS_MANIFEST)) {
      const rows = Object.keys(def.terrains).length;
      const variants = Object.values(def.terrains)[0].variants;
      const { w, h } = pngSize(def.image);
      expect(w, `${biome} ancho`).toBe(def.cellW * variants);
      expect(h, `${biome} alto`).toBe(def.cellH * rows);
    }
  });

  it('las celdas de suelo miden TILE_WIDTH x TILE_HEIGHT (rombo 2:1)', () => {
    for (const def of Object.values(TILE_ATLAS_MANIFEST)) {
      expect(def.cellW).toBe(TILE_WIDTH);
      expect(def.cellH).toBe(TILE_HEIGHT);
      expect(def.cellW / def.cellH).toBe(2);
    }
  });

  it('cada celda de suelo es un rombo 2:1: esquinas transparentes y aristas sin huecos', () => {
    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    for (const [biome, def] of Object.entries(TILE_ATLAS_MANIFEST)) {
      const alpha = pngAlphaReader(def.image);
      const rows = Object.keys(def.terrains).length;
      const variants = Object.values(def.terrains)[0].variants;
      for (let row = 0; row < rows; row++) {
        for (let v = 0; v < variants; v++) {
          const ox = v * TILE_WIDTH;
          const oy = row * TILE_HEIGHT;
          const where = `${biome} fila ${row} variante ${v}`;

          // las 4 esquinas de la celda son transparentes
          for (const [x, y] of [[0, 0], [TILE_WIDTH - 1, 0], [0, TILE_HEIGHT - 1], [TILE_WIDTH - 1, TILE_HEIGHT - 1]]) {
            expect(alpha(ox + x, oy + y), `${where} esquina ${x},${y}`).toBe(0);
          }
          // el centro y los 4 vertices del rombo (donde toca el borde de la celda) son opacos
          for (const [x, y] of [[halfW, halfH], [halfW - 1, 0], [halfW, 0], [halfW - 1, TILE_HEIGHT - 1], [halfW, TILE_HEIGHT - 1], [0, halfH - 1], [0, halfH], [TILE_WIDTH - 1, halfH - 1], [TILE_WIDTH - 1, halfH]]) {
            expect(alpha(ox + x, oy + y), `${where} punto ${x},${y}`).toBe(255);
          }
          // sin huecos: todo pixel cuyo centro cae dentro del rombo es opaco (las casillas vecinas se solapan, no se separan)
          for (let y = 0; y < TILE_HEIGHT; y++) {
            for (let x = 0; x < TILE_WIDTH; x++) {
              const inside = Math.abs(x + 0.5 - halfW) / halfW + Math.abs(y + 0.5 - halfH) / halfH <= 1;
              if (inside) expect(alpha(ox + x, oy + y), `${where} hueco en ${x},${y}`).toBe(255);
            }
          }
        }
      }
    }
  });

  it('las hojas de escenografia miden (celda x variantes) por (celda x tipos)', () => {
    for (const [biome, def] of Object.entries(PROP_ATLAS_MANIFEST)) {
      const { w, h } = pngSize(def.image);
      expect(w, `${biome} ancho`).toBe(def.cellW * def.variants);
      expect(h, `${biome} alto`).toBe(def.cellH * Object.keys(def.kinds).length);
    }
  });
});

describe('Proporciones y niebla', () => {
  it('el personaje cabe holgado dentro de una casilla (~0.3 del ancho de la casilla)', () => {
    const p = new Player();
    expect(p.width / TILE_WIDTH).toBeGreaterThan(0.2);
    expect(p.width / TILE_WIDTH).toBeLessThan(0.4);
    expect(p.height / TILE_WIDTH).toBeGreaterThan(0.3);
    expect(p.height / TILE_WIDTH).toBeLessThan(0.6);
  });

  it('la niebla oscurece mas lo no explorado que lo recordado, y deja intacto lo visible', () => {
    expect(shadeForVisibility(2)).toBe(0);
    expect(shadeForVisibility(1)).toBe(1);
    expect(shadeForVisibility(0)).toBe(2);
    expect(SHADE_ALPHA[0]).toBe(0);
    expect(SHADE_ALPHA[1]).toBeGreaterThan(0);
    expect(SHADE_ALPHA[2]).toBeGreaterThan(SHADE_ALPHA[1]);
    expect(SHADE_ALPHA[2]).toBeLessThan(1); // nunca negro total: el piso se intuye siempre
  });
});
