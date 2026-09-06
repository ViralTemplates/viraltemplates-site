// Favicons from the SAME file the nav logo <img> points at, so the tab icon
// cannot drift from the header mark. Each output is one sharp resize with
// fit: "contain": the mark scaled to fit the square, centred, aspect preserved,
// padded with solid --base. No compositing step. PNG only, no .ico.
//
// Run: npm run favicons
import sharp from "sharp";
import { writeFileSync, existsSync } from "node:fs";

const SOURCE = "src/assets/img/vt-logo.png"; // == the nav <img src>
const OUT = "src/assets/img";
const BASE = { r: 7, g: 11, b: 24, alpha: 1 }; // #070B18

if (!existsSync(SOURCE)) throw new Error("source missing: " + SOURCE);
const meta = await sharp(SOURCE).metadata();
console.log(`source ${SOURCE}  ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}`);

// The source carries transparent margins; trim them so "fit" fits the mark
// itself rather than its empty bounding box.
const trimmed = await sharp(SOURCE).trim().png().toBuffer();
const t = await sharp(trimmed).metadata();
console.log(`trimmed mark ${t.width}x${t.height}`);

const outputs = [
  [16, "favicon-16.png"],
  [32, "favicon-32.png"],
  [180, "favicon-180.png"],
  [180, "apple-touch-icon.png"],
];

for (const [size, name] of outputs) {
  const png = await sharp(trimmed)
    .resize(size, size, { fit: "contain", background: BASE, kernel: "lanczos3" })
    .flatten({ background: BASE })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(`${OUT}/${name}`, png);
  console.log(`wrote ${OUT}/${name}  ${size}x${size}  ${png.length} bytes`);
}
