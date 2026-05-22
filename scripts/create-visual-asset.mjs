import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const width = 1400;
const height = 900;
const data = Buffer.alloc(width * height * 4);

const palette = {
  ink: [23, 33, 38, 255],
  ink2: [31, 49, 55, 255],
  paper: [242, 236, 224, 255],
  gold: [184, 135, 54, 255],
  burgundy: [124, 38, 55, 255],
  jade: [31, 109, 92, 255],
  blue: [40, 80, 107, 255],
  vellum: [251, 250, 247, 255],
};

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const offset = (Math.floor(y) * width + Math.floor(x)) * 4;
  data[offset] = color[0];
  data[offset + 1] = color[1];
  data[offset + 2] = color[2];
  data[offset + 3] = color[3];
}

function fillRect(x, y, w, h, color) {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPixel(xx, yy, color);
  }
}

function line(x0, y0, x1, y1, color) {
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;

  while (true) {
    setPixel(x0, y0, color);
    setPixel(x0 + 1, y0, color);
    setPixel(x0, y0 + 1, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * error;
    if (e2 >= dy) {
      error += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

function documentCard(x, y, w, h, accent) {
  fillRect(x + 10, y + 12, w, h, [0, 0, 0, 42]);
  fillRect(x, y, w, h, palette.vellum);
  fillRect(x, y, 10, h, accent);
  fillRect(x + 28, y + 26, w - 56, 10, palette.ink2);
  fillRect(x + 28, y + 54, w - 88, 7, [92, 104, 109, 255]);
  fillRect(x + 28, y + 76, w - 68, 7, [121, 130, 132, 255]);
  fillRect(x + 28, y + 98, Math.floor((w - 70) * 0.68), 7, [121, 130, 132, 255]);
}

function chunk(type, body) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const crcBuffer = Buffer.concat([typeBuffer, body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuffer));
  return Buffer.concat([length, typeBuffer, body, crc]);
}

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

fillRect(0, 0, width, height, palette.ink);
for (let y = 0; y < height; y += 1) {
  const shade = Math.floor((y / height) * 34);
  for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 4;
    data[offset] = Math.min(255, data[offset] + shade);
    data[offset + 1] = Math.min(255, data[offset + 1] + shade);
    data[offset + 2] = Math.min(255, data[offset + 2] + shade);
  }
}

const nodes = [
  [760, 140, 270, 150, palette.gold],
  [1020, 300, 250, 140, palette.jade],
  [680, 430, 320, 170, palette.burgundy],
  [1080, 570, 240, 140, palette.blue],
  [820, 700, 290, 130, palette.gold],
  [1160, 90, 190, 120, palette.jade],
  [540, 260, 230, 130, palette.blue],
];

for (let i = 0; i < nodes.length; i += 1) {
  for (let j = i + 1; j < nodes.length; j += 1) {
    const [x0, y0, w0, h0] = nodes[i];
    const [x1, y1, w1, h1] = nodes[j];
    if ((i + j) % 2 === 0) line(x0 + w0 / 2, y0 + h0 / 2, x1 + w1 / 2, y1 + h1 / 2, [222, 203, 160, 110]);
  }
}

for (const node of nodes) documentCard(...node);

fillRect(70, 120, 360, 14, palette.gold);
fillRect(70, 160, 480, 14, palette.paper);
fillRect(70, 200, 420, 10, [205, 209, 204, 255]);
fillRect(70, 230, 520, 10, [166, 178, 174, 255]);
fillRect(70, 260, 430, 10, [166, 178, 174, 255]);
fillRect(70, 330, 180, 10, palette.jade);
fillRect(70, 362, 280, 8, [166, 178, 174, 255]);
fillRect(70, 390, 230, 8, [166, 178, 174, 255]);

const raw = Buffer.alloc((width * 4 + 1) * height);
for (let y = 0; y < height; y += 1) {
  raw[y * (width * 4 + 1)] = 0;
  data.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

mkdirSync(join(root, "public/images"), { recursive: true });
writeFileSync(join(root, "public/images/order-map.png"), png);
console.log("Created public/images/order-map.png");
