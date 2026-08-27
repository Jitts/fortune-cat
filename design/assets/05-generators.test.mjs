// Runnable check for the two generators inside 05-concept-ladder.html.
//   node design/assets/05-generators.test.mjs
// The plate copy quotes real counts (26 rows, 60 line items, one whisker
// per category) — these assertions are what keep those numbers honest.

import { createRequire } from 'module';
const { ledgerMark, moneyCat } = createRequire(import.meta.url)('./05-generators.js');
const eq = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };

const L = ledgerMark();
eq(L.startsWith('<svg') && L.endsWith('</svg>'), 'ledger wrapper');
const rects = (L.match(/<rect /g) || []).length;
eq(rects > 40 && rects < 220, 'ledger row count sane, got ' + rects);
eq(L === ledgerMark(), 'ledger is pure');
eq(/fill="#f0b429"/.test(L) && /fill="#2e2114"/.test(L), 'ledger uses both inks');

const a = moneyCat({ trend: 0.9, balance: 0.8, cats: 5, txns: 0.5 });
const b = moneyCat({ trend: 0.1, balance: 0.2, cats: 3, txns: 0.9 });
eq(a !== b, 'params change the mark');
eq(a === moneyCat({ trend: 0.9, balance: 0.8, cats: 5, txns: 0.5 }), 'moneyCat is pure');
eq((a.match(/M62 72/g) || []).length === 5, 'one whisker per category');
eq((b.match(/M62 72/g) || []).length === 3, 'whiskers follow the count');
eq(/q8 7 16 0/.test(a), 'high trend closes the eyes');
eq(/r="6.5"/.test(b), 'low trend gives the wide-eyed state');
eq((b.match(/ l0 5/g) || []).length === 14, 'tick count tracks transactions');

for (const t of [0, 0.5, 1])
  for (const bl of [0, 1])
    for (const c of [1, 2, 8])
      for (const x of [0, 1]) {
        const s = moneyCat({ trend: t, balance: bl, cats: c, txns: x });
        eq(!/NaN|undefined|Infinity/.test(s), `edge case t=${t} b=${bl} c=${c} x=${x}`);
      }
eq(!/NaN|undefined/.test(L), 'no NaN in ledger');
console.log(`ok — ledger ${rects} bars, moneyCat clean across 36 param combos`);
