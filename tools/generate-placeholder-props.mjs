// generate-placeholder-props.mjs
// Writes PLACEHOLDER decoration-prop atlases (pixel-art style) to public/props/<biome>.png.
// Layout must match PROP_ATLAS_MANIFEST in src/core/PropAtlas.ts:
//   64x80 cells, one row per prop kind (order below), 3 variant columns,
//   the prop's base sits at (32, 72) inside each cell.
// Replace any PNG with real art whenever it is ready - no code changes needed as long as
// the layout stays the same.
//
// Usage: node tools/generate-placeholder-props.mjs

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const W = 64;
const H = 80;
const BX = 32; // base anchor inside a cell
const BY = 72;
const VARIANTS = 3;

// ---------- palette helpers ----------
const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
const mul = (c, k, add = 0) => c.map((v) => Math.max(0, Math.min(255, Math.round(v * k + add))));
/** [base, light (top-left), dark (bottom-right)] */
const P = (h) => {
  const b = hex(h);
  return [b, mul(b, 1.28, 12), mul(b, 0.62)];
};

// ---------- deterministic prng ----------
function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- cell raster (coordinates are LOCAL: (0,0) = base, y grows downward, up is negative) ----------
const makeCell = () => new Uint8Array(W * H * 4);
function set(c, x, y, col, a = 255) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  c[i] = col[0];
  c[i + 1] = col[1];
  c[i + 2] = col[2];
  c[i + 3] = a;
}
function ellipse(c, cx, cy, rx, ry, pal) {
  const ax = BX + cx;
  const ay = BY + cy;
  for (let y = Math.floor(ay - ry); y <= Math.ceil(ay + ry); y++) {
    for (let x = Math.floor(ax - rx); x <= Math.ceil(ax + rx); x++) {
      const nx = (x + 0.5 - ax) / rx;
      const ny = (y + 0.5 - ay) / ry;
      if (nx * nx + ny * ny > 1) continue;
      const light = -0.6 * nx - 0.8 * ny;
      set(c, x, y, light > 0.42 ? pal[1] : light < -0.3 ? pal[2] : pal[0]);
    }
  }
}
function rect(c, x0, y0, x1, y1, pal) {
  const ax0 = BX + x0;
  const ax1 = BX + x1;
  for (let y = Math.floor(BY + y0); y < Math.ceil(BY + y1); y++) {
    for (let x = Math.floor(ax0); x < Math.ceil(ax1); x++) {
      const f = (x + 0.5 - ax0) / Math.max(1, ax1 - ax0);
      set(c, x, y, f < 0.3 ? pal[1] : f > 0.7 ? pal[2] : pal[0]);
    }
  }
}
function tri(c, x0, y0, x1, y1, x2, y2, pal) {
  const ax = BX + x0, ay = BY + y0, bx = BX + x1, by = BY + y1, cx = BX + x2, cy = BY + y2;
  const minX = Math.floor(Math.min(ax, bx, cx));
  const maxX = Math.ceil(Math.max(ax, bx, cx));
  const minY = Math.floor(Math.min(ay, by, cy));
  const maxY = Math.ceil(Math.max(ay, by, cy));
  const mx = (ax + bx + cx) / 3;
  const hw = Math.max(1, (maxX - minX) / 2);
  const den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (den === 0) return;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const l1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / den;
      const l2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < 0 || l2 < 0 || l3 < 0) continue;
      const s = (px - mx) / hw;
      set(c, x, y, s < -0.25 ? pal[1] : s > 0.25 ? pal[2] : pal[0]);
    }
  }
}
function line(c, x0, y0, x1, y1, col, th = 1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = BX + x0 + (x1 - x0) * t;
    const y = BY + y0 + (y1 - y0) * t;
    for (let dy = 0; dy < th; dy++) for (let dx = 0; dx < th; dx++) set(c, x + dx - th / 2, y + dy - th / 2, col);
  }
}
const dot = (c, x, y, col, r = 1) => rect(c, x - r, y - r, x + r, y + r, [col, col, col]);

/** Dark 1px outline around the sprite + soft ground shadow under it (drawn only on empty pixels). */
function finish(c, shadowRx) {
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && c[(y * W + x) * 4 + 3] >= 200;
  const outline = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (c[(y * W + x) * 4 + 3] !== 0) continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) outline.push([x, y]);
    }
  }
  for (const [x, y] of outline) set(c, x, y, [12, 12, 20], 235);
  for (let y = BY - 7; y <= BY + 7; y++) {
    for (let x = BX - shadowRx - 1; x <= BX + shadowRx + 1; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H || c[(y * W + x) * 4 + 3] !== 0) continue;
      const nx = (x + 0.5 - BX) / shadowRx;
      const ny = (y + 0.5 - BY) / 5.5;
      if (nx * nx + ny * ny <= 1) set(c, x, y, [0, 0, 0], 70);
    }
  }
}

// ---------- prop drawings: (cell, variant 0..2, prng) => shadowRx ----------
const SCALE = [0.85, 1, 1.15];
const blob = (c, cx, cy, rx, ry, h) => ellipse(c, cx, cy, rx, ry, P(h));

const KINDS = {
  // ---- beach ----
  palm(c, v) {
    const lean = [-6, 0, 7][v];
    const top = { x: lean * 1.4, y: -44 };
    for (let t = 0; t <= 1; t += 0.03) {
      const x = lean * t * t * 1.4;
      const y = -44 * t;
      rect(c, x - 2.5, y - 1, x + 2.5, y + 1.5, P(t * 10 % 2 < 1 ? 0x6b4a2a : 0x5a3d22));
    }
    for (const a of [-2.9, -2.3, -1.7, -1.3, -0.8, -0.25]) {
      for (let s = 0.1; s <= 1; s += 0.08) {
        blob(c, top.x + Math.cos(a) * 20 * s, top.y + Math.sin(a) * 9 * s + 15 * s * s, 2.6, 2, s > 0.6 ? 0x2d8a4a : 0x3aa05a);
      }
    }
    blob(c, top.x, top.y + 1, 3, 3, 0x6b4a2a);
    return 18;
  },
  rock(c, v) {
    const s = SCALE[v];
    blob(c, 0, -7 * s, 12 * s, 8 * s, 0x7d7a71);
    blob(c, -11, -3, 6 * s, 4, 0x6b6861);
    blob(c, 10, -3, 5 * s, 3.5, 0x8a877d);
    return 16;
  },
  driftwood(c, v) {
    line(c, -15, -3, 15, -7 - v * 2, hex(0x8a6f4a), 4);
    line(c, -15, -3, 15, -7 - v * 2, hex(0xa88a5e), 1);
    line(c, -2, -5, 4, -14 - v * 2, hex(0x7a6040), 2);
    dot(c, 15, -7 - v * 2, hex(0x6b5236), 2);
    return 17;
  },
  grass_tuft(c, v, r) {
    for (let i = 0; i < 6; i++) {
      const bx = (i - 2.5) * 3.2;
      const h = 9 + r() * 8 + v * 2;
      tri(c, bx - 1.6, 0, bx + 1.6, 0, bx + (r() - 0.5) * 6, -h, P(i % 2 ? 0x9aa84a : 0x7d8c3a));
    }
    return 9;
  },

  // ---- frost ----
  ice_spike(c, v, r) {
    const n = 1 + v;
    for (let i = 0; i < n; i++) {
      const bx = (i - (n - 1) / 2) * 11;
      tri(c, bx - 5, 0, bx + 5, 0, bx + (r() - 0.5) * 4, -(24 + r() * 16 + i * 2), P(i % 2 ? 0x9ad8ee : 0x7bc8e2));
    }
    return 14;
  },
  snow_rock(c) {
    blob(c, 0, -8, 13, 9, 0x5d6b79);
    blob(c, -1, -13, 10, 5, 0xe2edf5);
    return 16;
  },
  dead_pine(c, v, r) {
    rect(c, -2, -42, 2, 0, P(0x3a2c22));
    for (const y of [-32, -23, -14]) {
      const len = 8 + r() * 5 + v;
      line(c, 0, y, -len, y + 5, hex(0x3a2c22), 2);
      line(c, 0, y - 3, len, y + 3, hex(0x3a2c22), 2);
      dot(c, -len, y + 4, hex(0xeef5fa));
      dot(c, len, y + 2, hex(0xeef5fa));
    }
    return 12;
  },
  snow_mound(c, v) {
    blob(c, 0, -6, 20 * SCALE[v], 8, 0xe6f0f7);
    blob(c, -13, -3, 9, 5, 0xd6e6f2);
    return 20;
  },

  // ---- forest ----
  pine(c, v) {
    const s = SCALE[v];
    rect(c, -2.5, -10, 2.5, 0, P(0x5a3f28));
    tri(c, -16 * s, -8, 16 * s, -8, 0, -28, P(0x2e4a25));
    tri(c, -13 * s, -22, 13 * s, -22, 0, -42, P(0x35552a));
    tri(c, -10 * s, -36, 10 * s, -36, 0, -56, P(0x3d6230));
    return 16;
  },
  bush(c, v, r) {
    blob(c, -7, -7, 9, 7, 0x3b552f);
    blob(c, 6, -8, 9, 8, 0x456a37);
    blob(c, 0, -13, 8, 6, 0x4d7a3a);
    for (let i = 0; i < 3 + v; i++) dot(c, (r() - 0.5) * 20, -4 - r() * 12, hex(0xd6403a));
    return 15;
  },
  mossy_rock(c, v) {
    const s = SCALE[v];
    blob(c, 0, -7, 12 * s, 8 * s, 0x6b6a64);
    blob(c, -2, -12 * s, 9 * s, 4, 0x4d7a3a);
    return 15;
  },
  stump(c) {
    rect(c, -7, -10, 7, 0, P(0x5a3f28));
    blob(c, 0, -10, 7, 3, 0xb08a5a);
    blob(c, 0, -10, 3.5, 1.5, 0x8a6a3e);
    return 12;
  },

  // ---- swamp ----
  dead_tree(c, v, r) {
    for (let t = 0; t <= 1; t += 0.04) {
      const x = Math.sin(t * 5 + v) * 3;
      rect(c, x - 2.5 + t, -42 * t - 1, x + 2.5 - t, -42 * t + 1, P(0x2c2a24));
    }
    line(c, 0, -30, -13, -40, hex(0x2c2a24), 2);
    line(c, 1, -36, 12, -46, hex(0x2c2a24), 2);
    line(c, -8, -35, -12, -28, hex(0x4a5a3a), 1);
    line(c, 8, -41, 11, -33, hex(0x4a5a3a), 1);
    return 13;
  },
  reeds(c, v, r) {
    for (let i = 0; i < 7; i++) {
      const bx = (i - 3) * 3.4;
      const h = 18 + r() * 16;
      rect(c, bx - 0.75, -h, bx + 0.75, 0, P(0x6b7a3a));
      if (i % 3 === 0) blob(c, bx, -h, 1.8, 3.5, 0x5a3f28);
    }
    return 12;
  },
  mushroom(c, v) {
    const cap = [0x6a3d7a, 0x8a4a5a, 0x70e000][v];
    rect(c, -2, -10, 2, 0, P(0xd8d0b0));
    blob(c, 0, -12, 10, 6, cap);
    dot(c, -4, -14, hex(0xf0e8d0));
    dot(c, 3, -15, hex(0xf0e8d0));
    return 11;
  },
  bog_rock(c, v) {
    blob(c, 0, -6, 13 * SCALE[v], 7, 0x3a4036);
    blob(c, 2, -10, 8, 3.5, 0x4a6a34);
    return 15;
  },

  // ---- canyon ----
  boulder(c, v) {
    const s = SCALE[v];
    blob(c, 0, -9 * s, 14 * s, 10 * s, 0x8a4a2a);
    blob(c, -13, -3, 6, 4, 0x6a3a22);
    return 17;
  },
  cactus(c, v) {
    rect(c, -3, -36, 3, 0, P(0x3f7a3a));
    blob(c, 0, -36, 3, 2, 0x3f7a3a);
    rect(c, -12, -22, -3, -18, P(0x3f7a3a));
    rect(c, -12, -30, -8, -18, P(0x3f7a3a));
    if (v > 0) {
      rect(c, 3, -26, 12, -22, P(0x3f7a3a));
      rect(c, 8, -34, 12, -22, P(0x3f7a3a));
    }
    return 11;
  },
  bones(c, v) {
    const bone = [0xe8e0c8, 0xd8d0b8][v % 2];
    rect(c, -14, -3, 14, -1, P(bone));
    for (let i = 0; i < 5; i++) line(c, -10 + i * 5, -2, -8 + i * 5, -11, hex(bone), 1);
    blob(c, 17, -5, 4, 3.5, bone);
    dot(c, 18, -6, hex(0x2a2018));
    return 18;
  },
  rock_spire(c, v) {
    const s = SCALE[v];
    tri(c, -9, 0, 9, 0, (v - 1) * 3, -46 * s, P(0x6a3a22));
    tri(c, 5, 0, 15, 0, 11, -22 * s, P(0x884323));
    return 15;
  },

  // ---- caverns ----
  crystal(c, v, r) {
    const cols = [0x3f37c9, 0x7209b7, 0x4cc9f0];
    for (let i = 0; i < 3; i++) {
      const bx = (i - 1) * 9;
      tri(c, bx - 4.5, 0, bx + 4.5, 0, bx + (r() - 0.5) * 3, -(20 + r() * 20 + (i === 1 ? 8 : 0)), P(cols[(i + v) % 3]));
    }
    return 15;
  },
  stalagmite(c, v) {
    tri(c, -8, 0, 8, 0, 0, -(32 + v * 4), P(0x4a4266));
    tri(c, 6, 0, 14, 0, 10, -16, P(0x5a5078));
    return 14;
  },
  glow_mushroom(c, v) {
    for (const [x, h, cap] of [[-6, 10, 0x4cc9f0], [6, 14, 0x7fe3ff]]) {
      rect(c, x - 1.5, -h, x + 1.5, 0, P(0xb0d8e8));
      blob(c, x, -h - 2, 7, 4.5, cap);
      dot(c, x - 2, -h - 3, hex(0xffffff));
    }
    return 12;
  },
  rubble(c, v, r) {
    for (let i = 0; i < 4; i++) blob(c, (i - 1.5) * 7, -2 - r() * 3, 4 + r() * 3, 3 + r() * 2, [0x4a4266, 0x5a5078, 0x3a3456][i % 3]);
    return 14;
  },

  // ---- alien core ----
  antenna(c, v) {
    rect(c, -6, -6, 6, 0, P(0x2a4a5a));
    rect(c, -1, -46, 1, -6, P(0x3a6a80));
    blob(c, 0, -46, 8, 3, 0x2a4a5a);
    blob(c, 0, -50, 2.5, 2.5, 0x00f5d4);
    return 12;
  },
  debris(c, v) {
    tri(c, -14, 0, -2, 0, -8, -16 - v * 3, P(0x1f4a5c));
    tri(c, -2, 0, 12, 0, 6, -22, P(0x23395b));
    tri(c, 6, 0, 16, 0, 12, -9, P(0x1f4a5c));
    line(c, -8, -14, -6, -3, hex(0x00f5d4), 1);
    return 16;
  },
  pylon(c) {
    rect(c, -7, -36, 7, 0, P(0x23395b));
    rect(c, -2, -30, 2, -6, [hex(0x4cc9f0), hex(0x9af0ff), hex(0x2a9cc0)]);
    tri(c, -7, -36, 7, -36, 0, -44, P(0x2a4a5a));
    return 12;
  },
  plasma_vent(c) {
    blob(c, 0, -4, 14, 6, 0x12212b);
    blob(c, 0, -4, 9, 3.5, 0x00f5d4);
    rect(c, -1, -18, 1, -6, [hex(0x00f5d4), hex(0xb0fff0), hex(0x00a89a)]);
    dot(c, 3, -14, hex(0x4cc9f0));
    return 16;
  }
};

// Row order per biome must match PROP_ATLAS_MANIFEST
const BIOMES = {
  beach: ['palm', 'rock', 'driftwood', 'grass_tuft'],
  frost: ['ice_spike', 'snow_rock', 'dead_pine', 'snow_mound'],
  forest: ['pine', 'bush', 'mossy_rock', 'stump'],
  swamp: ['dead_tree', 'reeds', 'mushroom', 'bog_rock'],
  canyon: ['boulder', 'cactus', 'bones', 'rock_spire'],
  caverns: ['crystal', 'stalagmite', 'glow_mushroom', 'rubble'],
  alien_core: ['antenna', 'debris', 'pylon', 'plasma_vent']
};

function renderAtlas(kinds) {
  const width = W * VARIANTS;
  const height = H * kinds.length;
  const rgba = Buffer.alloc(width * height * 4);
  kinds.forEach((kind, row) => {
    for (let v = 0; v < VARIANTS; v++) {
      const cell = makeCell();
      const shadow = KINDS[kind](cell, v, rng(row * 101 + v * 13 + kind.length));
      finish(cell, shadow);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const s = (y * W + x) * 4;
          const d = ((row * H + y) * width + v * W + x) * 4;
          rgba[d] = cell[s];
          rgba[d + 1] = cell[s + 1];
          rgba[d + 2] = cell[s + 2];
          rgba[d + 3] = cell[s + 3];
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
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../public/props');
mkdirSync(outDir, { recursive: true });
for (const [biome, kinds] of Object.entries(BIOMES)) {
  const atlas = renderAtlas(kinds);
  const png = encodePng(atlas);
  writeFileSync(resolve(outDir, `${biome}.png`), png);
  console.log(`${biome}.png  ${atlas.width}x${atlas.height}  ${png.length} bytes  [${kinds.join(', ')}]`);
}
