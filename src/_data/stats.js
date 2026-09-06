import reviews from "./reviews.json" with { type: "json" };
import products from "./products.json" with { type: "json" };
import site from "./site.json" with { type: "json" };

// Every rating shown anywhere on the site is derived here, at build time.
// Nothing about the score is written by hand in a template.
const rated = reviews.filter((r) => typeof r.score === "number");
const sum = rated.reduce((total, r) => total + r.score, 0);

const averageOutOf10raw = rated.length ? sum / rated.length : 0;
const averageOutOf5raw = averageOutOf10raw / 2;

// One decimal, rounded half-up — 4.88 becomes 4.9, and stays 4.9.
const round1 = (n) => Math.round(n * 10) / 10;

const averageOutOf5 = round1(averageOutOf5raw);

// Star geometry for the display value, so a 4.9 renders four solid stars and a
// 90%-filled fifth rather than being rounded up to five.
const full = Math.floor(averageOutOf5);
const partialPercent = Math.round((averageOutOf5 - full) * 100);
const stars = {
  full,
  partialPercent, // 0 when the fifth star is not needed
  empty: 5 - full - (partialPercent > 0 ? 1 : 0),
};

const liveProducts = products.filter((p) => p.status === "live");

export default {
  reviewCount: reviews.length,
  ratedCount: rated.length,
  averageOutOf10: round1(averageOutOf10raw),
  averageOutOf5,
  averageOutOf5Precise: Number(averageOutOf5raw.toFixed(2)),
  stars,
  productCount: liveProducts.length,
  customerCount: site.customerCount,
};
