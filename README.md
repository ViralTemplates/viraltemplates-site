# viraltemplates.co

Static storefront for [Viral Templates](https://viraltemplates.co) — Roblox game
templates and scripted UI packs. Checkout is handled by Payhip; this repo is the
storefront only.

Eleventy 3 + Nunjucks. No CSS framework, no JS framework, one stylesheet.

## Running it

```bash
npm install
npm run build      # -> _site/
npm run serve      # Eleventy dev server with live reload
npm run preview    # plain static server over the built _site, port 8788
npm run verify     # build, then run both audits
```

`npm run verify` fails the run if any of these regress:

- a `<title>` over 60 characters, a meta description outside 140–160, or a
  duplicate of either
- more or fewer than one `<h1>` per page, or a heading level skip
- invalid JSON-LD, a missing canonical, og:image or twitter:card
- `payhip.js` loaded on a page that is not a product page, or missing from one
  that is
- an `<img>` without `width`, `height` or `alt`; a `<script src>` without `defer`
- a review missing from the home page, or a display name mangled in escaping
- a star rating that disagrees with the value computed from `reviews.json`
- any of the banned marketing phrases, or any of the forbidden visual effects
- a contrast pair falling below WCAG AA

## Layout

```
src/_data/          site.json, products.json, reviews.json, stats.js (computed)
src/_includes/      layouts/base.njk, components/*
src/assets/css/     main.css — the only stylesheet
src/assets/js/      nav, gallery, reveal, marquee, contact
src/assets/fonts/   self-hosted Outfit + JetBrains Mono (variable woff2, OFL)
src/assets/img/     WebP + JPG for every screenshot, plus logo and favicons
src/products/       product.njk — paginated, one page per entry in products.json
tools/              image pipeline, preview server, the two audits
```

## Ratings are computed, never typed

Every rating on the site comes from `src/_data/stats.js`, which derives
`reviewCount`, `ratedCount`, `averageOutOf10` and `averageOutOf5` from the
entries in `reviews.json` that have a non-null `score`. Nothing anywhere
hardcodes a number. Adding a review changes the stars, the stat row and the
`AggregateRating` in the JSON-LD together.

`site.customerCount` is the one manually maintained figure — it renders as static
text and is not animated.

Run `node tools/audit-ratings.mjs` to print every review, which ones count
toward the average, and the arithmetic. That is the file of record for the
rating; it currently reads 25 rated of 35, summing to 244, for 9.76/10 (4.9/5).

## The sales sparkline

`site.salesCurve` holds cumulative sales per month. `src/_data/sparkline.js`
turns it into an SVG path at build time. **If any month's `total` is `null` the
chart is not drawn** — the stat card renders a note naming the missing months
instead. A sales chart with invented points is worse than no chart, so the
generator refuses rather than guessing. Fill in the totals and it draws itself.

## Images

Screenshots are pre-generated and committed. The untouched masters live in
`_source-images/`, which is gitignored. To regenerate after replacing a master:

```bash
npm run images
```

That writes an optimised JPG and a WebP for each screenshot, re-encodes the Open
Graph card, and rebuilds the favicons.

## Colour

The base is `#070B18`, a deep blue-black sampled from the logo field, with
`--surface` #0D1424 and `--surface-raised` #141C30 carrying the same tint.
`--panel` is a top-lit gradient fill laid over an opaque surface — lighting,
not glassmorphism, so it is never placed over the page background.

`--brand-blue` (#1246F2) measures 2.98:1 on that base and **fails WCAG AA**. It
is only ever a filled surface with `#fff` text. `--brand-cyan` (#1CD1FC)
measures 10.82:1 and carries every small accent: links, focus rings, labels,
icon strokes, list markers. Where cyan is a fill, the text on it is `--base`,
never white.

Buttons use a 135deg gradient from #1246F2 to #0E38C4. Both stops are blue and
both carry white at AA — the worst point on the ramp is 6.60:1. `npm run verify`
walks the ramp in 5% steps and fails the build if any point drops below 4.5:1.
#1CD1FC appears only where no text sits: the inset highlight, the focus ring,
the ghost rim and the hero headline gradient.

Run `node tools/contrast.mjs` to print the full palette table, or
`node tools/contrast.mjs "#RRGGBB"` to test a different gradient stop.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds and publishes
to GitHub Pages. The custom domain comes from `CNAME`, which is copied into the
build output.
