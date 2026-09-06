// Moves the source screenshots into src/assets/img as an optimised JPG fallback
// plus a WebP primary. Run once via `npm run images`; outputs are committed.
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const OUT = "src/assets/img";
mkdirSync(OUT, { recursive: true });

// source file -> output basename
const SHOTS = {
  "JumpTemplate1Main.jpg": "jump-for-template-1",
  "JumpTemplate1_2.jpg": "jump-for-template-2",
  "JumpTemplate1_3.png": "jump-for-template-3",
  "EssentialStudUiPackMain.jpg": "essential-stud-ui-1",
  "EssentialStudUiPack_2.jpg": "essential-stud-ui-2",
  "EssentialStudUiPack_3.jpg": "essential-stud-ui-3",
  "CartoonUiPackMain.jpg": "essential-cartoon-ui-1",
  "CartoonUiPack_2.jpg": "essential-cartoon-ui-2",
  "CartoonUiPack_3.jpg": "essential-cartoon-ui-3",
};


for (const [src, base] of Object.entries(SHOTS)) {
  if (!existsSync(src)) { console.warn(`skip (missing): ${src}`); continue; }
  const img = sharp(src);
  const { width, height } = await img.metadata();
  await img.clone().jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:4:4" })
    .toFile(path.join(OUT, `${base}.jpg`));
  await img.clone().webp({ quality: 80, effort: 6 })
    .toFile(path.join(OUT, `${base}.webp`));
  console.log(`${src} -> ${base}.{jpg,webp} (${width}x${height})`);
}

// Open Graph card: already 1200x630, just re-encode to trim weight.
await sharp("MainLogo.jpg").jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, "og-default.jpg"));
console.log("MainLogo.jpg -> og-default.jpg");

// Wordmark: transparent PNG, keep alpha. Header/footer use the small one.
await sharp("MainVTLogo.png").png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, "vt-logo.png"));
await sharp("MainVTLogo.png").resize({ width: 160 }).webp({ quality: 92, alphaQuality: 100 })
  .toFile(path.join(OUT, "vt-logo.webp"));
console.log("MainVTLogo.png -> vt-logo.{png,webp}");

// Favicon source at a couple of raster sizes (VT mark on brand blue field).
for (const size of [180, 32]) {
  await sharp(await sharp("MainVTLogo.png").resize({
      width: Math.round(size * 0.78), fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    }).toBuffer())
    .extend({ top: 0, bottom: 0, left: 0, right: 0 })
    .flatten({ background: "#1246F2" })
    .resize(size, size, { fit: "contain", background: "#1246F2" })
    .png()
    .toFile(path.join(OUT, size === 180 ? "apple-touch-icon.png" : "favicon-32.png"));
}
console.log("MainVTLogo.png -> apple-touch-icon.png, favicon-32.png");

