// Metrics.ts - Medidas base del mundo. Un solo lugar para cambiar el tamano de casilla.
//
// Cada casilla es un CUADRADO PERFECTO girado 45 grados: se ve como un rombo que mide lo mismo de
// ancho que de alto (proporcion 1:1). Como es una rotacion pura, los circulos (vision, luz) siguen
// siendo circulos, y los 4 pasos "en cruz" de la pantalla son los pasos diagonales de la cuadricula.

/** Ancho y alto del rombo en pixeles (la diagonal del cuadrado). Los atlas de suelo usan celdas de este tamano. */
export const TILE_SIZE = 96;

/** Lado real del cuadrado = distancia entre los centros de dos casillas vecinas */
export const TILE_SIDE = TILE_SIZE / Math.SQRT2;

/** Casillas por lado de un mapa */
export const MAP_SIZE = 64;
