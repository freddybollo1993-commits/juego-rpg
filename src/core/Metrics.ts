// Metrics.ts - Medidas base del mundo. Un solo lugar para cambiar el tamano de casilla.
//
// Cada casilla es un rombo isometrico 2:1: el doble de ancho que de alto. Es la proporcion
// estandar del arte isometrico, asi que los sprites y suelos isometricos calzan sin deformarse.

/** Ancho del rombo en pixeles. Los atlas de suelo usan celdas de TILE_WIDTH x TILE_HEIGHT. */
export const TILE_WIDTH = 96;

/** Alto del rombo en pixeles (la mitad del ancho: proporcion 2:1) */
export const TILE_HEIGHT = TILE_WIDTH / 2;

/** Casillas por lado de un mapa */
export const MAP_SIZE = 64;
