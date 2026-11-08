import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { availableQuests, nextTrailPuzzle } from '../engine/quests';
import { taskProgress } from '../engine/orders';
import type { DailyTask } from '../engine/types';
import { echoId, TRAIL_LENGTH } from '../puzzles/levels';
import { useGame } from '../state/GameProvider';
import { Bar, Button, Card, SectionTitle, Sprite } from '../ui/components';
import { colors, font } from '../ui/theme';
import { QuestCard } from './QuestCard';

function TaskRow({ task }: { task: DailyTask }) {
  const { state, t, c, dispatch } = useGame();
  const p = taskProgress(state, task);
  const done = p >= task.target;
  const label = t(`task.${task.kind}` as 'task.merge', { n: task.target, f: task.family ? c(`family.${task.family}`) : '' });
  return (
    <View style={styles.task}>
      <View style={{ flex: 1 }}>
        <Text style={styles.taskLabel}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Bar value={p / task.target} color={done ? colors.sage : colors.honey} />
          </View>
          <Text style={styles.taskCount}>
            {p}/{task.target}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          {task.reward.leaves ? <Reward icon="icon.leaf" n={task.reward.leaves} /> : null}
          {task.reward.energy ? <Reward icon="icon.energy" n={task.reward.energy} /> : null}
        </View>
      </View>
      {task.claimed ? <Sprite id="icon.check" size={30} /> : <Button small tone={done ? 'sage' : 'cream'} disabled={!done} label={t('common.claim')} onPress={() => dispatch({ type: 'claimTask', id: task.id })} />}
    </View>
  );
}

function Reward({ icon, n }: { icon: string; n: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Sprite id={icon} size={16} />
      <Text style={styles.small}>+{n}</Text>
    </View>
  );
}

export function QuestsScreen() {
  const { state, t, open } = useGame();
  const quests = availableQuests(state);
  const story = quests.filter((q) => q.kind === 'story');
  const project = quests.filter((q) => q.kind === 'project');
  const side = quests.filter((q) => q.kind === 'side');
  const solved = Object.keys(state.puzzles).filter((k) => k.startsWith('lp')).length;
  const stars = Object.entries(state.puzzles)
    .filter(([k]) => k.startsWith('lp'))
    .reduce((s, [, v]) => s + v.stars, 0);
  const next = nextTrailPuzzle(state);
  const tier = Math.max(...state.regions);
  const echo = echoId(state.daily.day, tier);
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      {story.length ? <SectionTitle>{t('quests.story')}</SectionTitle> : null}
      {story.map((q) => (
        <QuestCard key={q.id} q={q} />
      ))}
      {project.length ? <SectionTitle>{t('quests.project')}</SectionTitle> : null}
      {project.map((q) => (
        <QuestCard key={q.id} q={q} />
      ))}
      {side.length ? <SectionTitle>{t('quests.side')}</SectionTitle> : null}
      {side.map((q) => (
        <QuestCard key={q.id} q={q} />
      ))}
      {!quests.length ? <Text style={styles.empty}>{t('quests.none')}</Text> : null}

      <SectionTitle>{t('quests.trail')}</SectionTitle>
      <Card tone="night">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Sprite id="icon.puzzle" size={52} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nightTitle}>{t('quests.trailProgress', { a: solved, b: TRAIL_LENGTH, s: stars })}</Text>
            <Text style={styles.nightSub}>{next ? t('quests.trailNext', { n: Number(next.slice(2)) }) : solved >= TRAIL_LENGTH ? t('quests.trailDone') : t('quests.trailLocked')}</Text>
            <View style={{ marginTop: 6 }}>
              <Bar value={solved / TRAIL_LENGTH} color={colors.honey} track="rgba(255,255,255,0.15)" />
            </View>
          </View>
          {next ? <Button small label={t('quests.solve')} onPress={() => open('puzzle', { id: next })} /> : null}
        </View>
      </Card>

      <SectionTitle>{t('quests.daily')}</SectionTitle>
      <Card>
        {state.daily.tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
        <View style={styles.echo}>
          <Sprite id="icon.calendar" size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.taskLabel}>{t('quests.echo')}</Text>
            <Text style={styles.small}>{t('quests.echoDesc')}</Text>
          </View>
          {state.echo.solved ? <Sprite id="icon.check" size={30} /> : <Button small tone="night" label={t('quests.solve')} onPress={() => open('puzzle', { id: echo })} />}
        </View>
        <Text style={styles.hint}>{t('quests.dailyHint')}</Text>
      </Card>
      {state.weekly.task ? (
        <>
          <SectionTitle>{t('quests.weekly')}</SectionTitle>
          <Card tone="gold">
            <TaskRow task={state.weekly.task} />
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40 },
  empty: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, textAlign: 'center', marginVertical: 20 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(65,105,87,0.2)' },
  taskLabel: { fontFamily: font.bold, fontSize: 14, color: colors.ink },
  taskCount: { fontFamily: font.black, fontSize: 12, color: colors.inkSoft, minWidth: 44, textAlign: 'right' },
  small: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  hint: { fontFamily: font.medium, fontSize: 11, color: colors.inkSoft, marginTop: 8, textAlign: 'center' },
  echo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 },
  nightTitle: { fontFamily: font.black, fontSize: 15, color: '#FFF8EA' },
  nightSub: { fontFamily: font.medium, fontSize: 12, color: 'rgba(255,248,234,0.75)' },
});
