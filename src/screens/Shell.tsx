import { RewardFlights } from './RewardFlights';
import { seasonNotices } from '../premium/season';
import { captureRewardOrigin } from '../ui/rewardEvents';
// App frame: HUD on top, the current screen, the bottom navigation and all overlays. Every
// full-screen celebration goes through the moment queue (one at a time, never over a dialogue).
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BALANCE, energyRegenMs, xpForNext } from '../content/balance';
import { readyNodes } from '../engine/nodes';
import { availableQuests, canComplete } from '../engine/quests';
import { unclaimedCollection } from '../engine/tutorial';
import { haptic, play, startMusic } from '../feedback';
import { useGame, type Screen } from '../state/GameProvider';
import { Bar, clock, compact, Dot, IconButton, Sprite } from '../ui/components';
import { useMeasuredTarget } from '../ui/targets';
import { colors, font } from '../ui/theme';
import { PremiumStore } from './PremiumStore';

import { BoardScreen } from './BoardScreen';
import { JournalScreen, ShopScreen } from './JournalShop';
import { MapScreen } from './MapScreen';
import { DialogueOverlay, IntroScreen, MemoryOverlay, Toasts } from './Overlays';
import { EnergyModal, ICON, LevelModal, MomentCard, NodeSheet, ResourceSheet, SourceModal, StorageSheet, SupplySheet, TutorialLayer } from './Panels';
import { PuzzleScreen } from './PuzzleScreen';
import { QuestsScreen } from './QuestsScreen';
import { SettingsSheet, StructureSheet } from './Sheets';

function HudPill({ icon, value, sub, label, onPress }: { icon: string; value: string; sub?: string; label: string; onPress?: () => void }) {
  const [targetRef, targetMeasure] = useMeasuredTarget(`hud.${icon === 'icon.token' ? 'token' : icon === ICON.energy ? 'energy' : 'gold'}`);
  const tone = icon === 'icon.token' ? styles.pillToken : icon === ICON.energy ? styles.pillEnergy : styles.pillGold;
  const ink = icon === 'icon.token' ? colors.tokenDeep : icon === ICON.energy ? colors.energyDeep : colors.honeyInk;
  return (
    <Pressable ref={targetRef} onLayout={targetMeasure} onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`} style={[styles.pill, tone]}>
      <Sprite id={icon} size={20} />
      <View style={{ flexShrink: 1 }}>
        <Text style={[styles.pillValue, { color: ink }]} numberOfLines={1}>{value}</Text>
        {sub ? <Text style={styles.pillSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

function TopBar() {
  const { state, t, now, open, testProfile } = useGame();
  const insets = useSafeAreaInsets();
  const need = xpForNext(state.level);
  const nextIn = state.energy < BALANCE.energy.max ? energyRegenMs(state.level) - Math.max(0, now - state.energyAnchor) % energyRegenMs(state.level) : 0;
  const [lvlRef, lvlMeasure] = useMeasuredTarget('level');
  return (
    <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
      <Pressable
        ref={lvlRef}
        onLayout={lvlMeasure}
        onPress={() => {
          play('select', 0.5);
          haptic.select();
          open('levelInfo', true);
        }}
        style={({ pressed }) => [styles.level, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel={`${t('level.title', { n: state.level })}, ${t('level.xp', { a: state.xp, b: need })}`}
      >
        <View style={styles.levelStar}>
          <Sprite id="icon.star" size={34} />
          <Text style={styles.levelNum}>{state.level}</Text>
        </View>
        <View style={styles.xp}>
          <Bar value={state.xp / need} color={colors.honey} height={6} track={colors.track} />
        </View>
      </Pressable>
      {testProfile ? <Text style={{ fontFamily: font.black, color: colors.tokenDeep, fontSize: 9 }}>TEST</Text> : null}
      <View style={styles.pills}>
        <HudPill icon={ICON.coin} value={compact(state.leaves)} label={t('hud.coins')} />
        <HudPill icon="icon.token" value={compact(state.starTokens ?? 0)} label={state.settings.lang === 'en' ? 'Star tokens' : 'Yıldız jetonu'} onPress={() => open('premium', true)} />
        <HudPill icon={ICON.energy} value={`${state.energy}`} sub={nextIn > 0 ? clock(nextIn) : t('hud.full')} label={t('hud.energy')} onPress={() => open('energy', true)} />
      </View>
      <View><IconButton icon="icon.shop" size={24} label="Işık Mağazası" onPress={() => open('premium', true)} />{seasonNotices(state.freeSeason, state.energy).any ? <Dot testID="season-notice" /> : null}</View>
      <IconButton icon="icon.settings" size={28} label={t('settings.title')} onPress={() => open('settings', true)} />
    </View>
  );
}

// Fixed order (left → right): Workshop, Valley, Quests, Journal, Market. Five equal tabs so they
// fit the narrowest iPhone; every tab is ≥ 54 pt tall.
export const TABS: { key: Screen; icon: string; label: 'nav.map' | 'nav.board' | 'nav.quests' | 'nav.journal' | 'nav.shop'; primary?: boolean }[] = [
  { key: 'board', icon: 'icon.board', label: 'nav.board' },
  { key: 'map', icon: 'icon.map', label: 'nav.map' },
  { key: 'quests', icon: 'icon.quests', label: 'nav.quests' },
  { key: 'journal', icon: 'icon.journal', label: 'nav.journal' },
  { key: 'shop', icon: 'icon.shop', label: 'nav.shop' },
];

function NavItem({ tab, on, badge, dot, onPress, label }: { tab: (typeof TABS)[number]; on: boolean; badge: number; dot: boolean; onPress: () => void; label: string }) {
  const [targetRef, targetMeasure] = useMeasuredTarget(`tab.${tab.key}`);
  return (
    <Pressable ref={targetRef} onLayout={targetMeasure} onPress={onPress} style={[styles.navItem, tab.primary && styles.navPrimary]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
      <View style={[styles.navIcon, tab.primary && styles.navIconPrimary, on && styles.navIconOn]}>
        <Sprite id={tab.icon} size={tab.primary ? 34 : 28} />
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : dot ? (
          <Dot />
        ) : null}
      </View>
      <Text style={[styles.navLabel, on && styles.navLabelOn]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function BottomNav() {
  const { screen, setScreen, t, state, now } = useGame();
  const insets = useSafeAreaInsets();
  const ready = availableQuests(state).filter((q) => canComplete(state, q)).length;
  const collection = unclaimedCollection(state) > 0;
  const nodes = readyNodes(state, now).length > 0;
  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => (
        <NavItem
          key={tab.key}
          tab={tab}
          on={screen === tab.key}
          badge={tab.key === 'quests' ? ready : 0}
          dot={(tab.key === 'journal' && collection) || (tab.key === 'board' && (nodes || state.rewardStorage.length > 0) && screen !== 'board')}
          label={t(tab.label)}
          onPress={() => {
            if (screen === tab.key) return;
            play('select', 0.5);
            haptic.select();
            setScreen(tab.key);
          }}
        />
      ))}
    </View>
  );
}

export function Shell() {
  const g = useGame();
  const [shellRef, shellMeasure] = useMeasuredTarget('shell');
  const { state, screen, overlays, open, talk, dispatch, toasts, setScreen, moments, dismissMoment } = g;

  // Opening the screen a hint points to completes that hint.
  useEffect(() => {
    const done = state.tutorial.done;
    if (screen === 'map' && !done.includes('valley') && state.tutorial.done.includes('crateMerge')) dispatch({ type: 'tutorial', step: 'valley' });
    if (screen === 'quests' && !done.includes('quest') && done.includes('crateMerge')) dispatch({ type: 'tutorial', step: 'quest' });
    if (screen === 'journal' && !done.includes('collection') && unclaimedCollection(state) > 0) dispatch({ type: 'tutorial', step: 'collection' });
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  const busy = !!(overlays.dialogue || overlays.puzzle || overlays.structure || overlays.settings || overlays.memory || overlays.node || overlays.source || overlays.levelInfo || overlays.storage || overlays.energy || overlays.supply || overlays.premium || overlays.season || overlays.resource !== null);
  const moment = !overlays.dialogue && !overlays.puzzle ? moments[0] : undefined;

  // New story quests introduce themselves once, when nothing else is on screen.
  useEffect(() => {
    if (!state.flags.introDone || busy || moments.length) return;
    if (!state.tutorial.done.includes('crateMerge') && !state.tutorial.skipped) return; // let the first hints finish
    const q = availableQuests(state).find((x) => x.kind !== 'side' && !state.quests.seen.includes(x.id));
    if (q) {
      const h = setTimeout(() => talk(q.id, 'start'), 450);
      return () => clearTimeout(h);
    }
  }, [state, busy, moments.length, talk]);

  if (!state.flags.introDone) {
    return (
      <IntroScreen
        onDone={() => {
          dispatch({ type: 'flag', key: 'introDone' });
          setScreen('board');
          startMusic();
        }}
      />
    );
  }

  return (
    <View ref={shellRef} onLayout={shellMeasure} onTouchStart={event => captureRewardOrigin(event.nativeEvent.pageX, event.nativeEvent.pageY)} style={styles.root}>
      <TopBar />
      <Animated.View key={screen} entering={FadeIn.duration(160)} style={{ flex: 1 }}>
        {screen === 'map' ? <MapScreen /> : screen === 'board' ? <BoardScreen key={state.workshop.active} /> : screen === 'quests' ? <QuestsScreen /> : screen === 'journal' ? <JournalScreen /> : <ShopScreen />}
      </Animated.View>
      <BottomNav />
      <TutorialLayer blocked={busy || !!moment} />
      {overlays.premium ? <PremiumStore onClose={() => open('premium', false)} /> : null}
      {overlays.season ? <PremiumStore initialCategory="Battle Pass" onClose={() => open('season', false)} /> : null}
      {overlays.structure ? <StructureSheet id={overlays.structure} onClose={() => open('structure', null)} /> : null}
      {overlays.node ? <NodeSheet id={overlays.node} onClose={() => open('node', null)} /> : null}
      {overlays.storage ? <StorageSheet onClose={() => open('storage', false)} /> : null}
      {overlays.settings ? <SettingsSheet onClose={() => open('settings', false)} /> : null}
      {overlays.levelInfo ? <LevelModal onClose={() => open('levelInfo', false)} /> : null}
      {overlays.energy ? <EnergyModal onClose={() => open('energy', false)} /> : null}
      {overlays.resource !== null ? <ResourceSheet cell={overlays.resource} onClose={() => open('resource', null)} /> : null}
      {overlays.supply ? <SupplySheet onClose={() => open('supply', false)} /> : null}
      {overlays.source ? <SourceModal key={overlays.source} item={overlays.source} onClose={() => open('source', null)} /> : null}
      {overlays.puzzle ? <PuzzleScreen id={overlays.puzzle.id} onSolved={overlays.puzzle.onSolved} onClose={() => open('puzzle', null)} /> : null}
      {overlays.dialogue ? (
        <DialogueOverlay
          lines={overlays.dialogue.lines}
          onDone={() => {
            const then = overlays.dialogue?.then;
            open('dialogue', null);
            then?.();
          }}
        />
      ) : null}
      {moment ? <MomentCard key={JSON.stringify(moment)} moment={moment} onDone={dismissMoment} /> : null}
      {overlays.memory ? <MemoryOverlay id={overlays.memory} onDone={() => open('memory', null)} /> : null}
      <Toasts toasts={toasts} />
      <RewardFlights />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 6, gap: 6, backgroundColor: colors.paper, zIndex: 5, shadowColor: colors.sageDeep, shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  level: { width: 58, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.honeySoft, borderRadius: 16, borderWidth: 2, borderColor: colors.honeySurface, paddingVertical: 3 },
  levelStar: { alignItems: 'center', justifyContent: 'center' },
  levelNum: { position: 'absolute', top: 10, fontFamily: font.black, fontSize: 12, color: colors.honeyInk },
  xp: { width: 46, marginTop: 2 },
  pills: { flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'space-between' },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 40, paddingHorizontal: 4, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.border },
  pillValue: { fontFamily: font.black, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  pillGold: { backgroundColor: colors.honeySurface, borderColor: colors.honeyRim },
  pillToken: { backgroundColor: colors.tokenSoft, borderColor: colors.tokenRim },
  pillEnergy: { backgroundColor: colors.energySoft, borderColor: colors.energyEdge },
  pillSub: { fontFamily: font.bold, fontSize: 9.5, color: colors.inkSoft, marginTop: -2, fontVariant: ['tabular-nums'] },
  nav: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.paper, paddingTop: 6, paddingHorizontal: 4, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderTopWidth: 2, borderColor: colors.white, shadowColor: colors.sageDeep, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: -3 }, elevation: 8 },
  navItem: { flex: 1, alignItems: 'center', minHeight: 54 },
  navPrimary: { flex: 1.25 },
  navIcon: { width: 48, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  navIconPrimary: { width: 62, height: 48, borderRadius: 18, backgroundColor: colors.honeySoft },
  navIconOn: { backgroundColor: colors.sageSoft, borderWidth: 2, borderColor: colors.white },
  navLabel: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft, marginTop: 1 },
  navLabelOn: { color: colors.ink, fontFamily: font.black },
  badge: { position: 'absolute', top: -3, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.paper },
  badgeText: { color: colors.white, fontFamily: font.black, fontSize: 10 },
});
