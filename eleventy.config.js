export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets/img");
  eleventyConfig.addPassthroughCopy("src/assets/fonts");
  eleventyConfig.addPassthroughCopy("src/assets/js");
  eleventyConfig.addPassthroughCopy("src/assets/css");
  eleventyConfig.addPassthroughCopy({ CNAME: "CNAME" });
  // Browsers request /favicon.ico by convention, so the same file also lives at the root.
  eleventyConfig.addPassthroughCopy({ "src/assets/img/favicon.ico": "favicon.ico" });

  eleventyConfig.addWatchTarget("src/assets/");

  // Rebuilt on every push, so the footer year stays current.
  eleventyConfig.addGlobalData("buildYear", () => new Date().getFullYear());
  eleventyConfig.addGlobalData("buildDate", () => new Date().toISOString());

  // 79.99 -> "79.99"; keeps trailing zeros so a price never renders as "$19.9".
  eleventyConfig.addFilter("money", (n) =>
    Number(n).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );

  eleventyConfig.addFilter("percentOff", (now, was) =>
    Math.round((1 - Number(now) / Number(was)) * 100)
  );

  // Product pages show ONLY reviews whose product field matches, tier 3 first,
  // capped at six. No fill from the general pool: a product with none renders
  // no reviews section at all.
  eleventyConfig.addFilter("reviewsFor", (reviews, slug, maximum = 6) =>
    reviews
      .filter((r) => r.product === slug)
      .sort((a, b) => b.tier - a.tier)
      .slice(0, maximum)
  );

  // Per-product rating for a product page's AggregateRating and its visible
  // stars. Null when the product has no reviews, so no rating is emitted.
  eleventyConfig.addFilter("ratingFor", (reviews, slug) => {
    const own = reviews.filter((r) => r.product === slug);
    const rated = own.filter((r) => typeof r.score === "number");
    if (!own.length || !rated.length) return null;
    const avg10 = rated.reduce((t, r) => t + r.score, 0) / rated.length;
    const round1 = (n) => Math.round(n * 10) / 10;
    const averageOutOf5 = round1(avg10 / 2);
    return {
      reviewCount: own.length,
      ratedCount: rated.length,
      averageOutOf10: round1(avg10),
      averageOutOf5,
      fillPercent: Math.round((averageOutOf5 / 5) * 100),
    };
  });

  eleventyConfig.addFilter("whereTier", (reviews, tier) =>
    reviews.filter((r) => r.tier === tier)
  );

  // Joins two review lists for the marquee, which draws from tier 3 then tier 2.
  eleventyConfig.addFilter("concatList", (a, b) => (a || []).concat(b || []));

  // Tier 3, with a named opening trio pulled to the front so the first frame of
  // the rotator is deterministic (and identical in the HTML every build).
  eleventyConfig.addFilter("rotatorOrder", (reviews, openingNames) => {
    const tier3 = reviews.filter((r) => r.tier === 3);
    const opening = openingNames
      .map((name) => tier3.find((r) => r.name === name))
      .filter(Boolean);
    if (opening.length !== openingNames.length) {
      const missing = openingNames.filter(
        (n) => !tier3.some((r) => r.name === n)
      );
      throw new Error(
        `rotatorOrder: opening review(s) not found in tier 3: ${missing.join(", ")}`
      );
    }
    const rest = tier3.filter((r) => !opening.includes(r));
    return opening.concat(rest);
  });

  // FAQ front matter -> schema.org Question/Answer entries, so the copy is
  // written once and the structured data cannot drift from the page.
  eleventyConfig.addFilter("faqSchema", (items) =>
    (items || []).map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  );

  // Display order comes from the explicit "order" integer in products.json,
  // so reordering the file cannot silently reorder the storefront.
  eleventyConfig.addFilter("byOrder", (list) =>
    [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
  );

  eleventyConfig.addFilter("findBySlug", (products, slug) =>
    products.find((p) => p.slug === slug)
  );

  // Absolute URL for canonicals, og tags and JSON-LD.
  eleventyConfig.addFilter("absolute", (path, base) => new URL(path, base).href);

  // JSON-LD is injected inside a <script> element, so "<" has to be escaped or a
  // "</script>" inside review text would close the block early. U+2028 and
  // U+2029 are valid JSON but illegal raw in a JS string literal, so they go too.
  eleventyConfig.addFilter("jsonld", (value) =>
    JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .split(" ")
      .join("\\u2028")
      .split(" ")
      .join("\\u2029")
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
}
