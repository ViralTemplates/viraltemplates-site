// Favicons from the SAME file the nav logo <img> points at: the VT mark on
// transparency, exactly as the header renders it. Each output is one sharp
// resize with fit: "contain" onto a fully transparent square — the mark scaled
// to fit, centred, aspect preserved. No flatten, no composite, no solid fill of
// any kind. PNG only, no .ico.
//
// Every output is checked before it is written: it must carry an alpha channel
// and all four corner pixels must be fully transparent.
//
// Run: npm run favicons
import sharp from "sharp";
import { writeFileSync, existsSync } from "node:fs";

const SOURCE = "src/assets/img/vt-logo.png"; // == the nav <img src>
const OUT = "src/assets/img";
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

if (!existsSync(SOURCE)) throw new Error("source missing: " + SOURCE);
const meta = await sharp(SOURCE).metadata();
console.log(`source ${SOURCE}  ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}`);
if (!meta.hasAlpha) throw new Error("source has no alpha channel");

// Trim the transparent margins so "fit" fits the mark itself.
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
    .resize(size, size, { fit: "contain", background: CLEAR, kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toBuffer();

  // Alpha + corner checks on the actual encoded output.
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = await sharp(png).metadata();
  const px = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const corners = [px(0, 0), px(size - 1, 0), px(0, size - 1), px(size - 1, size - 1)];
  const clear = corners.every((a) => a === 0);
  if (!out.hasAlpha || !clear) {
    throw new Error(`${name}: hasAlpha=${out.hasAlpha} corner alpha=${corners.join(",")} — refusing to write`);
  }
  writeFileSync(`${OUT}/${name}`, png);
  console.log(`wrote ${OUT}/${name}  ${size}x${size}  ${png.length} bytes  channels=${out.channels} hasAlpha=${out.hasAlpha}  corner alpha [TL,TR,BL,BR]=${corners.join(",")}`);
}
