// Prints every review in reviews.json, marks which ones count toward the
// average, and shows the arithmetic. This is the file of record for the rating.
import fs from "node:fs";

const reviews = JSON.parse(fs.readFileSync("src/_data/reviews.json", "utf8"));

let n = 0;
console.log("#   TIER  SCORE  NAME");
console.log("-".repeat(58));
for (const r of reviews) {
  n++;
  const scored = typeof r.score === "number";
  console.log(
    String(n).padStart(2) +
      "   t" + r.tier +
      "     " + (scored ? String(r.score).padStart(2) : " —") +
      "   " + r.name
  );
}

const rated = reviews.filter((r) => typeof r.score === "number");
const unrated = reviews.filter((r) => typeof r.score !== "number");

if (!reviews.length || !rated.length) {
  console.error("\nreviews.json has " + reviews.length + " reviews and " +
    rated.length + " with a score — nothing to average.");
  process.exit(1);
}

console.log("\nRATED (counts toward the average): " + rated.length);
const buckets = new Map();
for (const r of rated) buckets.set(r.score, (buckets.get(r.score) || 0) + 1);
let sum = 0;
for (const score of [...buckets.keys()].sort((a, b) => b - a)) {
  const count = buckets.get(score);
  const sub = score * count;
  sum += sub;
  console.log(`  ${count} x ${score} = ${String(sub).padStart(3)}`);
}
console.log("  " + "-".repeat(14));
console.log(`  ${rated.length} rated, sum ${sum}`);

console.log("\nUNRATED (score: null, excluded from the average): " + unrated.length);
console.log("  " + unrated.map((r) => r.name).join(", "));

const avg10 = sum / rated.length;
const avg5 = Math.round((avg10 / 2) * 10) / 10;
console.log("\nAVERAGE");
console.log(`  ${sum} / ${rated.length} = ${avg10.toFixed(4)} out of 10`);
console.log(`  ${avg10.toFixed(4)} / 2 = ${(avg10 / 2).toFixed(4)} out of 5 -> displays as ${avg5}`);
console.log(`  star fill = ${Math.round((avg5 / 5) * 100)}%`);
console.log(`\n  TOTAL REVIEWS ${reviews.length} = ${rated.length} rated + ${unrated.length} unrated`);
