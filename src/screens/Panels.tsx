// Information panels shared by the Shell: valley source sheet, level modal, "where to find it",
// storage, the single celebration card (moments), the tutorial layer, next-goal chip and the
// requirement rows used by quests and region panels.
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Canvas, Picture, Skia } from '@shopify/react-native-skia';

import { BALANCE, leafBreakCost, xpForNext } from '../content/balance';
import { nextTierLevel, RESOURCES, RESOURCE_KINDS, resourceTier, stageEnergy, SUPPLY, type ResourceKind } from '../content/resources';
import { busyWorkers, kindUnlock, obstaclesOn, unlockedKinds } from '../engine/resources';
import { drawResource } from '../render/resources';
import { FAMILY, parseItem, type ItemKey } from '../content/families';
import { collectionReward, isCollectible, levelReward, levelUnlocks, nextUnlockLevel, rarityOf } from '../content/progression';
import { QUEST, QUESTS, type Requirement } from '../content/quests';
import { NODE, NODES, type NodeDef, type NodeJob } from '../content/valley';
import { countItem } from '../engine/board';
import { nextGoal, type Goal } from '../engine/guide';
import { canAfford, isDepleted, isNodeBuilt, isNodeUnlocked, isReady, jobLevelOk, nodeState } from '../engine/nodes';
import { nextTrailPuzzle, type ReqProgress } from '../engine/quests';
import { itemSources } from '../engine/sources';
import { pendingTutorial, type TutorialStep } from '../engine/tutorial';
import type { GameState } from '../engine/types';
import { haptic, play } from '../feedback';
import { HurryButton } from '../ui/HurryButton';
import { hurryCost } from '../content/hurry';
import { purchases } from '../services/purchases';
import { useGame, type Moment } from '../state/GameProvider';
import { Bar, Button, Card, clock, InfoModal, Sheet, Sprite } from '../ui/components';
import { useTarget, type Rect } from '../ui/targets';
import { colors, FILL, font, radius } from '../ui/theme';
import { StructureArt } from './Overlays';

export const ICON = { coin: 'icon.coin', energy: 'icon.energy', xp: 'icon.star' } as const;

/** Sprite for a valley source in lists. */
export function nodeIcon(n: NodeDef): string {
  return `producer.${n.producer ?? 'field'}`;
}

/** "Level 3 Flower"-style label: name + level, readable even when the item is unknown. */
export function useItemLabel() {
  const { c, t } = useGame();
  return (key: ItemKey) => {
    const { f, l } = parseItem(key);
    const lv = FAMILY[f]?.levels > 1 ? ` · ${t('req.level', { n: l })}` : '';
    return { name: c(`item.${key}`), family: c(`family.${f}`), level: lv };
  };
}

// ---- Requirement rows ------------------------------------------------------------------------

export function RequirementRows({ prog, onSolve }: { prog: ReqProgress[]; onSolve?: () => void }) {
  const { state, t, open } = useGame();
  const label = useItemLabel();
  return (
    <View style={styles.reqs}>
      {prog.map((p, i) => {
        const r: Requirement = p.req;
        if (r.kind === 'item') {
          const known = state.discovered.includes(r.item);
          const L = label(r.item);
          return (
            <Pressable key={i} onPress={() => open('source', r.item)} style={[styles.req, p.met && styles.reqMet]} accessibilityRole="button" accessibilityLabel={`${L.name}${L.level} ${p.have}/${p.need}`}>
              <Sprite id={`item.${r.item}`} size={38} silhouette={!known && !p.met} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.reqName, !p.met && !known && { color: colors.inkSoft }]} numberOfLines={1}>{L.name}</Text>
                <Text style={styles.reqSub} numberOfLines={1}>{L.family}{L.level}</Text>
              </View>
              <Text style={[styles.reqCount, p.met && { color: '#3E7A47' }]}>{p.have}/{p.need}</Text>
              {p.met ? <Sprite id="icon.check" size={18} /> : <Text style={styles.reqWhere}>{t('src.go')}</Text>}
            </Pressable>
          );
        }
        if (r.kind === 'puzzle') {
          return (
            <View key={i} style={[styles.req, p.met && styles.reqMet]}>
              <Sprite id="icon.puzzle" size={34} />
              <Text style={[styles.reqName, { flex: 1 }]}>{t('quests.trail')}</Text>
              {p.met ? <Sprite id="icon.check" size={18} /> : onSolve ? <Button small tone="night" label={t('quests.solve')} onPress={onSolve} /> : null}
            </View>
          );
        }
        return (
          <View key={i} style={[styles.req, p.met && styles.reqMet]}>
            <Sprite id={ICON.coin} size={32} />
            <Text style={[styles.reqName, { flex: 1 }]}>{t('hud.coins')}</Text>
            <Text style={[styles.reqCount, p.met && { color: '#3E7A47' }]}>{Math.min(p.have, p.need)}/{p.need}</Text>
            {p.met ? <Sprite id="icon.check" size={18} /> : null}
          </View>
        );
      })}
    </View>
  );
}

// ---- Valley source sheet -----------------------------------------------------------------------

function Cost({ job, state }: { job: NodeJob; state: GameState }) {
  const lackE = state.energy < job.energy;
  return (
    <View style={styles.costRow}>
      {job.energy ? <Chip icon={ICON.energy} text={`${job.energy}`} warn={lackE} /> : null}
      {(job.inputs ?? []).map((x) => (
        <Chip key={x.item} icon={`item.${x.item}`} text={`${Math.min(countItem(state, x.item), x.n)}/${x.n}`} warn={countItem(state, x.item) < x.n} />
      ))}
      <Chip icon="icon.calendar" text={clock(job.seconds * 1000)} />
    </View>
  );
}

function Chip({ icon, text, warn }: { icon: string; text: string; warn?: boolean }) {
  return (
    <View style={[styles.chip, warn && styles.chipWarn]}>
      <Sprite id={icon} size={20} />
      <Text style={[styles.chipText, warn && { color: '#A8442E' }]}>{text}</Text>
    </View>
  );
}

function Yield({ job }: { job: NodeJob }) {
  const label = useItemLabel();
  return (
    <View style={styles.yieldRow}>
      {job.outputs.map((o) => {
        const L = label(o.item);
        return (
          <View key={o.item} style={styles.yieldItem}>
            <Sprite id={`item.${o.item}`} size={40} />
            <View>
              <Text style={styles.yieldN}>×{o.n}</Text>
              <Text style={styles.yieldName} numberOfLines={1}>{L.name}{L.level}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function NodeSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, t, c, dispatch, now, open, setScreen } = useGame();
  const n = NODE[id];
  if (!n) return null;
  const st = nodeState(state, id);
  const unlocked = isNodeUnlocked(state, n);
  const built = isNodeBuilt(state, n);
  const depleted = isDepleted(state, n);
  const running = st.readyAt > 0;
  const ready = isReady(state, id, now);
  const runningJob = running ? n.jobs[st.job] : null;
  const total = runningJob ? runningJob.seconds * 1000 : 1;
  const left = Math.max(0, st.readyAt - now);
  const start = (job?: number) => {
    const r = dispatch({ type: 'startNode', id, job });
    if (r.ok) haptic.light();
  };
  let body: React.ReactNode;
  if (!unlocked) {
    body = (
      <Card>
        <Text style={styles.lockTitle}>{t('common.locked')}</Text>
        {!state.regions.includes(n.region) ? <Text style={styles.body}>{t('node.lockedRegion')}</Text> : null}
        {n.level && state.level < n.level ? <Text style={styles.body}>{t('node.lockedLevel', { n: n.level })}</Text> : null}
        {n.quest && !state.quests.done.includes(n.quest) ? <Pressable accessibilityRole="button" onPress={() => { const quest = QUEST[n.quest!]; onClose(); if (quest?.structure) open('structure', quest.structure); else setScreen('quests'); }}><Text style={[styles.body, { textDecorationLine: 'underline', color: colors.sageDeep }]}>{t('node.lockedQuest', { q: c(`quest.${n.quest}`) })}</Text></Pressable> : null}
      </Card>
    );
  } else if (depleted) {
    body = <Card><Text style={styles.body}>{t('node.depleted')}</Text></Card>;
  } else if (!built) {
    body = (
      <Card>
        <Text style={styles.body}>{t('node.needBuild')}</Text>
        <Button icon={ICON.coin} label={t('node.build', { n: n.build ?? 0 })} disabled={state.leaves < (n.build ?? 0)} onPress={() => dispatch({ type: 'buildNode', id })} style={{ marginTop: 10 }} />
      </Card>
    );
  } else if (running) {
    body = (
      <Card tone={ready ? 'gold' : 'paper'}>
        {runningJob ? <Yield job={{ ...runningJob, outputs: st.out }} /> : null}
        {ready ? (
          <Button tone="sage" label={t('node.claim')} onPress={() => { dispatch({ type: 'claimNode', id }); onClose(); }} style={{ marginTop: 10 }} />
        ) : (
          <View style={{ marginTop: 10, gap: 6 }}>
            <Bar value={1 - left / total} color={colors.honey} height={10} />
            <Text style={styles.timer}>{t('node.working', { t: clock(left) })}</Text>
            <HurryButton target={{ kind: 'node', id }} readyAt={st.readyAt} />
          </View>
        )}
      </Card>
    );
  } else {
    body = (
      <View style={{ gap: 8 }}>
        {n.jobs.map((job, i) => {
          const levelOk = jobLevelOk(state, job);
          const lack = canAfford(state, job);
          return (
            <Card key={job.id} style={!levelOk && { opacity: 0.6 }}>
              <View style={styles.jobHead}>
                <Text style={styles.stageTitle}>{c(`job.${job.id}`)}</Text>
                {!levelOk ? <Text style={styles.levelLock}>{t('node.lockedLevel', { n: job.level ?? 1 })}</Text> : null}
              </View>
              <Yield job={job} />
              <Cost job={job} state={state} />
              {levelOk ? <Button small tone={lack ? 'cream' : 'sage'} disabled={!!lack} label={t('node.start')} onPress={() => start(i)} style={{ marginTop: 8 }} /> : null}
            </Card>
          );
        })}
      </View>
    );
  }
  return (
    <Sheet title={c(`node.${n.kind}`)} onClose={onClose}>
      <View style={styles.nodeHead}>
        <Sprite id={nodeIcon(n)} size={72} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.nodeKind}>{t('node.renewable')}</Text>
          <Text style={styles.body}>{c(`node.${n.kind}.desc`)}</Text>
        </View>
      </View>
      {body}
      <Text style={styles.foot}>{t('node.storage')}</Text>
    </Sheet>
  );
}

// ---- Level modal --------------------------------------------------------------------------------

export function LevelModal({ onClose }: { onClose: () => void }) {
  const { state, t, dispatch } = useGame();
  useEffect(() => {
    if (!state.tutorial.done.includes('level')) dispatch({ type: 'tutorial', step: 'level' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const need = xpForNext(state.level);
  const next = state.level + 1;
  const reward = levelReward(next);
  const unlocks = levelUnlocks(next);
  // Always show what comes after, so the player sees the next new items even on quiet levels.
  const upcoming = nextUnlockLevel(next);
  return (
    <InfoModal title={t('level.title', { n: state.level })} onClose={onClose} okLabel={t('common.ok')}>
      <View style={styles.levelHero}>
        <View style={styles.levelBadge}>
          <Sprite id="icon.star" size={64} />
          <Text style={styles.levelNum}>{state.level}</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.xpText}>{t('level.xp', { a: state.xp, b: need })}</Text>
          <Bar value={state.xp / need} color={colors.honey} height={12} />
          <Text style={styles.body}>{t('level.toNext', { n: next, x: Math.max(0, need - state.xp) })}</Text>
        </View>
      </View>
      <Text style={styles.section}>{t('level.rewards', { n: next })}</Text>
      <View style={styles.rewardGrid}>
        <RewardTile icon={ICON.coin} text={`+${reward.coins}`} label={t('hud.coins')} />
        <RewardTile icon={ICON.energy} text={`+${reward.energy}`} label={t('hud.energy')} />
        <RewardTile icon="icon.gift" text={`+${reward.crates}`} label={t('level.crates', { n: reward.crates }).replace(/^\+\d+\s*/, '')} />
        <RewardTile icon="prop.rock" text={`+${reward.supplies}`} label={t('supply.title')} />
      </View>
      <Text style={styles.section}>{t('level.unlocks', { n: next })}</Text>
      {unlocks.length ? <UnlockList level={next} /> : <Text style={styles.body}>{t('level.noUnlocks')}</Text>}
      {upcoming !== null ? (
        <>
          <Text style={styles.section}>{t('level.unlocks', { n: upcoming })}</Text>
          <UnlockList level={upcoming} />
        </>
      ) : null}
      <Text style={[styles.foot, { marginTop: 10 }]}>{t('level.howXp')}</Text>
    </InfoModal>
  );
}

function RewardTile({ icon, text, label }: { icon: string; text: string; label: string }) {
  return (
    <View style={styles.rewardTile}>
      <Sprite id={icon} size={34} />
      <Text style={styles.rewardText}>{text}</Text>
      <Text style={styles.rewardLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Everything that opens at `level`, with the item art (level modal and level-up card). */
export function UnlockList({ level, max }: { level: number; max?: number }) {
  const { t, c } = useGame();
  const list = levelUnlocks(level);
  return (
    <>
      {list.slice(0, max ?? list.length).map((u, i) => {
        if (u.kind === 'crate') return <UnlockRow key={i} icon={`item.${u.family}:1`} text={t('level.unlock.crate', { x: c(`item.${u.family}:1`) })} />;
        if (u.kind === 'node') return <UnlockRow key={i} icon={nodeIcon(NODE[u.node])} text={t('level.unlock.node', { x: c(`node.${NODE[u.node].kind}`) })} />;
        if (u.kind === 'tier') return <UnlockRow key={i} icon={`item.stone:${u.tier}`} text={t('level.unlock.tier', { n: u.tier, x: c(`item.stone:${u.tier}`) })} />;
        return <UnlockRow key={i} icon={`item.${u.item}`} text={t('level.unlock.job', { x: c(`node.${NODE[u.node].kind}`), y: c(`item.${u.item}`) })} />;
      })}
    </>
  );
}

function UnlockRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.unlockRow}>
      <Sprite id={icon} size={32} />
      <Text style={[styles.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

// ---- "Where to find it?" ----------------------------------------------------------------------

export function SourceModal({ item, onClose }: { item: ItemKey; onClose: () => void }) {
  const { state, t, c, open, setScreen, dispatch } = useGame();
  const label = useItemLabel();
  const L = label(item);
  const sources = itemSources(state, item);
  const known = state.discovered.includes(item);
  const collectible = isCollectible(item);
  const claimed = state.collected.includes(item);
  const reward = collectible ? collectionReward(item) : null;
  const uses = useMemo(() => {
    const q = QUESTS.filter((x) => !state.quests.done.includes(x.id) && x.reqs.some((r) => r.kind === 'item' && r.item === item)).slice(0, 3);
    const n = NODES.filter((x) => x.jobs.some((j) => j.inputs?.some((i) => i.item === item)));
    return { q, n };
  }, [state.quests.done, item]);
  const go = (fn: () => void) => {
    onClose();
    fn();
  };
  return (
    <InfoModal title={L.name} onClose={onClose} okLabel={t('common.ok')}>
      <View style={styles.srcHead}>
        <Sprite id={`item.${item}`} size={84} silhouette={!known} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.nodeKind}>{L.family}{L.level}</Text>
          {collectible ? <Text style={[styles.rarity, styles[`rarity_${rarityOf(item)}`]]}>{t(`col.rarity.${rarityOf(item)}`)}</Text> : null}
          {collectible && reward ? (
            known ? (
              claimed ? <Text style={styles.body}>{t('col.collected')}</Text> : <Button small tone="honey" icon={ICON.coin} label={`${t('col.collect')} · ${reward.coins}`} onPress={() => dispatch({ type: 'claimCollection', item })} />
            ) : (
              <Text style={styles.body}>{t('col.notYet')} · {t('col.reward', { n: reward.coins })}</Text>
            )
          ) : null}
        </View>
      </View>
      <Text style={styles.section}>{t('src.title')}</Text>
      {sources.map((s, i) => {
        if (s.kind === 'merge') {
          return (
            <Pressable key={i} onPress={() => open('source', s.from)} style={styles.srcRow} accessibilityRole="button">
              <Sprite id={`item.${s.from}`} size={30} />
              <Text style={[styles.body, { flex: 1 }]}>{t('src.merge', { x: c(`item.${s.from}`) })}</Text>
            </Pressable>
          );
        }
        if (s.kind === 'resource') {
          const name = t(`res.${s.res}` as 'res.stone');
          return (
            <View key={i} style={[styles.srcRow, !s.available && { opacity: 0.6 }]}>
              <Sprite id="prop.rock" size={30} />
              <Text style={[styles.body, { flex: 1 }]}>{s.available ? t('src.resource', { x: name }) : t('src.resourceLocked', { x: name, r: c(`region.${s.region}`) })}</Text>
              {s.available ? <Button small tone="cream" label={t('src.go')} onPress={() => go(() => setScreen('board'))} /> : null}
            </View>
          );
        }
        if (s.kind === 'crate') {
          return (
            <View key={i} style={[styles.srcRow, !s.available && { opacity: 0.6 }]}>
              <Sprite id="icon.gift" size={30} />
              <Text style={[styles.body, { flex: 1 }]}>{s.available ? t('src.crate') : t('src.crateLevel', { n: s.level })}</Text>
              {s.available ? <Button small tone="cream" label={t('src.go')} onPress={() => go(() => setScreen('board'))} /> : null}
            </View>
          );
        }
        if (s.kind === 'node') {
          const name = c(`node.${s.node.kind}`);
          return (
            <View key={i} style={[styles.srcRow, !s.available && { opacity: 0.6 }]}>
              <Sprite id={nodeIcon(s.node)} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{s.depleted ? t('src.nodeDepleted', { x: name }) : t('src.node', { x: name })} · {c(`region.${s.node.region}`)}</Text>
                {!s.available && !s.depleted ? <Text style={styles.reqSub}>{lockReason(state, s.node, t, c)}</Text> : null}
              </View>
              {s.available ? <Button small tone="cream" label={t('src.go')} onPress={() => go(() => { setScreen('board'); open('node', s.node.id); })} /> : null}
            </View>
          );
        }
        if (s.kind === 'farm') {
          return (
            <View key={i} style={[styles.srcRow, !s.available && { opacity: 0.6 }]}>
              <Sprite id={`item.${s.from}`} size={30} />
              <Text style={[styles.body, { flex: 1 }]}>{t('src.farm', { x: c(`item.${s.from}`) })}</Text>
            </View>
          );
        }
        return <Text key={i} style={styles.body}>{t('src.merchant')}</Text>;
      })}
      {uses.q.length || uses.n.length ? <Text style={styles.section}>{t('src.uses')}</Text> : null}
      {uses.q.map((q) => (
        <View key={q.id} style={styles.srcRow}>
          <Sprite id={`portrait.${q.giver}.calm`} size={30} />
          <Text style={[styles.body, { flex: 1 }]}>{c(`quest.${q.id}`)}</Text>
        </View>
      ))}
      {uses.n.map((n) => (
        <View key={n.id} style={styles.srcRow}>
          <Sprite id={nodeIcon(n)} size={30} />
          <Text style={[styles.body, { flex: 1 }]}>{c(`node.${n.kind}`)}</Text>
        </View>
      ))}
    </InfoModal>
  );
}

function lockReason(s: GameState, n: NodeDef, t: ReturnType<typeof useGame>['t'], c: ReturnType<typeof useGame>['c']): string {
  if (!s.regions.includes(n.region)) return t('node.lockedRegion');
  if (n.quest && !s.quests.done.includes(n.quest)) return t('node.lockedQuest', { q: c(`quest.${n.quest}`) });
  if (n.level && s.level < n.level) return t('node.lockedLevel', { n: n.level });
  return '';
}

// ---- Storage ---------------------------------------------------------------------------------

export function StorageSheet({ onClose }: { onClose: () => void }) {
  const { state, t, c, dispatch } = useGame();
  const groups = new Map<string, number>();
  for (const k of state.rewardStorage) groups.set(k, (groups.get(k) ?? 0) + 1);
  useEffect(() => {
    if (state.rewardUnread) dispatch({ type: 'viewRewards' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet title={t('storage.title')} onClose={onClose} footer={state.rewardStorage.length ? <Button tone="sage" label={t('storage.takeAll')} onPress={() => dispatch({ type: 'retrieveAllRewards' })} /> : null}>
      <Text style={styles.body}>{t('storage.count', { n: state.rewardStorage.length })}</Text>
      <View style={styles.storeGrid}>
        {[...groups.entries()].map(([k, n]) => (
          <View key={k} style={styles.storeCell} accessibilityLabel={`${c(`item.${k}`)} ×${n}`}>
            <Sprite id={`item.${k}`} size={44} />
            <Text style={styles.storeN}>×{n}</Text>
          </View>
        ))}
      </View>
      {Object.entries(state.harvestStock ?? {}).some(([, n]) => n > 0) ? (
        <>
          <Text style={styles.section}>{t('merchant.stock')}</Text>
          <View style={styles.storeGrid}>
            {Object.entries(state.harvestStock).filter(([, n]) => n > 0).map(([k, n]) => (
              <View key={k} style={styles.storeCell} accessibilityLabel={`${c(`item.${k}`)} ×${n}`}>
                <Sprite id={`item.${k}`} size={44} />
                <Text style={styles.storeN}>×{n}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.foot}>{t('node.storage')}</Text>
    </Sheet>
  );
}

// ---- Workshop resources ------------------------------------------------------------------------

/** Break panel for a resource obstacle (rock, logs, pottery, shells, crystal) on the board. */
export function ResourceSheet({ cell, onClose }: { cell: number; onClose: () => void }) {
  const { state, t, c, dispatch, now } = useGame();
  const [workerModal, setWorkerModal] = useState(false);
  const [workerPrice, setWorkerPrice] = useState<string | null>(null);
  const [workerMessage, setWorkerMessage] = useState(false);
  const [buyingWorker, setBuyingWorker] = useState(false);
  const res = state.board[cell];
  useEffect(() => { purchases.workerPrice().then(setWorkerPrice).catch(() => setWorkerPrice(null)); }, []);
  useEffect(() => {
    if (res?.t !== 'r') onClose();
  }, [res?.t, onClose]);
  if (res?.t !== 'r') return null;
  const def = RESOURCES[res.r];
  const stage = Math.min(2, res.stage);
  const st = def.stages[stage];
  const energy = stageEnergy(res.r, stage, res.tier);
  const item = `${def.family}:${res.tier}`;
  const running = res.readyAt > 0;
  const ready = running && now >= res.readyAt;
  const left = Math.max(0, res.readyAt - now);
  const footer = ready ? (
    <Button tone="sage" label={t('res.collect')} onPress={() => { dispatch({ type: 'claimResource', cell }); onClose(); }} />
  ) : running ? (
    <View style={{ gap: 6 }}>
      <Bar value={1 - left / (st.seconds * 1000)} color={colors.honey} height={10} />
      <Text style={styles.timer}>{t('res.working', { t: clock(left) })}</Text>
      <HurryButton target={{ kind: 'resource', cell }} readyAt={res.readyAt} />
      <Button tone="ghost" label={state.settings.lang === 'en' ? `Cancel work · refund ${energy} energy` : `İşi iptal et · ${energy} enerji iade`} onPress={() => { const result = dispatch({ type: 'cancelResource', cell }); if (result.ok) onClose(); }} />
    </View>
  ) : (
    <Button tone={state.energy >= energy ? 'sage' : 'cream'} disabled={state.energy < energy} icon={ICON.energy} label={`${t('res.break')} · ${energy}`} onPress={() => { if (busyWorkers(state, now) >= state.workerCapacity) setWorkerModal(true); else dispatch({ type: 'breakResource', cell }); }} />
  );
  return (
    <>
    <Sheet title={t(`res.${res.r}` as 'res.stone')} onClose={onClose} footer={footer}>
      <View style={styles.nodeHead}>
        <ResourceArt kind={res.r} stage={stage} size={92} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.nodeKind}>{t('res.durability', { a: 3 - res.stage })}</Text>
          <View style={styles.dots}>
            {[0, 1, 2].map((i) => <View key={i} style={[styles.dotStage, i < 3 - res.stage && styles.dotStageOn]} />)}
          </View>
          <Text style={styles.body}>{t('res.desc')}</Text>
        </View>
      </View>
      <Card>
        <Text style={styles.label}>{t('res.yield')}</Text>
        <View style={styles.yieldItem}>
          <Sprite id={`item.${item}`} size={40} />
          <View>
            <Text style={styles.yieldN}>×{st.yield}</Text>
            <Text style={styles.yieldName}>{c(`item.${item}`)} · {t('req.level', { n: res.tier })}</Text>
          </View>
        </View>
        <View style={[styles.costRow, { marginTop: 8 }]}>
          <Chip icon={ICON.energy} text={`${energy}`} warn={!running && state.energy < energy} />
          <Chip icon="icon.calendar" text={clock(st.seconds * 1000)} />
          <Chip icon="icon.token" text={t('hurry.chip', { n: running ? hurryCost(res.readyAt, now) : hurryCost(st.seconds * 1000, 0) })} />
        </View>
        {res.stage === 2 ? <Text style={[styles.foot, { textAlign: 'left' }]}>{t('res.clears')}</Text> : null}
      </Card>
      <Text style={styles.foot}>{t('res.storage')}</Text>
    </Sheet>
    {workerModal ? <InfoModal title={state.settings.lang === 'en' ? 'Your worker is busy' : 'İşçin meşgul'} onClose={() => { setWorkerModal(false); setWorkerMessage(false); }} okLabel={t('common.close')} footer={state.workerCapacity < 2 ? <Button disabled={buyingWorker} label={`+1 ${state.settings.lang === 'en' ? 'worker' : 'işçi'} · ${workerPrice ?? '49,90 TL'}`} onPress={async () => {
      setBuyingWorker(true);
      try {
        const result = await purchases.purchase('luma.worker.second', true);
        if (result.status === 'verified' && result.productId === 'luma.worker.second') { dispatch({ type: 'grantWorkerPurchase', transactionId: result.transactionId }); setWorkerModal(false); }
        else if (result.status !== 'cancelled') setWorkerMessage(true);
      } catch { setWorkerMessage(true); } finally { setBuyingWorker(false); }
    }} /> : undefined}>
      <Text style={styles.body}>{state.settings.lang === 'en' ? 'Wait for a job to finish, or add a second worker to break two resources at once.' : 'Bir iş bitene kadar bekle veya aynı anda iki kaynak kırmak için ikinci bir işçi ekle.'}</Text>
      {workerMessage ? <Text style={styles.foot}>{t('shop.unavailable')}</Text> : null}
    </InfoModal> : null}
    </>
  );
}

/** A small Skia view of one resource obstacle (for panels). */
export function ResourceArt({ kind, stage, size }: { kind: ResourceKind; stage: number; size: number }) {
  const pic = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const cv = rec.beginRecording(Skia.XYWHRect(0, 0, size, size));
    cv.scale(size / 100, size / 100);
    drawResource(cv, kind, stage);
    return rec.finishRecordingAsPicture();
  }, [kind, stage, size]);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Picture picture={pic} />
    </Canvas>
  );
}

/** Resource deliveries: choose which material to bring to a free edge cell. */
export function SupplySheet({ onClose }: { onClose: () => void }) {
  const { state, t, c, dispatch, now } = useGame();
  const kinds = unlockedKinds(state);
  const full = obstaclesOn(state.board) >= SUPPLY.perBoard;
  const nextIn = state.supply.charges < SUPPLY.max ? SUPPLY.regenMs - Math.max(0, now - state.supply.anchor) % SUPPLY.regenMs : 0;
  return (
    <Sheet title={t('supply.title')} onClose={onClose}>
      <Text style={styles.body}>{t('supply.desc')}</Text>
      <Text style={[styles.nodeKind, { marginTop: 6 }]}>
        {t('supply.charges', { a: state.supply.charges, b: SUPPLY.max })}
        {nextIn > 0 ? ` · ${t('supply.next', { t: clock(nextIn) })}` : ''}
      </Text>
      {full ? <Text style={[styles.body, { color: colors.danger, marginTop: 6 }]}>{t('supply.full')}</Text> : null}
      <View style={{ gap: 8, marginTop: 10 }}>
        {RESOURCE_KINDS.map((k) => {
          const open = kinds.includes(k);
          const unlock = open ? null : kindUnlock(state, k);
          const tierAt = nextTierLevel(state.level);
          return (
            <Card key={k} style={styles.supplyRow}>
              <View style={!open && { opacity: 0.55 }}>
                <ResourceArt kind={k} stage={0} size={58} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stageTitle}>{t(`res.${k}` as 'res.stone')}</Text>
                <Text style={styles.reqSub}>{open ? t('supply.tier', { n: resourceTier(state.level) }) : t('supply.locked', { x: c(`region.${RESOURCES[k].region}`) })}</Text>
                {open && tierAt !== null ? <Text style={styles.reqSub}>{t('supply.nextTier', { l: tierAt, n: resourceTier(tierAt) })}</Text> : null}
                {unlock ? (
                  <>
                    <Text style={[styles.reqSub, { color: colors.ink }]}>{t('supply.unlockQuest', { q: c(`quest.${unlock.quest.id}`) })}</Text>
                    <Text style={styles.reqSub}>
                      {unlock.reachable ? t('supply.unlockChain', { r: c(`region.${unlock.quest.region}`), a: unlock.done, b: unlock.total }) : t('supply.unlockFirst', { r: c(`region.${unlock.quest.region}`) })}
                    </Text>
                  </>
                ) : null}
              </View>
              {open ? <Button small tone="sage" disabled={state.supply.charges <= 0 || full} label={t('supply.place')} onPress={() => { if (dispatch({ type: 'placeResource', kind: k }).ok) onClose(); }} /> : null}
            </Card>
          );
        })}
      </View>
    </Sheet>
  );
}

/** Energy for coins (the only way to buy energy; no second currency). */
export function EnergyModal({ onClose }: { onClose: () => void }) {
  const { state, t, dispatch, now } = useGame();
  const price = leafBreakCost(state.energyBuys);
  const nextIn = state.energy < BALANCE.energy.max ? BALANCE.energy.regenMs - Math.max(0, now - state.energyAnchor) % BALANCE.energy.regenMs : 0;
  return (
    <InfoModal title={t('energy.buyTitle')} onClose={onClose} okLabel={t('common.close')}>
      <View style={styles.levelHero}>
        <Sprite id={ICON.energy} size={64} />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={styles.xpText}>{state.energy} / {BALANCE.energy.max}</Text>
          <Bar value={state.energy / BALANCE.energy.max} color={colors.energy} height={10} />
          {nextIn > 0 ? <Text style={styles.body}>{t('hud.nextEnergy', { t: clock(nextIn) })}</Text> : null}
        </View>
      </View>
      <Card style={[styles.supplyRow, { marginTop: 12 }]}>
        <Sprite id={ICON.energy} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.stageTitle}>{t('shop.tea', { n: BALANCE.energy.leafBreak.amount })}</Text>
          <Text style={styles.reqSub}>{t('shop.teaDesc')}</Text>
        </View>
        <Button small tone="honey" icon={ICON.coin} label={String(price)} disabled={state.leaves < price || state.energy >= BALANCE.energy.max} onPress={() => dispatch({ type: 'buyEnergy' })} />
      </Card>
    </InfoModal>
  );
}

// ---- Moments (one celebration card at a time) --------------------------------------------------

/** What finishing `questId` opened beyond coins and XP: valley buildings and workshop cells. */
function QuestOpens({ questId, onGo }: { questId: string; onGo: (node: string) => void }) {
  const { t, c } = useGame();
  const q = QUEST[questId];
  if (!q) return null;
  const nodes = NODES.filter((n) => n.quest === questId);
  const cells = q.rewards.reduce((sum, r) => sum + (r.kind === 'cells' ? r.n : 0), 0);
  if (!nodes.length && !cells) return null;
  return (
    <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 4 }}>
      <Text style={styles.momentExtra}>{t('celebrate.opened')}</Text>
      {nodes.map((n) => {
        const outs = [...new Set((n.mode === 'jobs' ? n.jobs.filter((j) => !j.level) : []).map((j) => j.outputs[0].item))];
        return (
          <View key={n.id} style={{ gap: 6 }}>
            <UnlockRow icon={outs[0] ? `item.${outs[0]}` : nodeIcon(n)} text={t('celebrate.node', { x: c(`node.${n.kind}`), y: outs.map((k) => c(`item.${k}`)).join(', ') || c(`node.${n.kind}`) })} />
            <Button small tone="sage" label={t('celebrate.goNode')} onPress={() => onGo(n.id)} />
          </View>
        );
      })}
      {cells ? <UnlockRow icon="icon.board" text={t('celebrate.cells', { n: cells })} /> : null}
    </View>
  );
}

export function MomentCard({ moment, onDone }: { moment: Moment; onDone: () => void }) {
  const { state, t, c, reduceMotion, open, setScreen } = useGame();
  useEffect(() => {
    play(moment.kind === 'level' ? 'levelup' : moment.kind === 'structure' && moment.complete ? 'build' : 'unlock', 0.8);
    haptic.success();
  }, [moment]);
  // One soft glow that blooms once and fades: no loops, no bouncing.
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = reduceMotion ? 0 : withDelay(80, withTiming(1, { duration: 700 }));
  }, [glow, reduceMotion]);
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - glow.value), transform: [{ scale: 0.8 + glow.value * 0.5 }] }));
  const level = moment.kind === 'level' ? moment.level : moment.level;
  let title = '';
  let body: React.ReactNode = null;
  if (moment.kind === 'structure') {
    const total = Math.max(1, Object.values(QUEST).filter((q) => q.structure === moment.id).length);
    const stage = state.structures[moment.id] ?? 0;
    title = t(moment.complete ? 'celebrate.restored' : 'celebrate.stage');
    body = (
      <>
        <Text style={styles.momentSub}>{c(`structure.${moment.id}`)}</Text>
        <View style={styles.momentArt}>
          <View style={{ alignItems: 'center' }}>
            <StructureArt id={moment.id} k={Math.max(0, (stage - 1) / total)} w={112} h={120} />
            <Text style={styles.momentLabel}>{t('map.before')}</Text>
          </View>
          <View style={styles.arrow}><View style={styles.arrowHead} /></View>
          <View style={{ alignItems: 'center' }}>
            <StructureArt id={moment.id} k={stage / total} w={112} h={120} />
            <Text style={styles.momentLabel}>{moment.complete ? t('map.restored') : t('map.stage', { a: stage, b: total })}</Text>
          </View>
        </View>
        {moment.quest ? <QuestOpens questId={moment.quest} onGo={(node) => { onDone(); setScreen('board'); open('node', node); }} /> : null}
      </>
    );
  } else if (moment.kind === 'region') {
    title = t('celebrate.region');
    body = (
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Sprite id="icon.map" size={76} />
        <Text style={styles.momentSub}>{c(`region.${moment.n}`)}</Text>
      </View>
    );
  }
  const rw = level ? levelReward(level) : null;
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.momentScrim} accessibilityViewIsModal>
      <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeIn.duration(220)} style={styles.momentCard}>
        <Animated.View pointerEvents="none" style={[styles.momentGlow, glowStyle]} />
        {moment.kind === 'level' ? (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <View style={styles.levelBadge}>
              <Sprite id="icon.star" size={86} />
              <Text style={[styles.levelNum, { fontSize: 24, top: 30 }]}>{moment.level}</Text>
            </View>
            <Text style={styles.momentTitle}>{t('level.up', { n: moment.level })}</Text>
            {levelUnlocks(moment.level).length ? (
              <View style={{ alignSelf: 'stretch', marginTop: 4 }}>
                <Text style={styles.momentExtra}>{t('level.unlockedNow')}</Text>
                <UnlockList level={moment.level} max={4} />
              </View>
            ) : null}
            {nextUnlockLevel(moment.level) !== null ? <Text style={styles.momentExtra}>{t('level.upcoming', { n: nextUnlockLevel(moment.level)! })}</Text> : null}
          </View>
        ) : (
          <>
            <Text style={styles.momentTitle}>{title}</Text>
            {body}
          </>
        )}
        {moment.kind === 'structure' && moment.region ? <Text style={styles.momentExtra}>{t('toast.region', { x: c(`region.${moment.region}`) })}</Text> : null}
        {rw ? (
          <View style={styles.momentRewards}>
            {moment.kind !== 'level' ? <Text style={styles.momentExtra}>{t('level.up', { n: level ?? 0 })}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center' }}>
              <Amount icon={ICON.coin} n={rw.coins} />
              <Amount icon={ICON.energy} n={rw.energy} />
              <Amount icon="icon.gift" n={rw.crates} />
              <Amount icon="prop.rock" n={rw.supplies} />
            </View>
          </View>
        ) : null}
        <Button label={t('celebrate.continue')} onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 6 }} />
      </Animated.View>
    </Animated.View>
  );
}

function Amount({ icon, n }: { icon: string; n: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Sprite id={icon} size={24} />
      <Text style={styles.amount}>+{n}</Text>
    </View>
  );
}

// ---- Tutorial layer ---------------------------------------------------------------------------

const TARGET: Partial<Record<TutorialStep, string>> = {
  crate: 'crate',
  resource: 'resource',
  quest: 'tab.quests',
  collection: 'tab.journal',
  level: 'level',
  order: 'orders',
  valley: 'tab.map',
};

const TEXT: Record<TutorialStep, string> = {
  merge: 'tut.merge',
  crate: 'tut.crate',
  crateMerge: 'tut.crateMerge',
  resource: 'tut.resource',
  quest: 'tut.quest',
  collection: 'tut.collection',
  level: 'tut.level',
  order: 'tut.order',
  valley: 'tut.valley',
};

/**
 * One calm pointer at a real control. Only the crate step dims the screen (it is the one action
 * the player must take); other hints are a ring and a bubble that never block play.
 */
export function TutorialLayer({ blocked }: { blocked: boolean }) {
  const { state, screen, t, dispatch, reduceMotion } = useGame();
  const step = blocked ? null : pendingTutorial(state, screen);
  const targetId = step ? TARGET[step] ?? null : null;
  const rect = useTarget(targetId);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = 0;
    glow.value = reduceMotion ? 1 : withTiming(1, { duration: 600 });
  }, [step, glow, reduceMotion]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  if (!step || !targetId || !rect) return null;
  const dim = step === 'crate';
  const pad = 6;
  const r: Rect = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
  const below = r.y + r.h / 2 < height / 2;
  const bubbleTop = below ? r.y + r.h + 12 : undefined;
  const bubbleBottom = below ? undefined : height - r.y + 12;
  const finish = () => dispatch({ type: 'tutorial', step });
  return (
    <View style={FILL} pointerEvents="box-none">
      {dim ? (
        <>
          <View style={[styles.dim, { left: 0, top: 0, width, height: Math.max(0, r.y) }]} />
          <View style={[styles.dim, { left: 0, top: r.y + r.h, width, height: Math.max(0, height - r.y - r.h) }]} />
          <View style={[styles.dim, { left: 0, top: r.y, width: Math.max(0, r.x), height: r.h }]} />
          <View style={[styles.dim, { left: r.x + r.w, top: r.y, width: Math.max(0, width - r.x - r.w), height: r.h }]} />
        </>
      ) : null}
      <Animated.View pointerEvents="none" style={[styles.ring, { left: r.x, top: r.y, width: r.w, height: r.h }, ringStyle]} />
      <Animated.View entering={FadeIn.duration(220)} style={[styles.bubble, { top: bubbleTop, bottom: bubbleBottom, left: 16, right: 16, maxWidth: 420, alignSelf: 'center' }, !below && { marginBottom: insets.bottom * 0 }]}>
        <Text style={styles.bubbleText}>{t(TEXT[step] as 'tut.crate')}</Text>
        <View style={styles.bubbleFoot}>
          <Pressable onPress={() => dispatch({ type: 'tutorial', skip: true })} hitSlop={8} accessibilityRole="button">
            <Text style={styles.skip}>{t('tut.skip')}</Text>
          </Pressable>
          {!dim ? <Button small tone="cream" label={t('tut.gotIt')} onPress={finish} /> : null}
        </View>
      </Animated.View>
    </View>
  );
}

// ---- Next goal chip ---------------------------------------------------------------------------

export function goalText(g: Goal, t: ReturnType<typeof useGame>['t'], c: ReturnType<typeof useGame>['c']): string {
  switch (g.kind) {
    case 'claimNode':
      return t('goal.claimNode', { x: c(`node.${NODE[g.node].kind}`) });
    case 'completeQuest':
      return t('goal.complete', { q: c(`quest.${g.quest}`) });
    case 'item': {
      const { f, l } = parseItem(g.item);
      return t('goal.item', { q: c(`structure.${QUEST[g.quest].structure}`) || c(`quest.${g.quest}`), n: g.missing, x: `${c(`item.${g.item}`)}${FAMILY[f].levels > 1 ? ` (${t('req.level', { n: l })})` : ''}` });
    }
    case 'puzzle':
      return t('goal.puzzle', { q: c(`quest.${g.quest}`) });
    case 'coins':
      return t('goal.coins', { q: c(`quest.${g.quest}`), n: g.missing });
    case 'region':
      return c(`quest.${g.quest}`);
  }
}

export function NextGoalChip({ compact }: { compact?: boolean }) {
  const { state, now, t, c, setScreen, open, dispatch } = useGame();
  const g = nextGoal(state, now);
  if (!g) return null;
  const icon = g.kind === 'claimNode' ? nodeIcon(NODE[g.node]) : g.kind === 'item' ? `item.${g.item}` : g.kind === 'puzzle' ? 'icon.puzzle' : g.kind === 'coins' ? ICON.coin : 'icon.quests';
  const act = () => {
    play('select', 0.5);
    switch (g.kind) {
      case 'claimNode':
        dispatch({ type: 'claimNode', id: g.node });
        return;
      case 'item':
        open('source', g.item);
        return;
      case 'puzzle': {
        const id = nextTrailPuzzle(state);
        if (id) open('puzzle', { id });
        else setScreen('quests');
        return;
      }
      default:
        setScreen('quests');
    }
  };
  return (
    <Pressable onPress={act} style={[styles.goal, compact && styles.goalCompact]} accessibilityRole="button" accessibilityLabel={`${t('goal.title')}: ${goalText(g, t, c)}`}>
      <Sprite id={icon} size={compact ? 24 : 28} />
      <View style={{ flex: 1 }}>
        {!compact ? <Text style={styles.goalLabel}>{t('goal.title')}</Text> : null}
        <Text style={styles.goalText} numberOfLines={1}>{goalText(g, t, c)}</Text>
      </View>
      <View style={styles.goalArrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft, lineHeight: 19 },
  section: { fontFamily: font.black, fontSize: 15, color: colors.ink, marginTop: 14, marginBottom: 6 },
  label: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft, marginTop: 8, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  foot: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, marginTop: 10, textAlign: 'center' },
  reqs: { gap: 6, marginTop: 8 },
  req: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(65,105,87,0.07)', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 5, minHeight: 48 },
  reqMet: { backgroundColor: 'rgba(111,174,82,0.16)' },
  reqName: { fontFamily: font.black, fontSize: 14, color: colors.ink },
  reqSub: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  reqCount: { fontFamily: font.black, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  reqWhere: { fontFamily: font.black, fontSize: 12, color: colors.sageDeep, paddingHorizontal: 6 },
  nodeHead: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 10 },
  nodeKind: { fontFamily: font.black, fontSize: 13, color: colors.sageDeep },
  dots: { flexDirection: 'row', gap: 6, marginTop: 4 },
  dotStage: { width: 22, height: 8, borderRadius: 4, backgroundColor: 'rgba(65,105,87,0.18)' },
  dotStageOn: { backgroundColor: colors.honey },
  lockTitle: { fontFamily: font.black, fontSize: 16, color: colors.ink, marginBottom: 4 },
  stageTitle: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  jobHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelLock: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  timer: { fontFamily: font.black, fontSize: 15, color: colors.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  costRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(242,181,68,0.14)', borderRadius: 12, paddingHorizontal: 8, height: 30 },
  chipWarn: { backgroundColor: 'rgba(217,96,74,0.14)' },
  chipText: { fontFamily: font.black, fontSize: 13, color: colors.ink, fontVariant: ['tabular-nums'] },
  yieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  yieldItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  yieldN: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  yieldName: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft, maxWidth: 170 },
  levelHero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelBadge: { alignItems: 'center', justifyContent: 'center' },
  levelNum: { position: 'absolute', top: 23, fontFamily: font.black, fontSize: 19, color: '#5A3A12' },
  xpText: { fontFamily: font.black, fontSize: 18, color: colors.ink, fontVariant: ['tabular-nums'] },
  rewardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rewardTile: { flexGrow: 1, minWidth: 70, alignItems: 'center', backgroundColor: 'rgba(242,181,68,0.12)', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 6 },
  rewardText: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  rewardLabel: { fontFamily: font.medium, fontSize: 11, color: colors.inkSoft },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  srcHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  supplyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  srcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border, minHeight: 44 },
  rarity: { alignSelf: 'flex-start', fontFamily: font.black, fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  rarity_common: { backgroundColor: '#E6EDE0', color: '#4E6A57' },
  rarity_uncommon: { backgroundColor: '#DCEFF5', color: '#2F6C80' },
  rarity_rare: { backgroundColor: '#ECE2F8', color: '#6A4A9A' },
  rarity_epic: { backgroundColor: '#FBE9C6', color: '#8A5A12' },
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  storeCell: { width: 64, height: 70, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  storeN: { fontFamily: font.black, fontSize: 12, color: colors.ink },
  momentScrim: { ...FILL, zIndex: 30, backgroundColor: 'rgba(37,52,42,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  momentCard: { width: '100%', maxWidth: 360, alignItems: 'center', padding: 20, borderRadius: radius.xl, backgroundColor: '#FFF8E6', borderWidth: 2, borderColor: '#FFFFFF', gap: 6, overflow: 'hidden' },
  momentGlow: { position: 'absolute', top: -60, width: 280, height: 280, borderRadius: 140, backgroundColor: '#FFE7A6' },
  momentTitle: { fontFamily: font.black, fontSize: 26, color: '#6B471B', textAlign: 'center' },
  momentSub: { fontFamily: font.bold, fontSize: 16, color: colors.ink, textAlign: 'center' },
  momentArt: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  momentLabel: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  momentExtra: { fontFamily: font.black, fontSize: 14, color: colors.sageDeep, textAlign: 'center' },
  momentRewards: { gap: 4, marginTop: 4 },
  arrow: { width: 22, height: 3, backgroundColor: colors.honeyDeep, borderRadius: 2 },
  arrowHead: { position: 'absolute', right: -2, top: -4, width: 10, height: 10, borderTopWidth: 3, borderRightWidth: 3, borderColor: colors.honeyDeep, transform: [{ rotate: '45deg' }] },
  amount: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  dim: { position: 'absolute', backgroundColor: 'rgba(24,34,28,0.5)' },
  ring: { position: 'absolute', borderRadius: 18, borderWidth: 3, borderColor: '#F7C65A', shadowColor: '#F7C65A', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  bubble: { position: 'absolute', backgroundColor: '#FFF9E8', borderRadius: radius.l, padding: 14, borderWidth: 2, borderColor: '#F2D28A', gap: 8, shadowColor: '#3A2A10', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  bubbleText: { fontFamily: font.bold, fontSize: 16, color: colors.ink, lineHeight: 21 },
  bubbleFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skip: { fontFamily: font.bold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(251,252,243,0.96)', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1.5, borderColor: 'rgba(242,181,68,0.55)', minHeight: 44 },
  goalCompact: { paddingVertical: 3, minHeight: 36, borderRadius: 14 },
  goalLabel: { fontFamily: font.black, fontSize: 10, color: colors.honeyDeep, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalText: { fontFamily: font.bold, fontSize: 13, color: colors.ink },
  goalArrow: { width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: colors.inkSoft, transform: [{ rotate: '45deg' }], marginRight: 4 },
});
