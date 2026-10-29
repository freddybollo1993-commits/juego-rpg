// PropAtlas.ts - Hojas de escenografia por bioma (rocas, arboles, cristales...)
//
// Igual que TileAtlas: UNA imagen por bioma, una fila por tipo de prop, una columna por variante.
//
//   celda : 64 x 80
//   ancla : la base del prop (donde toca el suelo) esta en (cellW / 2, anchorY)
//
// Los props se dibujan de pie sobre el centro de una casilla. Un bioma o tipo sin imagen
// simplemente no se dibuja (son decorativos).

import { ShadeLevel, buildShadedSheets } from './Shade';

export interface PropAtlasDef {
  image: string;
  cellW: number;
  cellH: number;
  anchorY: number;
  variants: number;
  kinds: Record<string, number>; // tipo -> fila
}

function propSheet(biome: string, kinds: string[], variants: number = 3): PropAtlasDef {
  return {
    image: `/props/${biome}.png`,
    cellW: 64,
    cellH: 80,
    anchorY: 72,
    variants,
    kinds: Object.fromEntries(kinds.map((kind, row) => [kind, row]))
  };
}

// Las claves son RegionData.biomeType. El orden de filas debe coincidir con tools/generate-placeholder-props.mjs
export const PROP_ATLAS_MANIFEST: Record<string, PropAtlasDef> = {
  beach:      propSheet('beach',      ['palm', 'rock', 'driftwood', 'grass_tuft']),
  frost:      propSheet('frost',      ['ice_spike', 'snow_rock', 'dead_pine', 'snow_mound']),
  forest:     propSheet('forest',     ['pine', 'bush', 'mossy_rock', 'stump']),
  swamp:      propSheet('swamp',      ['dead_tree', 'reeds', 'mushroom', 'bog_rock']),
  canyon:     propSheet('canyon',     ['boulder', 'cactus', 'bones', 'rock_spire']),
  caverns:    propSheet('caverns',    ['crystal', 'stalagmite', 'glow_mushroom', 'rubble']),
  alien_core: propSheet('alien_core', ['antenna', 'debris', 'pylon', 'plasma_vent'])
};

export class PropAtlas {
  private sheets: Map<string, CanvasImageSource[]> = new Map();
  private started: boolean = false;

  /** Carga todas las hojas. Si falta una imagen, esos props no se dibujan. */
  public preloadAll(): Promise<void> {
    if (this.started) return Promise.resolve();
    this.started = true;

    const jobs = Object.entries(PROP_ATLAS_MANIFEST).map(([biome, def]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.sheets.set(biome, buildShadedSheets(img));
          resolve();
        };
        img.onerror = () => {
          console.warn(`[PropAtlas] No se pudo cargar ${def.image} (props ocultos)`);
          resolve();
        };
        img.src = def.image;
      });
    });

    return Promise.all(jobs).then(() => {});
  }

  /**
   * Dibuja un prop con su base en (px, py). `variantSeed` en [0, 1] elige una variante estable.
   * `shade` lo oscurece segun la niebla. Devuelve false si no hay sprite.
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    biome: string,
    kind: string,
    variantSeed: number,
    px: number,
    py: number,
    shade: ShadeLevel = 0
  ): boolean {
    const def = PROP_ATLAS_MANIFEST[biome];
    const sheets = this.sheets.get(biome);
    const row = def?.kinds[kind];
    if (!def || !sheets || row === undefined) return false;

    const col = Math.min(def.variants - 1, Math.floor(variantSeed * def.variants));
    ctx.drawImage(
      sheets[shade],
      col * def.cellW, row * def.cellH, def.cellW, def.cellH,
      Math.round(px - def.cellW / 2), Math.round(py - def.anchorY), def.cellW, def.cellH
    );
    return true;
  }
}

export const propAtlas = new PropAtlas();
