import { DECOR_SPOTS, PREMIUM_DECOR } from '../premium/decor';
// The valley map: one-finger vertical scroll with momentum, tap a building to open it.
// Region art is rasterised once per change; ambient life is drawn per frame on the UI thread.
import { Canvas, Group, Image as SkImageNode, Picture, Skia, useClock } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, useAnimatedReaction, useDerivedValue, useSharedValue, withDecay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { NextGoalChip } from './Panels';

import { DECORATIONS } from '../content/decorations';
import { QUESTS, STRUCTURE_STAGES } from '../content/quests';
import { MAP_W, REGION_H, REGIONS, type StructureDef } from '../content/regions';
import { hashString } from '../core/rng';
import { availableQuests, canComplete, regionVitality } from '../engine/quests';
import type { GameState } from '../engine/types';
import { AMB, drawAmbient, type Ambient } from '../render/ambient';
import { DPR, sceneImage } from '../render/imageCache';
import { drawFog, drawRegion, structureRect, type RegionView } from '../render/map';
import { useGame } from '../state/GameProvider';
import { Bar, Sprite } from '../ui/components';
import { colors, font, radius } from '../ui/theme';

export function regionView(s: GameState, rid: number): RegionView {
  const r = REGIONS[rid - 1];
  const stages: Record<string, number> = {};
  const decor: Record<string, number> = {};
  const markers: Record<string, boolean> = {};
  for (const st of r.structures) {
    stages[st.id] = s.structures[st.id] ?? 0;
    if (s.decor[st.id] !== undefined) decor[st.id] = s.decor[st.id];
  }
  for (const q of availableQuests(s)) if (q.structure && q.region === rid) markers[q.structure] = markers[q.structure] || canComplete(s, q);
  const decorations = DECORATIONS.filter((d) => d.region === rid && s.decorations.includes(d.id));
  const premiumDecor = Object.entries(s.premiumDecor.placements).flatMap(([id, spotId]) => { const spot = DECOR_SPOTS.find(x => x.id === spotId && x.region === rid); const item = PREMIUM_DECOR.find(x => x.id === id); return spot && item ? [{ id, art: item.art, tint: item.tint, x: spot.x, y: spot.y }] : []; });
  return { premiumDecor, theme: s.themes.active, unlocked: s.regions.includes(rid), vitality: regionVitality(s, rid), stages, totals: STRUCTURE_STAGES, decor, markers, quality: s.settings.quality, decorations, nodes: [] };
}

function ambientFor(s: GameState): Ambient[] {
  const out: Ambient[] = [];
  let seed = 1;
  for (const r of REGIONS) {
    if (!s.regions.includes(r.id)) continue;
    const oy = (r.id - 1) * REGION_H;
    const v = regionVitality(s, r.id);
    if (v > 0.2) out.push([AMB.birds, 0, oy + 140 + r.id * 37, 1, r.id]);
    for (const st of r.structures) {
      const done = (s.structures[st.id] ?? 0) >= (STRUCTURE_STAGES[st.id] ?? 1);
      const x = st.x;
      const y = oy + st.y;
      const k = st.s;
      seed++;
      if (!done) continue;
      switch (st.type) {
        case 'cottage':
          out.push([AMB.smoke, x + 19 * k, y - 70 * k, k, seed]);
          break;
        case 'house':
          if ((st.v ?? 0) % 2 === 0) out.push([AMB.smoke, x + 17 * k, y - 74 * k, k, seed]);
          break;
        case 'bakery':
          out.push([AMB.smoke, x + 20 * k, y - 76 * k, k, seed], [AMB.smoke, x + 20 * k, y - 76 * k, k, seed + 0.5]);
          break;
        case 'windmill':
          out.push([AMB.sails, x, y - 74 * k, k, seed]);
          break;
        case 'waterwheel':
          out.push([AMB.wheel, x - 36 * k, y - 20 * k, k, seed]);
          break;
        case 'beemeadow':
        case 'barn':
          out.push([AMB.bee, x - 18 * k, y - 10 * k, k, seed], [AMB.bee, x + 18 * k, y - 10 * k, k, seed + 2]);
          break;
        case 'garden':
        case 'orchard':
        case 'square':
        case 'greenhouse':
        case 'gazebo':
          out.push([AMB.butterfly, x, y - 20 * k, k, seed], [AMB.butterfly, x + 20, y - 10, k, seed + 3]);
          break;
        case 'lamppost':
        case 'shrine':
        case 'bridge':
        case 'beacon':
        case 'greatlantern':
          out.push([AMB.firefly, x, y - 40 * k, k, seed], [AMB.firefly, x + 10, y - 20, k, seed + 1.7]);
          break;
        case 'lighthouse':
          out.push([AMB.beam, x, y - 125 * k, k, seed]);
          break;
        case 'fountain':
          out.push([AMB.spray, x, y - 50 * k, k, seed]);
          break;
        case 'bigtree':
          out.push([AMB.butterfly, x, y - 80 * k, k, seed], [AMB.firefly, x - 20, y - 60, k, seed]);
          break;
      }
    }
    // Water glints along the river / sea.
    for (let i = 0; i < 8; i++) out.push([AMB.sparkle, 30 + i * 46, oy + 1012 + (i % 2) * 8, 1, i + r.id]);
    if (r.biome === 'harbor') for (let i = 0; i < 10; i++) out.push([AMB.sparkle, 320 + (i % 3) * 22, oy + 220 + i * 70, 1, i * 3]);
  }
  return out;
}

/** World y the camera should start at: the first structure with an open story quest. */
function focusY(s: GameState, structure?: string | null): number {
  if (structure) for (const region of REGIONS) {
    const target = region.structures.find((x) => x.id === structure);
    if (target && s.regions.includes(region.id)) return (region.id - 1) * REGION_H + target.y;
  }
  const qs = availableQuests(s).sort((a, b) => (a.kind === 'story' ? -1 : 1) - (b.kind === 'story' ? -1 : 1));
  for (const q of qs) {
    if (!q.structure) continue;
    const st = REGIONS[q.region - 1].structures.find((x) => x.id === q.structure);
    if (st) return (q.region - 1) * REGION_H + st.y;
  }
  return (Math.max(...s.regions) - 1) * REGION_H + 400;
}

export function MapScreen() {
  const { state, open, t, c, toast, reduceMotion, overlays } = useGame();
  const [size, setSize] = useState({ w: 390, h: 700 });
  const scale = size.w / MAP_W;
  const maxRegion = Math.max(...state.regions);
  const shownRegions = Math.min(REGIONS.length, maxRegion + 1);
  const worldH = shownRegions * REGION_H;
  // Camera: normal play only scrolls vertically (a deliberate one-axis scroll that never fights
  // taps). Explore mode adds horizontal panning and a bounded pinch zoom; "Done" restores it.
  const [explore, setExplore] = useState(false);
  const zoom = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const placed = useRef(false);
  const [regionIdx, setRegionIdx] = useState(1);
  const minTyFor = useCallback((z: number) => Math.min(0, -(worldH * scale * z - size.h)), [worldH, scale, size.h]);
  const minTy = minTyFor(1);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  const focusOn = useCallback((wy: number, animate = true) => {
    const target = Math.max(minTyFor(zoom.value), Math.min(0, -(wy * scale * zoom.value - size.h * 0.5)));
    ty.set(animate && !reduceMotion ? withTiming(target, { duration: 320 }) : target);
  }, [minTyFor, scale, size.h, ty, zoom, reduceMotion]);

  useEffect(() => {
    if (placed.current || size.h < 100) return;
    placed.current = true;
    focusOn(focusY(state, overlays.structure), false);
  }, [size, state, focusOn, overlays.structure]);

  // Region images (rebuilt only when that region's view changes).
  const images = useMemo(() => {
    const out: { id: number; img: ReturnType<typeof sceneImage>; key: string }[] = [];
    const px = Math.min(DPR, 2) * scale;
    for (let rid = 1; rid <= shownRegions; rid++) {
      const r = REGIONS[rid - 1];
      if (state.regions.includes(rid)) {
        const view = regionView(state, rid);
        const key = `region${rid}:${hashString(JSON.stringify({ ...view, nodes: view.nodes?.map((n) => [n.def.id, n.look]) }))}`;
        out.push({ id: rid, key, img: sceneImage(key, MAP_W, REGION_H, px, (cv) => drawRegion(cv, r, view)) });
      } else {
        const key = `regionfog${rid}`;
        out.push({ id: rid, key, img: sceneImage(key, MAP_W, REGION_H, px * 0.5, (cv) => drawFog(cv, rid)) });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.structures, state.decor, state.decorations, state.regions, state.quests.done, state.settings.quality, state.board, state.inventory, state.puzzles, state.level, state.premiumDecor, state.themes.active, scale, shownRegions]);

  const ambient = useMemo(() => (reduceMotion ? [] : ambientFor(state)), [state.structures, state.regions, reduceMotion]); // eslint-disable-line react-hooks/exhaustive-deps
  const skClock = useClock();
  const ambPicture = useDerivedValue(() => {
    const rec = Skia.PictureRecorder();
    const cv = rec.beginRecording(Skia.XYWHRect(0, 0, MAP_W, worldH));
    const top = -ty.value / (scale * zoom.value);
    drawAmbient(cv, ambient, skClock.value / 1000, top, top + size.h / (scale * zoom.value), MAP_W);
    return rec.finishRecordingAsPicture();
  }, [ambient, scale, size.h, worldH]);

  const transform = useDerivedValue(() => [{ translateX: tx.value }, { translateY: ty.value }, { scale: zoom.value }]);
  const ambTransform = useDerivedValue(() => [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale * zoom.value }]);

  useAnimatedReaction(
    () => Math.min(shownRegions, Math.max(1, Math.floor((-ty.value + size.h * 0.4) / (scale * zoom.value) / REGION_H) + 1)),
    (cur, prev) => {
      if (cur !== prev) scheduleOnRN(setRegionIdx, cur);
    },
    [scale, size.h, shownRegions],
  );

  const onTap = useCallback(
    (x: number, y: number, txNow: number, tyNow: number, z: number) => {
      const wx = (x - txNow) / (scale * z);
      const wy = (y - tyNow) / (scale * z);
      const rid = Math.floor(wy / REGION_H) + 1;
      const r = REGIONS[rid - 1];
      if (!r) return;
      if (!state.regions.includes(rid)) {
        const q = QUESTS.find((qq) => qq.rewards.some((rw) => rw.kind === 'region' && rw.n === rid));
        toast({ kind: 'info', text: t('map.unlockBy', { q: q ? c(`quest.${q.id}`) : '' }), icon: 'icon.lock' });
        return;
      }
      const ly = wy - (rid - 1) * REGION_H;
      let best: StructureDef | null = null;
      let bestD = Infinity;
      for (const st of r.structures) {
        const k = Math.min(1, (state.structures[st.id] ?? 0) / (STRUCTURE_STAGES[st.id] ?? 1));
        const rc = structureRect(st, k);
        let d: number;
        if (rc) {
          const m = 10;
          const top = Math.min(rc.y, st.y - 70 * st.s);
          const inside = wx >= Math.min(rc.x, st.x - 45 * st.s) - m && wx <= Math.max(rc.x + rc.w, st.x + 45 * st.s) + m && ly >= top - m && ly <= st.y + 18;
          d = inside ? Math.hypot(st.x - wx, (st.y - ly) * 0.5) : Infinity;
        } else {
          const dd = Math.hypot(st.x - wx, (st.y - 40 * st.s - ly) * 0.8);
          d = dd < 62 * st.s ? dd : Infinity;
        }
        if (d < bestD) {
          best = st;
          bestD = d;
        }
      }
      if (best) open('structure', best.id);
    },
    [scale, state.regions, state.structures, open, toast, t, c],
  );

  const gesture = useMemo(() => {
    const W = size.w, H = size.h, mapW = MAP_W * scale, mapH = worldH * scale;
    const clampX = (v: number, z: number) => { 'worklet'; return Math.max(Math.min(0, W - mapW * z), Math.min(0, v)); };
    const clampY = (v: number, z: number) => { 'worklet'; return Math.max(Math.min(0, H - mapH * z), Math.min(0, v)); };
    const pan = Gesture.Pan()
      .maxPointers(explore ? 2 : 1)
      .activeOffsetY([-10, 10])
      .failOffsetX(explore ? [-1000, 1000] : [-24, 24])
      .onChange((e) => {
        ty.set(clampY(ty.value + e.changeY, zoom.value));
        if (explore) tx.set(clampX(tx.value + e.changeX, zoom.value));
      })
      .onEnd((e) => {
        const minY = Math.min(0, H - mapH * zoom.value);
        ty.set(withDecay({ velocity: e.velocityY, clamp: [minY, 0] }));
        if (explore) tx.set(withDecay({ velocity: e.velocityX, clamp: [Math.min(0, W - mapW * zoom.value), 0] }));
      });
    const startZoom = { z: 1, x: 0, y: 0, fx: 0, fy: 0 };
    const pinch = Gesture.Pinch()
      .enabled(explore)
      .onStart((e) => {
        startZoom.z = zoom.value; startZoom.x = tx.value; startZoom.y = ty.value; startZoom.fx = e.focalX; startZoom.fy = e.focalY;
      })
      .onUpdate((e) => {
        const z = Math.max(1, Math.min(1.8, startZoom.z * e.scale));
        const k = z / startZoom.z;
        zoom.set(z);
        tx.set(clampX(startZoom.fx - (startZoom.fx - startZoom.x) * k, z));
        ty.set(clampY(startZoom.fy - (startZoom.fy - startZoom.y) * k, z));
      });
    const tap = Gesture.Tap()
      .maxDuration(300)
      .onEnd((e) => {
        scheduleOnRN(onTap, e.x, e.y, tx.value, ty.value, zoom.value);
      });
    return Gesture.Race(Gesture.Simultaneous(pan, pinch), tap);
  }, [explore, size.w, size.h, scale, worldH, tx, ty, zoom, onTap]);

  const endExplore = useCallback(() => {
    setExplore(false);
    const d = reduceMotion ? 0 : 260;
    const centreY = (-ty.value + size.h / 2) / zoom.value;
    zoom.set(withTiming(1, { duration: d }));
    tx.set(withTiming(0, { duration: d }));
    ty.set(withTiming(Math.max(minTy, Math.min(0, -(centreY - size.h / 2))), { duration: d }));
  }, [reduceMotion, ty, tx, zoom, size.h, minTy]);

  useEffect(() => {
    if (ty.value < minTyFor(zoom.value)) ty.set(withTiming(minTyFor(zoom.value)));
  }, [minTyFor, ty, zoom]);

  const vit = state.regions.includes(regionIdx) ? regionVitality(state, regionIdx) : 0;

  return (
    <View style={styles.root} onLayout={onLayout}>
      <GestureDetector gesture={gesture}>
        <View style={StyleSheet.absoluteFill} accessibilityLabel={t('map.tapHint')}>
          <Canvas style={StyleSheet.absoluteFill}>
            <Group transform={transform}>
              {images.map(({ id, img }) =>
                img ? <SkImageNode key={id} image={img} x={0} y={(id - 1) * REGION_H * scale} width={size.w} height={REGION_H * scale} /> : null,
              )}
            </Group>
            <Group transform={ambTransform}>
              <Picture picture={ambPicture} />
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
      <Animated.View key={regionIdx} entering={FadeIn.duration(250)} style={styles.banner} pointerEvents="box-none">
        <View style={{ flex: 1 }} pointerEvents="none">
          <Text style={styles.bannerTitle} numberOfLines={1}>{c(`region.${regionIdx}`)}</Text>
          {state.regions.includes(regionIdx) ? (
            <View style={styles.bannerBar}>
              <View style={{ flex: 1 }}>
                <Bar value={vit} color={colors.sage} height={5} />
              </View>
              <Text style={styles.bannerSmall}>{t('map.vitality')} {Math.round(vit * 100)}%</Text>
            </View>
          ) : (
            <Text style={styles.bannerSub} numberOfLines={1}>{t('map.lockedRegion')}</Text>
          )}
        </View>
      </Animated.View>
      <View style={styles.goalWrap} pointerEvents="box-none">
        <NextGoalChip compact />
      </View>
      <View style={styles.exploreBar} pointerEvents="box-none">
        {explore ? (
          <View style={styles.exploreOn}>
            <Text style={styles.exploreText} numberOfLines={2}>{t('explore.on')}</Text>
            <Pressable onPress={endExplore} style={styles.exploreDone} accessibilityRole="button" accessibilityLabel={t('explore.done')}>
              <Text style={styles.exploreDoneText}>{t('explore.done')}</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setExplore(true)} style={styles.exploreBtn} accessibilityRole="button" accessibilityLabel={t('explore.button')}>
            <Sprite id="icon.map" size={22} />
            <Text style={styles.exploreBtnText}>{t('explore.button')}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.grass, overflow: 'hidden' },
  overlay: { position: 'absolute', left: 0, top: 0, transformOrigin: 'top left' },
  banner: { position: 'absolute', top: 6, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.glassSoft, borderRadius: 16, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.track },
  bannerTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  goalWrap: { position: 'absolute', left: 10, right: 110, bottom: 12 },
  bannerSub: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  bannerBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  bannerSmall: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft },
  badgeReady: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: colors.honeySurface, borderWidth: 2.5, borderColor: colors.honey, alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadowInk, shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  badgeCheck: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  badgeTimer: { position: 'absolute', minWidth: 68, paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: colors.glassDark, alignItems: 'center', justifyContent: 'center' },
  badgeTimerText: { fontFamily: font.black, fontSize: 12, color: colors.white, fontVariant: ['tabular-nums'] },
  badgeBuild: { position: 'absolute', minWidth: 60, paddingHorizontal: 8, height: 26, borderRadius: 13, flexDirection: 'row', gap: 4, backgroundColor: colors.honeySurface, borderWidth: 1.5, borderColor: colors.honeyEdge, alignItems: 'center', justifyContent: 'center' },
  badgeBuildText: { fontFamily: font.black, fontSize: 12, color: colors.honeyInk },
  tutRing: { position: 'absolute', borderRadius: 28, borderWidth: 3, borderColor: colors.honey, backgroundColor: colors.dropNeutral },
  tutBubble: { position: 'absolute', left: 16, right: 16, bottom: 74, backgroundColor: colors.honeySurface, borderRadius: radius.l, padding: 12, borderWidth: 2, borderColor: colors.honeyRim },
  tutText: { fontFamily: font.bold, fontSize: 15, color: colors.ink, textAlign: 'center' },
  exploreBar: { position: 'absolute', left: 12, right: 12, bottom: 12, alignItems: 'flex-end' },
  exploreBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 44, borderRadius: 22, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.border },
  exploreBtnText: { fontFamily: font.black, fontSize: 14, color: colors.ink },
  exploreOn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingLeft: 14, borderRadius: 22, backgroundColor: colors.glassDark },
  exploreText: { flex: 1, fontFamily: font.bold, fontSize: 13, color: colors.white },
  exploreDone: { paddingHorizontal: 18, height: 40, borderRadius: 20, backgroundColor: colors.honey, alignItems: 'center', justifyContent: 'center' },
  exploreDoneText: { fontFamily: font.black, fontSize: 14, color: colors.honeyInk },
});
