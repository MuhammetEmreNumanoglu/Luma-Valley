// Light Paths overlay: tap tiles to turn them; undo, reset, hints. Solving is verified by the
// engine (the rotations are re-checked), then rewards and stars are shown.
import { Canvas, Group, Picture, Skia } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, ZoomIn, useDerivedValue, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BALANCE } from '../content/balance';
import { haptic, play } from '../feedback';
import { getPuzzle } from '../puzzles/levels';
import { hintTile, isSolved, propagate, rotateMask, rotateTile, starsFor, canRotate, type Puzzle } from '../puzzles/lightpaths';
import { drawPuzzle, drawTile } from '../render/puzzle';
import { useGame } from '../state/GameProvider';
import { Button, Stars } from '../ui/components';
import { Rays } from '../ui/Rays';
import { colors, font, radius, FILL } from '../ui/theme';

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
      if (done) return;
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
        if (res.ok) setTimeout(() => setDone({ stars: starsFor(moves + 1, p.par) }), 380);
      }
    },
    [done, s, p, dispatch, id, moves],
  );

  const tapGesture = useMemo(() => Gesture.Tap().runOnJS(true).maxDuration(500).onEnd((e) => tap(e.x, e.y)), [tap]);

  const undo = () => {
    if (!history.length || done) return;
    setP(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => m + 1);
    setHint(null);
  };
  const reset = () => {
    if (done) return;
    setHistory((h) => [...h, p]);
    setP(initial);
    setMoves((m) => m + 1);
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
          <Rays size={480} reduce={state.settings.reduceMotion} />
          <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.doneCard}>
            <Text style={styles.doneTitle}>{t('puzzle.solved')}</Text>
            <Stars n={done.stars} size={44} />
            <Text style={styles.doneSub}>{t('puzzle.moves', { n: moves })}</Text>
            <Button
              label={t('puzzle.continue')}
              onPress={() => {
                onClose();
                onSolved?.();
              }}
              style={{ alignSelf: 'stretch', marginTop: 12 }}
            />
          </Animated.View>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
});
