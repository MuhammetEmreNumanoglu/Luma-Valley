import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validatePuzzle } from '../src/puzzles/generator';
import { echoId, getPuzzle, TRAIL_LENGTH, trailId } from '../src/puzzles/levels';
import {
  canRotate,
  distanceToSolution,
  E,
  hintTile,
  isSolved,
  N,
  period,
  rotateMask,
  rotateTile,
  S,
  solvedCopy,
  starsFor,
  W,
} from '../src/puzzles/lightpaths';

test('mask rotation and periods', () => {
  assert.equal(rotateMask(N, 1), E);
  assert.equal(rotateMask(N | E, 2), S | W);
  assert.equal(period(N | S), 2);
  assert.equal(period(N | E | S | W), 1);
  assert.equal(period(N | E), 4);
});

test(`all ${TRAIL_LENGTH} trail puzzles are valid: solvable, not pre-solved, not trivial`, () => {
  const sizes = new Set<string>();
  for (let k = 1; k <= TRAIL_LENGTH; k++) {
    const p = getPuzzle(trailId(k));
    assert.equal(validatePuzzle(p), null, `puzzle ${k}`);
    sizes.add(`${p.w}x${p.h}`);
  }
  assert.ok(sizes.size >= 5, 'difficulty curve uses several sizes');
});

test('difficulty grows along the trail (par of later sections is higher)', () => {
  const avg = (a: number, b: number) => {
    let t = 0;
    for (let k = a; k <= b; k++) t += getPuzzle(trailId(k)).par;
    return t / (b - a + 1);
  };
  assert.ok(avg(71, 80) > avg(23, 34));
  assert.ok(avg(23, 34) > avg(1, 10));
});

test('generated puzzles are deterministic', () => {
  const a = JSON.stringify(getPuzzle('lp40'));
  const b = JSON.stringify(getPuzzle('lp40'));
  assert.equal(a, b);
});

test('rotating tiles reaches the solution; fixed tiles do not rotate', () => {
  let p = getPuzzle('lp03');
  let guard = 0;
  while (!isSolved(p) && guard++ < 100) {
    const h = hintTile(p);
    assert.notEqual(h, null);
    p = rotateTile(p, h!);
  }
  assert.ok(isSolved(p));
  const fixed = p.tiles.findIndex((t) => !canRotate(t));
  assert.equal(rotateTile(p, fixed), p);
});

test('hint always moves toward the reference solution', () => {
  for (const k of [7, 25, 50, 80]) {
    const p = getPuzzle(trailId(k));
    const d0 = distanceToSolution(p);
    const after = rotateTile(p, hintTile(p)!);
    assert.equal(distanceToSolution(after), d0 - 1, `puzzle ${k}`);
  }
});

test('wrong colour reaching a target does not count as solved', () => {
  for (let k = 23; k <= 80; k++) {
    const p = solvedCopy(getPuzzle(trailId(k)));
    if (!p.tiles.some((t) => t.color === 1)) continue;
    assert.ok(isSolved(p));
    // Flip every target's colour: the same light now arrives at wrong-coloured targets.
    const swapped = { ...p, tiles: p.tiles.map((t) => (t.kind === 'target' ? { ...t, color: (1 - t.color) as 0 | 1 } : t)) };
    assert.equal(isSolved(swapped), false, `puzzle ${k}`);
    return;
  }
  assert.fail('no two-colour puzzle found');
});

test('stars scale with moves relative to par', () => {
  assert.equal(starsFor(10, 10), 3);
  assert.equal(starsFor(15, 10), 2);
  assert.equal(starsFor(40, 10), 1);
});

test('daily echo puzzles generate for many days and tiers', () => {
  for (let d = 20000; d < 20030; d++) {
    const p = getPuzzle(echoId(d, (d % 7) + 1));
    assert.equal(validatePuzzle(p), null);
  }
});
