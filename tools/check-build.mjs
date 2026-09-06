// Post-build audit: SEO limits, heading order, JSON-LD validity, image
// attributes, script deferral and the Payhip loading rule. Run: npm run check
import fs from "node:fs";
import path from "node:path";

const pages = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.name.endsWith(".html")) pages.push(p);
  }
})("_site");

let fail = 0;
const bad = (m) => {
  console.log("  x " + m);
  fail++;
};

// A check that iterates an empty collection reports nothing and looks clean.
// Every loop below is preceded by a floor on what it is iterating.
const expect = (count, min, label) => {
  if (count < min) {
    bad(`${label}: found ${count}, expected at least ${min} — the check scope is wrong, not clean`);
    return false;
  }
  return true;
};

expect(pages.length, 8, "built HTML pages");

const descriptions = new Map();
const titles = new Map();

for (const file of pages.sort()) {
  const html = fs.readFileSync(file, "utf8");
  const url = "/" + path.relative("_site", file).split(path.sep).join("/");
  console.log("\n" + url);

  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  console.log(`  title (${title.length}) ${title}`);
  if (!title) bad("no title");
  if (title.length > 60) bad("title over 60 chars");
  if (titles.has(title)) bad("duplicate title with " + titles.get(title));
  titles.set(title, url);

  const desc =
    (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  console.log(`  desc  (${desc.length})`);
  if (!desc) bad("no meta description");
  if (!url.includes("404") && (desc.length < 140 || desc.length > 160)) {
    bad(`description ${desc.length} chars, want 140-160`);
  }
  if (descriptions.has(desc)) bad("duplicate description with " + descriptions.get(desc));
  descriptions.set(desc, url);

  const h1 = html.match(/<h1[^>]*>/g) || [];
  if (h1.length !== 1) bad(`${h1.length} <h1> elements`);

  const levels = [...html.matchAll(/<h([1-6])[^>]*>/g)].map((m) => Number(m[1]));
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] > levels[i - 1] + 1) {
      bad(`heading level skip: h${levels[i - 1]} -> h${levels[i]}`);
    }
  }
  console.log("  headings " + levels.join(","));

  if (!html.includes('<link rel="canonical" href="https://viraltemplates.co')) {
    bad("no canonical");
  }
  if (!html.includes('og:image" content="https://viraltemplates.co/assets/img/og-default.jpg')) {
    bad("og:image wrong or missing");
  }
  if (!html.includes('name="twitter:card" content="summary_large_image"')) {
    bad("twitter card missing");
  }

  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const types = [];
  for (const [, body] of blocks) {
    try {
      types.push(JSON.parse(body)["@type"]);
    } catch (e) {
      bad("invalid JSON-LD: " + e.message);
    }
  }
  console.log("  json-ld " + types.join(", "));
  expect(blocks.length, 1, url + ": JSON-LD blocks");

  const isProduct = /^\/(jump-for-template|essential-stud-ui|essential-cartoon-ui)\//.test(url);
  const hasPayhip = html.includes("payhip.com/payhip.js");
  if (hasPayhip !== isProduct) {
    bad(`payhip.js present=${hasPayhip}, product page=${isProduct}`);
  }

  if (html.includes('href="#"')) bad('href="#" found');

  // Video-bearing product pages carry exactly one iframe, on the
  // youtube-nocookie host, lazy and titled. Every other page carries none.
  const iframes = [...html.matchAll(/<iframe\b[^>]*>/g)].map((m) => m[0]);
  const expectsVideo = /^\/(essential-stud-ui|essential-cartoon-ui)\//.test(url);
  if (iframes.length !== (expectsVideo ? 1 : 0)) {
    bad(`${iframes.length} iframe(s), expected ${expectsVideo ? 1 : 0}`);
  }
  for (const tag of iframes) {
    if (!tag.includes('src="https://www.youtube-nocookie.com/embed/')) bad("iframe not on youtube-nocookie: " + tag.slice(0, 90));
    if (!/\sloading="lazy"/.test(tag)) bad("iframe not lazy: " + tag.slice(0, 90));
    if (!/\stitle="[^"]+"/.test(tag)) bad("iframe without title: " + tag.slice(0, 90));
    if (!/\swidth=/.test(tag) || !/\sheight=/.test(tag)) bad("iframe without width/height: " + tag.slice(0, 90));
  }

  // A page with no images passes the attribute loop trivially, so the count is
  // asserted first. The 404 page legitimately has none.
  const imgTags = [...html.matchAll(/<img\b[^>]*>/g)];
  if (!url.includes("404")) expect(imgTags.length, 1, url + ": images");
  for (const [tag] of imgTags) {
    if (!/\swidth=/.test(tag) || !/\sheight=/.test(tag)) {
      bad("img without width/height: " + tag.slice(0, 80));
    }
    if (!/\salt=/.test(tag)) bad("img without alt: " + tag.slice(0, 80));
  }

  // Likewise: every page loads at least nav.js and reveal.js.
  const scriptTags = [...html.matchAll(/<script\b[^>]*\ssrc=[^>]*>/g)];
  expect(scriptTags.length, 1, url + ": external scripts");
  for (const [tag] of scriptTags) {
    if (!/\sdefer\b/.test(tag)) bad("script not deferred: " + tag);
  }

  // Backstop only — the authoritative check runs against main.css in
  // check-content.mjs. Word-bounded so "absorb" cannot trip "orb".
  for (const [label, re] of Object.entries({
    "inline glassmorphism": /backdrop-filter:\s*blur/i,
    "orb": /\borbs?\b/i,
    "particle": /\bparticles?\b/i,
    "spotlight": /\bspotlight\b/i,
    "noise grain": /\bnoise\b/i,
  })) {
    if (re.test(html)) bad("forbidden artefact referenced inline: " + label);
  }
}

console.log("\n" + (fail ? fail + " PROBLEM(S)" : "ALL CHECKS PASSED"));
process.exit(fail ? 1 : 0);
