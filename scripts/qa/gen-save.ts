// QA helper: plays the real engine with the autoplay bot until a target region is open and writes
// a valid save envelope (same format as the app) for screenshot runs and save-compat checks.
import { writeFileSync } from 'node:fs';

import { apply } from '../../src/engine/commands';
import { newGame } from '../../src/engine/state';
import type { Command } from '../../src/engine/commands';
import type { GameState } from '../../src/engine/types';
import { encode } from '../../src/persistence/save';
import { autoplayStep } from '../autoplay';

const target = Number(process.argv[2] ?? 3);
const out = process.argv[3] ?? 'qa-save.txt';
const end = Date.now() - 60_000;
let now = end - 25 * 86_400_000;
let s: GameState = newGame(now, 7, 0);
s.flags.introDone = true;
let steps = 0;
while (!s.regions.includes(target) && steps < 200_000 && now < end) {
  const cmd: Command = autoplayStep(s, now);
  s = apply(s, cmd, now).state;
  now += cmd.type === 'tick' ? 60_000 : 2_000;
  steps++;
}
s.flags.introDone = true;
writeFileSync(out, encode(s, 1, now));
console.log(JSON.stringify({ steps, regions: s.regions, quests: s.quests.done.length, level: s.level }));
