import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hurryCost, HURRY } from '../src/content/hurry';
import { makeResource } from '../src/engine/resources';
import { blank, run, T0 } from './helpers';
import { decode, encode } from '../src/persistence/save';

test('hurry prices decline with remaining time', () => {
  assert.equal(hurryCost(T0 + 60001, T0), 2);
  assert.equal(hurryCost(T0 + 60000, T0), 1);
  assert.equal(hurryCost(T0, T0), 0);
});
test('exchange is funded; completion spends once and survives reload', () => {
  let s = blank(); s.leaves = HURRY.coinsPerToken; s.energy = 100;
  s.board[24] = makeResource('stone', 1);
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  const command = { type: 'hurry' as const, target: { kind: 'resource' as const, cell: 24 }, maxCost: 1, expectedReadyAt: T0 + 60_000, area: 0 };
  assert.equal(run(s, command, T0).s, s);
  s = run(s, { type: 'exchangeHurryToken' }, T0).s;
  assert.equal(s.leaves, 0); assert.equal(s.hurryTokens, 1);
  assert.equal(run(s, { type: 'exchangeHurryToken' }, T0).s, s);
  s = run(s, command, T0).s;
  assert.equal(s.hurryTokens, 0);
  assert.equal(run(s, command, T0).s, s);
  const loaded = decode(encode(s, 1, T0))!.state;
  assert.equal(loaded.hurryTokens, 0);
  const claimed = run(loaded, { type: 'claimResource', cell: 24 }, T0).s;
  assert.notEqual(claimed, loaded);
  assert.equal(run(claimed, { type: 'claimResource', cell: 24 }, T0).s, claimed);
});


test('a stale confirmation cannot hurry a replacement job or a different area', () => {
  let s = blank(); s.energy = 100; s.hurryTokens = 2;
  s.board[24] = makeResource('stone', 1);
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  const command = { type: 'hurry' as const, target: { kind: 'resource' as const, cell: 24 }, maxCost: 1, expectedReadyAt: T0 + 60_000, area: 1 };
  assert.equal(run(s, command, T0).s, s);
  assert.equal(run(s, { ...command, area: 0, expectedReadyAt: T0 + 30_000 }, T0).s, s);
  assert.equal(s.hurryTokens, 2);
});

test('missing tokens are bought and the job finishes atomically after confirmation', () => {
  let s = blank(); s.energy = 100; s.leaves = 100; s.hurryTokens = 1;
  s.board[24] = { ...makeResource('stone', 1), stage: 1 };
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  const cell = s.board[24]; assert.ok(cell.t === 'r');
  const gold = 4 * HURRY.coinsPerToken;
  const cmd = { type: 'hurry' as const, target: { kind: 'resource' as const, cell: 24 }, maxCost: 5, maxGold: gold, expectedReadyAt: cell.readyAt, area: 0 };
  assert.equal(run(s, { ...cmd, maxGold: gold - 1 }, T0).s, s);
  const insufficient = { ...s, leaves: gold - 1 };
  assert.equal(run(insufficient, cmd, T0).s, insufficient);
  const finished = run(s, cmd, T0).s;
  assert.equal(finished.leaves, 100 - gold);
  assert.equal(finished.hurryTokens, 0);
  assert.ok(finished.board[24].t === 'r' && finished.board[24].readyAt === T0);
  assert.equal(run(finished, cmd, T0).s, finished);
  const saved = decode(encode(finished, 1, T0))!.state;
  assert.equal(saved.leaves, 100 - gold);
  const claimed = run(saved, { type: 'claimResource', cell: 24 }, T0).s;
  assert.notEqual(claimed, saved);
  assert.equal(run(claimed, { type: 'claimResource', cell: 24 }, T0).s, claimed);
});

test('if time passes after quoting only the current lower price is charged', () => {
  let s = blank(); s.energy = 100; s.leaves = 100;
  s.board[24] = { ...makeResource('stone', 1), stage: 1 };
  s = run(s, { type: 'breakResource', cell: 24 }, T0).s;
  const cell = s.board[24]; assert.ok(cell.t === 'r');
  const cmd = { type: 'hurry' as const, target: { kind: 'resource' as const, cell: 24 }, maxCost: 5, maxGold: 100, expectedReadyAt: cell.readyAt, area: 0 };
  assert.equal(run(s, cmd, T0 + 60_000).s.leaves, 100 - 4 * HURRY.coinsPerToken);
});
