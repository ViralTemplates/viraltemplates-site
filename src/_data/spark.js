// The chart's completed state (p = 1), rendered into the HTML so the picture is
// whole with scripts off and under reduced motion before spark.js runs. The
// same pure curve, sampled the same way, as the runtime loop.
const N = 120;
const y = (x) => 0.18 + 0.74 * Math.pow(x, 2.2);

const tip = 1;
const pts = [];
for (let i = 0; i <= N; i++) {
  const x = (tip * i) / N;
  pts.push((x * 300).toFixed(2) + " " + ((1 - y(x)) * 100).toFixed(2));
}
const line = "M" + pts.join(" L");

export default {
  line,
  area: line + " L" + (tip * 300).toFixed(2) + " 100 L0 100 Z",
  dotLeft: (tip * 100).toFixed(1),
  dotBottom: (y(tip) * 100).toFixed(1),
};
