// Content audit: reviews, computed stats, banned phrases, forbidden visual
// effects, and the contrast rules.
//
// SCOPE DISCIPLINE (see tools/README-checks.md): a check that scopes itself by
// searching for a comment, heading or selector can silently match nothing — or
// the whole file — when that string is renamed, and then passes vacuously. Every
// scoped rule below goes through slice()/rule()/expect(), which fail loudly when
// the anchor is missing or the captured region is an implausible size.
import fs from "node:fs";

const reviews = JSON.parse(fs.readFileSync("src/_data/reviews.json", "utf8"));
const css = fs.readFileSync("src/assets/css/main.css", "utf8");
const layout = fs.readFileSync("src/_includes/layouts/base.njk", "utf8");
const home = fs.readFileSync("_site/index.html", "utf8");

let fail = 0;
const bad = (m) => { console.log("  x " + m); fail++; };
const ok = (m) => console.log("  . " + m);

// --- scope guards ----------------------------------------------------------

// Asserts a collection is non-empty before rules iterate over it, so an empty
// build directory or an empty data file can never look like a clean pass.
function expect(count, min, label) {
  if (count < min) {
    bad(`${label}: found ${count}, expected at least ${min} — check scope is wrong, not clean`);
    return false;
  }
  return true;
}

// A region bounded by two anchors, with both anchors and the resulting size
// asserted. Returns "" and records a failure if anything is off.
function slice(text, startNeedle, endNeedle, { min = 1, max = Infinity, label }) {
  const start = text.indexOf(startNeedle);
  if (start === -1) { bad(`${label}: start anchor "${startNeedle}" not found`); return ""; }
  const end = endNeedle ? text.indexOf(endNeedle, start + startNeedle.length) : text.length;
  if (endNeedle && end === -1) { bad(`${label}: end anchor "${endNeedle}" not found after start`); return ""; }
  const region = text.slice(start, end === -1 ? text.length : end);
  if (region.length < min || region.length > max) {
    bad(`${label}: captured ${region.length} chars, expected ${min}..${max} — scope drifted`);
    return "";
  }
  return region;
}

// A single declaration block for a selector, with the block asserted non-trivial.
function rule(sheet, selector, label) {
  const needle = selector + " {";
  const start = sheet.indexOf(needle);
  if (start === -1) { bad(`${label}: selector ${selector} not found`); return null; }
  const end = sheet.indexOf("}", start);
  if (end === -1) { bad(`${label}: unterminated block for ${selector}`); return null; }
  const body = sheet.slice(start + needle.length, end);
  if (!body.includes(":")) { bad(`${label}: block for ${selector} has no declarations`); return null; }
  return body;
}

// CSS comments must be removed before token parsing: a comment like
// "/* --brand-blue is 2.98:1 on --base: a FILL */" otherwise matches the
// token regex, captures prose as a colour value, and swallows the real
// declaration that follows it.
const decomment = (s) =>
  s.split("/*").map((part, i) => (i === 0 ? part : part.slice(part.indexOf("*/") + 2))).join("");

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Every built page, asserted non-empty.
const pages = fs
  .readdirSync("_site", { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".html"))
  .map((f) => ({ name: f, html: fs.readFileSync("_site/" + f, "utf8") }));
expect(pages.length, 8, "built HTML pages");
expect(reviews.length, 1, "reviews in reviews.json");

// --- reviews ---------------------------------------------------------------

console.log("\nREVIEWS ON THE HOME PAGE");
let missing = 0;
for (const r of reviews) {
  if (!home.includes(esc(r.text))) { bad("text missing: " + r.name); missing++; }
  if (!home.includes(esc(r.name))) { bad("name missing: " + r.name); missing++; }
}
if (!missing) ok(`all ${reviews.length} reviews present, text and display name`);

for (const r of reviews) {
  if (!/[^\x20-\x7E]/.test(r.name)) continue;
  const points = [...r.name].map((c) => c.codePointAt(0).toString(16)).join(" ");
  if (home.includes(esc(r.name))) ok(`unicode name intact: ${r.name} (${points})`);
  else bad(`unicode name mangled: ${r.name} (${points})`);
}

// No review body may be rendered twice on a page. Compared as whole blockquote
// bodies rather than substrings, so a one-word review ("W") is not counted as a
// match inside longer text.
console.log("\nREVIEW DUPLICATION");
let dupes = 0;
let bodiesSeen = 0;
for (const page of pages) {
  const bodies = [...page.html.matchAll(/<blockquote class="review__text">([\s\S]*?)<\/blockquote>/g)]
    .map((m) => m[1].trim());
  bodiesSeen += bodies.length;
  const counts = new Map();
  for (const b of bodies) counts.set(b, (counts.get(b) || 0) + 1);
  const repeated = [...counts].filter(([, n]) => n > 1);
  for (const [body, n] of repeated) {
    bad(`/${page.name}: review body rendered ${n}x — "${body.slice(0, 48)}…"`);
    dupes++;
  }
  if (bodies.length) ok(`/${page.name}: ${bodies.length} review bodies, all unique`);
}
expect(bodiesSeen, 35, "review bodies across the site");
if (!dupes) ok("no review body appears more than once on any page");

// The home page must still carry every review exactly once, across the marquee
// and the disclosure combined.
const homeBodies = [...home.matchAll(/<blockquote class="review__text">([\s\S]*?)<\/blockquote>/g)];
if (homeBodies.length === reviews.length) {
  ok(`home page renders all ${reviews.length} reviews, once each`);
} else {
  bad(`home page renders ${homeBodies.length} review bodies, expected ${reviews.length}`);
}

// --- computed stats --------------------------------------------------------

console.log("\nCOMPUTED STATS");
const rated = reviews.filter((r) => typeof r.score === "number");
expect(rated.length, 1, "rated reviews");
const avg10 = rated.reduce((a, b) => a + b.score, 0) / rated.length;
const avg5 = Math.round((avg10 / 2) * 10) / 10;
ok(`${reviews.length} reviews, ${rated.length} rated, ${avg10.toFixed(2)}/10, ${avg5}/5`);
if (avg5 === 5) bad("average rounded to a flat 5 — partial stars would be pointless");

const products = JSON.parse(fs.readFileSync("src/_data/products.json", "utf8"));
const ownRating = (slug) => {
  const own = reviews.filter((r) => r.product === slug);
  const ownRated = own.filter((r) => typeof r.score === "number");
  if (!own.length || !ownRated.length) return null;
  const a5 = Math.round((ownRated.reduce((t, r) => t + r.score, 0) / ownRated.length / 2) * 10) / 10;
  return { count: own.length, rated: ownRated.length, avg5: a5, fill: Math.round((a5 / 5) * 100) };
};
const findPage = (name) => pages.find((p) => p.name.split(String.fromCharCode(92)).join("/") === name);
const FILL_RE = /--fill:\s*([\d.]+)%/g;
const FIVE_RE = /\b5(\.0)?\s*\/\s*5\b/;
const AGG_RE = /"ratingValue":([\d.]+)/;
const AGG_COUNT_RE = /"reviewCount":(\d+)/;

// Site-wide figure on the store pages.
for (const name of ["index.html", "templates/index.html"]) {
  const page = findPage(name);
  if (!page) { bad("expected page missing from build: " + name); continue; }
  const fills = [...page.html.matchAll(FILL_RE)].map((m) => Number(m[1]));
  if (!expect(fills.length, 1, name + ": star ratings")) continue;
  const expected = Math.round((avg5 / 5) * 100);
  const wrong = fills.filter((f) => f !== expected);
  if (wrong.length) bad(name + ": star fill " + wrong.join(", ") + "%, expected " + expected + "%");
  else ok(name + ": star fill " + fills[0] + "% (site-wide " + avg5 + "/5)");
  if (FIVE_RE.test(page.html)) bad(name + ": renders 5/5 somewhere");
}

// Own-product figure on each product page; none at all when it has no reviews.
for (const product of products) {
  const name = product.slug + "/index.html";
  const page = findPage(name);
  if (!page) { bad("expected page missing from build: " + name); continue; }
  const own = ownRating(product.slug);
  const fills = [...page.html.matchAll(FILL_RE)].map((m) => Number(m[1]));
  const bodies = page.html.split('<blockquote class="review__text">').length - 1;
  const ownCount = reviews.filter((r) => r.product === product.slug).length;
  const agg = (page.html.match(AGG_RE) || [])[1];
  const aggCount = (page.html.match(AGG_COUNT_RE) || [])[1];
  if (!own) {
    if (fills.length) bad(name + ": renders stars but has no reviews of its own");
    if (bodies) bad(name + ": renders " + bodies + " review bodies but has none of its own");
    if (agg) bad(name + ": emits an AggregateRating with no reviews of its own");
    if (page.html.includes("Reviews from people who bought this")) bad(name + ": reviews heading rendered with nothing to show");
    if (!fills.length && !bodies && !agg) ok(name + ": no own reviews, so no stars, no bodies, no AggregateRating, no heading");
    continue;
  }
  if (!expect(fills.length, 1, name + ": star ratings")) continue;
  const wrong = fills.filter((f) => f !== own.fill);
  if (wrong.length) bad(name + ": star fill " + wrong.join(", ") + "%, expected own " + own.fill + "%");
  else ok(name + ": star fill " + fills[0] + "% (own " + own.avg5 + "/5 from " + own.rated + " rated)");
  const expectBodies = Math.min(6, ownCount);
  if (bodies !== expectBodies) bad(name + ": " + bodies + " review bodies, expected " + expectBodies + " (own only, cap 6)");
  else ok(name + ": " + bodies + " own review bodies (of " + ownCount + ", cap 6)");
  if (Number(agg) !== own.avg5 || Number(aggCount) !== own.count) bad(name + ": AggregateRating " + agg + "/" + aggCount + " does not match own " + own.avg5 + "/" + own.count);
  else ok(name + ": AggregateRating " + agg + " from " + aggCount + " own reviews");
  if (FIVE_RE.test(page.html)) bad(name + ": renders 5/5 somewhere");
}

// --- bundle offer ----------------------------------------------------------

// The Stud + Cartoon bundle strip is data in site.json, not a product: it
// renders on exactly the two UI pack pages, nowhere else, buys the bundle's
// own Payhip id, and carries no hardcoded price anywhere in the templates.
console.log("\nBUNDLE OFFER");
const site = JSON.parse(fs.readFileSync("src/_data/site.json", "utf8"));
const bundle = site.bundle;
const BUNDLE_PAGES = ["essential-stud-ui", "essential-cartoon-ui"];
if (!bundle) {
  bad("site.json has no bundle object");
} else {
  const applies = [...(bundle.appliesTo || [])].sort();
  if (applies.join(",") !== [...BUNDLE_PAGES].sort().join(",")) {
    bad("bundle appliesTo is [" + applies.join(", ") + "], expected exactly the two UI pack slugs");
  } else {
    ok("bundle appliesTo is exactly the two UI pack slugs");
  }

  const wantHref = "https://payhip.com/buy?link=" + bundle.payhipId;
  if (bundle.url !== wantHref) bad("bundle url in site.json is " + bundle.url + ", expected " + wantHref);
  else ok("bundle url matches its payhipId");

  // Presence: one <section class="bundle"> on each applies-to page and none on
  // any other built page, product or not. Every page is visited, so a strip
  // leaking onto the Jump page or the home page is reported by name.
  let stripsSeen = 0;
  for (const page of pages) {
    const slug = page.name.split(/[\\/]/)[0];
    const strips = page.html.split('<section class="bundle"').length - 1;
    const want = BUNDLE_PAGES.includes(slug) && page.name.endsWith("index.html") ? 1 : 0;
    stripsSeen += strips;
    if (strips !== want) {
      bad(want
        ? "bundle strip missing on /" + slug + "/"
        : "bundle strip rendered on /" + page.name.split("\\").join("/").replace(/index\.html$/, "") + " (" + strips + "x)");
    }
  }
  if (stripsSeen === BUNDLE_PAGES.length) ok("bundle strip on exactly " + BUNDLE_PAGES.length + " pages: " + BUNDLE_PAGES.join(", "));
  else bad("bundle strip rendered " + stripsSeen + " times site-wide, expected " + BUNDLE_PAGES.length);

  // Wiring, price and image on each page that carries it.
  const imgFile = "src/assets/img/" + bundle.image + ".jpg";
  const webpFile = "src/assets/img/" + bundle.image + ".webp";
  for (const f of [imgFile, webpFile]) if (!fs.existsSync(f)) bad("bundle image missing: " + f);
  let realDims = null;
  if (fs.existsSync(imgFile)) {
    const sharp = (await import("sharp")).default;
    const meta = await sharp(imgFile).metadata();
    realDims = { width: meta.width, height: meta.height };
  }
  let checkedPages = 0;
  for (const slug of BUNDLE_PAGES) {
    const page = findPage(slug + "/index.html");
    if (!page) { bad("expected page missing from build: " + slug); continue; }
    if (!page.html.includes('<section class="bundle"')) continue; // reported above
    const strip = slice(page.html, '<section class="bundle"', "</section>", { min: 400, max: 6000, label: slug + ": bundle strip" });
    if (!strip) continue;
    checkedPages++;

    const btn = (strip.match(/<a[^>]*bundle__btn[^>]*>/) || [])[0];
    if (!btn) { bad(slug + ": bundle strip has no bundle__btn anchor"); continue; }
    const id = (btn.match(/data-product="([^"]*)"/) || [])[1];
    const href = (btn.match(/href="([^"]*)"/) || [])[1];
    if (id !== bundle.payhipId) bad(slug + ": bundle buy button data-product is " + id + ", expected " + bundle.payhipId);
    if (href !== wantHref) bad(slug + ": bundle buy button href is " + href + ", expected " + wantHref);
    if (!btn.includes("payhip-buy-button")) bad(slug + ": bundle buy button lacks the payhip-buy-button class");
    if (!/data-theme="none"/.test(btn)) bad(slug + ": bundle buy button lacks data-theme=none");
    if (id === bundle.payhipId && href === wantHref) ok(slug + ": bundle buy button -> " + href);

    const flatStrip = strip.replace(/\s+/g, " ");
    let figures = 0;
    for (const [field, label] of [["price", "price"], ["wasPrice", "was-price"], ["saving", "saving"]]) {
      if (flatStrip.includes(esc(bundle[field]))) figures++;
      else bad(slug + ": bundle " + label + " " + bundle[field] + " from site.json not rendered");
    }
    if (figures === 3) ok(slug + ": renders " + bundle.price + ", " + bundle.wasPrice + " and \"" + bundle.saving + "\" from site.json");

    const img = (strip.match(/<img\b[^>]*>/) || [])[0];
    if (!img) { bad(slug + ": bundle strip has no <img>"); continue; }
    const w = (img.match(/\swidth="(\d+)"/) || [])[1];
    const h = (img.match(/\sheight="(\d+)"/) || [])[1];
    const alt = (img.match(/\salt="([^"]*)"/) || [])[1];
    let imgOk = true;
    if (!w || !h) { bad(slug + ": bundle image lacks explicit width/height"); imgOk = false; }
    else if (Number(w) !== 96 || Number(h) !== 96) {
      bad(slug + ": bundle image declares " + w + "x" + h + ", expected the 96x96 frame");
      imgOk = false;
    }
    else if (realDims && (realDims.width !== 2 * Number(w) || realDims.height !== 2 * Number(h))) {
      bad(slug + ": bundle image is " + w + "x" + h + " in HTML but the file is " + realDims.width + "x" + realDims.height + ", expected 2x for a sharp 96px frame");
      imgOk = false;
    }
    if (alt === undefined) { bad(slug + ": bundle image has no alt attribute"); imgOk = false; }
    else if (!alt.trim()) { bad(slug + ": bundle image alt is empty"); imgOk = false; }
    else if (alt.trim().length < 40) { bad(slug + ": bundle image alt is a label, not a description: \"" + alt + "\""); imgOk = false; }
    if (!/\sloading="lazy"/.test(img)) { bad(slug + ": bundle image is not lazy"); imgOk = false; }
    if (!img.includes("/assets/img/" + bundle.image + ".jpg")) { bad(slug + ": bundle <img> does not point at " + bundle.image + ".jpg"); imgOk = false; }
    if (!strip.includes("/assets/img/" + bundle.image + ".webp")) { bad(slug + ": bundle strip has no WebP source"); imgOk = false; }
    // Both URLs carry the asset filter's content hash, so new artwork under the
    // same name cannot be served stale from a cache.
    const hashed = [...strip.matchAll(/\/assets\/img\/[^"\s]+\.(?:jpg|webp)(\?v=[0-9a-f]{8})?/g)];
    if (hashed.length < 2 || hashed.some((m) => !m[1])) { bad(slug + ": bundle image URLs are not content-hashed"); imgOk = false; }
    if (imgOk) ok(slug + ": bundle image " + w + "x" + h + " (file " + realDims.width + "x" + realDims.height + "), hashed URLs, lazy, WebP + JPG, alt " + alt.trim().length + " chars");
  }
  expect(checkedPages, BUNDLE_PAGES.length, "bundle strips inspected");

  // The bundle's figures live in site.json only. Any template, stylesheet or
  // script carrying the literal price is a hardcode waiting to drift.
  const sources = fs.readdirSync("src", { recursive: true }).map(String)
    .filter((f) => /\.(njk|css|js|md|html)$/.test(f) && !f.startsWith("_data"));
  expect(sources.length, 10, "source files scanned for a hardcoded bundle price");
  const literals = [bundle.price, bundle.wasPrice, bundle.saving, bundle.price.replace("$", ""), bundle.wasPrice.replace("$", "")];
  let hardcoded = 0;
  for (const f of sources) {
    const text = fs.readFileSync("src/" + f, "utf8");
    for (const lit of literals) {
      if (text.includes(lit)) { bad("bundle price hardcoded: \"" + lit + "\" in src/" + f.split("\\").join("/")); hardcoded++; }
    }
  }
  if (!hardcoded) ok("bundle price, was-price and saving appear in no template, stylesheet or script");

  // Not a product: no JSON-LD anywhere names it.
  let ld = 0;
  for (const page of pages) {
    for (const [, body] of page.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      if (body.includes(bundle.payhipId) || body.includes(bundle.name)) { bad(page.name + ": JSON-LD mentions the bundle"); ld++; }
    }
  }
  if (!ld) ok("no JSON-LD block names the bundle");
}

// --- copy ------------------------------------------------------------------

console.log("\nBANNED PHRASES AND PLACEHOLDER COPY");
const banned = ["unleash", "seamlessly", "seamless",
  "elevate", "game-changing", "in today's fast-paced", "revolutionise", "revolutionize",
  "empower", "supercharge", "the future of", "crafted with care", "we believe"];
let hits = 0;
for (const page of pages) {
  const text = page.html.toLowerCase();
  for (const phrase of banned) {
    if (text.includes(phrase)) { bad(`"${phrase}" in ${page.name}`); hits++; }
  }
}
if (!hits) ok(`none of the ${banned.length} banned phrases on any page`);
if (banned.length !== 13) bad("banned list should hold exactly 13 entries, has " + banned.length);

// No U+2014 anywhere in rendered HTML except inside verbatim review bodies.
console.log("\nEM DASHES");
let dashHits = 0;
for (const page of pages) {
  // Review bodies are verbatim buyer text and are excluded; everything else on
  // the page is ours and must not contain one. Split-based so no regex has to
  // carry a "</" sequence.
  const OPEN = '<blockquote class="review__text">';
  const CLOSE = "</blockquote>";
  const stripped = page.html
    .split(OPEN)
    .map((part, i) => (i === 0 ? part : part.slice(part.indexOf(CLOSE) + CLOSE.length)))
    .join("");
  const n = stripped.split("—").length - 1;
  if (n) { bad(page.name + " renders " + n + " em dash(es) outside review bodies"); dashHits += n; }
}
if (!dashHits) ok("no U+2014 in rendered HTML outside review bodies");

// --- visual effects --------------------------------------------------------

console.log("\nFORBIDDEN VISUAL EFFECTS + BACKGROUND SHAPE");
const forbidden = {
  "animated colour orbs": /\borb\b/i,
  "floating particles": /particle/i,
  "background grid lines via repeating gradients": /repeating-linear-gradient/i,
  "SVG noise grain": /feTurbulence|\bnoise\b/i,
  "cursor spotlight": /spotlight/i,
};
for (const [label, re] of Object.entries(forbidden)) {
  if (re.test(css)) bad("stylesheet contains " + label);
  else ok("no " + label);
}

// Gradient-clipped text is banned everywhere, with exactly one named exception.
// The exception is matched by its literal selector, so a NEW gradient-clipped
// element fails the build without anyone having to remember to add it here.
const GRADIENT_TEXT_EXCEPTION = ".display__grad";
function gradientClipOffenders(sheet, sourceLabel) {
  const offenders = [];
  for (const m of sheet.matchAll(/(?:-webkit-)?background-clip:\s*text/gi)) {
    // Walk back to the selector that owns this declaration.
    const open = sheet.lastIndexOf("{", m.index);
    if (open === -1) { offenders.push(`${sourceLabel}: declaration outside any rule`); continue; }
    const prevClose = Math.max(
      sheet.lastIndexOf("}", open),
      sheet.lastIndexOf("*/", open)
    );
    const selector = sheet.slice(prevClose + 1, open).trim().split("\n").pop().trim();
    if (selector !== GRADIENT_TEXT_EXCEPTION) {
      offenders.push(`${sourceLabel}: ${selector || "(unknown selector)"}`);
    }
  }
  return offenders;
}
const inlineCss = slice(layout, "<style>", "</style>", {
  min: 400, max: 8000, label: "inline critical CSS",
});
const clipOffenders = [
  ...gradientClipOffenders(css, "main.css"),
  ...gradientClipOffenders(inlineCss, "inline critical CSS"),
];
if (clipOffenders.length) {
  for (const o of clipOffenders) {
    bad(`gradient-clipped text outside the one allowed selector — ${o}`);
  }
} else {
  ok(`gradient-clipped text confined to ${GRADIENT_TEXT_EXCEPTION}`);
}
// …and that one exception must actually still be there.
const heroRule = rule(css, GRADIENT_TEXT_EXCEPTION, "hero headline");
if (heroRule && /background-clip:\s*text/.test(heroRule)) {
  ok("hero headline gradient present (the one sanctioned use)");
} else if (heroRule) {
  bad("hero headline rule exists but no longer applies a gradient");
}

// Figures stay solid: no gradient fill, no count-up.
for (const sel of [".stat__figure", ".price__now", ".buypanel__price", ".pcard__price b"]) {
  const body = rule(css, sel, "numeric styling");
  if (!body) continue;
  if (/background-clip:\s*text/.test(body) || /-webkit-text-fill-color:\s*transparent/.test(body)) {
    bad(sel + " is gradient-clipped; figures must be solid --text");
  } else if (!/color:\s*var\(--text\)/.test(body)) {
    bad(sel + " does not set a solid --text colour");
  } else {
    ok("solid, ungradiented figures: " + sel);
  }
}

// Cards keep border + background step + inset highlight; no outer drop shadow.
for (const sel of [".review", ".fgroup", ".card", ".stat"]) {
  const body = rule(css, sel, "card styling");
  if (!body) continue;
  const shadow = body.match(/box-shadow:([^;]*);/);
  if (shadow && /\d+px\s+\d+px/.test(shadow[1]) && !shadow[1].includes("inset")) {
    bad(sel + " has an outer drop shadow: " + shadow[1].trim());
  } else {
    ok("no drop shadow on " + sel);
  }
}

// Each filled buy variant must declare its own gradient AND colour, and no
// later rule in the file may re-declare color for that selector. This is the
// rule that would have flagged a lost or overridden button style.
for (const sel of [".btn--robux", ".btn--crypto"]) {
  const body = rule(css, sel, "buy variant");
  if (!body) continue;
  if (!/background:\s*linear-gradient\(/.test(body)) bad(sel + " does not declare a background gradient");
  else if (!/color:\s*var\(--base\)/.test(body)) bad(sel + " does not declare color: var(--base)");
  else ok(sel + " declares its gradient and --base text");
  const at = css.indexOf(sel + " {");
  const later = css.slice(css.indexOf("}", at) + 1);
  // any later rule whose selector list contains this exact selector (not :hover) and sets color
  const escaped = sel.replace(/[.\-]/g, (c) => "\\" + c);
  const re = new RegExp("(^|[\\s,])" + escaped + "\\s*(,|\\{)[^{]*\\{[^}]*\\bcolor\\s*:", "m");
  if (re.test(later)) bad(sel + " has its color re-declared by a later rule");
  else ok("no later rule re-declares color for " + sel);
}

// The nav CTA is <a class="btn btn--primary nav__cta"> inside .site-header >
// .nav > .nav__end. Its radius rule once lost to .btn, later in the file at
// equal specificity, so every radius change silently rendered at --r-sm. This
// resolves the cascade for that element in the BUILT stylesheet: every rule
// that matches it and sets border-radius is ranked by specificity then source
// order, and the winner must be .nav .nav__cta reading var(--nav-cta-radius).
{
  const built = fs.readFileSync("_site/assets/css/main.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const element = ["btn", "btn--primary", "nav__cta"];
  const ancestors = [["site-header"], ["nav"], ["nav__end"]];
  const compoundMatches = (compound, classes) => {
    const parts = compound.match(/\.[A-Za-z0-9_-]+/g) || [];
    if (!parts.length || parts.join("") !== compound) return false; // anything but bare classes: not this element
    return parts.every((c) => classes.includes(c.slice(1)));
  };
  const matches = (selector) => {
    const compounds = selector.trim().split(/\s*>\s*|\s+/).filter(Boolean);
    if (!compoundMatches(compounds[compounds.length - 1], element)) return false;
    let depth = 0;
    for (const compound of compounds.slice(0, -1)) {
      while (depth < ancestors.length && !compoundMatches(compound, ancestors[depth])) depth++;
      if (depth === ancestors.length) return false;
      depth++;
    }
    return true;
  };
  const candidates = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m, index = 0;
  while ((m = ruleRe.exec(built))) {
    const radius = m[2].match(/(?:^|;)\s*border-radius\s*:\s*([^;]+)/);
    if (!radius) continue;
    for (const selector of m[1].split(",")) {
      if (!matches(selector)) continue;
      const specificity = (selector.match(/\./g) || []).length;
      candidates.push({ selector: selector.trim().replace(/\s+/g, " "), value: radius[1].trim(), specificity, index });
    }
    index++;
  }
  if (expect(candidates.length, 2, "nav CTA border-radius candidates (.btn and .nav .nav__cta at least)")) {
    const winner = candidates.reduce((best, c) =>
      c.specificity > best.specificity || (c.specificity === best.specificity && c.index > best.index) ? c : best);
    if (winner.selector !== ".nav .nav__cta") {
      bad("nav CTA border-radius is won by " + winner.selector + " (" + winner.value + "), not .nav .nav__cta — the CTA radius rule is being overridden");
    } else if (winner.value !== "var(--nav-cta-radius)") {
      bad("nav CTA border-radius resolves to " + winner.value + ", expected var(--nav-cta-radius)");
    } else {
      ok("nav CTA border-radius is won by .nav .nav__cta -> " + winner.value + " over " + (candidates.length - 1) + " other matching rule(s)");
    }
  }
}

const glass = (css.match(/backdrop-filter/g) || []).length;
if (glass > 10) bad(glass + " backdrop-filter declarations — more than the header, carousel arrows and buy bar need");
else ok(glass + " backdrop-filter declarations (header, carousel arrows, buy bar)");

for (const layer of ["site-bg__vignette", "site-bg__grid", "site-bg__aurora"]) {
  if (css.includes("." + layer)) ok("background layer present: " + layer);
  else bad("background layer missing: " + layer);
}
if ((css.match(/site-bg__aurora--/g) || []).length > 0) bad("more than one aurora band defined");
else ok("one aurora band only");
for (const gone of ["site-bg__sheen", "site-bg__stars", "site-bg__streak"]) {
  if (css.includes("." + gone)) bad("removed background layer still present: " + gone);
}

// Background layers are viewport-anchored. This does NOT slice a region between
// two text anchors — that was the original bug, and an anchor like
// "@keyframes aurora" is also a prefix of "@keyframes auroraDrift", so renaming
// it would not even break the match. Instead each layer's own rule is pulled by
// selector, and rule() fails loudly if a selector disappears.
const BG_LAYERS = [".site-bg", ".site-bg__vignette", ".site-bg__grid", ".site-bg__aurora"];
let bgChecked = 0;
for (const sel of BG_LAYERS) {
  const body = rule(css, sel, "background layer");
  if (!body) continue;
  bgChecked++;
  const pxOffsets = body.match(/(top|bottom|left|right):\s*-?\d{3,}px/g);
  if (pxOffsets) bad(`${sel} anchored to fixed pixel offsets: ${pxOffsets.join(", ")}`);
}
if (expect(bgChecked, BG_LAYERS.length, "background layer rules inspected") && bgChecked) {
  ok("background positioned in % / vw / vh, not fixed pixel offsets");
}

// --- stylesheet ------------------------------------------------------------

console.log("\nFONTS");
// JetBrains Mono is gone for good; Montserrat 900 is prices and nothing else.
if (/JetBrains|font-mono/.test(css) || /JetBrains/.test(inlineCss)) bad("JetBrains Mono still referenced");
else ok("no JetBrains Mono reference in main.css or the inline critical CSS");
if (!fs.existsSync("src/assets/fonts/Montserrat-Black.woff2")) bad("Montserrat-Black.woff2 missing");
if (fs.existsSync("src/assets/fonts/JetBrainsMono-Variable.woff2")) bad("JetBrainsMono woff2 still shipped");
const PRICE_SELECTORS = [".price__now", ".price__was", ".buypanel__price", ".pcard__price b", ".buybar__price", ".bundle__price"];
for (const sel of PRICE_SELECTORS) {
  const body = rule(css, sel, "price font");
  if (!body) continue;
  if (!/font-family:\s*var\(--font-price\)/.test(body)) bad(sel + " is not set in --font-price (Montserrat)");
  else if (!/font-weight:\s*900/.test(body)) bad(sel + " is not weight 900");
  else if (!/letter-spacing:\s*-1px/.test(body)) bad(sel + " is not tracked at -1px");
  else ok(sel + " — Montserrat 900, -1px");
}
const priceUsers = [...css.matchAll(/([^{}]*)\{[^{}]*var\(--font-price\)/g)]
  .map((m) => m[1].trim().split("\n").pop().trim());
const strayPrice = priceUsers.filter((s) => !PRICE_SELECTORS.includes(s));
if (strayPrice.length) bad("--font-price used outside prices: " + strayPrice.join(", "));
else ok("--font-price confined to the " + PRICE_SELECTORS.length + " price selectors");
for (const sel of [".stat__figure", ".review__score"]) {
  const body = rule(css, sel, "figure font");
  if (!body) continue;
  if (/font-weight:\s*900/.test(body) && /letter-spacing:\s*-0\.5px/.test(body) && !/--font-price/.test(body)) ok(sel + " — Outfit 900, -0.5px");
  else bad(sel + " should be Outfit 900 at -0.5px");
}
const woff2 = fs.readdirSync("src/assets/fonts").filter((f) => f.endsWith(".woff2"));
const fontBytes = woff2.reduce((sum, f) => sum + fs.statSync("src/assets/fonts/" + f).size, 0);
ok("font payload " + (fontBytes / 1024).toFixed(1) + " KB across " + woff2.length + " files (" + woff2.join(", ") + ")");

console.log("\nSTYLESHEET");
const sheets = new Set();
for (const page of pages) {
  for (const [, href] of page.html.matchAll(/<link[^>]+href="([^"?]+\.css)(?:\?v=[0-9a-f]{8})?"/g)) sheets.add(href);
  if (!/href="\/assets\/css\/main\.css\?v=[0-9a-f]{8}"/.test(page.html)) bad(page.name + ": stylesheet URL is not content-hashed");
}
ok(`stylesheets referenced site-wide: ${[...sheets].join(", ") || "none"}`);
if (sheets.size !== 1) bad("expected exactly one stylesheet");
ok(`main.css is ${(fs.statSync("_site/assets/css/main.css").size / 1024).toFixed(1)} KB`);
if (inlineCss) {
  const bytes = Buffer.byteLength(inlineCss);
  ok(`inline critical CSS is ${(bytes / 1024).toFixed(2)} KB`);
  if (bytes > 4096) bad("inline critical CSS over 4KB");
}

// --- contrast --------------------------------------------------------------

console.log("\nCONTRAST (WCAG 2.1)");
console.log("  large text = 24px any weight, or 18.66px at 700+; everything else needs 4.5:1");

// Palette read FROM the stylesheet, not retyped here — otherwise changing a
// token in CSS would leave this gate validating the old colour and passing.
const rootBlock = slice(css, ":root {", "\n}", { min: 500, max: 6000, label: ":root token block" });
const token = {};
for (const m of decomment(rootBlock).matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) token[m[1]] = m[2].trim();
for (const need of ["--base", "--surface", "--surface-raised", "--text", "--text-muted",
                    "--text-dim", "--brand-blue", "--brand-cyan", "--danger",
                    "--grad-from", "--grad-to"]) {
  if (!token[need]) bad("token missing from :root: " + need);
}

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgbOf = (value) => {
  const hex = value.match(/#([0-9a-f]{6})/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { rgb: [(n >> 16) & 255, (n >> 8) & 255, n & 255], alpha: 1 };
  }
  const rgba = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)/i);
  if (rgba) {
    return { rgb: [+rgba[1], +rgba[2], +rgba[3]], alpha: rgba[4] === undefined ? 1 : +rgba[4] };
  }
  bad("could not parse colour: " + value);
  return { rgb: [0, 0, 0], alpha: 1 };
};
const lumOf = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
// Flattens a translucent foreground onto its background before measuring.
const flatten = (fg, bg) =>
  fg.rgb.map((v, i) => v * fg.alpha + bg.rgb[i] * (1 - fg.alpha));
const contrast = (fgValue, bgValue) => {
  const bg = rgbOf(bgValue);
  const fg = rgbOf(fgValue);
  const [hi, lo] = [lumOf(flatten(fg, bg)), lumOf(bg.rgb)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};

// Minimums stated as the WCAG rule that applies, not as a number someone picked.
const AA_SMALL = 4.5;
const AA_LARGE = 3.0;

const cases = [
  ["--text on --base", token["--text"], token["--base"], AA_SMALL, "body copy"],
  ["--text-muted on --base", token["--text-muted"], token["--base"], AA_SMALL, "small copy"],
  ["--text-muted on --surface", token["--text-muted"], token["--surface"], AA_SMALL, "card copy"],
  ["--text-muted on --surface-raised", token["--text-muted"], token["--surface-raised"], AA_SMALL, "raised copy"],
  ["--brand-cyan on --base", token["--brand-cyan"], token["--base"], AA_SMALL, "links, focus, labels"],
  ["--brand-cyan on --surface-raised", token["--brand-cyan"], token["--surface-raised"], AA_SMALL, "labels on raised"],
  ["#ffffff on --brand-blue", "#ffffff", token["--brand-blue"], AA_SMALL, "primary button"],
  ["--base on --brand-cyan", token["--base"], token["--brand-cyan"], AA_SMALL, "cyan-filled badge"],
  ["--base on #00B84D", token["--base"], "#00b84d", AA_SMALL, "Buy with Robux, darkest ramp stop"],
  ["--base on #E8590C", token["--base"], "#e8590c", AA_SMALL, "Buy with Crypto, darkest ramp stop"],
  // .price__was / .buypanel__was render at 18px weight 400. That is NOT large
  // text — WCAG needs 24px, or 18.66px at 700+ — so this takes the 4.5:1 gate.
  ["--danger on --base", token["--danger"], token["--base"], AA_SMALL, "18px/400 strikethrough price"],
  ["--text-dim on --base", token["--text-dim"], token["--base"], AA_LARGE, "36px/900 stat suffix — large text only"],
];
for (const [label, fg, bg, min, note] of cases) {
  const r = contrast(fg, bg);
  const pass = r >= min;
  console.log(`  ${pass ? "." : "x"} ${r.toFixed(2).padStart(6)}:1 (needs ${min})  ${label} — ${note}`);
  if (!pass) fail++;
}

// --text-dim only clears AA at large sizes, so it must not be available as a
// general utility. It is scoped to the one selector that is large enough.
const dimUsers = [...css.matchAll(/([^{}]*)\{[^{}]*var\(--text-dim\)/g)]
  .map((m) => m[1].trim().split("\n").pop().trim());
// The allowlist is selectors that render at 24px+, or 18.66px+ at weight 700.
// Anything else applying --text-dim fails: at 3.67:1 it only clears AA as large
// text. An empty list is the strictest possible state and passes.
const DIM_LARGE_TEXT_OK = [];
const dimOffenders = dimUsers.filter((s) => !DIM_LARGE_TEXT_OK.includes(s));
if (!dimOffenders.length) {
  ok(dimUsers.length
    ? "--text-dim confined to large-text selectors: " + dimUsers.join(", ")
    : "--text-dim is defined but unused — nothing renders at 3.67:1");
} else {
  bad("--text-dim used by: " + dimOffenders.join(", ") + " — only clears AA at 24px+, or 18.66px+ at 700");
}

// White text on the button ramp, checked at every point rather than averaged.
const gradFrom = token["--grad-from"];
const gradTo = token["--grad-to"];
if (gradFrom && gradTo) {
  const a = rgbOf(gradFrom).rgb;
  const b = rgbOf(gradTo).rgb;
  let worst = Infinity, worstHex = "";
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const mixed = "#" + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, "0")).join("");
    const r = contrast("#ffffff", mixed);
    if (r < worst) { worst = r; worstHex = mixed; }
  }
  const pass = worst >= AA_SMALL;
  console.log(`  ${pass ? "." : "x"} ${worst.toFixed(2).padStart(6)}:1 (needs ${AA_SMALL})  white on the ${gradFrom} -> ${gradTo} ramp, worst point ${worstHex}`);
  if (!pass) fail++;
  console.log(`  . ${contrast("#ffffff", "#1cd1fc").toFixed(2)}:1 white on the vivid #1CD1FC, for reference — why the ramp stays blue`);
}

const blueOnBase = contrast(token["--brand-blue"], token["--base"]);
console.log(`  . ${blueOnBase.toFixed(2)}:1 --brand-blue on --base — fails AA, which is why it is only ever a fill`);
if (blueOnBase >= AA_SMALL) bad("brand blue unexpectedly passes; the fill-only rule needs revisiting");
if (/color:\s*var\(--brand-blue\)/.test(css)) bad("--brand-blue used as a text colour");
else ok("--brand-blue never used as a foreground colour");

console.log("\n" + (fail ? fail + " PROBLEM(S)" : "ALL CONTENT CHECKS PASSED"));
process.exit(fail ? 1 : 0);
