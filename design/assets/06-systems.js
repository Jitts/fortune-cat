/* ─────────────────────────────────────────────────────────────────────
   Generators for the second concept set. One silhouette, reused three
   ways: as a field of tally characters, as a guilloche clip, and as a
   thermal-printer dot matrix. Pure functions — same input, same output.
   ───────────────────────────────────────────────────────────────────── */

var LAC = '#2e2114', GOLD = '#f0b429', VERM = '#e4533c', PAPER = '#fbf6ec';

/* The cat, defined once, in a 100x100 box. Everything below samples it. */
function inCat(x, y) {
  if ((x - 50) * (x - 50) + (y - 42) * (y - 42) < 529) return true;      // head r23
  if (y >= 6 && y <= 34) {                                              // ears
    var hw = 15 * ((y - 6) / 28);
    if (Math.abs(x - 34) < hw || Math.abs(x - 66) < hw) return true;
  }
  if (y >= 62 && y <= 94) {                                             // body
    if (Math.abs(x - 50) < 22 + 8 * ((y - 62) / 32)) return true;
  }
  if ((x - 75) * (x - 75) + (y - 64) * (y - 64) < 100) return true;     // raised paw
  return false;
}

/* coverage of one cell, 0..1, on a 3x3 subsample */
function cover(x0, y0, w, h) {
  var hit = 0;
  for (var i = 0; i < 3; i++)
    for (var j = 0; j < 3; j++)
      if (inCat(x0 + w * (i + 0.5) / 3, y0 + h * (j + 0.5) / 3)) hit++;
  return hit / 9;
}

/* ── 01 · 正 ──────────────────────────────────────────────────────────
   Five strokes, drawn in the order they are counted. A cell that has
   reached five prints gold; everything short of five stays lacquer. */
function tallyStrokes(n, x, y, s) {
  var d = [
    'M' + x + ' ' + (y + 0.12 * s) + ' h' + (0.86 * s),               // 一
    'M' + (x + 0.30 * s) + ' ' + (y + 0.12 * s) + ' v' + (0.76 * s),  // 丨
    'M' + (x + 0.30 * s) + ' ' + (y + 0.50 * s) + ' h' + (0.40 * s),  // 一
    'M' + (x + 0.70 * s) + ' ' + (y + 0.50 * s) + ' v' + (0.38 * s),  // 丨
    'M' + x + ' ' + (y + 0.88 * s) + ' h' + (0.86 * s)                // 一
  ];
  return d.slice(0, n).join(' ');
}

function tallyField() {
  var COLS = 15, ROWS = 13, W = 100 / COLS, H = 100 / ROWS, out = [];
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      var x = c * W, y = r * H, cv = cover(x, y, W, H);
      var n = cv === 0 ? 1 : Math.max(1, Math.round(cv * 5));
      var done = n === 5;
      out.push('<path d="' + tallyStrokes(n, x + W * 0.12, y + H * 0.12, W * 0.78) +
               '" stroke="' + (done ? GOLD : LAC) + '" stroke-width="0.5"' +
               ' opacity="' + (cv === 0 ? 0.14 : done ? 1 : (0.3 + 0.12 * n)).toFixed(2) + '"/>');
    }
  }
  return '<g class="ink" fill="none" stroke-linecap="round">' + out.join('') + '</g>';
}

/* ── 04 · Guilloche ───────────────────────────────────────────────────
   An epitrochoid — the curve a rose engine cuts. R/r decides the lobe
   count, a decides how deep they bite. This is the actual maths behind
   the rosette on a share certificate. */
function rosette(R, r, a, cx, cy, scale, steps) {
  var k = (R + r) / r, turns = r, pts = [], i, t, x, y;
  steps = steps || 620;
  for (i = 0; i <= steps; i++) {
    t = turns * 2 * Math.PI * i / steps;
    x = (R + r) * Math.cos(t) - a * Math.cos(k * t);
    y = (R + r) * Math.sin(t) - a * Math.sin(k * t);
    pts.push((cx + x * scale).toFixed(1) + ' ' + (cy + y * scale).toFixed(1));
  }
  return 'M' + pts.join('L');
}

/* ── 05 · Thermal ─────────────────────────────────────────────────────
   A 203dpi head firing on a grid, with the dropout a tired roll gives
   you. Deterministic dropout — a receipt reprints the same. */
function thermalCat(cols, rows, dot) {
  var out = [], c, r, cv, idx = 0, keep;
  for (r = 0; r < rows; r++) {
    for (c = 0; c < cols; c++) {
      cv = cover(c * 100 / cols, r * 100 / rows, 100 / cols, 100 / rows);
      idx++;
      if (cv === 0) continue;
      keep = ((idx * 41) % 17) / 17;                 // stable pseudo-dropout
      if (keep > 0.06 + cv * 0.94) continue;
      out.push('<rect x="' + (c * dot).toFixed(1) + '" y="' + (r * dot).toFixed(1) +
               '" width="' + (dot * 0.82).toFixed(2) + '" height="' + (dot * 0.82).toFixed(2) +
               '" opacity="' + (0.45 + 0.55 * cv).toFixed(2) + '"/>');
    }
  }
  return '<g fill="#2b2a28">' + out.join('') + '</g>';
}

if (typeof module !== 'undefined')
  module.exports = { inCat: inCat, cover: cover, tallyField: tallyField,
                     tallyStrokes: tallyStrokes, rosette: rosette, thermalCat: thermalCat };
