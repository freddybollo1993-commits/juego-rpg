// TileAtlas.ts - Hojas de suelo por bioma (con respaldo a color plano si falta la imagen)
//
// Cada bioma tiene UNA imagen: una fila por tipo de terreno y una columna por variante.
// Cada casilla es un rombo isometrico 2:1 de TILE_WIDTH x TILE_HEIGHT (ver Metrics.ts) que ocupa
// toda la celda; las 4 esquinas de la celda quedan transparentes. El rombo llega hasta el borde
// de la celda y no lleva sombras ni luces en el contorno, para que las casillas vecinas se unan
// sin costuras.
//
// Para poner arte propio: reemplazar public/tiles/<bioma>.png respetando este diseno.

import { ShadeLevel, buildShadedSheets } from './Shade';
import { TILE_WIDTH, TILE_HEIGHT } from './Metrics';

export interface TileAtlasTerrain {
  row: number;      // fila dentro de la hoja
  variants: number; // columnas de variantes disponibles en esa fila
}

export interface TileAtlasDef {
  image: string;
  cellW: number;
  cellH: number;
  terrains: Record<string, TileAtlasTerrain>;
}

/** Hoja con `terrains` de arriba a abajo en el PNG, 3 variantes cada uno. */
function sheet(biome: string, terrains: string[], variants: number = 3): TileAtlasDef {
  return {
    image: `/tiles/${biome}.png`,
    cellW: TILE_WIDTH,
    cellH: TILE_HEIGHT,
    terrains: Object.fromEntries(terrains.map((name, row) => [name, { row, variants }]))
  };
}

// Las claves son RegionData.biomeType. El orden de filas debe coincidir con tools/generate-placeholder-tiles.mjs
export const TILE_ATLAS_MANIFEST: Record<string, TileAtlasDef> = {
  beach:      sheet('beach',      ['dry_sand', 'wet_sand', 'coastal_pebbles', 'deep_water', 'rock_cliff']),
  frost:      sheet('frost',      ['packed_snow', 'glacial_ice', 'frost_rock', 'boundary_cliff']),
  forest:     sheet('forest',     ['pine_humus', 'ancient_moss', 'root_cluster', 'boundary_cliff']),
  swamp:      sheet('swamp',      ['mud_moss', 'toxic_slime', 'deep_mire', 'boundary_cliff']),
  canyon:     sheet('canyon',     ['red_sandstone', 'magma_fissure', 'basalt_gravel', 'boundary_cliff']),
  caverns:    sheet('caverns',    ['dark_slate', 'crystal_cluster', 'abyssal_chasm', 'boundary_cliff']),
  alien_core: sheet('alien_core', ['precursor_alloy', 'plasma_circuit', 'levitation_ring', 'boundary_cliff'])
};

export class TileAtlas {
  private sheets: Map<string, CanvasImageSource[]> = new Map();
  private started: boolean = false;

  /** Carga todas las hojas. Si falta una imagen se usa el color plano de respaldo. */
  public preloadAll(): Promise<void> {
    if (this.started) return Promise.resolve();
    this.started = true;

    const jobs = Object.entries(TILE_ATLAS_MANIFEST).map(([biome, def]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          this.sheets.set(biome, buildShadedSheets(img));
          resolve();
        };
        img.onerror = () => {
          console.warn(`[TileAtlas] No se pudo cargar ${def.image} (se usa color plano)`);
          resolve();
        };
        img.src = def.image;
      });
    });

    return Promise.all(jobs).then(() => {});
  }

  /**
   * Dibuja una casilla con su esquina superior izquierda en (px, py). `variantSeed` en [0, 1] elige una variante estable.
   * `shade` oscurece segun la niebla. Devuelve false si no hay sprite (el llamador usa el respaldo).
   */
  public draw(
    ctx: CanvasRenderingContext2D,
    biome: string,
    terrain: string,
    variantSeed: number,
    px: number,
    py: number,
    shade: ShadeLevel = 0
  ): boolean {
    const def = TILE_ATLAS_MANIFEST[biome];
    const sheets = this.sheets.get(biome);
    const entry = def?.terrains[terrain];
    if (!def || !sheets || !entry) return false;

    const col = Math.min(entry.variants - 1, Math.floor(variantSeed * entry.variants));
    ctx.drawImage(
      sheets[shade],
      col * def.cellW, entry.row * def.cellH, def.cellW, def.cellH,
      Math.round(px), Math.round(py), def.cellW, def.cellH
    );
    return true;
  }
}

export const tileAtlas = new TileAtlas();
