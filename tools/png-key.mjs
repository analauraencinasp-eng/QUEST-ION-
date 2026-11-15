// png-key.mjs — makes the background colour of exported Figma layers transparent.
// Figma exports a layer frame with its fill, so stacked ship layers would hide each other.
// Usage: node tools/png-key.mjs <file.png> [more.png ...]   (key colour = top-left pixel)
// No dependencies: decodes/encodes 8-bit RGBA, non-interlaced PNGs with node:zlib.
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function decode(buf) {
  let p = 8, w = 0, h = 0, depth = 0, type = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), name = buf.toString('ascii', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; }
    if (name === 'IDAT') idat.push(data);
    p += 12 + len;
  }
  if (depth !== 8 || (type !== 6 && type !== 2)) throw new Error(`unsupported PNG (depth ${depth}, type ${type})`);
  const bpp = type === 6 ? 4 : 3, stride = w * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? line[x - bpp] : 0, b = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[x] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      out[o] = line[x * bpp]; out[o + 1] = line[x * bpp + 1]; out[o + 2] = line[x * bpp + 2]; out[o + 3] = bpp === 4 ? line[x * bpp + 3] : 255;
    }
    prev = line;
  }
  return { w, h, data: out };
}

export function encode({ w, h, data }) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; data.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (name, d) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const nd = Buffer.concat([Buffer.from(name, 'ascii'), d]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(nd));
    return Buffer.concat([len, nd, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

export function keyOut(img, rgb) {
  const [r, g, b] = rgb || [img.data[0], img.data[1], img.data[2]];
  for (let i = 0; i < img.data.length; i += 4) {
    if (Math.abs(img.data[i] - r) < 3 && Math.abs(img.data[i + 1] - g) < 3 && Math.abs(img.data[i + 2] - b) < 3) img.data[i + 3] = 0;
  }
  return img;
}

if (process.argv[1] && process.argv[1].endsWith('png-key.mjs')) {
  for (const f of process.argv.slice(2)) {
    const img = keyOut(decode(readFileSync(f)));
    writeFileSync(f, encode(img));
    console.log('keyed', f);
  }
}
