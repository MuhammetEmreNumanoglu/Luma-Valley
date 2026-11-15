/** Model free play, a purchase with earned tokens, and the isolated dev pass. No real-money or saved state. */
import { apply, type Command } from '../src/engine/commands';
import { newGame } from '../src/engine/state';
import { freeSeasonLevel } from '../src/premium/season';
import { MockPurchaseProvider, newDemo, seasonLevel } from '../src/premium/mock';
import { autoplayStep } from './autoplay';
const DAY = 86400000;
const minutes = Number(process.argv[2] ?? 30);
const seeds = (process.argv[3] ?? '7,11,23').split(',').map(Number);
const cost = (c: Command) => c.type === 'tap' ? 1.2 : c.type === 'move' ? 2.2 : c.type === 'completeQuest' ? 12 : c.type === 'solvePuzzle' ? 45 : 2;
for (const variant of ['free-no-purchase', 'free-earned-purchase', 'dev-premium-mock'] as const) for (const seed of seeds) {
  let s = newGame(0, seed, 0); s.flags.introDone = true;
  const demoBase = newDemo(0, s.stats);
  const demoResult = new MockPurchaseProvider(true).purchase(demoBase, 'pass.moon', `test-${seed}`, 'success');
  if (!demoResult.ok) throw new Error(demoResult.reason);
  const demo = demoResult.state;
  let purchaseDay: number | null = null;
  const snapshots = [];
  const daily: number[][] = [];
  for (let day = 1; day <= 30; day++) {
    const before = [s.stats.merges, s.stats.orders, s.stats.produced, s.stats.cleared, s.crate.opens];
    for (const hour of [8, 14, 20]) {
      let now = (day - 1) * DAY + hour * 3600000;
      s = apply(s, { type: 'tick' }, now).state;
      let used = 0, idle = 0;
      while (used < minutes * 20) {
        // Buy once using only previously earned light tokens; no developer grant or mock money.
        let cmd: Command;
        if (variant === 'free-earned-purchase' && purchaseDay === null && s.starTokens >= 20 && s.energy <= 969) cmd = { type: 'buyConvenience', id: 'energy30', requestId: `earned-${seed}` };
        else cmd = autoplayStep(s, now);
        if (cmd.type === 'tick') { if (++idle > 2) break; now += 30000; s = apply(s, cmd, now).state; continue; }
        const result = apply(s, cmd, now);
        if (result.events.some(e => e.type === 'denied')) { if (++idle > 2) break; now += 30000; continue; }
        s = result.state; if (cmd.type === 'buyConvenience') purchaseDay = day;
        used += cost(cmd); now += cost(cmd) * 1000; idle = 0;
      }
    }
    daily.push([s.stats.merges, s.stats.orders, s.stats.produced, s.stats.cleared, s.crate.opens].map((v, i) => v - before[i]));
    if ([1, 3, 7, 14, 21, 30].includes(day)) snapshots.push({ day, level: s.level, freeXp: s.freeSeason.xp, freeLevel: freeSeasonLevel(s.freeSeason), purchaseProgress: s.freeSeason.progress['season:purchase'], purchaseClaimed: s.freeSeason.claimedTasks.includes('season:purchase'), devMockLevel: variant === 'dev-premium-mock' ? seasonLevel(demo, s.stats) : null, devPremium: variant === 'dev-premium-mock' && demo.season.premium });
  }
  const avg = (from: number, to: number) => daily.slice(from, to).reduce((a, d) => a.map((v, i) => v + d[i] / (to - from)), [0, 0, 0, 0, 0]).map(Math.round);
  console.log(JSON.stringify({ minutes, seed, variant, purchaseDay, perDay: { 'merges/orders/produced/cleared/crates days1-7': avg(0, 7), 'days8-30': avg(7, 30) }, snapshots }));
}
