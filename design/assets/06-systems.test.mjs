// Runnable check for the generators inside 06-borrowed-systems.html.
//   node design/assets/06-systems.test.mjs
// One silhouette feeds three plates, so if inCat() drifts, all three break
// at once. These assertions are what stop that being silent.

import { createRequire } from 'module';
const g = createRequire(import.meta.url)('./06-systems.js');
const eq = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };

// the silhouette has to actually be a cat: head solid, ear tufts clear of
// the skull, a gap between the ears, and empty corners.
eq(g.inCat(50, 42), 'head centre is solid');
eq(!g.inCat(2, 2) && !g.inCat(98, 98), 'corners are empty');
eq(g.inCat(34, 30) && g.inCat(66, 30), 'both ears present');
eq(!g.inCat(50, 12), 'gap between the ears');
eq(g.inCat(50, 90), 'body reaches the base');
eq(g.inCat(75, 64), 'raised paw');

// coverage must be monotone-ish: fully inside = 1, fully outside = 0
eq(g.cover(45, 38, 6, 6) === 1, 'cell inside the head is full');
eq(g.cover(0, 0, 6, 6) === 0, 'cell in the corner is empty');

const t = g.tallyField();
eq(t.startsWith('<g') && t.endsWith('</g>'), 'tally wrapper');
eq((t.match(/<path /g) || []).length === 15 * 13, 'one glyph per cell');
eq(t.includes('#f0b429') && t.includes('#2e2114'), 'completed tallies print gold');
eq(t === g.tallyField(), 'tally field is pure');
for (let n = 1; n <= 5; n++)
  eq((g.tallyStrokes(n, 0, 0, 10).match(/M/g) || []).length === n, `${n} strokes for ${n}`);

const ros = g.rosette(8, 3, 5, 50, 50, 3);
eq(ros.startsWith('M') && !/NaN/.test(ros), 'rosette path is clean');
const head = ros.slice(1).split('L')[0].split(' ').map(Number);
const tail = ros.split('L').pop().split(' ').map(Number);
eq(Math.hypot(head[0] - tail[0], head[1] - tail[1]) < 0.5, 'rosette closes on itself');

const th = g.thermalCat(46, 34, 4);
eq(/^<g fill/.test(th) && !/NaN/.test(th), 'thermal wrapper');
const dots = (th.match(/<rect /g) || []).length;
eq(dots > 250 && dots < 1100, 'thermal dot count sane, got ' + dots);
eq(th === g.thermalCat(46, 34, 4), 'thermal dropout is deterministic');

console.log(`ok — 195 tally cells, rosette closes, ${dots} thermal dots`);
