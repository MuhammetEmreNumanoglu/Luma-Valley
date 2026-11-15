import { LANDMARKS, TREES, PROPS, CROSSINGS, closedChest } from './regional.js';
export const CUSTOM = {
  regional(it) {
    if (it.kind === 'chest') return closedChest();
    if (it.kind === 'landmark') return LANDMARKS[it.name](it.stage);
    if (it.kind === 'crossing') return CROSSINGS[it.name](it.stage);
    if (it.kind === 'tree') return TREES[it.name]();
    return PROPS[it.name]();
  },
};
