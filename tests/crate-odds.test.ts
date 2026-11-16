// Dynamic crate odds (engine/crateOdds.ts): scenarios A–G from the product brief.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { cratePool, cratePoolFor, CRATE_POOL } from '../src/content/progression';
import { CRATE_ODDS, dynamicCrateOdds, familyDemand, familyStock } from '../src/engine/crateOdds';
import { weighted, nextRandom } from '../src/core/rng';
import { parseItem } from '../src/content/families';
import { blank, fresh, put, run, T0 } from './helpers';

const pool = (...fs: string[]) => CRATE_POOL.filter((e) => fs.includes(e.family));
const odds = (fs: string[], stock: Record<string, number>, demand: Record<string, number> = {}) => Object.fromEntries(dynamicCrateOdds(pool(...fs), stock, demand).map((x) => [x.family, x.p]));
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

test('A: equal stock gives ~50/50, and a new game starts 50/50', () => {
  const o = odds(['chicken', 'tomatoFarm'], { chicken: 10, tomatoFarm: 10 });
  assert.ok(Math.abs(o.chicken - 0.5) < 1e-9);
  const start = Object.fromEntries(dynamicCrateOdds(cratePool(1), familyStock(blank())).map((x) => [x.family, x.p]));
  assert.deepEqual(Object.keys(start).sort(), ['cow', 'wheatFarm']);
  assert.ok(Math.abs(start.cow - 0.5) < 1e-9);
});

test('B: 50 eggs vs 5 tomatoes favours tomatoes strongly (~80/20)', () => {
  const o = odds(['chicken', 'tomatoFarm'], { chicken: 50, tomatoFarm: 5 });
  assert.ok(o.tomatoFarm >= 0.75 && o.tomatoFarm <= 0.85, String(o.tomatoFarm));
  assert.ok(Math.abs(sum(o) - 1) < 1e-9);
});

test('C: three families order by scarcity', () => {
  const o = odds(['chicken', 'tomatoFarm', 'wheatFarm'], { chicken: 40, tomatoFarm: 5, wheatFarm: 15 });
  assert.ok(o.tomatoFarm > o.wheatFarm && o.wheatFarm > o.chicken, JSON.stringify(o));
  assert.ok(Math.abs(sum(o) - 1) < 1e-9);
});

test('D: zero stock raises the empty family but never zeroes the other', () => {
  const o = odds(['chicken', 'tomatoFarm'], { chicken: 30 });
  assert.ok(o.tomatoFarm >= 0.75 && o.chicken >= CRATE_ODDS.FLOOR_SHARE / 2 - 1e-9, JSON.stringify(o));
  const extreme = odds(['chicken', 'tomatoFarm'], { chicken: 100000 });
  assert.ok(Math.abs(extreme.chicken - CRATE_ODDS.FLOOR_SHARE / 2) < 1e-9, 'floor holds');
});

test('E: a locked family never drops, whatever the stock', () => {
  let s = blank(); s.level = 1; s.crate.charges = 400;
  s.harvestStock = { 'milk:1': 500, 'wheatCrop:1': 500 };
  for (let i = 0; i < 400; i++) {
    s = run(s, { type: 'openCrate' }, T0 + i).s;
    for (const c of s.board) if (c.t === 'i') assert.ok(['cow', 'wheatFarm'].includes(parseItem(c.k).f));
    s.board = s.board.map(() => ({ t: 'e' as const }));
  }
});

test('F: a newly opened family is not starved in its first session', () => {
  const s = fresh(); s.level = 4;
  s.harvestStock = { 'milk:1': 30, 'wheatCrop:1': 30 };
  const o = Object.fromEntries(dynamicCrateOdds(cratePoolFor(s), familyStock(s), familyDemand(s)).map((x) => [x.family, x.p]));
  assert.ok(o.chicken > 1 / 3, `new chicken family ${o.chicken}`);
});

test('stock counts each place once, weighs levels with a cap, and demand nudges with a cap', () => {
  const s = blank();
  put(s, 0, 'chicken:1'); put(s, 1, 'chicken:3'); put(s, 2, 'chicken:5');
  s.inventory[0] = 'chicken:2'; s.rewardStorage = ['chicken:1']; s.harvestStock = { 'egg:1': 30 };
  assert.equal(familyStock(s).chicken, 1 + 9 + 9 + 3 + 1 + 30);
  const base = odds(['chicken', 'tomatoFarm'], { chicken: 30, tomatoFarm: 30 });
  const asked = odds(['chicken', 'tomatoFarm'], { chicken: 30, tomatoFarm: 30 }, { tomatoFarm: 1000 });
  assert.ok(asked.tomatoFarm > base.tomatoFarm && asked.tomatoFarm < 0.95, 'demand helps, but no guarantee');
});

test('G: 10,000 seeded draws follow the odds and keep stocks from running away', () => {
  // A player who holds whatever drops: stocks start lopsided and the odds pull them together.
  const fams = ['chicken', 'tomatoFarm', 'wheatFarm'];
  const stock: Record<string, number> = { chicken: 60, tomatoFarm: 0, wheatFarm: 20 };
  let rng = 12345;
  const p0 = odds(fams, stock);
  let first = 0;
  for (let i = 0; i < 10000; i++) {
    const o = odds(fams, stock);
    assert.ok(Math.abs(sum(o) - 1) < 1e-9);
    const [r, next] = nextRandom(rng); rng = next;
    const f = weighted(fams.map((x) => ({ value: x, weight: o[x] })), r);
    if (i < 200 && f === 'tomatoFarm') first++;
    stock[f] += 1;
    // The player uses a share of every family over time.
    if (i % 3 === 0) for (const x of fams) stock[x] = Math.max(0, stock[x] - 1);
  }
  assert.ok(first / 200 > p0.chicken, 'the empty family dominates early draws');
  const vals = Object.values(stock), spread = Math.max(...vals) - Math.min(...vals);
  assert.ok(spread <= 70, `stocks converge (spread ${spread}): ${JSON.stringify(stock)}`);
});

test('openCrate stays deterministic and uses one random draw', () => {
  const s = fresh(); s.level = 6; s.crate.charges = 5; s.harvestStock = { 'egg:1': 50, 'tomatoCrop:1': 5 };
  const a = run(s, { type: 'openCrate' }, T0).s, b = run(s, { type: 'openCrate' }, T0).s;
  assert.deepEqual(a.board, b.board);
  assert.equal(a.rng, nextRandom(s.rng)[1]);
});
