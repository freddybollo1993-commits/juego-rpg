// TileAtlas.ts - Ground tile spritesheets per biome (with graceful fallback to flat polygons)
//
// Each biome has ONE image: a grid of cells, one ROW per terrain type and one COLUMN
// per visual variant. A cell holds a full 2.5D block: top diamond + left/right faces.
//
//   cell size : 72 x 50  (TILE_WIDTH x (TILE_HEIGHT/2 + TILE_HEIGHT/2 + TILE_DEPTH))
//   anchor    : the top diamond's centre sits at (cellW / 2, anchorY) inside the cell
//
// To add art for a biome: drop the PNG in /public/tiles and register it below.
// Any biome / terrain without an entry keeps using the flat-colour blocks from IsometricGrid.

export interface TileAtlasTerrain {
  row: number;      // row index inside the sheet
  variants: number; // number of variant columns available in that row
}

export interface TileAtlasDef {
  image: string;
  cellW: number;
  cellH: number;
  anchorY: number;  // y (inside the cell) of the top diamond's centre
  terrains: Record<string, TileAtlasTerrain>;
}

/** Build a sheet definition: `terrains` are listed top-to-bottom in the PNG, 3 variants each. */
function sheet(biome: string, terrains: string[], variants: number = 3): TileAtlasDef {
  return {
    image: `/tiles/${biome}.png`,
    cellW: 72,
    cellH: 50,
    anchorY: 18,
    terrains: Object.fromEntries(terrains.map((name, row) => [name, { row, variants }]))
  };
}

// Keys are RegionData.biomeType. Row order must match tools/generate-placeholder-tiles.mjs
export const TILE_ATLAS_MANIFEST: Record<string, TileAtlasDef> = {
  beach:      sheet('beach',      ['dry_sand', 'wet_sand', 'coastal_pebbles', 'deep_water', 'rock_cliff']),
  frost:      sheet('frost',      ['packed_snow', 'glacial_ice', 'frost_rock', 'boundary_cliff']),
  forest:     sheet('forest',     ['pine_humus', 'ancient_moss', 'root_cluster', 'boundary_cliff']),
  swamp:      sheet('swamp',      ['mud_moss', 'toxic_slime', 'deep_mire', 'boundary_cliff']),
  canyon:     sheet('canyon',     ['red_sandstone', 'magma_fissure', 'basalt_gravel', 'boundary_cliff']),
  caverns:    sheet('caverns',    ['dark_slate', 'crystal_cluster', 'abyssal_chasm', 'boundary_cliff']),
  alien_core: sheet('alien_core', ['precursor_alloy', 'plasma_circuit', 'levitation_ring'])
};

export class TileAtlas {
  private images: Map<string, HTMLImageElement> = new Map();
  private started: boolean = false;

  /** Load every registered sheet. Missing files are ignored (fallback rendering is used). */
  public preloadAll(): Promise<void> {
    if (this.started) return Promise.resolve();
    this.started = true;

    const jobs = Object.entries(TILE_ATLAS_MANIFEST).map(([biome, def]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(biome, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[TileAtlas] Could not load tile sheet: ${def.image} (using flat tiles)`);
          resolve();
        };
        img.src = def.image;
      });
    });

    return Promise.all(jobs).then(() => {});
  }

  /** True when a sprite exists for this biome + terrain. */
  public has(biome: string, terrain: string): boolean {
    return this.images.has(biome) && !!TILE_ATLAS_MANIFEST[biome]?.terrains[terrain];
  }

  /**
   * Draw one ground block centred on (px, py). `variantSeed` is any value in [0, 1]
   * (IsoTile.accentVariant) so a tile always keeps the same variant.
   * Returns false when no sprite is available so the caller can fall back.
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    biome: string,
    terrain: string,
    variantSeed: number,
    px: number,
    py: number
  ): boolean {
    const def = TILE_ATLAS_MANIFEST[biome];
    const img = this.images.get(biome);
    const entry = def?.terrains[terrain];
    if (!def || !img || !entry) return false;

    const col = Math.min(entry.variants - 1, Math.floor(variantSeed * entry.variants));
    ctx.drawImage(
      img,
      col * def.cellW, entry.row * def.cellH, def.cellW, def.cellH,
      Math.round(px - def.cellW / 2), Math.round(py - def.anchorY), def.cellW, def.cellH
    );
    return true;
  }
}

export const tileAtlas = new TileAtlas();
