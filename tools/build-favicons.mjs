// Generates every favicon from the SAME file the nav logo <img> points at, so
// the tab icon can never drift from the mark in the header.
//
// The mark is light on transparent and vanishes on a white tab bar, so each
// icon is the mark centred at ~76% of the canvas width on a solid --base
// square. Aspect ratio is preserved (fit: inside); nothing is stretched.
//
// Run: npm run favicons
import sharp from "sharp";
import { writeFileSync, existsSync } from "node:fs";

const SOURCE = "src/assets/img/vt-logo.png"; // == the nav <img src>
const OUT = "src/assets/img";
const BASE = { r: 7, g: 11, b: 24, alpha: 1 }; // #070B18
const MARK_WIDTH = 0.76;

if (!existsSync(SOURCE)) throw new Error("source missing: " + SOURCE);
const meta = await sharp(SOURCE).metadata();
console.log(`source ${SOURCE}  ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}`);

async function icon(size) {
  const mark = await sharp(SOURCE)
    .resize({ width: Math.round(size * MARK_WIDTH), height: size, fit: "inside", kernel: "lanczos3" })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BASE } })
    .composite([{ input: mark, gravity: "centre" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

// PNG-in-ICO container: 6-byte header, 16-byte entry per image, then the blobs.
function ico(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  entries.forEach(({ size, png }, i) => {
    const o = i * 16;
    dir.writeUInt8(size === 256 ? 0 : size, o); dir.writeUInt8(size === 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2); dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4); dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8); dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

const sizes = { 16: "favicon-16.png", 32: "favicon-32.png", 180: "apple-touch-icon.png" };
const pngs = {};
for (const [size, name] of Object.entries(sizes)) {
  pngs[size] = await icon(Number(size));
  writeFileSync(`${OUT}/${name}`, pngs[size]);
  console.log(`wrote ${OUT}/${name}  ${size}x${size}  ${pngs[size].length} bytes`);
}
writeFileSync(`${OUT}/favicon.ico`, ico([{ size: 16, png: pngs[16] }, { size: 32, png: pngs[32] }]));
console.log(`wrote ${OUT}/favicon.ico  (16 + 32)`);
