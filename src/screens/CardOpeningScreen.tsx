import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image as SkImage } from '@shopify/react-native-skia';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAP_W, REGION_H, REGIONS } from '../content/regions';
import { hashString } from '../core/rng';
import type { StringKey } from '../i18n/strings';
import { CARD_PACKS, type PackExtra } from '../premium/cards';
import { sceneImage } from '../render/imageCache';
import { drawRegion } from '../render/map';
import { drawWorkshopPreview } from '../render/workshopSkin';
import { useGame } from '../state/GameProvider';
import { Button, Sprite } from '../ui/components';
import { Rays } from '../ui/Rays';
import { font } from '../ui/theme';
import { regionView } from './MapScreen';

const chestOpenArt = require('../../assets/art/premium/moon_chest.png');
const chestClosedArt = require('../../assets/art/premium/chest_closed.png');
type T = (key: StringKey, vars?: Record<string, string | number>) => string;
const extraLabel = (t: T, extra: PackExtra) => t(extra.kind === 'energy' ? 'cardOpen.energy' : extra.kind === 'gold' ? 'cardOpen.gold' : 'cardOpen.crates', { n: extra.amount });
const extraIcon = (extra: PackExtra) => extra.kind === 'energy' ? 'icon.energy' : extra.kind === 'gold' ? 'icon.coin' : 'icon.gift';

/** Four-point sparkle drawn from two thin diamonds (no glyphs or emoji). */
function Sparkle({ size, color, style }: { size: number; color: string; style?: object }) {
  return <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
    <View style={{ position: 'absolute', width: size * 0.26, height: size, borderRadius: size, backgroundColor: color }} />
    <View style={{ position: 'absolute', width: size, height: size * 0.26, borderRadius: size, backgroundColor: color }} />
    <View style={{ position: 'absolute', width: size * 0.34, height: size * 0.34, borderRadius: size, backgroundColor: '#FFFFFF', opacity: 0.85 }} />
  </View>;
}

// Chest timeline (ms): drop in, then on tap a short shake, a light burst while the closed chest
// becomes the open one, and the first card rises out of it.
const DROP = 560, SHAKE = 4 * 70, BURST = 420, RISE = 420;

/** A replayable presentation of rewards that were already committed by the engine. */
export function CardOpeningScreen({ onCollection }: { onCollection: () => void }) {
  const { state, dispatch, reduceMotion, t } = useGame();
  const insets = useSafeAreaInsets();
  const reveal = state.cardReveals?.[0];
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // 'chest' while the chest is closed or opening; 'cards' once the first card has risen out of it.
  const [phase, setPhase] = useState<'chest' | 'cards'>(reveal && reveal.shown > 0 ? 'cards' : 'chest');
  const [opened, setOpened] = useState(false);
  const turn = useSharedValue(0);
  const pulse = useSharedValue(1);
  const drop = useSharedValue(reduceMotion ? 0 : -460);
  const bob = useSharedValue(0);
  const shake = useSharedValue(0);
  const lift = useSharedValue(1);
  const openMix = useSharedValue(0);
  const burst = useSharedValue(0);
  const rise = useSharedValue(reveal && reveal.shown > 0 ? 1 : 0);
  const later = (ms: number, fn: () => void) => { timers.current.push(setTimeout(fn, ms)); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);
  useEffect(() => {
    if (reduceMotion || phase !== 'chest') return;
    drop.value = withTiming(0, { duration: DROP, easing: Easing.out(Easing.back(1.5)) });
    bob.value = withDelay(DROP, withRepeat(withSequence(withTiming(-7, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })), -1, false));
    return () => cancelAnimation(bob);
    // Runs once per opening; shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);
  const motion = useAnimatedStyle(() => ({ opacity: rise.value < 0.05 ? 0 : 1, transform: [{ translateY: (1 - rise.value) * 120 }, { perspective: 600 }, { rotateY: `${turn.value}deg` }, { scale: pulse.value * (0.3 + 0.7 * rise.value) }] }));
  const chestMotion = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value + bob.value + (1 - lift.value) * 40 }, { rotate: `${shake.value}deg` }, { scale: 0.92 + 0.08 * lift.value }] }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: 1 - openMix.value }));
  const openStyle = useAnimatedStyle(() => ({ opacity: openMix.value }));
  const burstStyle = useAnimatedStyle(() => ({ opacity: burst.value > 0 ? (1 - burst.value) * 0.95 : 0, transform: [{ scale: 0.2 + burst.value * 2.6 }] }));
  const chestFade = useAnimatedStyle(() => ({ opacity: 1 - rise.value * 0.85, transform: [{ translateY: rise.value * 150 }, { scale: 1 - rise.value * 0.35 }] }));
  if (!reveal) return null;
  const pack = CARD_PACKS.find(item => item.id === reveal.cardId);
  const title = reveal.kind === 'crateReward' ? t('cardOpen.crateCard') : reveal.kind === 'cratePack' ? t('cardOpen.cratePack') : t('cardOpen.pack', { name: pack?.name ?? t('cardOpen.card') });
  const scene = pack?.kind === 'theme' ? (() => { const view = { ...regionView(state, 1), theme: pack.target }; return sceneImage(`store-map:${hashString(JSON.stringify(view))}`, MAP_W, REGION_H, 0.45, cv => drawRegion(cv, REGIONS[0], view)); })() : pack?.kind === 'workshop' ? sceneImage(`workshop-preview-v2:${pack.target}`, 102, 102, 1.5, cv => drawWorkshopPreview(cv, pack.target)) : null;
  const done = reveal.shown >= reveal.total;
  const extra = reveal.kind === 'cosmetic' && reveal.shown > 2 ? reveal.extras?.[reveal.shown - 3] : undefined;
  const showChest = phase === 'chest' || reveal.shown === 0;
  const remaining = reveal.total - reveal.shown;
  const openChest = () => {
    if (busy.current || reveal.shown > 0) return;
    busy.current = true;
    // The reward is already in the save; this only advances the presentation, exactly once.
    const result = dispatch({ type: 'advanceCardReveal', id: reveal.id, expectedShown: 0 });
    if (!result.ok) { busy.current = false; return; }
    setOpened(true);
    if (reduceMotion) {
      openMix.value = withTiming(1, { duration: 60 });
      rise.value = withTiming(1, { duration: 80 });
      later(90, () => { setPhase('cards'); busy.current = false; });
      return;
    }
    cancelAnimation(bob); bob.value = withTiming(0, { duration: 120 });
    shake.value = withSequence(withTiming(-7, { duration: 70 }), withTiming(7, { duration: 70 }), withTiming(-5, { duration: 70 }), withTiming(0, { duration: 70 }));
    lift.value = withSequence(withTiming(0.8, { duration: SHAKE, easing: Easing.out(Easing.quad) }), withTiming(1.08, { duration: 160, easing: Easing.out(Easing.back(2)) }), withTiming(1, { duration: 160 }));
    openMix.value = withDelay(SHAKE + 40, withTiming(1, { duration: 140 }));
    burst.value = withDelay(SHAKE, withTiming(1, { duration: BURST, easing: Easing.out(Easing.cubic) }));
    rise.value = withDelay(SHAKE + BURST - 80, withTiming(1, { duration: RISE, easing: Easing.out(Easing.back(1.3)) }));
    later(SHAKE + BURST - 80, () => setPhase('cards'));
    later(SHAKE + BURST + RISE, () => { busy.current = false; });
  };
  const flip = () => {
    if (busy.current || done) return;
    busy.current = true;
    const result = dispatch({ type: 'advanceCardReveal', id: reveal.id, expectedShown: reveal.shown });
    if (!result.ok) { busy.current = false; return; }
    const duration = reduceMotion ? 40 : 160;
    turn.set(withSequence(withTiming(80, { duration }), withTiming(0, { duration })));
    pulse.set(withSequence(withTiming(1.07, { duration }), withTiming(1, { duration })));
    later(duration * 2 + 30, () => { busy.current = false; });
  };
  const finish = (collection: boolean) => {
    if (dispatch({ type: 'finishCardReveal', id: reveal.id }).ok && collection) onCollection();
  };
  return <View style={styles.root} accessibilityViewIsModal>
    <Text style={styles.eyebrow}>{t('cardOpen.eyebrow')}</Text>
    <Text style={styles.title}>{title}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('cardOpen.close')} onPress={() => finish(false)} style={[styles.close, { top: insets.top + 10 }]}><Text style={styles.closeText}>×</Text></Pressable>
    <View style={styles.halo} pointerEvents="none" />
    <View style={styles.stage}>
      <Rays size={430} color="#F5DFAB" reduce={reduceMotion} />
      {showChest ? <Animated.View pointerEvents="none" style={[styles.chestWrap, chestFade]}>
        <Animated.View style={[styles.chestBox, chestMotion]}>
          <Animated.Image source={chestClosedArt} resizeMode="contain" style={[styles.chestImg, styles.chestClosed, closedStyle]} />
          <Animated.Image source={chestOpenArt} resizeMode="contain" style={[styles.chestImg, openStyle]} />
        </Animated.View>
        <View style={styles.chestShadow} />
        {!opened ? <><Sparkle size={18} color="#F7DE9B" style={{ top: 52, left: 24 }} /><Sparkle size={13} color="#EBD1F5" style={{ top: 30, right: 36 }} /><Sparkle size={10} color="#F7DE9B" style={{ top: 96, right: 18 }} /></> : null}
      </Animated.View> : null}
      <Animated.View pointerEvents="none" style={[styles.burst, burstStyle]} />
      {reveal.shown === 0 ? <Pressable accessibilityRole="button" accessibilityLabel={t('cardOpen.openChest')} onPress={openChest} style={styles.chestHit} /> : null}
      {phase === 'cards' && reveal.shown > 0 ? <Pressable accessibilityRole="button" accessibilityLabel={done ? t('cardOpen.allOpened') : t('cardOpen.openCard', { n: remaining })} disabled={done} onPress={flip} style={styles.press}>
        {remaining > 0 ? <View pointerEvents="none" style={[styles.stackCard, { transform: [{ translateX: 10 }, { translateY: 8 }, { rotate: '5deg' }] }]} /> : null}
        {remaining > 1 ? <View pointerEvents="none" style={[styles.stackCard, { transform: [{ translateX: -9 }, { translateY: 10 }, { rotate: '-4deg' }] }]} /> : null}
        <Animated.View style={[styles.card, motion]}>
          <View style={styles.counter}><Text style={styles.counterText}>{remaining}</Text></View>
          <View style={styles.face}>
            {scene && pack && !extra ? <View style={styles.illustration}><Canvas style={{ width: 190, height: 178 }}><SkImage image={scene} x={0} y={pack.kind === 'theme' ? -55 : 0} width={190} height={pack.kind === 'theme' ? REGION_H * 190 / MAP_W : 178} fit="fill" /></Canvas></View> : <View style={[styles.illustration, styles.crateArt]}><View style={styles.crateGlow} /><Sparkle size={22} color="#F7DE9B" style={{ top: 22, left: 24 }} /><Sparkle size={17} color="#EBD1F5" style={{ top: 31, right: 26 }} /><View style={styles.cratePedestal} /><Sprite id={extra ? extraIcon(extra) : 'icon.gift'} size={112} /></View>}
            <Text style={styles.cardTitle}>{extra ? extraLabel(t, extra) : reveal.kind === 'crateReward' ? t('cardOpen.crates', { n: reveal.crates ?? 0 }) : reveal.kind === 'cratePack' ? t('cardOpen.crateCard') : pack?.name}</Text>
            <Text style={styles.cardSub}>{extra ? t('cardOpen.addedBalance') : reveal.kind === 'crateReward' ? t('cardOpen.addedCrates') : t('cardOpen.plusCard')}</Text>
            {reveal.kind === 'cosmetic' && !extra ? <Text style={styles.progress}>{t('cardOpen.progress', { a: reveal.before + reveal.shown - 1, b: reveal.before + reveal.shown })}</Text> : null}
          </View>
        </Animated.View>
      </Pressable> : null}
    </View>
    <Text style={styles.hint}>{done ? t('cardOpen.saved') : reveal.shown === 0 ? t('cardOpen.tapChest') : t('cardOpen.tapCard')}</Text>
    {done ? <View style={styles.actions}>{reveal.extras ? <Text style={styles.summary}>{[t('cardOpen.twoCards'), ...reveal.extras.map((x) => extraLabel(t, x))].join(' · ')}</Text> : null}<Button label={t('cardOpen.toCollection')} onPress={() => finish(true)} /><Button tone="cream" label={t('cardOpen.toStore')} onPress={() => finish(false)} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E292D', padding: 20 },
  eyebrow: { color: '#C7ACED', fontFamily: font.black, fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  title: { color: '#FFF5DD', fontFamily: font.black, fontSize: 23, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  close: { position: 'absolute', right: 20, top: 20, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3A4A49' },
  closeText: { color: '#F5F0E4', fontSize: 27, fontFamily: font.bold },
  halo: { position: 'absolute', width: 310, height: 310, borderRadius: 155, backgroundColor: '#584E71', opacity: 0.35 },
  stage: { width: 300, height: 340, alignItems: 'center', justifyContent: 'center' },
  chestWrap: { position: 'absolute', width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  chestBox: { width: 230, height: 214 },
  chestImg: { position: 'absolute', width: 230, height: 214 },
  chestClosed: { width: 200, height: 186, left: 15, top: 22 },
  chestShadow: { position: 'absolute', bottom: 14, width: 170, height: 22, borderRadius: 85, backgroundColor: '#000000', opacity: 0.22, zIndex: -1 },
  chestHit: { position: 'absolute', width: 260, height: 300 },
  burst: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: '#FFF2C9' },
  stackCard: { position: 'absolute', width: 230, height: 325, borderRadius: 24, borderWidth: 3, borderColor: '#B89A5E', backgroundColor: '#5B4B70' },
  press: { width: 230, height: 325 }, card: { flex: 1, borderRadius: 24, borderWidth: 3, borderColor: '#DCBD7A', backgroundColor: '#48405A', overflow: 'visible' },
  counter: { position: 'absolute', zIndex: 2, right: -12, top: -12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8BE69', borderWidth: 3, borderColor: '#FFF0C9' },
  counterText: { color: '#493617', fontFamily: font.black, fontSize: 19 },
  face: { flex: 1, backgroundColor: '#F8F1DF', borderRadius: 20, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  illustration: { width: 190, height: 178, borderRadius: 14, backgroundColor: '#D6DFE1', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  crateArt: { backgroundColor: '#54446C', borderWidth: 2, borderColor: '#D6B973' },
  crateGlow: { position: 'absolute', width: 146, height: 146, borderRadius: 73, backgroundColor: '#D9AC63', opacity: 0.28 },
  cratePedestal: { position: 'absolute', bottom: 23, width: 134, height: 28, borderRadius: 70, backgroundColor: '#302C50', borderWidth: 2, borderColor: '#AD9368' },
  cardTitle: { textAlign: 'center', color: '#30443C', fontFamily: font.black, fontSize: 16 }, cardSub: { color: '#705490', fontFamily: font.black, fontSize: 14 }, progress: { color: '#54655A', fontFamily: font.bold, fontSize: 12 },
  summary: { color: '#F5DFAB', fontFamily: font.bold, textAlign: 'center', fontSize: 11 },
  hint: { color: '#D8DFD5', fontFamily: font.bold, fontSize: 13, marginTop: 22, textAlign: 'center' }, actions: { marginTop: 15, width: 230, gap: 8 },
});
