import { StyleSheet, Text, View } from 'react-native';

import { QUEST, type QuestDef, type Reward } from '../content/quests';
import { nodesUnlockedBy } from '../content/valley';
import { canComplete, questPuzzleToSolve, requirementProgress } from '../engine/quests';
import { ICON, nodeIcon, RequirementRows } from './Panels';
import { useGame } from '../state/GameProvider';
import { Button, Card, Sprite } from '../ui/components';
import { colors, font } from '../ui/theme';

export function RewardRow({ rewards, quest }: { rewards: Reward[]; quest?: string }) {
  const { c } = useGame();
  const unlocks = quest ? nodesUnlockedBy(quest) : [];
  return (
    <View style={styles.rewards}>
      {unlocks.map((n) => <Chip key={n.id} icon={nodeIcon(n)} text={c(`node.${n.kind}`)} />)}
      {rewards.map((r, i) => {
        switch (r.kind) {
          case 'leaves':
            return <Chip key={i} icon={ICON.coin} text={`+${r.n}`} />;
          case 'xp':
            return <Chip key={i} icon="icon.star" text={`+${r.n}`} />;
          case 'energy':
            return <Chip key={i} icon="icon.energy" text={`+${r.n}`} />;
          case 'cells':
            return <Chip key={i} icon="icon.board" text={`+${r.n}`} />;
          case 'producer':
            return null; // shown as the unlocked valley building above
          case 'memory':
            return <Chip key={i} icon="item.memory:2" text="" />;
          case 'region':
            return <Chip key={i} icon="icon.map" text={c(`region.${r.n}`)} />;
        }
      })}
    </View>
  );
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.chip}>
      <Sprite id={icon} size={18} />
      {text ? <Text style={styles.chipText}>{text}</Text> : null}
    </View>
  );
}

export function QuestCard({ q, compact }: { q: QuestDef; compact?: boolean }) {
  const { state, t, c, dispatch, talk, open } = useGame();
  const prog = requirementProgress(state, q);
  const ready = canComplete(state, q);
  const fresh = !state.quests.seen.includes(q.id);
  const complete = () => {
    const r = dispatch({ type: 'completeQuest', id: q.id });
    if (r.ok) talk(q.id, 'end');
  };
  const solveNext = () => {
    const target = prog.find(x => x.req.kind === 'puzzle' && !x.met)?.req;
    const id = target?.kind === 'puzzle' ? questPuzzleToSolve(state, target.id) : null;
    if (id) open('puzzle', { id });
  };
  return (
    <Card tone={ready ? 'gold' : 'paper'} style={styles.card}>
      <View style={styles.head}>
        <Sprite id={`portrait.${q.giver}.${ready ? 'happy' : 'calm'}`} size={compact ? 40 : 48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.kind}>
            {t(q.kind === 'story' ? 'quests.story' : q.kind === 'project' ? 'quests.project' : 'quests.side')} · {c(`char.${q.giver}`)}
            {fresh ? `  •  ${t('common.new')}` : ''}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {c(`quest.${q.id}`)}
          </Text>
          {q.structure ? <Text style={styles.place}>{c(`structure.${q.structure}`)}</Text> : null}
        </View>
        {fresh ? <Button small tone="cream" label="…" accessibilityLabel={t('common.next')} onPress={() => talk(q.id, 'start')} /> : null}
      </View>
      <RequirementRows prog={prog} onSolve={solveNext} />
      <View style={styles.foot}>
        <RewardRow rewards={q.rewards} quest={q.id} />
        <Button small tone={ready ? 'sage' : 'cream'} disabled={!ready} label={t('quests.complete')} onPress={complete} />
      </View>
    </Card>
  );
}

export function questOf(id: string) {
  return QUEST[id];
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  kind: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft },
  title: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  place: { fontFamily: font.medium, fontSize: 11, color: colors.sageDeep },
  reqs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  req: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 3 },
  reqMet: { backgroundColor: colors.sageSoft },
  reqText: { fontFamily: font.black, fontSize: 13, color: colors.ink },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.honeySoft, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2 },
  chipText: { fontFamily: font.bold, fontSize: 11, color: colors.ink },
});
