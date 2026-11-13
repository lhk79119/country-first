// Normalizes raw.json with the extension's own norm() and writes data.js (curated) and data-x.js (translations).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
globalThis.self = globalThis;
self.COUNTRIES = {};
require(path.join(ROOT, 'common.js'));
const { LOCALES, nameOf, nameVariants } = self.CF;
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'raw.json'), 'utf8'));
const codes = Object.keys(raw);
const codeSet = new Set(codes.flatMap(c => [c, raw[c].a3]));

const curated = new Map(), intl = new Map();
const add = (m, v, c) => (m.get(v) || m.set(v, new Set()).get(v)).add(c);
const strong = {}, weak = {};
for (const c of codes) {
  strong[c] = new Set(raw[c].names.flatMap(nameVariants));
  weak[c] = new Set(raw[c].weak.flatMap(nameVariants).filter(v => !strong[c].has(v)));
  for (const v of [...strong[c], ...weak[c]]) add(curated, v, c);
  for (const n of [...raw[c].names, ...raw[c].weak])
    if (/^[A-Z]{2,3}$/.test(n) && codeSet.has(n) && n !== c && n !== raw[c].a3) console.log('WARN alias is another ISO code:', c, n);
  for (const l of LOCALES) for (const v of nameVariants(nameOf(c, l))) add(intl, v, c);
  for (const v of nameVariants(nameOf(c, 'en', 'short'))) add(intl, v, c);
}
for (const [v, s] of curated) {
  if (s.size > 1) console.log('WARN curated collision:', JSON.stringify(v), [...s].join(','));
  const o = intl.get(v);
  if (o && [...o].some(c => !s.has(c))) console.log('NOTE curated vs Intl:', JSON.stringify(v), [...s].join(','), 'intl', [...o].join(','));
}

const autoOwners = new Map();
const auto = {};
for (const c of codes) {
  auto[c] = new Set(raw[c].auto.flatMap(nameVariants));
  for (const v of auto[c]) add(autoOwners, v, c);
}
let kept = 0, dropped = 0;
const X = {};
for (const c of codes) {
  const out = [];
  for (const v of auto[c]) {
    const cur = curated.get(v), it = intl.get(v);
    if (cur?.has(c) || (it?.has(c) && it.size === 1)) continue;
    if (cur || (it && !it.has(c)) || autoOwners.get(v).size > 1 || v.length < 2) { dropped++; continue; }
    out.push(v); kept++;
  }
  if (out.length) X[c] = out;
}
const D = {};
for (const c of codes) D[c] = [raw[c].a3, raw[c].num, raw[c].tel, raw[c].show, [...strong[c]], [...weak[c]]];
fs.writeFileSync(path.join(ROOT, 'data.js'), 'self.COUNTRIES=' + JSON.stringify(D) + ';\n');
fs.writeFileSync(path.join(ROOT, 'data-x.js'), 'self.COUNTRIES_X=' + JSON.stringify(X) + ';\n');
console.log('curated names', curated.size, 'auto kept', kept, 'dropped', dropped);
