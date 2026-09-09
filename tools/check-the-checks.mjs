// Negative tests for the audit itself.
//
// Every rule below is deliberately broken, the audit is run, and the run must
// FAIL with the expected message. A gate that cannot be made to fail is not a
// gate. Each mutation is reverted whether or not the test passes.
//
// Run: node tools/check-the-checks.mjs
import fs from "node:fs";
import { execSync } from "node:child_process";

const CASES = [
  {
    name: "duplicate review body is caught",
    file: "src/index.njk",
    apply: (s) => {
      const inc = '{% include "components/reviews-marquee.njk" %}';
      return s.replace(inc, inc + "\n  " + inc);
    },
    expect: /review body rendered 2x/,
  },
  {
    name: "an em dash outside a review body is caught",
    file: "src/index.njk",
    apply: (s) => s.replace("Browse the collection.", "Browse the collection — now."),
    expect: /renders 1 em dash/,
  },
  {
    name: "the old 'See all three' CTA label coming back is caught",
    file: "src/index.njk",
    apply: (s) => s.replace('href="/templates/">Browse</a>', 'href="/templates/">See all three</a>'),
    expect: /CTA link label — NOT FOUND|old CTA label 'See all three' still present/,
  },
  {
    name: "a price set outside Montserrat is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace(".price__now {\n  font-family: var(--font-price);", ".price__now {\n  font-family: var(--font-sans);"),
    expect: /\.price__now is not set in --font-price/,
  },
  {
    name: "gradient-clipped text outside the hero is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace(
      ".stat__figure {\n  font-family: var(--font-sans);",
      ".stat__figure {\n  background-clip: text;\n  font-family: var(--font-sans);"
    ),
    expect: /gradient-clipped text outside the one allowed selector/,
  },
  {
    name: "a second --text-dim usage is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace(
      ".muted {\n  color: var(--text-muted);\n}",
      ".muted {\n  color: var(--text-dim);\n}"
    ),
    expect: /--text-dim used by/,
  },
  {
    name: "a pixel-anchored background layer is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace("  top: -14vh;", "  top: 1400px;"),
    expect: /anchored to fixed pixel offsets/,
  },
  {
    name: "a renamed background layer fails loudly, not vacuously",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace(".site-bg__grid {", ".site-bg__mesh {"),
    expect: /background layer missing: site-bg__grid|selector .site-bg__grid not found/,
  },
  {
    name: "a renamed :root token block fails loudly",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace(":root {", ":root,\n.theme {"),
    expect: /:root token block: start anchor/,
  },
  {
    name: "a missing card selector fails loudly",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace("\n.fgroup {", "\n.featuregroup {"),
    expect: /selector \.fgroup not found/,
  },
  {
    name: "a contrast regression is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace("--text-muted: rgba(250, 250, 250, 0.62);", "--text-muted: rgba(250, 250, 250, 0.26);"),
    expect: /--text-muted on --base/,
  },
  {
    name: "a gradient stop that fails white text is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace("--grad-to: #0e38c4;", "--grad-to: #1cd1fc;"),
    expect: /white on the .* ramp/,
  },
  {
    name: "the nav CTA radius rule losing the cascade to .btn is caught",
    file: "src/assets/css/main.css",
    apply: (s) => s.replace("\n.nav .nav__cta {", "\n.nav__cta {"),
    expect: /nav CTA border-radius is won by \.btn/,
  },
  {
    name: "a star rating that disagrees with the data is caught",
    file: "src/_includes/components/stars.njk",
    apply: (s) => s.replace('style="--fill: {{ fillPercent }}%"', 'style="--fill: 100%"'),
    expect: /star fill 100%, expected 98%/,
  },
  {
    name: "the bundle strip leaking onto a page outside appliesTo is caught",
    file: "src/_includes/components/bundle-offer.njk",
    apply: (s) => s.replace("{%- if bundle and (product.slug in bundle.appliesTo) %}", "{%- if bundle %}"),
    expect: /bundle strip rendered on \/jump-for-template\//,
  },
  {
    name: "a third slug added to bundle appliesTo is caught",
    file: "src/_data/site.json",
    apply: (s) => s.replace('"appliesTo": ["essential-stud-ui", "essential-cartoon-ui"]', '"appliesTo": ["essential-stud-ui", "essential-cartoon-ui", "jump-for-template"]'),
    expect: /bundle appliesTo is \[.*\], expected exactly the two UI pack slugs/,
  },
  {
    // Both attributes move together, so the generic href-equals-id rule in
    // check-build stays green and it is the bundle rule that has to bite.
    name: "a bundle buy button wired to another product's id is caught",
    file: "src/_includes/components/bundle-offer.njk",
    apply: (s) => s.split("{{ bundle.payhipId }}").join("0hoa7"),
    expect: /bundle buy button data-product is 0hoa7/,
  },
  {
    name: "a hardcoded bundle price in a template is caught",
    file: "src/_includes/components/bundle-offer.njk",
    apply: (s) => s.replace("{{ bundle.price }}", "$29.99"),
    expect: /bundle price hardcoded: "\$29\.99" in src/,
  },
  {
    name: "a bundle image with empty alt is caught",
    file: "src/_includes/components/bundle-offer.njk",
    apply: (s) => s.replace('alt="{{ bundle.imageAlt }}"', 'alt=""'),
    expect: /bundle image alt is empty/,
  },
  {
    name: "a bundle image declaring the file size instead of the frame is caught",
    file: "src/_includes/components/bundle-offer.njk",
    apply: (s) => s.replace('width="{{ bundle.imageWidth }}"', 'width="192"'),
    expect: /bundle image declares 192x96, expected the 96x96 frame/,
  },
];

let passed = 0;
let failed = 0;

for (const testCase of CASES) {
  const original = fs.readFileSync(testCase.file, "utf8");
  const mutated = testCase.apply(original);

  if (mutated === original) {
    console.log(`  x ${testCase.name}: mutation did not apply — the test itself is stale`);
    failed++;
    continue;
  }

  let output = "";
  let exitCode = 0;
  try {
    fs.writeFileSync(testCase.file, mutated);
    output = execSync("npm run verify", { encoding: "utf8", stdio: "pipe" });
  } catch (err) {
    exitCode = err.status ?? 1;
    output = (err.stdout || "") + (err.stderr || "");
  } finally {
    fs.writeFileSync(testCase.file, original);
  }

  const matched = testCase.expect.test(output);
  if (exitCode !== 0 && matched) {
    console.log(`  . ${testCase.name}`);
    passed++;
  } else if (exitCode === 0) {
    console.log(`  x ${testCase.name}: verify PASSED on broken input — the gate does not bite`);
    failed++;
  } else {
    console.log(`  x ${testCase.name}: failed, but not with the expected message`);
    failed++;
  }
}

// Leave the tree rebuilt from the restored sources.
execSync("npm run build", { stdio: "ignore" });

console.log(`\n${passed}/${CASES.length} gates bite` + (failed ? ` — ${failed} PROBLEM(S)` : ""));
process.exit(failed ? 1 : 0);
