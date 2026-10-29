/// <reference types="node" />
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TILE_ATLAS_MANIFEST } from '../../core/TileAtlas';
import { PROP_ATLAS_MANIFEST } from '../../core/PropAtlas';
import { IsometricGrid } from '../../core/IsometricGrid';
import { Player } from '../../entities/Player';
import { SHADE_ALPHA, shadeForVisibility } from '../../core/Shade';

/** Lee ancho y alto del encabezado de un PNG */
function pngSize(publicPath: string): { w: number; h: number } {
  const file = fileURLToPath(new URL(`../../../public${publicPath}`, import.meta.url));
  const buf = readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
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

  it('las celdas de suelo son exactamente una casilla plana', () => {
    for (const def of Object.values(TILE_ATLAS_MANIFEST)) {
      expect(def.cellW).toBe(IsometricGrid.TILE_WIDTH);
      expect(def.cellH).toBe(IsometricGrid.TILE_HEIGHT);
      expect(def.anchorY).toBe(IsometricGrid.TILE_HEIGHT / 2);
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
  it('el personaje mide cerca de una casilla de alto y menos de media de ancho', () => {
    const p = new Player();
    expect(p.height / IsometricGrid.TILE_HEIGHT).toBeGreaterThan(0.8);
    expect(p.height / IsometricGrid.TILE_HEIGHT).toBeLessThan(1.0);
    expect(p.width / IsometricGrid.TILE_WIDTH).toBeLessThan(0.5);
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
