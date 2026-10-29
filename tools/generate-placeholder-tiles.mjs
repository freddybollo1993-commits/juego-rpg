// generate-placeholder-tiles.mjs
// Escribe atlas PROVISIONALES de suelo PLANO para cada bioma en public/tiles/<bioma>.png.
// El diseno debe coincidir con TILE_ATLAS_MANIFEST (src/core/TileAtlas.ts):
//   celdas de 80x40 (un rombo 2:1 sin grosor), una fila por terreno en el orden de abajo,
//   3 columnas de variantes. Cualquier PNG se puede reemplazar por arte final sin tocar codigo
//   mientras se respete ese diseno.
//
// Uso: node tools/generate-placeholder-tiles.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CELL_W = 80;
const CELL_H = 40;
const HALF_W = CELL_W / 2;
const HALF_H = CELL_H / 2;
const VARIANTS = 3;
// El rombo se dibuja un poco mas grande que la celda para solaparse 1 px con sus vecinos:
// asi no quedan lineas oscuras entre casillas (el piso se ve continuo).
const OVERDRAW = 1.045;

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
// t(nombre, color base, color de motitas, detalle?)   detalle: { color, kind: 'lines' | 'dots' }
const t = (name, top, speckle, detail = null) => ({ name, top: hex(top), speckle: hex(speckle), detail });

const BIOMES = {
  beach: [
    t('dry_sand', 0xb0a880, 0xc9c196),
    t('wet_sand', 0x9e9570, 0x7c7455),
    t('coastal_pebbles', 0x7d7a71, 0xa09c90),
    t('deep_water', 0x2b4353, 0x4a6e84),
    t('rock_cliff', 0x5a5750, 0x77736a)
  ],
  frost: [
    t('packed_snow', 0xd6e6f2, 0xffffff),
    t('glacial_ice', 0x7bc8e2, 0xd8f4ff, { color: 0xffffff, kind: 'lines' }),
    t('frost_rock', 0x5d6b79, 0x8092a3),
    t('boundary_cliff', 0x6c7a88, 0x93a4b5)
  ],
  forest: [
    t('pine_humus', 0x273820, 0x3d5530),
    t('ancient_moss', 0x3b552f, 0x5d8a48),
    t('root_cluster', 0x423326, 0x61503c),
    t('boundary_cliff', 0x3a3d33, 0x565a4b)
  ],
  swamp: [
    t('mud_moss', 0x2b3a27, 0x4d6a34),
    t('toxic_slime', 0x426b2b, 0x70e000, { color: 0x70e000, kind: 'dots' }),
    t('deep_mire', 0x1c2219, 0x2f3a2a),
    t('boundary_cliff', 0x2f3529, 0x485240)
  ],
  canyon: [
    t('red_sandstone', 0x884323, 0xb3673d),
    t('magma_fissure', 0x4a1e12, 0x6d2f1c, { color: 0xff5400, kind: 'lines' }),
    t('basalt_gravel', 0x50443e, 0x7a6b63),
    t('boundary_cliff', 0x6a3a22, 0x8e5535)
  ],
  caverns: [
    t('dark_slate', 0x1a162b, 0x322b52),
    t('crystal_cluster', 0x3f37c9, 0x4cc9f0, { color: 0x4cc9f0, kind: 'dots' }),
    t('abyssal_chasm', 0x0a0812, 0x18142a),
    t('boundary_cliff', 0x2a2440, 0x463d6e)
  ],
  alien_core: [
    t('precursor_alloy', 0x12212b, 0x1f3a4a),
    t('plasma_circuit', 0x0e3846, 0x14566a, { color: 0x00f5d4, kind: 'lines' }),
    t('levitation_ring', 0x23395b, 0x3a5a8c, { color: 0x4cc9f0, kind: 'dots' }),
    t('boundary_cliff', 0x16303d, 0x2a5668)
  ]
};

// Hash determinista -> [0, 1)
function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function renderAtlas(terrains) {
  const width = CELL_W * VARIANTS;
  const height = CELL_H * terrains.length;
  const rgba = Buffer.alloc(width * height * 4); // todo transparente

  const put = (x, y, [r, g, b]) => {
    const i = (y * width + x) * 4;
    rgba[i] = Math.max(0, Math.min(255, r));
    rgba[i + 1] = Math.max(0, Math.min(255, g));
    rgba[i + 2] = Math.max(0, Math.min(255, b));
    rgba[i + 3] = 255;
  };

  terrains.forEach((terrain, row) => {
    for (let variant = 0; variant < VARIANTS; variant++) {
      for (let cy = 0; cy < CELL_H; cy++) {
        for (let cx = 0; cx < CELL_W; cx++) {
          const dx = cx + 0.5 - HALF_W;
          const dy = cy + 0.5 - HALF_H;
          if (Math.abs(dx) / HALF_W + Math.abs(dy) / HALF_H > OVERDRAW) continue;

          // Textura suave: ruido por pixel, sin bordes ni luces marcadas en el contorno
          const noise = (hash(cx, cy, row * 7 + variant) - 0.5) * 14;
          let color = terrain.top.map((v) => v + noise);

          // Motitas claras dispersas (granos, guijarros, ondas)
          if (hash(cx + 91, cy + 17, row * 13 + variant * 5) > 0.93) {
            color = terrain.speckle.slice();
          }
          // Detalles brillantes: grietas / circuitos (diagonales) o burbujas / gemas (puntos)
          if (terrain.detail) {
            const d = hex(terrain.detail.color);
            if (terrain.detail.kind === 'lines') {
              const run = (cx + cy * 2 + variant * 7 + row * 3) % 19;
              if (run < 2 && hash(cx >> 3, cy >> 2, variant + 40) > 0.35) color = d;
            } else if (hash(cx + 5, cy + 71, variant * 11 + row) > 0.965) {
              color = d;
            }
          }

          put(variant * CELL_W + cx, row * CELL_H + cy, color);
        }
      }
    }
  });

  return { rgba, width, height };
}

// ---- Codificador PNG minimo (RGBA, 8 bits) ----
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng({ rgba, width, height }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profundidad de bits
  ihdr[9] = 6; // tipo de color: RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filtro: ninguno
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/tiles');
mkdirSync(outDir, { recursive: true });
for (const [biome, terrains] of Object.entries(BIOMES)) {
  const atlas = renderAtlas(terrains);
  const png = encodePng(atlas);
  writeFileSync(resolve(outDir, `${biome}.png`), png);
  console.log(`${biome}.png  ${atlas.width}x${atlas.height}  ${png.length} bytes  [${terrains.map((x) => x.name).join(', ')}]`);
}
