// Contextual tutorial: each hint appears once, only when its system is actually usable, and is
// stored in the save (`state.tutorial`). Pure; the UI decides where to draw it.
import { QUEST } from '../content/quests';
import { isCollectible } from '../content/progression';
import { canComplete } from './quests';
import type { GameState } from './types';

export type TutorialStep = 'merge' | 'crate' | 'crateMerge' | 'resource' | 'quest' | 'collection' | 'level' | 'order' | 'valley';

export const TUTORIAL_STEPS: readonly TutorialStep[] = ['merge', 'crate', 'crateMerge', 'resource', 'quest', 'collection', 'level', 'order', 'valley'];

/** Where the hint is drawn: the board, the map or any screen (tab bar / HUD targets). */
export const TUTORIAL_SCREEN: Record<TutorialStep, 'board' | 'map' | 'any'> = {
  merge: 'board',
  crate: 'board',
  crateMerge: 'board',
  resource: 'board',
  quest: 'any',
  collection: 'any',
  level: 'any',
  order: 'board',
  valley: 'any',
};

export function tutorialDone(s: GameState, step: TutorialStep): boolean {
  return s.tutorial.skipped || s.tutorial.done.includes(step);
}

export function unclaimedCollection(s: GameState): number {
  let n = 0;
  for (const k of s.discovered) if (isCollectible(k) && !s.collected.includes(k)) n++;
  return n;
}

function relevant(s: GameState, step: TutorialStep): boolean {
  const done = (x: TutorialStep) => s.tutorial.done.includes(x);
  switch (step) {
    case 'merge':
      return s.stats.merges === 0 || !!s.tutorial.replay;
    case 'crate':
      return done('merge') && (s.crate.opens === 0 || !!s.tutorial.replay) && s.crate.charges > 0;
    case 'crateMerge':
      return done('crate');
    case 'resource':
      return done('crateMerge') && s.board.some((c) => c.t === 'r' && c.readyAt === 0) && s.energy >= 5;
    case 'quest':
      return done('crateMerge') && !s.quests.done.includes('r1_light') && canComplete(s, QUEST.r1_light);
    case 'collection':
      return done('crateMerge') && unclaimedCollection(s) > 0;
    case 'level':
      return s.level >= 2;
    case 'order':
      return s.orders.length > 0 && s.stats.orders === 0;
    case 'valley':
      // After the first restoration: the valley is where the story happens.
      return s.quests.done.length > 0 && s.level >= 2;
  }
}

/** The one hint to show now (or null). Earlier steps always win, so hints never pile up. */
export function pendingTutorial(s: GameState, screen: string): TutorialStep | null {
  if (s.tutorial.skipped) return null;
  for (const step of TUTORIAL_STEPS) {
    if (s.tutorial.done.includes(step)) continue;
    if (!relevant(s, step)) continue;
    const where = TUTORIAL_SCREEN[step];
    if (where !== 'any' && where !== screen) return null; // wait for the right screen; don't skip ahead
    return step;
  }
  return null;
}

/** The first item in a family teaches the whole chain, never individual levels. */
export function needsFamilyIntro(s: GameState, family: string): boolean {
  return !s.tutorial.skipped && family !== 'starCoin' && family !== 'flower' && !s.flags[`introItem:${family}`];
}
