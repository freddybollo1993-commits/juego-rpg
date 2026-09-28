// generate-placeholder-tiles.mjs
// Writes a PLACEHOLDER ground-tile atlas for the beach biome to public/tiles/beach.png.
// Layout must match TILE_ATLAS_MANIFEST.beach in src/core/TileAtlas.ts
// (72x50 cells, one row per terrain, 3 variant columns). Replace the PNG with real art
// whenever it is ready - no code changes needed as long as the layout stays the same.
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

// Same palette family as IsometricGrid.getTileColors (beach) + a rock cliff
const TERRAINS = [
  { name: 'dry_sand',        top: [0xb0, 0xa8, 0x80], left: [0x8e, 0x86, 0x63], right: [0x6d, 0x67, 0x49], speckle: [0xc9, 0xc1, 0x96] },
  { name: 'wet_sand',        top: [0x9e, 0x95, 0x70], left: [0x78, 0x71, 0x52], right: [0x5c, 0x56, 0x3c], speckle: [0x7c, 0x74, 0x55] },
  { name: 'coastal_pebbles', top: [0x7d, 0x7a, 0x71], left: [0x5f, 0x5d, 0x56], right: [0x45, 0x43, 0x3d], speckle: [0xa0, 0x9c, 0x90] },
  { name: 'deep_water',      top: [0x2b, 0x43, 0x53], left: [0x1d, 0x2e, 0x3a], right: [0x12, 0x1d, 0x25], speckle: [0x4a, 0x6e, 0x84] },
  { name: 'rock_cliff',      top: [0x5a, 0x57, 0x50], left: [0x3f, 0x3d, 0x38], right: [0x2b, 0x2a, 0x27], speckle: [0x77, 0x73, 0x6a] }
];

const width = CELL_W * VARIANTS;
const height = CELL_H * TERRAINS.length;
const rgba = Buffer.alloc(width * height * 4); // fully transparent

// Small deterministic hash -> [0, 1)
function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function put(x, y, [r, g, b]) {
  const i = (y * width + x) * 4;
  rgba[i] = Math.max(0, Math.min(255, r));
  rgba[i + 1] = Math.max(0, Math.min(255, g));
  rgba[i + 2] = Math.max(0, Math.min(255, b));
  rgba[i + 3] = 255;
}

TERRAINS.forEach((terrain, row) => {
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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // colour type: RGBA
const raw = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y++) {
  raw[y * (width * 4 + 1)] = 0; // filter: none
  rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../public/tiles/beach.png');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`Wrote ${out} (${width}x${height}, ${png.length} bytes)`);
