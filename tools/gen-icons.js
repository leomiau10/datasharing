// Generates icons/icon-192.png and icon-512.png (pixel-art hero) with a
// hand-rolled PNG encoder. Run with: node tools/gen-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// Same pixel art as the in-game hero (js/engine/sprites.js, small Pip).
const heroPal = {
  y: [255, 216, 74], Y: [216, 154, 28], t: [37, 181, 164], T: [23, 122, 116], s: [255, 208, 164],
  k: [42, 26, 58], w: [255, 255, 255], r: [255, 154, 138], n: [244, 160, 128], m: [200, 74, 74],
  o: [242, 138, 46], l: [255, 192, 112], b: [110, 60, 30], '.': null
};
const hero = [
  '.......yy.......',
  '......yYYy......',
  '....tttttttt....',
  '...tttttttttt...',
  '..tTTTTTTTTTTt..',
  '.ssssskwssskwss.',
  '.ssssskkssskkss.',
  '.ssrrsssnnssrrs.',
  '..sssssssmmss...',
  '...oooooooooo...',
  '.sooollllllooos.',
  '.soooooooooooos.',
  '..oooooooooooo..',
  '...oooooooooo...',
  '...bbb....bbb...',
  '..bbbb....bbbb..'
];

function makeIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  // background gradient-ish sky + ground
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      let r, g, b;
      if (y > size * 0.78) { r = 156; g = 90; b = 40; }       // ground
      else { r = 92; g = 148; b = 252; }                       // sky
      rgba[i] = r; rgba[i + 1] = g; rgba[i + 2] = b; rgba[i + 3] = 255;
    }
  }
  // draw hero centered, scaled
  const hw = hero[0].length, hh = hero.length;
  const scale = Math.floor(size * 0.62 / hh);
  const ox = Math.floor((size - hw * scale) / 2);
  const oy = Math.floor(size * 0.74 - hh * scale);
  for (let ry = 0; ry < hh; ry++) {
    for (let rx = 0; rx < hw; rx++) {
      const col = heroPal[hero[ry][rx]];
      if (!col) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = ox + rx * scale + sx;
          const py = oy + ry * scale + sy;
          if (px < 0 || py < 0 || px >= size || py >= size) continue;
          const i = (py * size + px) * 4;
          rgba[i] = col[0]; rgba[i + 1] = col[1]; rgba[i + 2] = col[2]; rgba[i + 3] = 255;
        }
      }
    }
  }
  return encodePNG(size, size, rgba);
}

const outDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon-192.png'), makeIcon(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), makeIcon(512));
console.log('icons written');
