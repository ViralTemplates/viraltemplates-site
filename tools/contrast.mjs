import fs from "node:fs";
// WCAG contrast maths for the palette. Run: node tools/contrast.mjs
const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const lum = (hex) => {
  const [r, g, b] = rgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Flatten a translucent foreground over a background to a solid hex.
export const over = (fg, alpha, bg) => {
  const f = rgb(fg), b = rgb(bg);
  return (
    "#" +
    f
      .map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0"))
      .join("")
  );
};

import { pathToFileURL } from "node:url";

// CSS comments must be removed before token parsing: a comment like
// "/* --brand-blue is 2.98:1 on --base: a FILL */" otherwise matches the
// token regex, captures prose as a colour value, and swallows the real
// declaration that follows it.
const decomment = (s) =>
  s.split("/*").map((part, i) => (i === 0 ? part : part.slice(part.indexOf("*/") + 2))).join("");


if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Palette read FROM the stylesheet. Retyping it here would let a token change
  // in CSS pass a gate that is silently measuring the old colour.
  const sheet = fs.readFileSync("src/assets/css/main.css", "utf8");
  const rootStart = sheet.indexOf(":root {");
  const rootEnd = sheet.indexOf("\n}", rootStart);
  if (rootStart === -1 || rootEnd === -1 || rootEnd - rootStart < 500) {
    console.error("could not read the :root token block from main.css");
    process.exit(1);
  }
  const tok = {};
  for (const m of decomment(sheet.slice(rootStart, rootEnd)).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    tok[m[1]] = m[2].trim();
  }
  for (const need of ["--base", "--surface", "--surface-raised", "--brand-blue", "--brand-cyan"]) {
    if (!tok[need]) { console.error("token missing from :root: " + need); process.exit(1); }
  }
  const NEW = { base: tok["--base"], surface: tok["--surface"], raised: tok["--surface-raised"] };
  const blue = tok["--brand-blue"];
  const cyan = tok["--brand-cyan"];

  console.log("=== PALETTE READ FROM main.css — base " + NEW.base + " ===");
  const pairs = [
    ["--text #fafafa on --base", "#fafafa", NEW.base, 4.5],
    ["--text-muted (62%) on --base", over("#fafafa", 0.62, NEW.base), NEW.base, 4.5],
    ["--text-dim (40%) on --base", over("#fafafa", 0.4, NEW.base), NEW.base, 3.0],
    ["--text on --surface", "#fafafa", NEW.surface, 4.5],
    ["--text-muted on --surface", over("#fafafa", 0.62, NEW.surface), NEW.surface, 4.5],
    ["--text-muted on --surface-raised", over("#fafafa", 0.62, NEW.raised), NEW.raised, 4.5],
    ["--brand-cyan on --base (links, focus, labels)", cyan, NEW.base, 4.5],
    ["--brand-cyan on --surface", cyan, NEW.surface, 4.5],
    ["--brand-cyan on --surface-raised", cyan, NEW.raised, 4.5],
    ["--danger #ff5c5c on --base", "#ff5c5c", NEW.base, 3.0],
    ["--brand-blue on --base (must FAIL: fill only)", blue, NEW.base, 4.5],
  ];
  for (const [label, fg, bg, min] of pairs) {
    const r = ratio(fg, bg);
    console.log(`  ${r >= min ? "PASS" : "fail"}  ${r.toFixed(2).padStart(6)}:1  (needs ${min})  ${label}`);
  }

  console.log("\n=== WHITE ON GRADIENT STOPS ===");
  console.log("  White needs luminance <= " + (1.05 / 4.5 - 0.05).toFixed(4) + " to reach 4.5:1");
  console.log(`  #1246F2 (dark stop) L=${lum(blue).toFixed(4)}  white ${ratio("#ffffff", blue).toFixed(2)}:1`);
  console.log(`  #1CD1FC (asked-for light stop) L=${lum(cyan).toFixed(4)}  white ${ratio("#ffffff", cyan).toFixed(2)}:1  <- FAILS`);

  console.log("\n  Candidate darker cyan end stops:");
  for (const hex of ["#0fa8d8", "#0e9ccb", "#0f93bf", "#0d8ab3", "#0b7ea4", "#0a7599", "#0c6f90"]) {
    const r = ratio("#ffffff", hex);
    console.log(`    ${r >= 4.5 ? "PASS" : "fail"}  ${hex}  L=${lum(hex).toFixed(4)}  white ${r.toFixed(2)}:1`);
  }

  // Worst point on a two-stop gradient is the lightest stop, but check the whole
  // ramp in case an intermediate mix is lighter than either end.
  const mix = (a, b, t) => {
    const [ar, ag, ab] = rgb(a), [br, bg, bb] = rgb(b);
    return (
      "#" +
      [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t]
        .map((v) => Math.round(v).toString(16).padStart(2, "0"))
        .join("")
    );
  };
  const pick = process.argv[2] || "#0f93bf";
  console.log(`\n=== FULL RAMP #1246F2 -> ${pick} vs white ===`);
  let worst = Infinity, worstAt = "";
  for (let t = 0; t <= 1.0001; t += 0.1) {
    const c = mix(blue, pick, t);
    const r = ratio("#ffffff", c);
    if (r < worst) { worst = r; worstAt = `${c} at ${Math.round(t * 100)}%`; }
    console.log(`  ${Math.round(t * 100).toString().padStart(3)}%  ${c}  ${r.toFixed(2)}:1`);
  }
  console.log(`  WORST POINT: ${worst.toFixed(2)}:1 at ${worstAt} -> ${worst >= 4.5 ? "PASSES AA" : "FAILS AA"}`);
}
