// Moves the source screenshots into src/assets/img as an optimised JPG fallback
// plus a WebP primary. Run once via `npm run images`; outputs are committed.
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const SRC = "_source-images";
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
  // Bundle strip thumbnail on the two UI pack pages (site.json "bundle").
  "UltimateUiPack.jpg": "ultimate-ui-pack",
};


for (const [name, base] of Object.entries(SHOTS)) {
  const src = path.join(SRC, name);
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
await sharp(path.join(SRC, "MainLogo.jpg")).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(OUT, "og-default.jpg"));
console.log("MainLogo.jpg -> og-default.jpg");

// Wordmark: transparent PNG, keep alpha. Header/footer use the small one.
await sharp(path.join(SRC, "MainVTLogo.png")).png({ compressionLevel: 9, palette: true }).toFile(path.join(OUT, "vt-logo.png"));
await sharp(path.join(SRC, "MainVTLogo.png")).resize({ width: 160 }).webp({ quality: 92, alphaQuality: 100 })
  .toFile(path.join(OUT, "vt-logo.webp"));
console.log("MainVTLogo.png -> vt-logo.{png,webp}");

// Favicons are generated separately by tools/build-favicons.mjs from the nav
// logo file (src/assets/img/vt-logo.png), not from the archived master.


