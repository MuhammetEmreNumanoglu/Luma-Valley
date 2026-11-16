import { themedStyles, font, radius, FILL } from '../ui/theme';
// Light Paths overlay: tap tiles to turn them; undo, reset, hints. Solving is verified by the
// engine (the rotations are re-checked), then rewards and stars are shown.
import { Canvas, Group, Picture, Skia } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BALANCE } from '../content/balance';
import { haptic, play } from '../feedback';
import { getPuzzle } from '../puzzles/levels';
import { hintTile, isSolved, propagate, rotateMask, rotateTile, starsFor, canRotate, type Puzzle } from '../puzzles/lightpaths';
import { drawPuzzle, drawTile } from '../render/puzzle';
import { useGame } from '../state/GameProvider';
import { Button, Sprite } from '../ui/components';
import { Rays } from '../ui/Rays';


export function PuzzleScreen({ id, onClose, onSolved }: { id: string; onClose: () => void; onSolved?: () => void }) {
  const { t, dispatch, state } = useGame();
  const insets = useSafeAreaInsets();
  const initial = useMemo(() => getPuzzle(id), [id]);
  const [p, setP] = useState<Puzzle>(initial);
  const [history, setHistory] = useState<Puzzle[]>([]);
  const [moves, setMoves] = useState(0);
  const [hint, setHint] = useState<number | null>(null);
  const [anim, setAnim] = useState<{ i: number; key: number } | null>(null);
  const [done, setDone] = useState<{ stars: number } | null>(null);
  // Set the moment the engine accepts the solve: later taps can neither rotate tiles nor solve
  // (and reward) again, and the result card is created exactly once.
  const [solved, setSolved] = useState(false);
  const [area, setArea] = useState({ w: 360, h: 500 });
  const rot = useSharedValue(0);

  const s = Math.floor(Math.min((area.w - 40) / p.w, (area.h - 40) / p.h, 74));
  const bw = p.w * s;
  const bh = p.h * s;
  const lit = useMemo(() => propagate(p), [p]);
  const targets = p.tiles.filter((x) => x.kind === 'target');
  const okTargets = p.tiles.filter((x, i) => x.kind === 'target' && lit[i] === 1 << x.color).length;
  const wrong = p.tiles.some((x, i) => x.kind === 'target' && lit[i] !== 0 && lit[i] !== 1 << x.color);

  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(-20, -20, bw + 40, bh + 40));
    drawPuzzle(c, p, lit, s, anim?.i ?? null, hint);
    return rec.finishRecordingAsPicture();
  }, [p, lit, s, anim, hint, bw, bh]);

  // The tile being turned is drawn separately so it can rotate smoothly.
  const tilePicture = useMemo(() => {
    if (!anim) return null;
    const t0 = p.tiles[anim.i];
    const prevMask = rotateMask(t0.mask, (t0.rot + 3) & 3);
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, s, s));
    drawTile(c, { ...t0 }, prevMask, 0, s);
    return rec.finishRecordingAsPicture();
  }, [anim, p, s]);
  const tileTransform = useDerivedValue(() => {
    const i = anim?.i ?? 0;
    const x = (i % p.w) * s;
    const y = Math.floor(i / p.w) * s;
    return [{ translateX: x + s / 2 }, { translateY: y + s / 2 }, { rotate: (rot.value * Math.PI) / 2 }, { translateX: -s / 2 }, { translateY: -s / 2 }];
  }, [anim, p.w, s]);

  useEffect(() => {
    if (!anim) return;
    rot.value = 0;
    rot.value = withTiming(1, { duration: state.settings.reduceMotion ? 1 : 130, easing: Easing.out(Easing.quad) });
    const h = setTimeout(() => setAnim(null), state.settings.reduceMotion ? 10 : 140);
    return () => clearTimeout(h);
  }, [anim, rot, state.settings.reduceMotion]);

  const tap = useCallback(
    (x: number, y: number) => {
      if (done || solved) return;
      const cx = Math.floor(x / s);
      const cy = Math.floor(y / s);
      if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx < 0 || cy < 0 || cx >= p.w || cy >= p.h) return;
      const i = cy * p.w + cx;
      if (!p.tiles[i] || !canRotate(p.tiles[i])) {
        haptic.warn();
        return;
      }
      const next = rotateTile(p, i);
      setHistory((h) => [...h.slice(-60), p]);
      setP(next);
      setMoves((m) => m + 1);
      setHint(null);
      setAnim({ i, key: Date.now() });
      play('rotate', 0.6);
      haptic.light();
      if (isSolved(next)) {
        const res = dispatch({ type: 'solvePuzzle', id, rotations: next.tiles.map((tt) => tt.rot), moves: moves + 1 });
        if (res.ok) {
          setSolved(true);
          const stars = starsFor(moves + 1, p.par);
          setTimeout(() => setDone((prev) => prev ?? { stars }), 380);
        }
      }
    },
    [done, solved, s, p, dispatch, id, moves],
  );

  const tapGesture = useMemo(() => Gesture.Tap().runOnJS(true).maxDuration(500).onEnd((e) => tap(e.x, e.y)), [tap]);

  const undo = () => {
    if (!history.length || done || solved) return;
    setP(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m + 1);
    setHint(null);
  };
  const reset = () => {
    if (done || solved) return;
    setHistory([]);
    setP(initial);
    setMoves(0);
    setHint(null);
  };
  const askHint = () => {
    if (done) return;
    const target = hintTile(p);
    if (target === null) return;
    const r = dispatch({ type: 'useHint' });
    if (r.ok) {
      setHint(target);
      play('select', 0.6);
    }
  };
  const freeLeft = BALANCE.puzzle.freeHintsPerDay - state.hintsDay;
  const title = id.startsWith('echo-') ? t('puzzle.echoTitle') : t('puzzle.title', { n: Number(id.slice(2)) });

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.header}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>
            {t('puzzle.moves', { n: moves })} · {t('puzzle.par', { n: p.par })} · {t('puzzle.lit', { a: okTargets, b: targets.length })}
          </Text>
        </View>
      </View>
      <Text style={styles.help}>{wrong ? t('puzzle.wrongColor') : t('puzzle.help')}</Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onLayout={(e: LayoutChangeEvent) => setArea({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
        <GestureDetector gesture={tapGesture}>
          <View style={{ width: bw, height: bh }} accessibilityLabel={title}>
            <Canvas style={{ width: bw, height: bh }}>
              <Picture picture={picture} />
              {tilePicture ? (
                <Group transform={tileTransform}>
                  <Picture picture={tilePicture} />
                </Group>
              ) : null}
            </Canvas>
          </View>
        </GestureDetector>
      </View>
      <View style={styles.controls}>
        <Button tone="night" icon="icon.undo" label={t('puzzle.undo')} onPress={undo} disabled={!history.length} small />
        <Button tone="night" icon="icon.reset" label={t('puzzle.reset')} onPress={reset} small />
        <Button tone="honey" icon="icon.hint" label={freeLeft > 0 ? t('puzzle.hintFree', { n: freeLeft }) : t('puzzle.hintCost', { n: BALANCE.puzzle.hintCoins })} onPress={askHint} small />
      </View>
      {done ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.doneScrim}>
          {/* Static rays and a single short settle: the card opens once and then stays still. */}
          <Rays size={480} reduce />
          <SolvedCard reduce={state.settings.reduceMotion} style={styles.doneCard}>
            <Text style={styles.doneTitle}>{t('puzzle.solved')}</Text>
            <FillingStars n={done.stars} size={44} reduce={state.settings.reduceMotion} />
            <Text style={styles.doneSub}>{t('puzzle.moves', { n: moves })}</Text>
            <Button
              label={t('puzzle.continue')}
              onPress={() => {
                onClose();
                onSolved?.();
              }}
              style={{ alignSelf: 'stretch', marginTop: 12 }}
            />
          </SolvedCard>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Interval between stars filling (ms); three stars finish in ~0.5 s. */
export const STAR_STEP_MS = 120;
const STAR_POP_MS = 140;

/** The result card: fades in with a 4% settle (no spring, no loop), then never moves again. */
function SolvedCard({ reduce, style, children }: { reduce: boolean; style: object; children: React.ReactNode }) {
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => { if (!reduce) k.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }); }, [k, reduce]);
  const anim = useAnimatedStyle(() => ({ opacity: k.value, transform: [{ scale: 0.96 + 0.04 * k.value }] }));
  return <Animated.View style={[style, anim]} accessibilityViewIsModal>{children}</Animated.View>;
}

/** Three star slots; the earned ones fill left to right, one every STAR_STEP_MS, once. */
function FillingStars({ n, size, reduce }: { n: number; size: number; reduce: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`${n}/3`}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={{ width: size, height: size }}>
          <Sprite id="icon.star" size={size} silhouette />
          {i < n ? <FilledStar index={i} size={size} reduce={reduce} /> : null}
        </View>
      ))}
    </View>
  );
}

function FilledStar({ index, size, reduce }: { index: number; size: number; reduce: boolean }) {
  const k = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    k.value = withDelay(120 + index * STAR_STEP_MS, withTiming(1, { duration: STAR_POP_MS, easing: Easing.out(Easing.back(1.4)) }));
    { const h = setTimeout(() => play('coin', 0.35), 120 + index * STAR_STEP_MS); return () => clearTimeout(h); }
  }, [k, index, reduce]);
  const anim = useAnimatedStyle(() => ({ opacity: Math.min(1, k.value * 1.5), transform: [{ scale: 0.55 + 0.45 * k.value }] }));
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, anim]}><Sprite id="icon.star" size={size} /></Animated.View>;
}

const styles = themedStyles((colors) => StyleSheet.create({
  root: { ...FILL, backgroundColor: colors.night, paddingHorizontal: 14, zIndex: 20, elevation: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  close: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gloss, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.nightText, fontSize: 20, fontFamily: font.black },
  title: { fontFamily: font.black, fontSize: 20, color: colors.nightText },
  sub: { fontFamily: font.medium, fontSize: 12, color: colors.nightMuted },
  help: { fontFamily: font.medium, fontSize: 12, color: colors.nightMuted, marginTop: 8, lineHeight: 17 },
  controls: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  doneScrim: { ...FILL, backgroundColor: colors.scrimDeep, alignItems: 'center', justifyContent: 'center', padding: 24 },
  doneCard: { width: '100%', maxWidth: 340, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: colors.white, borderBottomWidth: 5, borderBottomColor: colors.borderDeep, shadowColor: colors.shadowInk, shadowOpacity: 0.3, shadowRadius: 18, elevation: 10 },
  doneTitle: { fontFamily: font.black, fontSize: 22, color: colors.ink },
  doneSub: { fontFamily: font.medium, fontSize: 14, color: colors.inkSoft },
}));
