// Structure details (from the map) and Settings.
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { QUESTS, STRUCTURE_STAGES } from '../content/quests';
import { STRUCTURE } from '../content/regions';
import { availableQuests, requirementProgress } from '../engine/quests';
import { useGame } from '../state/GameProvider';
import { Button, Card, Sheet } from '../ui/components';
import { colors, font } from '../ui/theme';
import { StructureArt } from './Overlays';
import { QuestCard } from './QuestCard';

const DECOR_SWATCH: Record<string, string[]> = {
  flowers: ['#EE8FB0', '#B9A3E3', '#F2865A', '#7FA7C9'],
  fence: ['#B07A4A', '#F6EEDC', '#A7AFB4', '#8E5A2E'],
  roof: ['#C8563A', '#5E86A8', '#6E9E6A', '#B8643E'],
};

export function StructureSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, t, c, dispatch, open } = useGame();
  const st = STRUCTURE[id];
  const stage = state.structures[id] ?? 0;
  const total = STRUCTURE_STAGES[id] ?? 1;
  const done = stage >= total;
  const quest = availableQuests(state).find((q) => q.structure === id);
  const nextQuest = !quest && !done ? QUESTS.find((q) => q.structure === id && !state.quests.done.includes(q.id)) : null;
  // Progress of the current stage: share of required items/coins/sparks/puzzles already met.
  const prog = quest ? requirementProgress(state, quest) : [];
  const need = prog.reduce((a, p) => a + p.need, 0);
  const have = prog.reduce((a, p) => a + Math.min(p.have, p.need), 0);
  const pct = done ? 100 : need ? Math.round(((stage + have / need) / total) * 100) : Math.round((stage / total) * 100);
  return (
    <Sheet onClose={onClose} title={c(`structure.${id}`)} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        <View style={styles.hero}>
          <StructureArt id={id} k={stage / total} w={170} h={150} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={styles.region}>{c(`region.${st.region}`)}</Text>
            <Text style={styles.stage}>{done ? t('map.restored') : t('map.stage', { a: stage, b: total })}</Text>
            <View style={styles.dots}>
              {Array.from({ length: total }, (_, i) => (
                <View key={i} style={[styles.dot, i < stage && styles.dotOn]} />
              ))}
            </View>
            <Text style={styles.region}>{t('req.progress', { n: pct })}</Text>
            {done && state.memories.includes(id) ? <Button small tone="cream" icon="item.memory:2" label={t('map.memory')} onPress={() => open('memory', id)} /> : null}
          </View>
        </View>
        {quest ? <QuestCard q={quest} compact /> : null}
        {nextQuest ? (
          <Card>
            <Text style={styles.wait}>{t('map.noQuest')}</Text>
            {nextQuest.prereq.filter((p) => !state.quests.done.includes(p)).map((p) => <Text key={p} style={styles.wait}>• {c(`quest.${p}`)}</Text>)}
          </Card>
        ) : null}
        {done && st.decor ? (
          <Card>
            <Text style={styles.decorTitle}>{t('map.decor')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              {DECOR_SWATCH[st.decor].map((col, i) => (
                <Pressable key={i} onPress={() => dispatch({ type: 'setDecor', structure: id, variant: i })} style={[styles.swatch, { backgroundColor: col }, (state.decor[id] ?? 0) === i && styles.swatchOn]} accessibilityRole="button" accessibilityLabel={`${t('map.decor')} ${i + 1}`} />
              ))}
            </View>
          </Card>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

function Row({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.sage, false: 'rgba(65,105,87,0.3)' }} thumbColor="#FFF" accessibilityLabel={label} />
    </View>
  );
}

function Segmented({ options, value, onChange }: { options: { v: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.v} onPress={() => onChange(o.v)} style={[styles.segItem, value === o.v && styles.segOn]} accessibilityRole="button" accessibilityState={{ selected: value === o.v }}>
          <Text style={[styles.segText, value === o.v && { color: '#FFF' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, t, dispatch, lang, savedAt, resetAll } = useGame();
  const [confirm, setConfirm] = useState(false);
  const [info, setInfo] = useState<'help' | 'privacy' | null>(null);
  const s = state.settings;
  const set = (patch: Partial<typeof s>) => dispatch({ type: 'settings', patch });
  return (
    <Sheet onClose={onClose} title={t('settings.title')} scroll={false}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Card>
          <Row label={t('settings.music')} value={s.music} onChange={(v) => set({ music: v })} />
          <Row label={t('settings.sfx')} value={s.sfx} onChange={(v) => set({ sfx: v })} />
          <Row label={t('settings.haptics')} value={s.haptics} onChange={(v) => set({ haptics: v })} />
          <Row label={t('settings.reduceMotion')} value={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.quality')}</Text>
            <Segmented options={[{ v: 'high', label: t('settings.high') }, { v: 'low', label: t('settings.low') }]} value={s.quality} onChange={(v) => set({ quality: v as 'high' | 'low' })} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.language')}</Text>
            <Segmented options={[{ v: 'tr', label: 'Türkçe' }, { v: 'en', label: 'English' }]} value={lang} onChange={(v) => set({ lang: v as 'tr' | 'en' })} />
          </View>
        </Card>
        <Card style={{ marginTop: 10, gap: 8 }}>
          <Text style={styles.rowLabel}>{t('settings.tutorial')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button tone="cream" small label={t('settings.tutorialReplay')} onPress={() => { dispatch({ type: 'tutorial', reset: true }); onClose(); }} style={{ flex: 1 }} />
            {!state.tutorial.skipped ? <Button tone="ghost" small label={t('settings.tutorialSkip')} onPress={() => dispatch({ type: 'tutorial', skip: true })} style={{ flex: 1 }} /> : null}
          </View>
        </Card>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Button tone="cream" small label={t('settings.help')} onPress={() => setInfo(info === 'help' ? null : 'help')} style={{ flex: 1 }} />
          <Button tone="cream" small label={t('settings.privacy')} onPress={() => setInfo(info === 'privacy' ? null : 'privacy')} style={{ flex: 1 }} />
        </View>
        {info ? (
          <Card style={{ marginTop: 8 }}>
            <Text style={styles.body}>{t(info === 'help' ? 'settings.helpText' : 'settings.privacyText')}</Text>
          </Card>
        ) : null}
        <Card style={{ marginTop: 10 }}>
          <Text style={styles.rowLabel}>{t('settings.save')}</Text>
          <Text style={styles.body}>{t('settings.saved', { t: savedAt ? new Date(savedAt).toLocaleTimeString(lang === 'tr' ? 'tr-TR' : 'en-US') : '—' })}</Text>
          {!confirm ? (
            <Button tone="ghost" small label={t('settings.reset')} onPress={() => setConfirm(true)} style={{ marginTop: 8 }} />
          ) : (
            <View style={{ marginTop: 8, gap: 6 }}>
              <Text style={[styles.body, { color: colors.danger }]}>{t('settings.resetConfirm')}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button tone="cream" small label={t('common.cancel')} onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                <Button
                  tone="danger"
                  small
                  label={t('settings.resetYes')}
                  onPress={() => {
                    setConfirm(false);
                    resetAll();
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          )}
        </Card>
        <Text style={styles.version}>{t('settings.version', { v: '1.0.0' })}</Text>
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  region: { fontFamily: font.bold, fontSize: 12, color: colors.sageDeep },
  stage: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  dots: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: 'rgba(65,105,87,0.2)' },
  dotOn: { backgroundColor: colors.honey },
  wait: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginVertical: 10 },
  decorTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'transparent' },
  swatchOn: { borderColor: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  rowLabel: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  seg: { flexDirection: 'row', backgroundColor: 'rgba(65,105,87,0.12)', borderRadius: 12, padding: 3 },
  segItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minHeight: 36, justifyContent: 'center' },
  segOn: { backgroundColor: colors.sageDeep },
  segText: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  body: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, color: colors.inkSoft, marginTop: 4 },
  version: { fontFamily: font.medium, fontSize: 11, color: colors.inkSoft, textAlign: 'center', marginTop: 14 },
});
