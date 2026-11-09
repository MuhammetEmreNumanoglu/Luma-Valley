// Story, side and long-project quests. Each quest may advance one structure by one stage; a
// structure's stage count is simply the number of quests that build it.
//
// Compact notation (parsed once at load, validated by tests/content.test.ts):
//   requirements: "wood:4x2"  deliver two level-4 wood items. Never a level-4 animal, plot,
//                             flower or fruit (tapping one harvests it) nor a harvest good:
//                             those chains are asked at levels 1–3; bigger asks use materials
//                 "lp07"      solve Light Path puzzle 7
//                 "L120"      pay 120 coins (stored as `leaves`)
//   rewards:      L coins, T coins ×30 (former Light Tokens), X xp, E energy, C open N cells,
//                 P:<producer> (legacy; the valley building of content/valley.ts unlocks by
//                 quest id instead), M:<structure> memory card, R<n> unlock region n
import type { CharId } from './characters';
import type { ItemKey } from './families';
import type { ProducerId } from './producers';

export type QuestKind = 'story' | 'side' | 'project';

export type Requirement = { kind: 'item'; item: ItemKey; n: number } | { kind: 'puzzle'; id: string } | { kind: 'leaves'; n: number };

export type Reward =
  | { kind: 'leaves'; n: number }
  | { kind: 'xp'; n: number }
  | { kind: 'energy'; n: number }
  | { kind: 'cells'; n: number }
  | { kind: 'producer'; id: ProducerId }
  | { kind: 'memory'; id: string }
  | { kind: 'region'; n: number };

export interface QuestDef {
  id: string;
  region: number;
  kind: QuestKind;
  giver: CharId;
  structure: string | null;
  reqs: Requirement[];
  rewards: Reward[];
  prereq: string[];
}

function parseReqs(spec: string): Requirement[] {
  return spec
    .split(/\s+/)
    .filter(Boolean)
    .map((tok): Requirement => {
      if (/^lp\d+$/.test(tok)) return { kind: 'puzzle', id: tok };
      if (/^L\d+$/.test(tok)) return { kind: 'leaves', n: Number(tok.slice(1)) };
      const m = /^([a-zA-Z]+:\d+)(?:x(\d+))?$/.exec(tok);
      if (!m) throw new Error(`Bad requirement "${tok}"`);
      return { kind: 'item', item: m[1], n: m[2] ? Number(m[2]) : 1 };
    });
}

function parseRewards(spec: string): Reward[] {
  return spec
    .split(/\s+/)
    .filter(Boolean)
    .map((tok): Reward => {
      const head = tok[0];
      const rest = tok.slice(tok[1] === ':' ? 2 : 1);
      switch (head) {
        case 'L':
          return { kind: 'leaves', n: Number(rest) };
        case 'T':
          return { kind: 'leaves', n: Number(rest) * 30 };
        case 'X':
          return { kind: 'xp', n: Number(rest) };
        case 'E':
          return { kind: 'energy', n: Number(rest) };
        case 'C':
          return { kind: 'cells', n: Number(rest) };
        case 'P':
          return { kind: 'producer', id: rest as ProducerId };
        case 'M':
          return { kind: 'memory', id: rest };
        case 'R':
          return { kind: 'region', n: Number(rest) };
      }
      throw new Error(`Bad reward "${tok}"`);
    });
}

type Row = [id: string, kind: QuestKind, giver: CharId, structure: string | null, reqs: string, rewards: string, prereq?: string[]];

// prettier-ignore
const ROWS: Row[] = [
  // ---- Region 1 · Güneş Çayırı ----------------------------------------------------------
  ['r1_light', 'story', 'lumi', 'r1_shrine', 'flower:2', 'L15 X5'],
  ['r1_garden1', 'story', 'lumi', 'r1_garden', 'flower:3', 'L25 X10 P:workbench'],
  ['r1_mira', 'story', 'mira', 'r1_cottage', 'flower:2x2', 'L30 X12 P:quarry'],
  ['r1_shrine', 'story', 'lumi', 'r1_shrine', 'lp01', 'L20 T2 C4 P:lanternStone'],
  ['r1_cottage2', 'story', 'mira', 'r1_cottage', 'flower:3', 'L40 X20'],
  ['r1_ada', 'side', 'ada', 'r1_greenhouse', 'flower:3x4', 'L40 X20 E20', ['r1_cottage2']],
  ['r1_cottage3', 'story', 'mira', 'r1_cottage', 'flower:3x2', 'X30 C4 E30 M:r1_cottage'],
  ['r1_well', 'side', 'ada', 'r1_well', 'flower:3 lp03', 'L50 X25', ['r1_ada']],
  ['r1_orchard', 'story', 'ada', 'r1_orchard', 'flower:3x2', 'L40 X25 P:orchard'],
  ['r1_garden2', 'side', 'ada', 'r1_garden', 'wood:3 lp04', 'L45 T2 X25', ['r1_well']],
  ['r1_lamps', 'side', 'lumi', 'r1_lamppost', 'lantern:3x2 lp05', 'L40 T1 X25', ['r1_shrine']],
  ['r1_waterwheel', 'story', 'mira', 'r1_waterwheel', 'wood:5 stone:5', 'L60 X35 C3'],
  ['r1_bees', 'side', 'ada', 'r1_beemeadow', 'fruit:3x2 wood:3', 'L60 X30 M:r1_beemeadow', ['r1_orchard']],
  ['r1_path', 'side', 'bera', 'r1_stonepath', 'stone:3x3', 'L45 X20', ['r1_waterwheel']],
  ['r1_garden3', 'side', 'ada', 'r1_garden', 'wood:4 stone:3', 'L80 T3 X40 M:r1_garden', ['r1_garden2', 'r1_bees']],
  ['r1_bridge1', 'story', 'bera', 'r1_bridge', 'wood:5x2', 'L50 X30'],
  ['r1_bridge2', 'story', 'bera', 'r1_bridge', 'stone:5x2 lp06', 'L60 X35'],
  ['r1_bridge3', 'story', 'bera', 'r1_bridge', 'wood:6 stone:6 lp08 L120', 'X60 T5 R2 P:field M:r1_bridge'],
  ['r1_beacon', 'project', 'lumi', 'r1_beacon', 'lantern:5 memory:3 lp10', 'L120 T5 X60 M:r1_beacon', ['r1_lamps']],

  // ---- Region 2 · Bal Rüzgârı Köyü ------------------------------------------------------
  ['r2_niko', 'story', 'niko', 'r2_bakery', 'grain:3x2', 'L40 X20'],
  ['r2_windmill1', 'story', 'niko', 'r2_windmill', 'wood:5 grain:4', 'L50 X25'],
  ['r2_bakery2', 'story', 'niko', 'r2_bakery', 'stone:5 grain:4x2', 'L60 X30 P:oven'],
  ['r2_square1', 'side', 'bera', 'r2_square', 'stone:4x3 lp12', 'L60 X30', ['r2_bakery2']],
  ['r2_bees', 'side', 'ada', 'r2_honeybarn', 'wood:3x2', 'L60 X30 P:beehive', ['r2_windmill1']],
  ['r2_windmill2', 'story', 'niko', 'r2_windmill', 'wood:6 lp13', 'L70 X40 M:r2_windmill'],
  ['r2_bakery3', 'story', 'niko', 'r2_bakery', 'grain:6 honey:3x2', 'L90 T3 X50 M:r2_bakery', ['r2_windmill2', 'r2_bees']],
  ['r2_loom', 'story', 'mira', 'r2_loomhouse', 'wood:5x2 wood:3', 'L70 X40 P:loom'],
  ['r2_house_a', 'side', 'mira', 'r2_house_a', 'fabric:3x2 wood:5', 'L70 X40', ['r2_loom']],
  ['r2_kiln', 'story', 'mira', 'r2_kilnhouse', 'stone:5x2 lp15', 'L80 X45 P:kiln'],
  ['r2_fountain', 'side', 'ada', 'r2_fountain', 'ceramic:3x2 stone:6 lp16', 'L90 T2 X50', ['r2_kiln']],
  ['r2_house_b', 'side', 'mira', 'r2_house_b', 'fabric:5 ceramic:4', 'L90 X50', ['r2_house_a', 'r2_kiln']],
  ['r2_honey2', 'side', 'ada', 'r2_honeybarn', 'honey:5 ceramic:4', 'L100 X55', ['r2_bakery3']],
  ['r2_square2', 'story', 'bera', 'r2_square', 'ceramic:3x2 grain:5x2 lp18', 'L110 X60 M:r2_square'],
  ['r2_workshop', 'story', 'mira', 'r2_workshop', 'wood:7 stone:6', 'L120 X65 C4'],
  ['r2_clock1', 'project', 'bera', 'r2_clocktower', 'lantern:4 stone:6', 'L100 X50', ['r2_square2']],
  ['r2_clock2', 'project', 'bera', 'r2_clocktower', 'wood:7 ceramic:5 lp20', 'L120 X60'],
  ['r2_clock3', 'project', 'bera', 'r2_clocktower', 'fabric:5 honey:6', 'L140 X70'],
  ['r2_clock4', 'project', 'bera', 'r2_clocktower', 'lantern:6 memory:4 lp22 L300', 'T8 X90 M:r2_clocktower'],
  ['r2_gate', 'story', 'bera', 'r2_gate', 'wood:7 stone:7 L250', 'X90 T5 R3 P:tidepool M:r2_gate', ['r2_workshop', 'r2_clock2']],

  // ---- Region 3 · Fener Limanı ----------------------------------------------------------
  ['r3_dock', 'story', 'deniz', 'r3_dock', 'wood:6x2 shell:3', 'L120 X60'],
  ['r3_hut_a', 'story', 'deniz', 'r3_hut_a', 'fabric:5 shell:4', 'L120 X60'],
  ['r3_boat', 'story', 'deniz', 'r3_boat', 'wood:7 fabric:6 lp24', 'L140 X70 M:r3_boat'],
  ['r3_hut_b', 'side', 'mira', 'r3_hut_b', 'wood:6 ceramic:5', 'L120 X60', ['r3_dock']],
  ['r3_market', 'story', 'niko', 'r3_market', 'ceramic:4 grain:6 shell:5', 'L150 X75'],
  ['r3_cave', 'side', 'bera', 'r3_cave', 'lantern:5 lp27', 'L150 T3 X70', ['r3_boat']],
  ['r3_house', 'side', 'ada', 'r3_house', 'wood:5 fabric:5', 'L140 X70', ['r3_market']],
  ['r3_lamppost', 'side', 'lumi', 'r3_lamppost', 'lantern:5x2 lp29', 'L140 T2 X70', ['r3_cave']],
  ['r3_lighthouse1', 'story', 'deniz', 'r3_lighthouse', 'stone:7 lantern:6', 'L180 X90'],
  ['r3_lighthouse2', 'story', 'deniz', 'r3_lighthouse', 'shell:7 memory:4 lp31', 'L220 T5 X100 M:r3_lighthouse'],
  ['r3_bridge', 'story', 'bera', 'r3_bridge', 'wood:8 stone:7 lp34 L400', 'X120 T5 R4 P:geode M:r3_bridge'],

  // ---- Region 4 · Kızıl Yaprak Ormanı ---------------------------------------------------
  ['r4_hut', 'story', 'mira', 'r4_hut', 'wood:7 crystal:3', 'L160 X80'],
  ['r4_shrine', 'story', 'lumi', 'r4_shrine', 'lantern:6 crystal:4 lp36', 'L180 T3 X90'],
  ['r4_stonepath', 'story', 'bera', 'r4_stonepath', 'stone:7x2', 'L170 X85'],
  ['r4_bigtree1', 'story', 'ada', 'r4_bigtree', 'wood:5 ceramic:5', 'L190 X95'],
  ['r4_gazebo', 'side', 'mira', 'r4_gazebo', 'wood:8 fabric:6', 'L180 X90', ['r4_stonepath']],
  ['r4_well', 'side', 'ada', 'r4_well', 'stone:7 crystal:5 lp39', 'L180 T2 X90', ['r4_bigtree1']],
  ['r4_workshop', 'story', 'mira', 'r4_workshop', 'wood:8 ceramic:6 lp41', 'L210 X100'],
  ['r4_statue', 'side', 'bera', 'r4_statue', 'stone:8 memory:5', 'L200 T3 X100 M:r4_statue', ['r4_workshop']],
  ['r4_lamppost', 'side', 'lumi', 'r4_lamppost', 'lantern:6x2 lp43', 'L190 T2 X95', ['r4_shrine']],
  ['r4_bigtree2', 'story', 'ada', 'r4_bigtree', 'wood:6 honey:7 crystal:6', 'L240 T5 X120 M:r4_bigtree'],
  ['r4_gate', 'story', 'bera', 'r4_gate', 'wood:9 stone:8 lp46 L500', 'X140 T6 R5 M:r4_gate'],

  // ---- Region 5 · Sessiz Tepeler --------------------------------------------------------
  ['r5_hut', 'story', 'yaren', 'r5_hut', 'fabric:7 wood:8', 'L220 X110'],
  ['r5_windmill_a', 'story', 'yaren', 'r5_windmill_a', 'wood:8 grain:7 lp48', 'L240 X115'],
  ['r5_stonepath', 'story', 'bera', 'r5_stonepath', 'stone:8x2', 'L230 X115'],
  ['r5_statue', 'side', 'yaren', 'r5_statue', 'stone:8 crystal:5', 'L230 T3 X110', ['r5_windmill_a']],
  ['r5_windmill_b', 'story', 'niko', 'r5_windmill_b', 'wood:8 grain:8 lp51', 'L260 X125'],
  ['r5_barn', 'side', 'niko', 'r5_barn', 'honey:7 grain:8', 'L250 X120', ['r5_windmill_b']],
  ['r5_gazebo', 'side', 'ada', 'r5_gazebo', 'wood:6 fabric:7 lp53', 'L250 T2 X120', ['r5_stonepath']],
  ['r5_tower1', 'story', 'yaren', 'r5_tower', 'stone:9 lantern:6', 'L280 X135'],
  ['r5_tower2', 'story', 'yaren', 'r5_tower', 'crystal:5 memory:6 lp55', 'L320 T5 X150 M:r5_tower'],
  ['r5_beacon', 'side', 'lumi', 'r5_beacon', 'lantern:7 lp57', 'L260 T3 X125', ['r5_tower1']],
  ['r5_bridge', 'story', 'bera', 'r5_bridge', 'wood:9 stone:9 lp58 L600', 'X160 T6 R6 M:r5_bridge'],

  // ---- Region 6 · Yıldızlı Göl ----------------------------------------------------------
  ['r6_dock', 'story', 'deniz', 'r6_dock', 'wood:9 shell:7', 'L300 X140'],
  ['r6_boat', 'story', 'deniz', 'r6_boat', 'fabric:8 shell:7 lp60', 'L320 X150'],
  ['r6_greenhouse', 'side', 'ada', 'r6_greenhouse', 'wood:6 crystal:6', 'L300 X145', ['r6_dock']],
  ['r6_gazebo', 'story', 'yaren', 'r6_gazebo', 'wood:9 ceramic:7 lp62', 'L330 X155'],
  ['r6_lamppost', 'side', 'lumi', 'r6_lamppost', 'lantern:7x2 lp64', 'L310 T3 X150', ['r6_gazebo']],
  ['r6_house', 'side', 'mira', 'r6_house', 'fabric:8 ceramic:8', 'L320 X150', ['r6_greenhouse']],
  ['r6_statue', 'side', 'bera', 'r6_statue', 'stone:9 memory:6', 'L320 T3 X150 M:r6_statue', ['r6_gazebo']],
  ['r6_observatory1', 'story', 'yaren', 'r6_observatory', 'crystal:6 stone:9 lp66', 'L360 X170'],
  ['r6_observatory2', 'story', 'yaren', 'r6_observatory', 'crystal:6 lantern:7 memory:7', 'L400 T6 X190 M:r6_observatory'],
  ['r6_fountain', 'side', 'ada', 'r6_fountain', 'ceramic:8 shell:7 lp68', 'L340 T3 X160', ['r6_observatory1']],
  ['r6_gate', 'story', 'bera', 'r6_gate', 'wood:9 crystal:6 lp70 L700', 'X200 T8 R7 M:r6_gate'],

  // ---- Region 7 · Kaybolan Bahçe --------------------------------------------------------
  ['r7_arch', 'story', 'bera', 'r7_arch', 'stone:9 wood:9', 'L380 X180'],
  ['r7_garden_a', 'story', 'ada', 'r7_garden_a', 'wood:7 ceramic:7', 'L400 X190'],
  ['r7_garden_b', 'side', 'ada', 'r7_garden_b', 'wood:7 honey:8 lp72', 'L400 T3 X190', ['r7_garden_a']],
  ['r7_gazebo', 'story', 'mira', 'r7_gazebo', 'wood:9 fabric:8', 'L420 X200'],
  ['r7_fountain', 'side', 'ada', 'r7_fountain', 'ceramic:8 shell:8 lp74', 'L420 T3 X200', ['r7_gazebo']],
  ['r7_greenhouse', 'side', 'ada', 'r7_greenhouse', 'crystal:7 wood:7', 'L410 X195', ['r7_garden_b']],
  ['r7_statue', 'story', 'bera', 'r7_statue', 'stone:9 memory:7 lp76', 'L450 T4 X210 M:r7_statue'],
  ['r7_bigtree', 'side', 'ada', 'r7_bigtree', 'ceramic:8 honey:8', 'L440 T4 X210', ['r7_statue']],
  ['r7_beacon', 'side', 'lumi', 'r7_beacon', 'lantern:7 lp78', 'L440 T4 X210', ['r7_statue']],
  ['r7_great1', 'story', 'lumi', 'r7_greatlantern', 'lantern:7 crystal:7 lp79', 'L500 X240'],
  ['r7_great2', 'story', 'lumi', 'r7_greatlantern', 'memory:7 lantern:7 lp80 L1000', 'T20 X300 M:r7_greatlantern'],
];

function build(): QuestDef[] {
  const out: QuestDef[] = [];
  const lastOfKind = new Map<string, string>();
  for (const [id, kind, giver, structure, reqs, rewards, prereq] of ROWS) {
    const region = Number(id.slice(1, id.indexOf('_')));
    const k = `${region}:${kind}`;
    const implicit = kind === 'side' ? undefined : lastOfKind.get(k);
    out.push({
      id,
      region,
      kind,
      giver,
      structure,
      reqs: parseReqs(reqs),
      rewards: parseRewards(rewards),
      prereq: prereq ?? (implicit ? [implicit] : []),
    });
    if (kind !== 'side') lastOfKind.set(k, id);
  }
  return out;
}

export const QUESTS: readonly QuestDef[] = build();
export const QUEST: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** Stage count per structure = number of quests that build it. */
export const STRUCTURE_STAGES: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (const q of QUESTS) if (q.structure) m[q.structure] = (m[q.structure] ?? 0) + 1;
  return m;
})();
