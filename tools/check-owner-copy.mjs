// The owner's own words, checked byte-for-byte against the rendered HTML.
// Deliberately includes their customise/customizable inconsistency — this file
// asserts the inconsistency SURVIVES, so a well-meaning "fix" fails the build.
import fs from "node:fs";

const page = (p) => fs.readFileSync("_site/" + p, "utf8");
const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Rendered HTML wraps and indents, so compare on collapsed whitespace.
const flat = (s) => s.replace(/\s+/g, " ").trim();

let fail = 0;
// Nunjucks escapes apostrophes in {{ variable }} output but leaves literal
// template text alone, so the same sentence can legitimately appear either way.
// Both forms are accepted; anything else is a real difference in the words.
const check = (file, text, label) => {
  const html = flat(page(file));
  if (html.includes(flat(esc(text))) || html.includes(flat(text))) {
    console.log("  . " + label);
  } else {
    console.log("  x " + label + " — NOT FOUND VERBATIM in /" + file);
    fail++;
  }
};

console.log("HERO + HOME SECTIONS (index.html)");
check("index.html", "Premium Roblox templates", "hero line 1");
check("index.html", "& assets, ready to go.", "hero line 2");
check("index.html", "High-quality, pre-made game templates and assets inspired by current trending and viral Roblox games.", "hero sub");
check("index.html", "Tired of rebuilding the same systems again?", "value heading");
check("index.html", "Every template ships ready to publish. Clean code, polished UI, and the systems you'd otherwise spend weeks rebuilding.", "value sub");
check("index.html", "Built for success", "card 1 title");
check("index.html", "With 5+ years of Roblox development experience, we know what current trends look like and what makes games reach the front page.", "card 1 body");
check("index.html", "Built for efficiency", "card 2 title");
check("index.html", "Stop wasting weeks rebuilding the basics. Our templates are ready to launch in minutes, so you can focus on reaching the algorithm.", "card 2 body");
check("index.html", "Built for affordability", "card 3 title");
check("index.html", "Premium quality templates without premium agency pricing. Professional results at a price that actually makes sense for indie developers.", "card 3 body");
check("index.html", "Browse the collection.", "collection heading");
check("index.html", "Production-ready templates and asset packs, fully scripted and supported. More dropping soon, keep an eye out.", "collection sub");

console.log("\nSTAT CARDS (index.html)");
for (const t of ["Developers", "Templates and assets sold to developers", "Products",
                 "More dropping soon", "Released, live and supported", "Rating",
                 "Average customer rating"]) {
  check("index.html", t, "stat: " + t);
}

console.log("\nCARD DESCRIPTIONS");
check("index.html", "This premium Roblox game template gives you a complete, ready to use game structure, consisting of core scripts, a fully built map, and polished UI, all designed for smooth gameplay and strong player retention.", "Jump description");
check("index.html", "A complete pack of clean, customizable UI elements. Buttons, menus, frames, and HUD components. Drop into any Roblox game and restyle in minutes for a polished, professional look.", "Stud description (note: US 'customizable')");

console.log("\nHOME FAQ (index.html)");
check("index.html", "Can I customise the template?", "Q1 (UK 'customise')");
check("index.html", "Yes. All templates are fully customizable in Roblox Studio. You can change assets, UI, scripts, and scale systems to fit your specific needs for your game.", "A1 (US 'customizable' — inconsistency preserved)");
check("index.html", "I've never released a game before, will I be able to use this template?", "Q2");
check("index.html", "Absolutely. Whether you're new to Roblox development or experienced, the template is clean, organised, and easy to work with.", "A2");
check("index.html", "What happens after I purchase a template?", "Q3");
check("index.html", "You get instant access to the template after checkout. Download it, open it in Roblox Studio, and release it within a matter of minutes.", "A3");

console.log("\nTEMPLATES PAGE");
check("templates/index.html", "The full collection.", "heading");
check("templates/index.html", "Every template and asset pack we've built, fully scripted, production-ready, and inspired by current trending Roblox games. New drops added regularly.", "sub");

console.log("\nPRODUCT PAGE: jump-for-template (owner copy, unadapted)");
const jump = "jump-for-template/index.html";
check(jump, "Everything you need to ship.", "ship heading");
check(jump, "Clean, modular code", "feature 1");
check(jump, "Server-authoritative architecture with commented Luau. Easy to extend, easy to learn from.", "feature 1 body");
check(jump, "Polished UI", "feature 2");
check(jump, "Pre-built menus, HUDs, and reward screens. Drop in your branding and you're done.", "feature 2 body");
check(jump, "Launch in minutes", "feature 3");
check(jump, "Open in Studio, replace placeholder assets, hit publish. No setup grind, no rewriting.", "feature 3 body");
check(jump, "Built for retention", "feature 4");
check(jump, "Reward loops, progression systems, and monetization hooks", "feature 4 body (no full stop, as written)");
check(jump, "Instant download", "tick 1");
check(jump, "24/7 support", "tick 2");
check(jump, "Ready to publish", "tick 3");
check(jump, "Have any questions?", "FAQ heading");
check(jump, "Can I customise the template?", "product Q1");
check(jump, "Yes. The template is fully customisable in Roblox Studio, assets, UI, scripts, and progression all editable to fit your specific game.", "product A1 (UK 'customisable')");
check(jump, "I've never released a game before, will I be able to use this?", "product Q2");
check(jump, "Absolutely. The code is clean, organised, and well-commented, designed to be approachable for new developers and useful for experienced ones.", "product A2");
check(jump, "What happens after I purchase?", "product Q3");
check(jump, "You get instant access to download the template. Open it in Roblox Studio, customise to taste, and you can have it live in minutes.", "product A3");
check(jump, "Ready to take your game to the next level?", "closing CTA heading");
check(jump, "Stop rebuilding the basics. Get a production-ready template and focus on what makes your game stand out.", "closing CTA body");
check(jump, "Buy for $79.99", "buy button label, price from products.json");

console.log("\nHOME CTA BAND");
check("index.html", "Pick a product and get building", "CTA heading");
check("index.html", "A range of products, all professionally built, downloadable immediately.", "CTA sub");
// The link label is pinned as the full anchor tail so the word "Browse" in
// the collection heading cannot satisfy it. "See all three" would go stale
// the moment a fourth product ships, so its absence is asserted too.
check("index.html", 'href="/templates/">Browse</a>', "CTA link label");
if (flat(page("index.html")).includes("See all three")) { console.log("  x old CTA label 'See all three' still present"); fail++; }
else console.log("  . old CTA label 'See all three' is gone");
check("index.html", "Join the Discord", "hero secondary button");

console.log("\nTERMS OF SERVICE (terms/index.html)");
const tos = "terms/index.html";
check(tos, "Terms of Service.", "h1");
check(tos, "By purchasing, downloading, or using any digital product from Viral Templates, you agree to be bound by the terms below. Failure to read these terms does not exempt you from liability.", "intro");
const TOS = [
  ["1. License Grant & IP", ["Ownership:", "All Products remain the exclusive property of Viral Templates.", "Limited License:", "Purchase grants a non-exclusive, non-transferable license for use on Roblox.", "No Authorship:", "You may not claim the Product or its source code as your own work."]],
  ["2. Strict Prohibitions (Read Carefully)", ["No Resale:", "Reselling, sharing, leaking, or trading files (.rbxl, .rbxm) is strictly forbidden.", "Team Liability:", "You are responsible for your developers. If a team member leaks the product, you are liable.", "Unsafe Sharing:", "Uploading to public asset libraries or unauthorized social media is a violation."]],
  ["3. Payments & Refunds", ["All Sales Final:", "Due to the digital nature of the products, no refunds or exchanges are offered.", "Chargebacks:", "Any unauthorized chargeback will result in a permanent blacklist and revocation of all licenses.", "Fraud:", "We actively report fraudulent disputes."]],
  ["4. Liability & Disclaimers", ['"As-Is":', "Products are provided without warranties of any kind.", "No Guarantees:", "We do not guarantee game popularity or revenue.", "Roblox Updates:", "We are not responsible if future Roblox updates break compatibility.", "Takedowns:", "If your game or your account is moderated, restricted, or removed by Roblox, Viral Templates is not liable.", "Financial Loss:", "We are not responsible for any loss of revenue, profits, or financial damages resulting from bugs, errors, or game issues.", "Liability Cap:", "Total liability will not exceed the amount you paid for the Product."]],
  ["5. Support & Maintenance", ["Support:", "Provided at our discretion for bug fixes only.", "No Coaching:", "We do not teach you how to script or use Roblox Studio."]],
  ["6. Enforcement & DMCA", ["Revocation:", "We may revoke access to current and future products for ToS violations.", "Legal Action:", "Unauthorized redistribution may result in DMCA takedowns and legal escalation."]],
  ["7. Attribution", ["If significant assets remain intact, you must acknowledge them as the adjusted property of Viral Templates."]],
];
for (const [h, items] of TOS) {
  check(tos, h, h);
  items.forEach((t, i) => check(tos, t, "  " + h.slice(0, 2) + " item " + (i + 1)));
}
if (flat(page(tos)).includes("Last updated")) { console.log("  x 'Last updated' line still present"); fail++; }
else console.log("  . no 'Last updated' line");

console.log("\nCONTACT (contact/index.html)");
check("contact/index.html", "Need to contact us?", "h1");
if (flat(page("contact/index.html")).includes("Ask us and we'd be more than happy")) { console.log("  x removed contact sub-line still present"); fail++; }
else console.log("  . removed contact sub-line is gone");
check("contact/index.html", "Or get an answer faster", "secondary label");

console.log("\nFOOTER");
check("index.html", "Developing made Easy.", "footer tagline");

console.log("\n" + (fail ? fail + " PROBLEM(S)" : "ALL OWNER COPY REPRODUCED VERBATIM"));
process.exit(fail ? 1 : 0);
