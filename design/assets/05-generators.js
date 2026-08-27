/* ─────────────────────────────────────────────────────────────────────
   Two of the five plates have no cat drawn in them. They have a cat
   DEFINED — as geometry — and the marks below are what that geometry
   prints. Both functions are pure: same input, same path data, every
   time, so nothing on this page jitters when it re-renders.
   ───────────────────────────────────────────────────────────────────── */

var LAC = '#2e2114', GOLD = '#f0b429', VERM = '#e4533c', PAPER = '#fbf6ec';

/* ── 02 · Ledger ──────────────────────────────────────────────────────
   The silhouette is sampled on a 6.6px pitch and every scanline is
   emitted as a statement row: a long bar for the payee, a short
   right-aligned bar for the amount. Nothing traces an outline. */
function ledgerMark() {
  var CX = 118, CY = 76, R = 42, out = [];

  function bar(x, y, w, fill) {
    return '<rect x="' + r2(x) + '" y="' + r2(y) + '" width="' + r2(w) +
           '" height="4" rx="2" fill="' + fill + '"/>';
  }

  for (var y = 14; y <= 182; y += 6.6) {
    var segs = [], d, hw;

    d = R * R - (y - CY) * (y - CY);                       // head
    if (d > 0) { d = Math.sqrt(d); segs.push([CX - d, CX + d]); }

    if (y >= 12 && y <= 50) {                              // two ears
      hw = 27 * ((y - 12) / 38);
      segs.push([82 - hw, 82 + hw]);
      segs.push([154 - hw, 154 + hw]);
    }

    if (y >= 114) {                                        // body
      hw = 40 + 16 * ((y - 114) / 68);
      segs.push([CX - hw, CX + hw]);
    }

    d = 17 * 17 - (y - 110) * (y - 110);                   // raised paw
    if (d > 0) { d = Math.sqrt(d); segs.push([168 - d, 168 + d]); }

    segs.sort(function (a, b) { return a[0] - b[0]; });
    var merged = [];
    for (var i = 0; i < segs.length; i++) {
      var last = merged[merged.length - 1];
      if (last && segs[i][0] <= last[1] + 1) last[1] = Math.max(last[1], segs[i][1]);
      else merged.push([segs[i][0], segs[i][1]]);
    }

    for (var j = 0; j < merged.length; j++) {
      var x0 = merged[j][0], x1 = merged[j][1], w = x1 - x0;
      if (w < 3) continue;
      if (w < 26) {
        out.push(bar(x0, y, w, LAC));
      } else {
        out.push(bar(x0, y, w - 15, LAC));
        out.push(bar(x1 - 11, y, 11, GOLD));
      }
    }
  }

  return '<svg width="330" height="264" viewBox="0 0 250 200" role="img"' +
         ' aria-label="A fortune cat assembled out of bank-statement rows">' +
         '<g class="ink">' + out.join('') + '</g>' +
         '<g fill="' + PAPER + '"><ellipse cx="118" cy="88" rx="22" ry="14"/></g>' +
         '<g class="ink" fill="none" stroke="' + LAC + '" stroke-width="3" stroke-linecap="round">' +
           '<path d="M96 66 q8 7 16 0"/><path d="M124 66 q8 7 16 0"/>' +
           '<path d="M114 81 l8 0 l-4 5 z" fill="' + LAC + '" stroke="none"/>' +
           '<path d="M110 90 q8 6 16 0"/>' +
         '</g></svg>';
}

/* ── 05 · Your Cat ────────────────────────────────────────────────────
   Every limb is bound to a number the app already holds. trend and
   balance arrive 0..1; cats is a count; txns is 0..1. */
function moneyCat(p) {
  var CX = 96, t = p.trend, b = p.balance;
  var hw1 = 26 + 16 * b, hw2 = 34 + 22 * b;
  var apexX = 58 + 12 * t, apexY = 30 - 20 * t;
  var s = [], i, j, k;

  s.push('<g class="ink" fill="' + VERM + '"><path d="M' + r2(CX - hw1) + ' 95 L' +
         r2(CX + hw1) + ' 95 L' + r2(CX + hw1 - 4) + ' 106 L' + r2(CX - hw1 + 4) + ' 106 Z"/></g>');

  var pts = [], x0 = CX + hw2 - 2;
  for (j = 0; j < 8; j++) {
    var v = clamp(0.45 + (t - 0.5) * 0.85 * (j / 7) + 0.12 * Math.sin(j * 1.9 + p.cats), 0, 1);
    pts.push(r2(x0 + j * (58 / 7)) + ' ' + r2(146 - v * 34));
  }
  s.push('<g class="ink" fill="none" stroke="' + GOLD + '" stroke-width="7"' +
         ' stroke-linecap="round" stroke-linejoin="round"><path d="M' + pts.join(' L') + '"/></g>');

  var gold = [];
  gold.push('<polygon points="68,42 ' + r2(apexX) + ',' + r2(apexY) + ' 94,32"/>');
  gold.push('<polygon points="124,42 ' + r2(192 - apexX) + ',' + r2(apexY) + ' 98,32"/>');
  gold.push('<path d="M' + r2(CX - hw1) + ' 96 L' + r2(CX + hw1) + ' 96 C' +
            r2(CX + hw2) + ' 116 ' + r2(CX + hw2) + ' 138 ' + r2(CX + hw2) + ' 154 L' +
            r2(CX - hw2) + ' 154 C' + r2(CX - hw2) + ' 138 ' + r2(CX - hw2) + ' 116 ' +
            r2(CX - hw1) + ' 96 Z"/>');
  gold.push('<circle cx="96" cy="66" r="36"/>');
  s.push('<g class="ink" fill="' + GOLD + '">' + gold.join('') + '</g>');

  var wh = [];
  for (i = 0; i < p.cats; i++) {
    var a = (-14 + 28 * (p.cats === 1 ? 0.5 : i / (p.cats - 1))) * Math.PI / 180;
    var dx = 24 * Math.cos(a), dy = 24 * Math.sin(a);
    wh.push('<path d="M62 72 L' + r2(62 - dx) + ' ' + r2(72 + dy) + '"/>');
    wh.push('<path d="M130 72 L' + r2(130 + dx) + ' ' + r2(72 + dy) + '"/>');
  }
  s.push('<g class="ink" fill="none" stroke="' + LAC + '" stroke-width="1.2"' +
         ' stroke-linecap="round" opacity="0.42">' + wh.join('') + '</g>');

  var ticks = [], n = Math.round(p.txns * 16), span = Math.max(1, Math.round(2 * hw2 - 12));
  for (k = 0; k < n; k++) {
    ticks.push('<path d="M' + r2(CX - hw2 + 6 + ((k * 37) % span)) + ' ' +
               r2(108 + ((k * 53) % 42)) + ' l0 5"/>');
  }
  s.push('<g class="ink" fill="none" stroke="' + LAC + '" stroke-width="1.5"' +
         ' stroke-linecap="round" opacity="0.4">' + ticks.join('') + '</g>');

  s.push('<g fill="' + PAPER + '"><ellipse cx="96" cy="80" rx="18" ry="11.5"/></g>');

  var eyes;
  if (t > 0.58)      eyes = '<path d="M72 60 q8 7 16 0"/><path d="M104 60 q8 7 16 0"/>';
  else if (t > 0.4)  eyes = '<circle cx="80" cy="62" r="3.4" fill="' + LAC + '"/>' +
                            '<circle cx="112" cy="62" r="3.4" fill="' + LAC + '"/>';
  else               eyes = '<circle cx="80" cy="62" r="6.5"/><circle cx="112" cy="62" r="6.5"/>' +
                            '<circle cx="80" cy="62" r="2.2" fill="' + LAC + '"/>' +
                            '<circle cx="112" cy="62" r="2.2" fill="' + LAC + '"/>';

  s.push('<g class="ink" fill="none" stroke="' + LAC + '" stroke-width="3" stroke-linecap="round">' +
         eyes + '<path d="M92 74 l8 0 l-4 5 z" fill="' + LAC + '" stroke="none"/>' +
         '<path d="M88 83 q8 6 16 0" stroke-width="2.2"/></g>');

  return '<svg width="200" height="150" viewBox="0 0 240 180" role="img" aria-label="' +
         (p.label || 'A cat derived from one month of cash flow') + '">' + s.join('') + '</svg>';
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function r2(n) { return Math.round(n * 100) / 100; }

if (typeof module !== 'undefined') module.exports = { ledgerMark: ledgerMark, moneyCat: moneyCat };
