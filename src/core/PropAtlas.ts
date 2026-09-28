// PropAtlas.ts - Decoration prop spritesheets per biome (rocks, trees, crystals...)
//
// Same idea as TileAtlas: ONE image per biome, one ROW per prop kind, one COLUMN per variant.
//
//   cell size : 64 x 80
//   anchor    : the prop's base (where it touches the ground) is at (cellW / 2, anchorY)
//
// Props are drawn standing on the centre of a tile. A biome / kind without art is simply
// not drawn (props are purely decorative).

export interface PropAtlasDef {
  image: string;
  cellW: number;
  cellH: number;
  anchorY: number;
  variants: number;
  kinds: Record<string, number>; // kind -> row index
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

// Keys are RegionData.biomeType. Row order must match tools/generate-placeholder-props.mjs
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
  private images: Map<string, HTMLImageElement> = new Map();
  private started: boolean = false;

  /** Load every registered sheet. Missing files are ignored (those props are not drawn). */
  public preloadAll(): Promise<void> {
    if (this.started) return Promise.resolve();
    this.started = true;

    const jobs = Object.entries(PROP_ATLAS_MANIFEST).map(([biome, def]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.images.set(biome, img);
          resolve();
        };
        img.onerror = () => {
          console.warn(`[PropAtlas] Could not load prop sheet: ${def.image} (props hidden)`);
          resolve();
        };
        img.src = def.image;
      });
    });

    return Promise.all(jobs).then(() => {});
  }

  /**
   * Draw one prop with its base at (px, py). `variantSeed` in [0, 1] picks a stable variant.
   * Returns false when no sprite is available.
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    biome: string,
    kind: string,
    variantSeed: number,
    px: number,
    py: number
  ): boolean {
    const def = PROP_ATLAS_MANIFEST[biome];
    const img = this.images.get(biome);
    const row = def?.kinds[kind];
    if (!def || !img || row === undefined) return false;

    const col = Math.min(def.variants - 1, Math.floor(variantSeed * def.variants));
    ctx.drawImage(
      img,
      col * def.cellW, row * def.cellH, def.cellW, def.cellH,
      Math.round(px - def.cellW / 2), Math.round(py - def.anchorY), def.cellW, def.cellH
    );
    return true;
  }
}

export const propAtlas = new PropAtlas();
