// Urza Tower Capital LP - rendering layer.
// Loaded by index.html and facts.html. Renders whichever mount points exist on the page.

var usd = function (v) {
  return "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
var pct = function (v) { return (v >= 0 ? "+" : "") + v.toFixed(2) + "%"; };
var wgt = function (v) { return v.toFixed(1) + "%"; };

var NS = "http://www.w3.org/2000/svg";
function el(name, attrs, text) {
  var n = document.createElementNS(NS, name);
  for (var k in attrs) { if (attrs[k] !== undefined) n.setAttribute(k, attrs[k]); }
  if (text !== undefined) n.textContent = text;
  return n;
}
function tag(name, cls, text) {
  var n = document.createElement(name);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function cell(text, cls) {
  var td = document.createElement("td");
  if (cls) td.className = cls;
  td.textContent = text;
  return td;
}
function label(mount, kind, no, caption) {
  var p = tag("p", "exhibit");
  p.appendChild(document.createTextNode(kind + " " + no + ". "));
  p.appendChild(tag("span", null, caption));
  mount.appendChild(p);
  return p;
}

function stats() {
  var s = DATA.summary;
  var h = DATA.holdings.slice().sort(function (a, b) { return b[4] - a[4]; });
  var sum = function (arr, i) { return arr.reduce(function (a, r) { return a + r[i]; }, 0); };
  var b = DATA.buckets.slice().sort(function (a, b) { return b[2] - a[2]; });
  return {
    cost: sum(DATA.holdings, 3),
    value: sum(DATA.holdings, 4),
    units: sum(DATA.holdings, 2),
    avg: s.nav / DATA.holdings.length,
    top1: h[0],
    top1w: h[0][4] / s.nav * 100,
    top5w: sum(h.slice(0, 5), 4) / s.nav * 100,
    top10w: sum(h.slice(0, 10), 4) / s.nav * 100,
    bigBucket: b[0],
    bigBucketW: b[0][2] / s.nav * 100,
    above: DATA.holdings.filter(function (r) { return r[5] > 0; }).length,
    lastBuy: DATA.holdings.map(function (r) { return r[6]; }).sort().slice(-1)[0]
  };
}

/* ---------------------------------------------------------------- charts */

var W = 560, PAD = { l: 56, r: 56, t: 18, b: 34 };
var AXIS = "font-size:9px;font-family:inherit;fill:#666";
var AXIS_DARK = "font-size:9px;font-family:inherit;fill:#111";

function xScale() {
  var pts = DATA.series;
  var t0 = Date.parse(pts[0][0]), t1 = Date.parse(pts[pts.length - 1][0]);
  return function (d) { return PAD.l + ((Date.parse(d) - t0) / (t1 - t0)) * (W - PAD.l - PAD.r); };
}

// Attaches crosshair tracking to a plot. series index list tells the tracker
// which columns to mark with a dot and how to write the readout.
function track(svg, H, x, ys, cols, readout, fmt) {
  var pts = DATA.series;
  var g = el("g", { style: "pointer-events:none" });
  var rule = el("line", { y1: PAD.t, y2: H - PAD.b, stroke: "#111", "stroke-width": "1", "stroke-dasharray": "2 2", opacity: "0" });
  g.appendChild(rule);
  var dots = cols.map(function (c, i) {
    var d = el("circle", { r: 3, fill: "#fff", stroke: "#111", "stroke-width": "1.5", opacity: "0" });
    g.appendChild(d);
    return d;
  });
  svg.appendChild(g);

  var hit = el("rect", {
    x: PAD.l, y: PAD.t, width: W - PAD.l - PAD.r, height: H - PAD.t - PAD.b,
    fill: "transparent", style: "cursor:crosshair"
  });
  svg.appendChild(hit);

  var cur = pts.length - 1;

  function show(i, active) {
    cur = i;
    var p = pts[i];
    var px = x(p[0]);
    rule.setAttribute("x1", px);
    rule.setAttribute("x2", px);
    rule.setAttribute("opacity", active ? "1" : "0");
    dots.forEach(function (d, k) {
      d.setAttribute("cx", px);
      d.setAttribute("cy", ys[k](p[cols[k]]));
      d.setAttribute("opacity", active ? "1" : "0");
    });
    readout.textContent = fmt(p);
  }

  function nearest(vx) {
    var best = 0, bd = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = Math.abs(x(pts[i][0]) - vx);
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  function fromEvent(e) {
    var r = svg.getBoundingClientRect();
    if (!r.width) return cur;
    return nearest((e.clientX - r.left) / r.width * W);
  }

  svg.addEventListener("pointermove", function (e) { show(fromEvent(e), true); });
  svg.addEventListener("pointerdown", function (e) { show(fromEvent(e), true); });
  svg.addEventListener("pointerleave", function () { show(pts.length - 1, false); });
  svg.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { show(Math.max(0, cur - 1), true); e.preventDefault(); }
    if (e.key === "ArrowRight") { show(Math.min(pts.length - 1, cur + 1), true); e.preventDefault(); }
  });
  svg.addEventListener("blur", function () { show(pts.length - 1, false); });

  show(pts.length - 1, false);
  return show;
}

function buildCharts(mount) {
  var pts = DATA.series;
  var x = xScale();
  var line = function (ys, idx) {
    return pts.map(function (p, i) {
      return (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + ys(p[idx]).toFixed(1);
    }).join(" ");
  };
  var years = ["2025-01-01", "2026-01-01"];

  /* Exhibit 1 - NAV against cost */
  var H1 = 440;
  var navMax = Math.max.apply(null, pts.map(function (p) { return p[1]; })) * 1.05;
  var yNav = function (v) { return H1 - PAD.b - (v / navMax) * (H1 - PAD.t - PAD.b); };

  label(mount, "Exhibit", 1, "Net asset value against invested capital, USD");
  var r1 = tag("p", "readout");
  mount.appendChild(r1);
  var box1 = tag("div", "plot");
  var s1 = el("svg", { viewBox: "0 0 " + W + " " + H1, role: "img", tabindex: "0",
                       "aria-label": "Net asset value against invested capital. Use arrow keys to step through months." });
  [0, 2000, 4000, 6000, 8000].forEach(function (v) {
    s1.appendChild(el("line", { x1: PAD.l, x2: W - PAD.r, y1: yNav(v), y2: yNav(v), stroke: "#eee", "stroke-width": "1" }));
    s1.appendChild(el("text", { x: PAD.l - 6, y: yNav(v) + 3, "text-anchor": "end", style: AXIS }, v >= 1000 ? v / 1000 + "k" : String(v)));
  });
  years.forEach(function (d) {
    s1.appendChild(el("text", { x: x(d), y: H1 - PAD.b + 16, "text-anchor": "middle", style: AXIS }, d.slice(0, 4)));
  });
  s1.appendChild(el("path", { d: line(yNav, 2), fill: "none", stroke: "#999", "stroke-width": "1", "stroke-dasharray": "4 3" }));
  s1.appendChild(el("path", { d: line(yNav, 1), fill: "none", stroke: "#111", "stroke-width": "1.5" }));
  s1.appendChild(el("text", { x: W - PAD.r, y: yNav(pts[pts.length - 1][1]) - 6, "text-anchor": "end", style: AXIS_DARK }, "NAV " + usd(pts[pts.length - 1][1])));
  s1.appendChild(el("text", { x: W - PAD.r, y: yNav(pts[pts.length - 1][2]) + 14, "text-anchor": "end", style: AXIS }, "cost " + usd(pts[pts.length - 1][2])));
  box1.appendChild(s1);
  mount.appendChild(box1);
  track(s1, H1, x, [yNav, yNav], [1, 2], r1, function (p) {
    return p[0] + "   NAV " + usd(p[1]) + "   cost " + usd(p[2]) + "   unrealized " + pct(p[3]);
  });
  mount.appendChild(tag("p", "note",
    "NAV solid, cumulative acquisition cost dashed. Monthly points. Hover or use arrow keys to read a month. " +
    "The path between a position's acquisition and its " + DATA.summary.asof +
    " mark is straight-line modelled; no intramonth marks exist."));

  /* Exhibit 2 - unrealized return */
  var H2 = 380;
  var perfs = pts.map(function (p) { return p[3]; });
  var pMin = Math.min.apply(null, [0].concat(perfs));
  var pMax = Math.max.apply(null, perfs) * 1.1;
  var yPerf = function (v) { return H2 - PAD.b - ((v - pMin) / (pMax - pMin)) * (H2 - PAD.t - PAD.b); };

  label(mount, "Exhibit", 2, "Unrealized return on invested capital");
  var r2 = tag("p", "readout");
  mount.appendChild(r2);
  var box2 = tag("div", "plot");
  var s2 = el("svg", { viewBox: "0 0 " + W + " " + H2, role: "img", tabindex: "0",
                       "aria-label": "Unrealized return on invested capital. Use arrow keys to step through months." });
  [0, 10, 20, 30].forEach(function (v) {
    s2.appendChild(el("line", { x1: PAD.l, x2: W - PAD.r, y1: yPerf(v), y2: yPerf(v), stroke: "#eee", "stroke-width": "1" }));
    s2.appendChild(el("text", { x: PAD.l - 6, y: yPerf(v) + 3, "text-anchor": "end", style: AXIS }, v + "%"));
  });
  years.forEach(function (d) {
    s2.appendChild(el("text", { x: x(d), y: H2 - PAD.b + 16, "text-anchor": "middle", style: AXIS }, d.slice(0, 4)));
  });
  s2.appendChild(el("path", { d: line(yPerf, 3), fill: "none", stroke: "#111", "stroke-width": "1.5" }));
  s2.appendChild(el("text", { x: W - PAD.r, y: yPerf(pts[pts.length - 1][3]) - 6, "text-anchor": "end", style: AXIS_DARK }, pct(pts[pts.length - 1][3])));
  box2.appendChild(s2);
  mount.appendChild(box2);
  track(s2, H2, x, [yPerf], [3], r2, function (p) {
    return p[0] + "   unrealized " + pct(p[3]) + "   on cost " + usd(p[2]);
  });
  mount.appendChild(tag("p", "note",
    "Return on invested capital, not a time-weighted return. The early swings sit on a very small base, one position of " +
    usd(51.3) + " until November 2024, and are not comparable with later periods."));
}

/* ---------------------------------------------------------------- tables */

function buildTables() {
  var s = DATA.summary, k = stats();

  var bt = document.querySelector("#buckets tbody");
  DATA.buckets.forEach(function (r) {
    var tr = document.createElement("tr");
    tr.appendChild(cell(r[0]));
    tr.appendChild(cell(usd(r[1]), "num"));
    tr.appendChild(cell(usd(r[2]), "num"));
    tr.appendChild(cell(pct(r[3]), "num"));
    tr.appendChild(cell(wgt(r[2] / s.nav * 100), "num"));
    bt.appendChild(tr);
  });
  var btot = document.createElement("tr");
  btot.className = "total";
  btot.appendChild(cell("Total"));
  btot.appendChild(cell(usd(k.cost), "num"));
  btot.appendChild(cell(usd(k.value), "num"));
  btot.appendChild(cell(pct(s.perf_pct), "num"));
  btot.appendChild(cell("100.0%", "num"));
  bt.appendChild(btot);

  document.querySelector("#holdings-title span").textContent = "Holdings, all " + s.positions + " positions";

  var ht = document.querySelector("#holdings tbody");
  DATA.holdings.forEach(function (r) {
    var tr = document.createElement("tr");
    tr.appendChild(cell(r[0]));
    tr.appendChild(cell(r[1]));
    tr.appendChild(cell(String(r[2]), "num"));
    tr.appendChild(cell(usd(r[3]), "num"));
    tr.appendChild(cell(usd(r[4]), "num"));
    tr.appendChild(cell(pct(r[5]), "num"));
    tr.appendChild(cell(wgt(r[4] / s.nav * 100), "num"));
    tr.appendChild(cell(r[6], "num"));
    ht.appendChild(tr);
  });
  var htot = document.createElement("tr");
  htot.className = "total";
  htot.appendChild(cell("Total"));
  htot.appendChild(cell(""));
  htot.appendChild(cell(String(k.units), "num"));
  htot.appendChild(cell(usd(k.cost), "num"));
  htot.appendChild(cell(usd(k.value), "num"));
  htot.appendChild(cell(pct(s.perf_pct), "num"));
  htot.appendChild(cell("100.0%", "num"));
  htot.appendChild(cell(""));
  ht.appendChild(htot);
}

/* ----------------------------------------------------------- facts sheet */

function factsRow(tbody, l, v) {
  var tr = document.createElement("tr");
  tr.appendChild(cell(l, "lbl"));
  tr.appendChild(cell(v, "val"));
  tbody.appendChild(tr);
}
function factsGroup(tbody, l) {
  var tr = document.createElement("tr");
  tr.className = "group";
  var td = cell(l);
  td.colSpan = 2;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

function buildFacts(tb) {
  var s = DATA.summary, k = stats();

  factsGroup(tb, "Vehicle");
  factsRow(tb, "Name", "Urza Tower Capital LP");
  factsRow(tb, "Structure", "Personal book, run with fund discipline");
  factsRow(tb, "Location", "Miami, Florida");
  factsRow(tb, "Base currency", "USD");
  factsRow(tb, "First acquisition", s.first_acq);
  factsRow(tb, "Inception of the book", s.inception);
  factsRow(tb, "Reporting date", s.asof);

  factsGroup(tb, "Mandate");
  factsRow(tb, "Strategy", "Long-only sealed trading card product");
  factsRow(tb, "Instruments", "Sealed boxes, displays, packs, decks, bundles");
  factsRow(tb, "Universe", "Magic: The Gathering and Universes Beyond");
  factsRow(tb, "Holding period", "Indefinite. No position has been sold");
  factsRow(tb, "Benchmark", "None");

  factsGroup(tb, "Portfolio");
  factsRow(tb, "Net asset value", usd(s.nav));
  factsRow(tb, "Invested capital", usd(s.invested));
  factsRow(tb, "Unrealized return", pct(s.perf_pct));
  factsRow(tb, "Positions", String(s.positions) + " across " + DATA.buckets.length + " buckets");
  factsRow(tb, "Sealed units held", String(k.units));
  factsRow(tb, "Average position", usd(k.avg));
  factsRow(tb, "Largest position", k.top1[0] + ", " + wgt(k.top1w) + " of NAV");
  factsRow(tb, "Top five concentration", wgt(k.top5w) + " of NAV");
  factsRow(tb, "Top ten concentration", wgt(k.top10w) + " of NAV");
  factsRow(tb, "Largest bucket", k.bigBucket[0] + ", " + wgt(k.bigBucketW) + " of NAV");
  factsRow(tb, "Positions above cost", k.above + " of " + s.positions);
  factsRow(tb, "Most recent acquisition", k.lastBuy);

  factsGroup(tb, "Terms");
  factsRow(tb, "Outside capital", "None accepted");
  factsRow(tb, "Management fee", "None");
  factsRow(tb, "Performance fee", "None");
  factsRow(tb, "Leverage", "None");
  factsRow(tb, "Redemptions", "Not offered");
  factsRow(tb, "Custody", "Self custody, sealed storage");

  factsGroup(tb, "Valuation");
  factsRow(tb, "Marks", "Public retail and marketplace data");
  factsRow(tb, "Frequency", "Monthly, at month end");
  factsRow(tb, "Cost basis", "All-in order cost, after discount and tax");
  factsRow(tb, "Excluded inputs", "Asking prices and single outlier listings");
  factsRow(tb, "Intramonth path", "Straight-line modelled between marks");

  factsGroup(tb, "Risk");
  factsRow(tb, "Principal risk", "Reprint of a set, tracked per set");
  factsRow(tb, "Concentration", "Single publisher, single asset class");
  factsRow(tb, "Liquidity", "Marketplace-dependent, no committed bid");
  factsRow(tb, "Physical", "Condition, humidity, storage integrity");
  factsRow(tb, "Realization", "All returns unrealized to date");
}

/* -------------------------------------------------------------- dispatch */

(function () {
  var s = DATA.summary, k = stats();

  var summary = document.getElementById("summary-line");
  if (summary) {
    summary.textContent =
      "As of " + s.asof + ". Invested capital " + usd(s.invested) + ", marked at " + usd(s.nav) +
      ", unrealized " + pct(s.perf_pct) + ". " + s.positions + " positions and " + k.units +
      " sealed units across " + DATA.buckets.length + " strategy buckets. First acquisition " + s.first_acq + ".";
  }

  var charts = document.getElementById("charts");
  if (charts) buildCharts(charts);

  if (document.getElementById("buckets")) buildTables();

  var facts = document.querySelector("#facts-table tbody");
  if (facts) buildFacts(facts);

  var factsHead = document.getElementById("facts-line");
  if (factsHead) {
    factsHead.textContent =
      "All portfolio figures below are computed from the holdings ledger as of " + s.asof +
      ". Terms, valuation policy and risk entries are statements of practice, not derived values.";
  }
})();
