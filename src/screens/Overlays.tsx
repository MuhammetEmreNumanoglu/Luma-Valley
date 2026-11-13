// Dialogue, intro story, toasts and the restoration celebration.
import { DECOR_STYLE } from '../content/decor';
import { recolored } from '../render/recolor';
import { Canvas, FilterMode, MipmapMode, Picture, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, FadeOutUp, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHARACTER } from '../content/characters';
import { STRUCTURE_STAGES } from '../content/quests';
import { STRUCTURE } from '../content/regions';
import { haptic, play, startMusic } from '../feedback';
import { INTRO, type Line } from '../i18n/dialogues';
import { artImage } from '../art/art';
import { structureArtId } from '../art/ids';
import { drawStructure } from '../render/structures';
import { useGame, type Toast } from '../state/GameProvider';
import { Button, compact, Sprite } from '../ui/components';
import { Rays } from '../ui/Rays';
import { colors, font, radius, FILL } from '../ui/theme';

/** Name ribbon colour: the outfit, or the accent when the outfit is too light for white text. */
function ribbon(who: keyof typeof CHARACTER): string {
  const ch = CHARACTER[who];
  const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11; };
  if (lum(ch.outfit) < 170) return ch.outfit;
  return lum(ch.accent) < 170 ? ch.accent : colors.honeyDeep;
}

export function DialogueOverlay({ lines, onDone }: { lines: Line[]; onDone: () => void }) {
  const { lang, c, t, state } = useGame();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const line = lines[i];
  const next = () => {
    play('page', 0.4);
    if (i + 1 >= lines.length) onDone();
    else setI(i + 1);
  };
  if (!line) return null;
  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={styles.dlgScrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={next} accessibilityRole="button" accessibilityLabel={t('common.next')} />
      <View style={[styles.dlgWrap, { paddingBottom: insets.bottom + 18 }]} pointerEvents="box-none">
        <Animated.View key={`${line.who}-${i}`} entering={state.settings.reduceMotion ? FadeIn.duration(120) : FadeInUp.duration(300)} style={styles.dlgPortrait}>
          <Sprite id={`portrait.${line.who}.${line.mood}`} size={132} />
        </Animated.View>
        <Animated.View key={`b${i}`} entering={state.settings.reduceMotion ? FadeIn.duration(120) : FadeInDown.duration(260)} style={styles.dlgBox}>
          <View style={[styles.dlgName, { backgroundColor: ribbon(line.who) }]}>
            <Text style={styles.dlgNameText}>{c(`char.${line.who}`)}</Text>
          </View>
          <Text style={styles.dlgText}>{lang === 'tr' ? line.tr : line.en}</Text>
          <View style={styles.dlgFoot}>
            <Pressable onPress={onDone} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.skip')}>
              <Text style={styles.dlgSkip}>{t('common.skip')}</Text>
            </Pressable>
            <Text style={styles.dlgMore}>
              {i + 1}/{lines.length} ▸
            </Text>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function LanternGlow() {
  const s = useSharedValue(1);
  useEffect(() => {
    s.value = withRepeat(withSequence(withTiming(1.08, { duration: 1400 }), withTiming(0.96, { duration: 1400 })), -1, true);
  }, [s]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Animated.View style={[styles.lantern, st]}>
      <Sprite id="item.lantern:7" size={170} />
    </Animated.View>
  );
}

export function IntroScreen({ onDone }: { onDone: () => void }) {
  const { lang, t } = useGame();
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const next = () => {
    play('page', 0.5);
    haptic.select();
    if (i + 1 >= INTRO.length) onDone();
    else setI(i + 1);
  };
  const bg = [colors.night, colors.nightSoft, colors.nightRaised, colors.nightRim][i] ?? colors.night;
  return (
    <Animated.View exiting={FadeOut.duration(400)} style={[styles.intro, { backgroundColor: bg, paddingTop: insets.top + 30, paddingBottom: insets.bottom + 24 }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={next} accessibilityRole="button" accessibilityLabel={t('intro.tap')} />
      <Text style={styles.introLogo}>Luma Valley</Text>
      <Text style={styles.introSub}>{t('app.subtitle')}</Text>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
        {i >= 2 ? <LanternGlow /> : <Sprite id={i === 0 ? 'icon.map' : 'item.memory:3'} size={130} style={{ opacity: 0.85 }} />}
      </View>
      <Animated.Text key={i} entering={FadeIn.duration(600)} style={styles.introText}>
        {lang === 'tr' ? INTRO[i].tr : INTRO[i].en}
      </Animated.Text>
      <View style={styles.introFoot} pointerEvents="box-none">
        <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button">
          <Text style={styles.introSkip}>{t('common.skip')}</Text>
        </Pressable>
        <Text style={styles.introTap}>{t('intro.tap')}</Text>
      </View>
    </Animated.View>
  );
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.toasts, { top: insets.top + 62 }]} pointerEvents="none">
      {toasts.slice(-2).map((tt) => (
        <Animated.View key={tt.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.toast, tt.kind === 'deny' && styles.toastDeny, (tt.kind === 'levelUp' || tt.kind === 'achievement' || tt.kind === 'region') && styles.toastBig]}>
          {tt.icon ? <Sprite id={tt.icon} size={tt.kind === 'levelUp' ? 34 : 28} /> : null}
          {tt.text ? (
            <Text style={[styles.toastText, tt.kind === 'deny' && { color: colors.white }]} numberOfLines={2}>
              {tt.text}
            </Text>
          ) : null}
          {tt.leaves ? <Amount icon="icon.coin" n={tt.leaves} /> : null}
          {tt.energy ? <Amount icon="icon.energy" n={tt.energy} /> : null}
        </Animated.View>
      ))}
    </View>
  );
}

function Amount({ icon, n }: { icon: string; n: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Sprite id={icon} size={20} />
      <Text style={styles.toastAmount}>+{compact(n)}</Text>
    </View>
  );
}

/** Before/after picture of a structure (also used for memory cards). */
export function StructureArt({ id, k, w, h, decor = 0 }: { id: string; k: number; w: number; h: number; decor?: number }) {
  const st = STRUCTURE[id];
  const pic = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const c = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
    const aid = structureArtId(st.type, k, st.v ?? 0);
    const base = artImage(aid);
    const img = base && st.decor ? recolored(aid, base, DECOR_STYLE[st.type], decor) : base;
    if (img) {
      // Fit the isometric sprite inside the box, resting on a soft ground shadow.
      const f = Math.min((w * 0.94) / img.width(), (h * 0.94) / img.height());
      const dw = img.width() * f, dh = img.height() * f;
      const dst = Skia.XYWHRect((w - dw) / 2, h - dh - h * 0.03, dw, dh);
      c.drawImageRectOptions(img, Skia.XYWHRect(0, 0, img.width(), img.height()), dst, FilterMode.Linear, MipmapMode.None, Skia.Paint());
      return rec.finishRecordingAsPicture();
    }
    const scale = Math.min(w / 170, h / 190);
    c.translate(w / 2, h * 0.86);
    c.scale(scale, scale);
    c.translate(-st.x, -st.y);
    drawStructure(c, st, { k, decor: 0, v: st.v ?? 0, region: st.region });
    return rec.finishRecordingAsPicture();
  }, [st, k, w, h, decor]);
  return (
    <Canvas style={{ width: w, height: h }}>
      <Picture picture={pic} />
    </Canvas>
  );
}

export function CelebrationOverlay({ id, complete, onDone }: { id: string; complete: boolean; onDone: () => void }) {
  const { state, t, c } = useGame();
  const stage = state.structures[id] ?? 0;
  const total = STRUCTURE_STAGES[id] ?? 1;
  useEffect(() => {
    play(complete ? 'build' : 'quest', 0.9);
    haptic.success();
  }, [complete]);
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={styles.celebScrim}>
      <Rays size={520} reduce={state.settings.reduceMotion} />
      <Animated.View entering={ZoomIn.springify().damping(13)} style={styles.celebCard}>
        <Text style={styles.celebTitle}>{t(complete ? 'celebrate.restored' : 'celebrate.stage')}</Text>
        <Text style={styles.celebSub}>{c(`structure.${id}`)}</Text>
        <View style={styles.celebArt}>
          <View style={{ alignItems: 'center' }}>
            <StructureArt id={id} k={Math.max(0, (stage - 1) / total)} w={120} h={130} />
            <Text style={styles.celebLabel}>{t('map.before')}</Text>
          </View>
          <Text style={styles.celebArrow}>➜</Text>
          <View style={{ alignItems: 'center' }}>
            <StructureArt id={id} k={stage / total} w={120} h={130} />
            <Text style={styles.celebLabel}>{complete ? t('map.restored') : t('map.stage', { a: stage, b: total })}</Text>
          </View>
        </View>
        <Button label={t('celebrate.continue')} onPress={onDone} style={{ alignSelf: 'stretch' }} />
      </Animated.View>
    </Animated.View>
  );
}

export function MemoryOverlay({ id, onDone }: { id: string; onDone: () => void }) {
  const { t, c, state } = useGame();
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)} style={styles.celebScrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDone} />
      <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.celebCard, { backgroundColor: colors.honeySurface }]}>
        <Text style={styles.celebSub}>{c(`structure.${id}`)}</Text>
        <View style={styles.celebArt}>
          <View style={{ alignItems: 'center' }}>
            <StructureArt id={id} k={0} w={120} h={130} />
            <Text style={styles.celebLabel}>{t('map.before')}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <StructureArt id={id} k={1} w={120} h={130} decor={state.decor[id] ?? 0} />
            <Text style={styles.celebLabel}>{t('map.after')}</Text>
          </View>
        </View>
        <Text style={styles.memoryText}>{c(`memory.${id}`)}</Text>
        <Button tone="cream" label={t('common.close')} onPress={onDone} style={{ alignSelf: 'stretch' }} />
      </Animated.View>
    </Animated.View>
  );
}

export function useStartMusicOnce() {
  useEffect(() => startMusic(), []);
}

const styles = StyleSheet.create({
  dlgScrim: { ...FILL, backgroundColor: colors.scrimSoft, justifyContent: 'flex-end' },
  dlgWrap: { paddingHorizontal: 14 },
  dlgPortrait: { marginLeft: 8, marginBottom: -18, zIndex: 2, alignSelf: 'flex-start' },
  dlgBox: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 16, paddingTop: 22, borderWidth: 2, borderColor: colors.white, borderBottomWidth: 5, borderBottomColor: colors.borderDeep, minHeight: 130, shadowColor: colors.shadowInk, shadowOpacity: 0.2, shadowRadius: 14, elevation: 8 },
  dlgName: { position: 'absolute', top: -14, left: 140, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 999, borderWidth: 2, borderColor: colors.white, shadowColor: colors.shadowInk, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  dlgNameText: { fontFamily: font.black, fontSize: 14, color: colors.white },
  dlgText: { fontFamily: font.bold, fontSize: 17, lineHeight: 24, color: colors.ink },
  dlgFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  dlgSkip: { fontFamily: font.bold, fontSize: 13, color: colors.inkSoft, textDecorationLine: 'underline' },
  dlgMore: { fontFamily: font.black, fontSize: 13, color: colors.honeyDeep },
  intro: { ...FILL, paddingHorizontal: 28, alignItems: 'center' },
  introLogo: { fontFamily: font.black, fontSize: 40, color: colors.honeySoft, textShadowColor: colors.honey, textShadowRadius: 16 },
  introSub: { fontFamily: font.bold, fontSize: 16, color: colors.nightMuted },
  lantern: { shadowColor: colors.honey, shadowOpacity: 0.9, shadowRadius: 40 },
  introText: { fontFamily: font.bold, fontSize: 20, lineHeight: 29, color: colors.nightText, textAlign: 'center', minHeight: 120 },
  introFoot: { flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: 12 },
  introSkip: { fontFamily: font.bold, fontSize: 14, color: colors.nightMuted, textDecorationLine: 'underline', padding: 6 },
  introTap: { fontFamily: font.medium, fontSize: 13, color: colors.nightMuted, padding: 6 },
  toasts: { position: 'absolute', left: 12, right: 12, alignItems: 'center', gap: 6 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 2, borderColor: colors.white, maxWidth: '100%', shadowColor: colors.shadowInk, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6 },
  toastDeny: { backgroundColor: colors.dangerDeep, borderColor: 'transparent' },
  toastBig: { backgroundColor: colors.honeySoft, borderColor: colors.honey, paddingVertical: 10 },
  toastText: { fontFamily: font.bold, fontSize: 14, color: colors.ink, flexShrink: 1 },
  toastAmount: { fontFamily: font.black, fontSize: 14, color: colors.ink },
  celebScrim: { ...FILL, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', padding: 20 },
  celebCard: { width: '100%', maxWidth: 380, backgroundColor: colors.surface, borderRadius: radius.xl, padding: 18, alignItems: 'center', gap: 8, borderWidth: 2, borderColor: colors.white, borderBottomWidth: 5, borderBottomColor: colors.borderDeep, shadowColor: colors.shadowInk, shadowOpacity: 0.25, shadowRadius: 18, elevation: 10 },
  celebTitle: { fontFamily: font.black, fontSize: 26, color: colors.honeyDeep },
  celebSub: { fontFamily: font.black, fontSize: 18, color: colors.ink },
  celebArt: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 6 },
  celebArrow: { fontSize: 22, color: colors.honeyDeep },
  celebLabel: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft },
  memoryText: { fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: colors.ink, textAlign: 'center', fontStyle: 'italic', marginBottom: 8 },
});
