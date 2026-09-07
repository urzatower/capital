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

function xScale(series) {
  var pts = series || DATA.series;
  var t0 = Date.parse(pts[0][0]), t1 = Date.parse(pts[pts.length - 1][0]);
  var span = t1 - t0 || 1;
  return function (d) { return PAD.l + ((Date.parse(d) - t0) / span) * (W - PAD.l - PAD.r); };
}

// Attaches crosshair tracking to a plot. series index list tells the tracker
// which columns to mark with a dot and how to write the readout.
function track(svg, H, x, ys, cols, readout, fmt, series) {
  var pts = series || DATA.series;
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
  var pts = DATA.series;                 /* date, nav, cost, unreal%, priced, held, twr% */
  var x = xScale();
  var years = ["2025-01-01", "2026-01-01"];
  var FAINT = "#c9c9c9";

  var seg = function (ys, idx, from, to) {
    var a = from == null ? 0 : from, b = to == null ? pts.length - 1 : to;
    return pts.slice(a, b + 1).map(function (p, i) {
      return (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + ys(p[idx]).toFixed(1);
    }).join(" ");
  };

  /* The first stretch of the book had nothing the price feed covered, so it sits
     at cost by necessity. It is drawn faint and excluded from the return, rather
     than presented as a flat zero that later falls off a cliff. */
  var cov = 0;
  while (cov < pts.length - 1 && pts[cov][4] === 0) { cov++; }
  var covered = cov > 0 && cov < pts.length;

  function ruleAt(svg, H) {
    if (!covered) return;
    var px = x(pts[cov][0]);
    svg.appendChild(el("line", { x1: px, x2: px, y1: PAD.t, y2: H - PAD.b,
                                 stroke: "#bbb", "stroke-width": "1", "stroke-dasharray": "2 3" }));
    svg.appendChild(el("text", { x: px + 5, y: PAD.t + 9, "text-anchor": "start", style: AXIS },
                       "first mark"));
  }
  function split(svg, ys, idx, colour) {
    if (covered) {
      svg.appendChild(el("path", { d: seg(ys, idx, 0, cov), fill: "none", stroke: FAINT, "stroke-width": "1.5" }));
      svg.appendChild(el("path", { d: seg(ys, idx, cov), fill: "none", stroke: colour, "stroke-width": "1.5" }));
    } else {
      svg.appendChild(el("path", { d: seg(ys, idx), fill: "none", stroke: colour, "stroke-width": "1.5" }));
    }
  }
  function ticks(lo, hi, want) {
    var step = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200].filter(
      function (t) { return (hi - lo) / t <= want; })[0] || 500;
    var out = [];
    for (var v = Math.floor(lo / step) * step; v <= hi + 1e-9; v += step) { out.push(Math.round(v * 100) / 100); }
    return out;
  }
  var last = pts[pts.length - 1];

  /* Exhibit 1 - NAV against cost */
  var H1 = 440;
  var navMax = Math.max.apply(null, pts.map(function (p) { return Math.max(p[1], p[2]); })) * 1.05;
  var yNav = function (v) { return H1 - PAD.b - (v / navMax) * (H1 - PAD.t - PAD.b); };

  label(mount, "Exhibit", 1, "Assets under management against cumulative subscriptions, USD");
  var r1 = tag("p", "readout");
  mount.appendChild(r1);
  var box1 = tag("div", "plot");
  var s1 = el("svg", { viewBox: "0 0 " + W + " " + H1, role: "img", tabindex: "0",
                       "aria-label": "Net asset value against invested capital. Use arrow keys to step through observations." });
  ticks(0, navMax, 5).forEach(function (v) {
    s1.appendChild(el("line", { x1: PAD.l, x2: W - PAD.r, y1: yNav(v), y2: yNav(v), stroke: "#eee", "stroke-width": "1" }));
    s1.appendChild(el("text", { x: PAD.l - 6, y: yNav(v) + 3, "text-anchor": "end", style: AXIS },
                       v >= 1000 ? (v / 1000) + "k" : String(v)));
  });
  years.forEach(function (d) {
    s1.appendChild(el("text", { x: x(d), y: H1 - PAD.b + 16, "text-anchor": "middle", style: AXIS }, d.slice(0, 4)));
  });
  ruleAt(s1, H1);
  s1.appendChild(el("path", { d: seg(yNav, 2), fill: "none", stroke: "#999", "stroke-width": "1", "stroke-dasharray": "4 3" }));
  split(s1, yNav, 1, "#111");
  s1.appendChild(el("text", { x: W - PAD.r, y: yNav(last[1]) - 6, "text-anchor": "end", style: AXIS_DARK }, "AUM " + usd(last[1])));
  s1.appendChild(el("text", { x: W - PAD.r, y: yNav(last[2]) + 14, "text-anchor": "end", style: AXIS }, "subscribed " + usd(last[2])));
  box1.appendChild(s1);
  mount.appendChild(box1);
  track(s1, H1, x, [yNav, yNav], [1, 2], r1, function (p) {
    return p[0] + "   AUM " + usd(p[1]) + "   subscribed " + usd(p[2]) +
           "   " + (p[4] ? p[4] + " of " + p[5] + " positions marked" : "all positions at cost");
  });
  mount.appendChild(tag("p", "note",
    "AUM solid, cumulative subscriptions dashed. One point per date the price feed actually observed a " +
    "holding, back to " + pts[0][0] + ". A position is valued at the latest observed sale price on or before " +
    "each date, at cost on the day it was bought, and at cost throughout if the feed never covered it. " +
    (covered ? "Nothing in the book was covered before " + pts[cov][0] + ", so that stretch is drawn faint." : "")));

  /* Exhibit 2 - the two returns, money-weighted and time-weighted */
  var H2 = 380;
  var both = pts.map(function (p) { return p[3]; }).concat(pts.map(function (p) { return p[6]; }));
  var tT = ticks(Math.min.apply(null, both.concat(0)), Math.max.apply(null, both.concat(0)) * 1.06, 5);
  var tMin = tT[0], tMax = tT[tT.length - 1];
  var yR = function (v) { return H2 - PAD.b - ((v - tMin) / (tMax - tMin)) * (H2 - PAD.t - PAD.b); };

  label(mount, "Exhibit", 2, "NAV per unit, base 100 at inception, against the investor return");
  var r2 = tag("p", "readout");
  mount.appendChild(r2);
  var box2 = tag("div", "plot");
  var s2 = el("svg", { viewBox: "0 0 " + W + " " + H2, role: "img", tabindex: "0",
                       "aria-label": "Money-weighted and time-weighted return. Use arrow keys to step through observations." });
  tT.forEach(function (v) {
    s2.appendChild(el("line", { x1: PAD.l, x2: W - PAD.r, y1: yR(v), y2: yR(v),
                                stroke: v === 0 ? "#ccc" : "#eee", "stroke-width": "1" }));
    s2.appendChild(el("text", { x: PAD.l - 6, y: yR(v) + 3, "text-anchor": "end", style: AXIS }, v + "%"));
  });
  years.forEach(function (d) {
    s2.appendChild(el("text", { x: x(d), y: H2 - PAD.b + 16, "text-anchor": "middle", style: AXIS }, d.slice(0, 4)));
  });
  ruleAt(s2, H2);
  s2.appendChild(el("path", { d: seg(yR, 6), fill: "none", stroke: "#999", "stroke-width": "1", "stroke-dasharray": "4 3" }));
  split(s2, yR, 3, "#111");
  s2.appendChild(el("text", { x: W - PAD.r, y: yR(last[6]) - 6, "text-anchor": "end", style: AXIS },
                     "NAV per unit " + (100 + last[6]).toFixed(1)));
  s2.appendChild(el("text", { x: W - PAD.r, y: yR(last[3]) + 14, "text-anchor": "end", style: AXIS_DARK },
                     "investor return " + pct(last[3])));
  box2.appendChild(s2);
  mount.appendChild(box2);
  track(s2, H2, x, [yR, yR], [3, 6], r2, function (p) {
    return p[0] + "   NAV per unit " + (100 + p[6]).toFixed(1) + "   investor return " + pct(p[3]) +
           "   subscriptions " + usd(p[2]);
  });
  mount.appendChild(tag("p", "note",
    "Investor return solid, NAV per unit dashed, both read on the same scale as a percentage from base. " +
    "NAV per unit is the fund measure: it chains each period's return on the positions marked at both ends " +
    "of it and ignores how much money was in at the time, so it stands at " + (100 + DATA.summary.twr_pct).toFixed(1) +
    " against 100 at inception. The investor return is money-weighted, the gain on capital actually at risk, " +
    "and annualises to " + pct(DATA.summary.mwr_irr_pct) + ". The gap between the two lines is the whole story " +
    "of this book. Average capital at risk over the period was " + usd(DATA.summary.avg_capital) + " against " +
    usd(DATA.summary.invested) + " subscribed today, and most of that arrived after May 2026, so the early " +
    "doubling happened on a position too small to move the money. A fund reports both for exactly this reason."));
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

  document.querySelector("#holdings-title span").textContent =
    "Holdings, all " + s.positions + " positions. An asterisk marks a position the price feed does not cover, carried at cost";

  var ht = document.querySelector("#holdings tbody");
  DATA.holdings.forEach(function (r) {
    var tr = document.createElement("tr");
    tr.appendChild(cell(r[7] === false ? r[0] + " *" : r[0]));
    tr.appendChild(cell(r[1]));
    tr.appendChild(cell(String(r[2]), "num"));
    tr.appendChild(cell(usd(r[3]), "num"));
    tr.appendChild(cell(usd(r[4]), "num"));
    tr.appendChild(cell(r[7] === false ? "at cost" : pct(r[5]), "num"));
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
  factsRow(tb, "Positions marked to market", s.marked + " of " + s.positions);
  factsRow(tb, "Positions above cost", k.above + " of " + s.marked + " marked");
  factsRow(tb, "Most recent acquisition", k.lastBuy);

  factsGroup(tb, "Terms");
  factsRow(tb, "Outside capital", "None accepted");
  factsRow(tb, "Management fee", "None");
  factsRow(tb, "Performance fee", "None");
  factsRow(tb, "Leverage", "None");
  factsRow(tb, "Redemptions", "Not offered");
  factsRow(tb, "Custody", "Self custody, sealed storage");

  factsGroup(tb, "Valuation");
  factsRow(tb, "Marks", "Observed marketplace sale prices only");
  factsRow(tb, "Coverage", s.marked + " of " + s.positions + " positions, " + wgt(s.marked_pct) + " of cost basis");
  factsRow(tb, "Unpriced positions", "Carried at cost, never estimated");
  factsRow(tb, "Frequency", "Daily price collection, marked on refresh");
  factsRow(tb, "Cost basis", "All-in order cost, after discount and tax");
  factsRow(tb, "Excluded inputs", "Asking prices, dealer bids, single outlier listings");
  factsRow(tb, "Intramonth path", "None. Month ends only, valued at the latest observation on or before each date");

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
      ". NAV per unit " + (100 + s.twr_pct).toFixed(1) + " against 100 at inception " + s.inception +
      "; investor return " + pct(s.mwr_pct) + ", " + pct(s.mwr_irr_pct) + " a year, on average capital at " +
      "risk of " + usd(s.avg_capital) + ". " + s.positions + " positions and " + k.units +
      " sealed units across " + DATA.buckets.length + " strategy buckets. First acquisition " + s.first_acq +
      ". " + s.marked + " of " + s.positions + " positions, " + wgt(s.marked_pct) +
      " of cost basis, are marked to observed sale prices; the rest are carried at cost.";
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
