// Valley decorations bought with leaves: a long-term leaf sink that visibly changes the map.
// Each region has fixed spots so pieces never overlap buildings.
export type DecorKind = 'bench' | 'lamp' | 'planter' | 'banner' | 'pond';

export interface DecorationDef {
  id: string;
  region: number;
  kind: DecorKind;
  x: number;
  y: number;
  cost: number;
}

const SPOTS: [number, number][] = [
  [150, 150],
  [250, 640],
  [330, 950],
  [60, 950],
];
const KINDS: DecorKind[] = ['bench', 'planter', 'lamp', 'banner', 'pond'];

export const DECORATIONS: readonly DecorationDef[] = Array.from({ length: 7 }, (_, r) =>
  SPOTS.map(([x, y], i) => ({
    id: `d${r + 1}_${i + 1}`,
    region: r + 1,
    kind: KINDS[(r + i) % KINDS.length],
    x,
    y,
    cost: 150 * (r + 1) * (i + 1),
  })),
).flat();

export const DECORATION: Record<string, DecorationDef> = Object.fromEntries(DECORATIONS.map((d) => [d.id, d]));
