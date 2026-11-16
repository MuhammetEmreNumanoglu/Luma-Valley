// Region opening, shown once per region on the valley map: the camera glides to the new region
// (MapScreen), soft clouds part, then the region name and its intro line appear. Skippable at any
// moment; with reduce motion the clouds are skipped and the card appears at once.
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { REGIONS } from '../content/regions';
import { regionalIdentity } from '../content/regionIdentity';
import { hash01 } from '../core/rng';
import { useGame } from '../state/GameProvider';
import { Button, Sprite } from '../ui/components';
import { font, radius, themedStyles } from '../ui/theme';

/** Cloud parting duration (ms); the card follows shortly before it ends. */
export const REVEAL_CLOUD_MS = 1400;
const CARD_DELAY_MS = 900;

export function RegionReveal({ region, onDone }: { region: number; onDone: () => void }) {
  const { t, c, state, reduceMotion } = useGame();
  const lang = state.settings.lang === 'en' ? 'en' : 'tr';
  const name = regionalIdentity(REGIONS[region - 1] ?? { id: region })?.label[lang] ?? c(`region.${region}`);
  const clouds = useMemo(() => Array.from({ length: 16 }, (_, i) => ({ x: (i % 4 + 0.15 + hash01(region * 31 + i, 1) * 0.7) / 4, y: (Math.floor(i / 4) + 0.1 + hash01(region * 31 + i, 2) * 0.8) / 4, r: 0.42 + hash01(region * 31 + i, 3) * 0.24 })), [region]);
  const k = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => { if (!reduceMotion) k.value = withTiming(1, { duration: REVEAL_CLOUD_MS, easing: Easing.inOut(Easing.quad) }); }, [k, reduceMotion]);
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(220)} style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      {reduceMotion ? null : clouds.map((cl, i) => <Cloud key={i} {...cl} k={k} />)}
      <Animated.View entering={reduceMotion ? FadeIn.duration(120) : FadeIn.delay(CARD_DELAY_MS).duration(300)} style={styles.card} accessibilityLiveRegion="polite">
        <Sprite id="icon.map" size={40} />
        <Text style={styles.kicker}>{t('celebrate.region')}</Text>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.line}>{c(`region.${region}.intro`)}</Text>
        <Button label={t('celebrate.continue')} onPress={onDone} style={{ alignSelf: 'stretch', marginTop: 8 }} />
      </Animated.View>
      <View style={styles.skipWrap} pointerEvents="box-none">
        <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('reveal.skip')} style={styles.skip}>
          <Text style={styles.skipText}>{t('reveal.skip')}</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

/** One soft cloud that drifts away from the centre and fades as the region appears. */
function Cloud({ x, y, r, k }: { x: number; y: number; r: number; k: { value: number } }) {
  const dir = x < 0.5 ? -1 : 1;
  const style = useAnimatedStyle(() => ({
    opacity: 0.95 * (1 - k.value),
    transform: [{ translateX: dir * k.value * 260 }, { translateY: (y - 0.5) * k.value * 120 }, { scale: 1 + k.value * 0.25 }],
  }));
  return <Animated.View pointerEvents="none" style={[styles.cloud, { left: `${x * 100 - r * 50}%`, top: `${y * 100 - r * 40}%`, width: `${r * 100}%`, aspectRatio: 1.5, borderRadius: 999 }, style]} />;
}

const styles = themedStyles((colors) => StyleSheet.create({
  cloud: { position: 'absolute', backgroundColor: '#F4F1F8', borderWidth: 6, borderColor: 'rgba(255,255,255,0.7)' },
  card: { position: 'absolute', left: 28, right: 28, top: '30%', backgroundColor: colors.paper, borderRadius: radius.l, padding: 18, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: colors.honey, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  kicker: { fontFamily: font.bold, fontSize: 13, color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontFamily: font.black, fontSize: 24, color: colors.ink, textAlign: 'center' },
  line: { fontFamily: font.regular, fontSize: 15, color: colors.ink, textAlign: 'center', lineHeight: 21 },
  skipWrap: { position: 'absolute', top: 92, right: 12 },
  skip: { backgroundColor: 'rgba(30,40,36,0.72)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, minHeight: 36, justifyContent: 'center' },
  skipText: { fontFamily: font.bold, fontSize: 14, color: '#FFFFFF' },
}));
