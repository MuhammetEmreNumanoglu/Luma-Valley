import { captureRewardOrigin } from './rewardEvents';
import { useEffect, useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, play } from '../feedback';
import { artIdForSprite } from '../art/ids';
import { ART } from '../art/registry.generated';
import { SPRITES } from '../render/sprites.generated';
import { colors, font, HIT, radius, FILL } from './theme';

/** Baked procedural sprite (items, producers, portraits, icons). */
export function Sprite({ id, size, silhouette, style }: { id: string; size: number; silhouette?: boolean; style?: StyleProp<ViewStyle> }) {
  const [failedPrimary, setFailedPrimary] = useState<string | null>(null);
  const aid = artIdForSprite(id);
  const primary = aid ? ART[aid]?.src : undefined;
  const fallback = SPRITES[id];
  const src = failedPrimary === id && fallback ? fallback : primary || fallback;
  if (!src) return <View style={[{ width: size, height: size }, style]} />;
  return (
    <Image
      source={src}
      onError={() => { if (primary && fallback && primary !== fallback && failedPrimary !== id) setFailedPrimary(id); }}
      style={[{ width: size, height: size }, silhouette ? { tintColor: colors.silhouette } : null, style as object]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}

type Tone = 'honey' | 'sage' | 'cream' | 'night' | 'danger' | 'ghost' | 'energy';

// Layered button: a darker lip below, the face, a light rim and a soft gloss on the upper half.
const TONES: Record<Tone, { bg: string; edge: string; rim: string; text: string }> = {
  honey: { bg: colors.honey, edge: colors.honeyEdge, rim: colors.honeyRim, text: colors.honeyInk },
  energy: { bg: colors.energySoft, edge: colors.energyEdge, rim: colors.energyRim, text: colors.energyDeep },
  sage: { bg: colors.sageDeep, edge: colors.sageEdge, rim: colors.sageRim, text: colors.white },
  cream: { bg: colors.surface, edge: colors.borderDeep, rim: colors.white, text: colors.ink },
  night: { bg: colors.nightRaised, edge: colors.night, rim: colors.nightRim, text: colors.white },
  danger: { bg: colors.danger, edge: colors.dangerDeep, rim: colors.dangerRim, text: colors.white },
  ghost: { bg: colors.glassSoft, edge: colors.border, rim: colors.glass, text: colors.ink },
};

export function Button({
  label,
  onPress,
  tone = 'honey',
  icon,
  iconAfter,
  disabled,
  small,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  icon?: string;
  /** Icon drawn right after the label (e.g. the token next to its count). */
  iconAfter?: string;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = disabled ? { bg: colors.disabled, edge: colors.borderDeep, rim: colors.border, text: colors.disabledInk } : TONES[tone];
  return (
    <Pressable
      onPress={(event) => {
        captureRewardOrigin(event.nativeEvent.pageX, event.nativeEvent.pageY);
        if (disabled) return;
        play('tap', 0.5);
        haptic.select();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => [
        styles.btnOuter,
        small && styles.btnOuterSmall,
        { backgroundColor: t.edge, paddingBottom: pressed ? 1 : 4, marginTop: pressed ? 3 : 0, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      <View style={[styles.btn, small && styles.btnSmall, { backgroundColor: t.bg, borderColor: t.rim }]}>
        {!disabled && tone !== 'danger' ? <View pointerEvents="none" style={[styles.btnGloss, small && styles.btnGlossSmall]} /> : null}
        {icon ? <Sprite id={icon} size={small ? 22 : 28} style={styles.btnIcon} /> : null}
        <Text style={[styles.btnText, small && styles.btnTextSmall, { color: t.text }, !disabled && (tone === 'sage' || tone === 'night' || tone === 'danger') ? styles.btnTextShadow : null]} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
        {iconAfter ? <Sprite id={iconAfter} size={small ? 20 : 24} style={{ marginLeft: 4 }} /> : null}
      </View>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, size = 40, badge }: { icon: string; onPress: () => void; label: string; size?: number; badge?: number }) {
  return (
    <Pressable
      onPress={() => {
        play('tap', 0.5);
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, { width: Math.max(HIT, size + 8), height: Math.max(HIT, size + 8), transform: [{ scale: pressed ? 0.92 : 1 }] }]}
    >
      <Sprite id={icon} size={size} />
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Pill({ icon, value, sub, onPress, label }: { icon: string; value: string; sub?: string; onPress?: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityLabel={`${label}: ${value}`} style={styles.pill}>
      <Sprite id={icon} size={30} style={styles.pillIcon} />
      <View>
        <Text style={styles.pillValue} numberOfLines={1}>
          {value}
        </Text>
        {sub ? (
          <Text style={styles.pillSub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function Bar({ value, color = colors.sage, height = 8, track = colors.track }: { value: number; color?: string; height?: number; track?: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Card({ children, style, tone = 'paper' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'paper' | 'gold' | 'night' }) {
  const bg = tone === 'gold' ? colors.honeySurface : tone === 'night' ? colors.nightSoft : colors.surface;
  const edge = tone === 'gold' ? colors.honeyRim : tone === 'night' ? colors.night : colors.border;
  const lip = tone === 'gold' ? colors.honeyEdge : tone === 'night' ? colors.nightEdge : colors.borderDeep;
  return <View style={[styles.card, { backgroundColor: bg, borderColor: edge, borderBottomColor: lip }, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        <View style={styles.sectionMark} />
        <Text style={styles.section}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

/** Round close button (X) drawn with views, so it needs no font glyph or emoji. */
export function CloseButton({ onPress, label = 'Kapat' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}>
      <View style={[styles.closeBar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.closeBar, { transform: [{ rotate: '-45deg' }] }]} />
    </Pressable>
  );
}

/**
 * Bottom sheet with scrim: tap outside or X to close. The body scrolls inside the safe area, so
 * nothing is ever cut off at the bottom of the screen (`footer` stays pinned and reachable).
 */
export function Sheet({ children, onClose, title, maxHeight = '86%', footer, scroll = true }: { children: ReactNode; onClose: () => void; title?: string; maxHeight?: `${number}%`; footer?: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  useEffect(() => {
    play('page', 0.4);
  }, []);
  return (
    <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={styles.scrim}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />
      <Animated.View entering={reduce ? FadeIn.duration(120) : SlideInDown.duration(240)} exiting={SlideOutDown.duration(160)} style={[styles.sheet, { paddingBottom: insets.bottom + 12, maxHeight }]}>
        <View style={styles.grabber} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle} numberOfLines={1}>{title ?? ''}</Text>
          <CloseButton onPress={onClose} />
        </View>
        {scroll ? (
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={{ flexShrink: 1 }}>{children}</View>
        )}
        {footer ? <View style={styles.sheetFoot}>{footer}</View> : null}
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Centered information modal (level, sources, rewards): X at top-right, an OK button at the
 * bottom and tap-outside to close. Opens with a short fade and a 4% settle, never a bounce.
 */
export function InfoModal({ children, onClose, title, okLabel = 'Tamam', footer }: { children: ReactNode; onClose: () => void; title: string; okLabel?: string; footer?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  useEffect(() => {
    play('page', 0.35);
  }, []);
  return (
    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(130)} style={[styles.scrim, styles.modalScrim, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} accessibilityViewIsModal>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="close" />
      <Animated.View entering={reduce ? FadeIn.duration(120) : ZoomIn.duration(200).withInitialValues({ transform: [{ scale: 0.96 }] })} style={styles.modal}>
        <View style={styles.modalHead}>
          <Text style={styles.modalTitle} numberOfLines={2}>{title}</Text>
          <CloseButton onPress={onClose} />
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
        <View style={styles.modalFoot}>
          {footer}
          <Button label={okLabel} onPress={onClose} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** Small red dot for unread / unclaimed content. */
export function Dot({ style, testID }: { style?: StyleProp<ViewStyle>; testID?: string }) {
  return <View testID={testID} style={[styles.dot, style]} accessibilityElementsHidden />;
}

export function Stars({ n, size = 18 }: { n: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[0, 1, 2].map((i) => (
        <Sprite key={i} id="icon.star" size={size} silhouette={i >= n} />
      ))}
    </View>
  );
}

export function compact(n: number): string {
  if (n >= 100_000) return `${Math.floor(n / 1000)}k`;
  if (n >= 10_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export const styles = StyleSheet.create({
  btnOuter: {
    borderRadius: radius.m + 2,
    shadowColor: colors.shadowInk,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  btnOuterSmall: { borderRadius: radius.s + 2 },
  btn: {
    minHeight: HIT,
    paddingHorizontal: 16,
    borderRadius: radius.m,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  btnGloss: { position: 'absolute', left: 0, right: 0, top: 0, height: '48%', backgroundColor: colors.gloss },
  btnGlossSmall: { height: '46%' },
  btnIcon: { marginVertical: -4, marginLeft: -4 },
  btnSmall: { minHeight: 34, paddingHorizontal: 10, borderRadius: radius.s },
  btnText: { fontFamily: font.black, fontSize: 16, letterSpacing: 0.2 },
  btnTextSmall: { fontSize: 13 },
  btnTextShadow: { textShadowColor: colors.shadowText, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  iconBtn: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: colors.paper },
  badgeText: { color: colors.white, fontFamily: font.black, fontSize: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingRight: 11,
    paddingLeft: 0,
    height: 32,
    borderWidth: 2,
    borderColor: colors.white,
    gap: 3,
    shadowColor: colors.sageDeep,
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  pillIcon: { marginLeft: -6, marginVertical: -4 },
  pillValue: { fontFamily: font.black, fontSize: 14, color: colors.ink },
  pillSub: { fontFamily: font.medium, fontSize: 9, color: colors.inkSoft, marginTop: -3 },
  card: {
    borderRadius: radius.l,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    padding: 12,
    shadowColor: colors.sageDeep,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionMark: { width: 5, height: 18, borderRadius: 3, backgroundColor: colors.honey },
  section: { fontFamily: font.black, fontSize: 18, color: colors.ink, letterSpacing: 0.2 },
  scrim: { ...FILL, zIndex: 20, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 2, borderColor: colors.white, shadowColor: colors.shadowInk, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 },
  sheetHead: { marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetFoot: { paddingTop: 10, gap: 8 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  closeBar: { position: 'absolute', width: 15, height: 2.5, borderRadius: 2, backgroundColor: colors.inkSoft },
  modalScrim: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  modal: { width: '100%', maxWidth: 420, maxHeight: '100%', backgroundColor: colors.paper, borderRadius: radius.xl, padding: 18, borderWidth: 2, borderColor: colors.white, shadowColor: colors.shadowInk, shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  modalHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  modalTitle: { flex: 1, fontFamily: font.black, fontSize: 22, color: colors.ink },
  modalFoot: { paddingTop: 12, gap: 8 },
  dot: { position: 'absolute', top: 2, right: 6, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.white },
  sheetRule: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.honey, marginTop: 4 },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderDeep, marginBottom: 8 },
  sheetTitle: { flex: 1, fontFamily: font.black, fontSize: 22, color: colors.ink },
});
