import { useEffect, useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, Image as SkImage } from '@shopify/react-native-skia';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAP_W, REGION_H, REGIONS } from '../content/regions';
import { hashString } from '../core/rng';
import { CARD_PACKS, type PackExtra } from '../premium/cards';
import { sceneImage } from '../render/imageCache';
import { drawRegion } from '../render/map';
import { drawWorkshopPreview } from '../render/workshopSkin';
import { useGame } from '../state/GameProvider';
import { Button, Sprite } from '../ui/components';
import { font } from '../ui/theme';
import { regionView } from './MapScreen';

const chestArt = require('../../assets/art/premium/moon_chest.png');
const extraLabel = (extra: PackExtra) => `+${extra.amount} ${extra.kind === 'energy' ? 'ENERJİ' : extra.kind === 'gold' ? 'ALTIN' : 'KUTU'}`;
const extraIcon = (extra: PackExtra) => extra.kind === 'energy' ? 'icon.energy' : extra.kind === 'gold' ? 'icon.coin' : 'icon.gift';

/** A replayable presentation of rewards that were already committed by the engine. */
export function CardOpeningScreen({ onCollection }: { onCollection: () => void }) {
  const { state, dispatch, reduceMotion } = useGame();
  const insets = useSafeAreaInsets();
  const reveal = state.cardReveals?.[0];
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const turn = useSharedValue(0);
  const pulse = useSharedValue(1);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const motion = useAnimatedStyle(() => ({ transform: [{ perspective: 600 }, { rotateY: `${turn.value}deg` }, { scale: pulse.value }] }));
  if (!reveal) return null;
  const pack = CARD_PACKS.find(item => item.id === reveal.cardId);
  const title = reveal.kind === 'crateReward' ? 'Kutu Kartı' : reveal.kind === 'cratePack' ? 'Kutu Kartı Paketi' : `${pack?.name ?? 'Kart'} Paketi`;
  const scene = pack?.kind === 'theme' ? (() => { const view = { ...regionView(state, 1), theme: pack.target }; return sceneImage(`store-map:${hashString(JSON.stringify(view))}`, MAP_W, REGION_H, 0.45, cv => drawRegion(cv, REGIONS[0], view)); })() : pack?.kind === 'workshop' ? sceneImage(`workshop-preview-v2:${pack.target}`, 102, 102, 1.5, cv => drawWorkshopPreview(cv, pack.target)) : null;
  const done = reveal.shown >= reveal.total;
  const extra = reveal.kind === 'cosmetic' && reveal.shown > 2 ? reveal.extras?.[reveal.shown - 3] : undefined;
  const flip = () => {
    if (busy.current || done) return;
    busy.current = true;
    const result = dispatch({ type: 'advanceCardReveal', id: reveal.id, expectedShown: reveal.shown });
    if (!result.ok) { busy.current = false; return; }
    const duration = reduceMotion ? 40 : 160;
    turn.set(withSequence(withTiming(80, { duration }), withTiming(0, { duration })));
    pulse.set(withSequence(withTiming(1.07, { duration }), withTiming(1, { duration })));
    timer.current = setTimeout(() => { busy.current = false; }, duration * 2 + 30);
  };
  const finish = (collection: boolean) => {
    if (busy.current) return;
    if (dispatch({ type: 'finishCardReveal', id: reveal.id }).ok && collection) onCollection();
  };
  return <View style={styles.root} accessibilityViewIsModal>
    <Text style={styles.eyebrow}>LUMA VALLEY · KART KOLEKSİYONU</Text>
    <Text style={styles.title}>{title}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Açılışı kapat" onPress={() => finish(false)} style={[styles.close, { top: insets.top + 10 }]}><Text style={styles.closeText}>×</Text></Pressable>
    <View style={styles.halo} pointerEvents="none" />
    <Pressable accessibilityRole="button" accessibilityLabel={done ? 'Tüm kartlar açıldı' : `Kartı aç, ${reveal.total - reveal.shown} kaldı`} disabled={done} onPress={flip} style={styles.press}>
      <Animated.View entering={reduceMotion ? undefined : FadeInDown.duration(350)} style={[styles.card, motion]}>
        <View style={styles.counter}><Text style={styles.counterText}>{reveal.total - reveal.shown}</Text></View>
        {reveal.shown === 0 ? <View style={styles.back}><Text style={styles.backTop}>LUMA</Text><Image source={chestArt} resizeMode="contain" style={{ width: 174, height: 150 }} /><Text style={styles.backBottom}>V A L L E Y</Text></View> : <View style={styles.face}>
          {scene && pack && !extra ? <View style={styles.illustration}><Canvas style={{ width: 190, height: 178 }}><SkImage image={scene} x={0} y={pack.kind === 'theme' ? -55 : 0} width={190} height={pack.kind === 'theme' ? REGION_H * 190 / MAP_W : 178} fit="fill" /></Canvas></View> : <View style={[styles.illustration, styles.crateArt]}><View style={styles.crateGlow} /><Text style={styles.crateSparkleLeft}>✦</Text><Text style={styles.crateSparkleRight}>✧</Text><View style={styles.cratePedestal} /><Sprite id={extra ? extraIcon(extra) : "icon.gift"} size={112} /></View>}
          <Text style={styles.cardTitle}>{extra ? extraLabel(extra) : reveal.kind === 'crateReward' ? `+${reveal.crates} KUTU` : reveal.kind === 'cratePack' ? 'Kutu Kartı' : pack?.name}</Text>
          <Text style={styles.cardSub}>{extra ? 'Bakiyene eklendi' : reveal.kind === 'crateReward' ? 'Kutu sayacına eklendi' : '+1 Kart'}</Text>
          {reveal.kind === 'cosmetic' && !extra ? <Text style={styles.progress}>Koleksiyon: {reveal.before + reveal.shown - 1}/10 → {reveal.before + reveal.shown}/10</Text> : null}
        </View>}
      </Animated.View>
    </Pressable>
    <Text style={styles.hint}>{done ? 'Tüm ödüller koleksiyonuna kaydedildi.' : 'Açmak için karta dokun'}</Text>
    {done ? <View style={styles.actions}>{reveal.extras ? <Text style={styles.summary}>2 kart · {reveal.extras.map(extraLabel).join(' · ')}</Text> : null}<Button label="Koleksiyona Git" onPress={() => finish(true)} /><Button tone="cream" label="Mağazaya Dön" onPress={() => finish(false)} /></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E292D', padding: 20 },
  eyebrow: { color: '#C7ACED', fontFamily: font.black, fontSize: 11, letterSpacing: 1, textAlign: 'center' },
  title: { color: '#FFF5DD', fontFamily: font.black, fontSize: 23, textAlign: 'center', marginTop: 8, marginBottom: 28 },
  close: { position: 'absolute', right: 20, top: 20, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#3A4A49' },
  closeText: { color: '#F5F0E4', fontSize: 27, fontFamily: font.bold },
  halo: { position: 'absolute', width: 310, height: 310, borderRadius: 155, backgroundColor: '#584E71', opacity: 0.35 },
  press: { width: 230, height: 325 }, card: { flex: 1, borderRadius: 24, borderWidth: 3, borderColor: '#DCBD7A', backgroundColor: '#48405A', overflow: 'visible' },
  counter: { position: 'absolute', zIndex: 2, right: -12, top: -12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8BE69', borderWidth: 3, borderColor: '#FFF0C9' },
  counterText: { color: '#493617', fontFamily: font.black, fontSize: 19 },
  back: { flex: 1, margin: 9, borderRadius: 15, borderWidth: 1.5, borderColor: '#AE93CA', backgroundColor: '#5B4B70', alignItems: 'center', justifyContent: 'center', gap: 18 },
  backTop: { fontFamily: font.black, fontSize: 25, letterSpacing: 4, color: '#F5DFAB' }, backBottom: { fontFamily: font.black, fontSize: 12, color: '#E7D9EF' },
  face: { flex: 1, backgroundColor: '#F8F1DF', borderRadius: 20, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 5 },
  illustration: { width: 190, height: 178, borderRadius: 14, backgroundColor: '#D6DFE1', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  crateArt: { backgroundColor: '#54446C', borderWidth: 2, borderColor: '#D6B973' },
  crateGlow: { position: 'absolute', width: 146, height: 146, borderRadius: 73, backgroundColor: '#D9AC63', opacity: 0.28 },
  cratePedestal: { position: 'absolute', bottom: 23, width: 134, height: 28, borderRadius: 70, backgroundColor: '#302C50', borderWidth: 2, borderColor: '#AD9368' },
  crateSparkleLeft: { position: 'absolute', top: 22, left: 24, color: '#F7DE9B', fontSize: 27 },
  crateSparkleRight: { position: 'absolute', top: 31, right: 24, color: '#EBD1F5', fontSize: 25 },
  cardTitle: { textAlign: 'center', color: '#30443C', fontFamily: font.black, fontSize: 16 }, cardSub: { color: '#705490', fontFamily: font.black, fontSize: 14 }, progress: { color: '#54655A', fontFamily: font.bold, fontSize: 12 },
  summary: { color: '#F5DFAB', fontFamily: font.bold, textAlign: 'center', fontSize: 11 },
  hint: { color: '#D8DFD5', fontFamily: font.bold, fontSize: 13, marginTop: 22, textAlign: 'center' }, actions: { marginTop: 15, width: 230, gap: 8 },
});
