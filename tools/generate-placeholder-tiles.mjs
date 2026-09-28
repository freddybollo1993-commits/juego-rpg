// generate-placeholder-tiles.mjs
// Writes PLACEHOLDER ground-tile atlases for every biome to public/tiles/<biome>.png.
// Layout must match TILE_ATLAS_MANIFEST in src/core/TileAtlas.ts
// (72x50 cells, one row per terrain in the order listed below, 3 variant columns).
// Replace any PNG with real art whenever it is ready - no code changes needed as long
// as the layout stays the same.
//
// Usage: node tools/generate-placeholder-tiles.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CELL_W = 72;
const CELL_H = 50;
const ANCHOR_Y = 18;
const HALF_W = 36;
const HALF_H = 18;
const DEPTH = 14;
const VARIANTS = 3;

const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
// t(name, top, left, right, speckle, detail?) - colours match IsometricGrid.getTileColors
const t = (name, top, left, right, speckle, detail = null) => ({
  name, top: hex(top), left: hex(left), right: hex(right), speckle: hex(speckle), detail
});

// detail: null | { color, kind: 'lines' | 'dots' }  (glowing cracks, circuits, bubbles...)
const BIOMES = {
  beach: [
    t('dry_sand', 0xb0a880, 0x8e8663, 0x6d6749, 0xc9c196),
    t('wet_sand', 0x9e9570, 0x787152, 0x5c563c, 0x7c7455),
    t('coastal_pebbles', 0x7d7a71, 0x5f5d56, 0x45433d, 0xa09c90),
    t('deep_water', 0x2b4353, 0x1d2e3a, 0x121d25, 0x4a6e84),
    t('rock_cliff', 0x5a5750, 0x3f3d38, 0x2b2a27, 0x77736a)
  ],
  frost: [
    t('packed_snow', 0xd6e6f2, 0x9ab3c4, 0x758d9e, 0xffffff),
    t('glacial_ice', 0x7bc8e2, 0x4e9ab3, 0x347083, 0xd8f4ff, { color: 0xffffff, kind: 'lines' }),
    t('frost_rock', 0x5d6b79, 0x424d58, 0x2e363d, 0x8092a3),
    t('boundary_cliff', 0x6c7a88, 0x4a5563, 0x333b45, 0x93a4b5)
  ],
  forest: [
    t('pine_humus', 0x273820, 0x1b2716, 0x121b0f, 0x3d5530),
    t('ancient_moss', 0x3b552f, 0x27391f, 0x1a2715, 0x5d8a48),
    t('root_cluster', 0x423326, 0x2f241b, 0x201812, 0x61503c),
    t('boundary_cliff', 0x3a3d33, 0x272a22, 0x181a15, 0x565a4b)
  ],
  swamp: [
    t('mud_moss', 0x2b3a27, 0x1d261a, 0x141a12, 0x4d6a34),
    t('toxic_slime', 0x426b2b, 0x2d4c1c, 0x1f3513, 0x70e000, { color: 0x70e000, kind: 'dots' }),
    t('deep_mire', 0x1c2219, 0x121610, 0x0a0d09, 0x2f3a2a),
    t('boundary_cliff', 0x2f3529, 0x1e2319, 0x121510, 0x485240)
  ],
  canyon: [
    t('red_sandstone', 0x884323, 0x6a341b, 0x4f2613, 0xb3673d),
    t('magma_fissure', 0x4a1e12, 0x31140c, 0x220e08, 0x6d2f1c, { color: 0xff5400, kind: 'lines' }),
    t('basalt_gravel', 0x50443e, 0x382f2b, 0x27201d, 0x7a6b63),
    t('boundary_cliff', 0x6a3a22, 0x472515, 0x2f180d, 0x8e5535)
  ],
  caverns: [
    t('dark_slate', 0x1a162b, 0x131020, 0x0d0b16, 0x322b52),
    t('crystal_cluster', 0x3f37c9, 0x2c268f, 0x1f1b66, 0x4cc9f0, { color: 0x4cc9f0, kind: 'dots' }),
    t('abyssal_chasm', 0x0a0812, 0x06050b, 0x030206, 0x18142a),
    t('boundary_cliff', 0x2a2440, 0x1a1629, 0x100d1a, 0x463d6e)
  ],
  alien_core: [
    t('precursor_alloy', 0x12212b, 0x0d1820, 0x091117, 0x1f3a4a),
    t('plasma_circuit', 0x0e3846, 0x092731, 0x061a21, 0x14566a, { color: 0x00f5d4, kind: 'lines' }),
    t('levitation_ring', 0x23395b, 0x18273f, 0x101b2c, 0x3a5a8c, { color: 0x4cc9f0, kind: 'dots' })
  ]
};

// Small deterministic hash -> [0, 1)
function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function renderAtlas(terrains) {
  const width = CELL_W * VARIANTS;
  const height = CELL_H * terrains.length;
  const rgba = Buffer.alloc(width * height * 4); // fully transparent

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
          const dy = cy + 0.5 - ANCHOR_Y;
          const nx = Math.abs(dx) / HALF_W;
          const inTop = nx + Math.abs(dy) / HALF_H <= 1;
          const bottomEdge = HALF_H * (1 - nx); // dy of the diamond's lower edge
          const inFace = !inTop && nx < 1 && dy > bottomEdge && dy <= bottomEdge + DEPTH;
          if (!inTop && !inFace) continue;

          const base = inTop ? terrain.top : dx < 0 ? terrain.left : terrain.right;
          const noise = (hash(cx, cy, row * 7 + variant) - 0.5) * 14;
          let color = base.map((v) => v + noise);

          // Sparse lighter speckles on the top surface (grains, pebbles, ripples)
          if (inTop && hash(cx + 91, cy + 17, row * 13 + variant * 5) > 0.93) {
            color = terrain.speckle.slice();
          }
          // Glowing details: cracks / circuit traces (diagonal runs) or bubbles / gems (dots)
          if (inTop && terrain.detail) {
            const d = hex(terrain.detail.color);
            if (terrain.detail.kind === 'lines') {
              const run = (cx + cy * 2 + variant * 7 + row * 3) % 19;
              if (run < 2 && hash(cx >> 3, cy >> 2, variant + 40) > 0.35) color = d;
            } else if (hash(cx + 5, cy + 71, variant * 11 + row) > 0.965) {
              color = d;
            }
          }
          // Thin highlight along the top edges to read as a lit rim
          if (inTop && nx + Math.abs(dy) / HALF_H > 0.9 && dy < 0) {
            color = color.map((v) => v + 14);
          }
          // Dark seam where the top meets the side faces
          if (inFace && dy <= bottomEdge + 1) {
            color = color.map((v) => v - 22);
          }

          put(variant * CELL_W + cx, row * CELL_H + cy, color);
        }
      }
    }
  });

  return { rgba, width, height };
}

// ---- Minimal PNG encoder (RGBA, 8-bit) ----
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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
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
