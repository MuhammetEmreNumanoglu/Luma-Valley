import { captureRewardOrigin } from '../ui/rewardEvents';
import { drawWorkshopFrame, drawWorkshopTile } from '../render/workshopSkin';
import type { WorkshopSkinId } from '../premium/catalog';
// The merge workshop: orders on top, the 7×9 board, an info strip for the selected cell and the
// bag. Drag with one finger to move/merge; the crate supplies merge starters and the merchant
// turns delivered goods into unlock currency.
import { BlendMode, Canvas, Circle, Group, Image as SkImageNode, Picture, RoundedRect, Skia, type SkImage } from '@shopify/react-native-skia';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, ZoomIn, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BALANCE, BOARD_H, BOARD_W, openCellCost, sellValue } from '../content/balance';
import { FAMILY, isMaxLevel, itemKey, parseItem, type ItemKey } from '../content/families';
import { FARM_OUTPUTS, FARM_RECIPES, FARM_YIELD, HARVEST_ITEMS, traderRecipe } from '../content/farm';
import { coinValue } from '../content/coins';
import { NODES } from '../content/valley';
import { isNodeUnlocked, isReady, nodeState } from '../engine/nodes';
import { WORKSHOP_COLS, WORKSHOP_GRID, WORKSHOP_ROWS, workshopAt, workshopPosition, workshopPrice } from '../content/workshop';
import { PRODUCER, producerLevel, type ProducerId } from '../content/producers';
import { QUEST } from '../content/quests';
import { countItem, findGroup, isOpenable } from '../engine/board';
import { DAY, HOUR, MINUTE, localDay } from '../core/time';
import { availableQuests, canComplete } from '../engine/quests';
import { canDeliverOrder, orderNeedsLockedItem, orderProgress } from '../engine/orders';
import { SHOP_RECIPES, SHOP_LEVELS, shopStatus, farmRecipeUnlocked } from '../engine/shops';
import type { Cell, GameEvent, GameState, Order } from '../engine/types';
import { drawArtBox, drawArtFit } from '../art/art';
import { artIdForSprite, itemArtId, producerArtId } from '../art/ids';
import { boxImage } from '../render/imageCache';
import { drawItem } from '../render/items';
import { blob, fill, lin, line, rad, shade, sparkle } from '../render/kit';
import { drawLevelPips, drawProducer } from '../render/producers';
import { useGame } from '../state/GameProvider';
import { migrate, repair } from '../persistence/save';
import { SAVE_VERSION } from '../engine/state';
import { Bar, Button, clock, Dot, InfoModal, Sheet, Sprite } from '../ui/components';
import { boardColors, colors, font, radius } from '../ui/theme';
import { showItemLevels } from '../ui/boardPresentation';
import { useMeasuredTarget } from '../ui/targets';
import { needsFamilyIntro, pendingTutorial } from '../engine/tutorial';
import { mergeTrio } from '../engine/board';
import type { ResourceKind } from '../content/resources';
import { drawResource } from '../render/resources';
import { setTarget } from '../ui/targets';
import { HurryButton } from '../ui/HurryButton';
import { ICON, NextGoalChip, nodeIcon, useItemLabel } from './Panels';

// Strip heights. The board gets everything else: the strips were trimmed in v4 so cells grew
// ~12–15% on every iPhone; on short screens (SE class) they shrink further so cells stay ≥ 40 pt.
// v5: the separate goal row is gone (the goal sits in the info strip while nothing is selected)
// and explore/supply live in the bag row, so the board takes the space: ~53 pt cells at 390×844.
let ORDERS_H = 76;
let INFO_H = 70;
let BAG_H = 58;
const HUD_H = 0;
const ORDER_BAR_H = 0;
let COMPACT = false;
function layoutFor(h: number) {
  COMPACT = h < 600;
  ORDERS_H = COMPACT ? 62 : 76;
  INFO_H = COMPACT ? 58 : 70;
  BAG_H = COMPACT ? 50 : 58;
}

type Fx =
  | { id: number; type: 'merge'; from: number[]; at: number; created: number[]; oldKey: ItemKey; newKey: ItemKey; five: boolean; bonus: boolean }
  | { id: number; type: 'fly'; from: number; to: number[]; key: ItemKey }
  | { id: number; type: 'poof'; at: number }
  | { id: number; type: 'resource'; at: number; kind: ResourceKind };

// A compact number, drawn as paths so it looks the same even before fonts load.
function drawItemLevel(c: Parameters<typeof drawItem>[0], level: number) {
  const digits: Record<string, number[]> = {
    '0': [0, 1, 2, 3, 4, 5], '1': [1, 2], '2': [0, 1, 6, 4, 3],
    '3': [0, 1, 6, 2, 3], '4': [5, 6, 1, 2], '5': [0, 5, 6, 2, 3],
    '6': [0, 5, 6, 4, 3, 2], '7': [0, 1, 2], '8': [0, 1, 2, 3, 4, 5, 6],
    '9': [0, 1, 2, 3, 5, 6],
  };
  const segments = [[0, 0, 6, 0], [6, 0, 6, 6], [6, 6, 6, 12], [0, 12, 6, 12], [0, 6, 0, 12], [0, 0, 0, 6], [0, 6, 6, 6]];
  const text = String(level);
  const width = text.length === 1 ? 26 : 37;
  const x = 96 - width;
  const outline = line(colors.paper, 6);
  const ink = line(colors.sageDeep, 3);
  for (let i = 0; i < text.length; i++) {
    for (const s of digits[text[i]] ?? []) {
      const [x1, y1, x2, y2] = segments[s];
      const ox = x + (width - (text.length * 11.2 - 2.8)) / 2 + i * 11.2;
      c.drawLine(ox + x1 * 1.4, 73 + y1 * 1.4, ox + x2 * 1.4, 73 + y2 * 1.4, outline);
    }
  }
  for (let i = 0; i < text.length; i++) {
    for (const s of digits[text[i]] ?? []) {
      const [x1, y1, x2, y2] = segments[s];
      const ox = x + (width - (text.length * 11.2 - 2.8)) / 2 + i * 11.2;
      c.drawLine(ox + x1 * 1.4, 73 + y1 * 1.4, ox + x2 * 1.4, 73 + y2 * 1.4, ink);
    }
  }
}

function itemImg(key: ItemKey, pt: number, showLevel: boolean) {
  return boxImage(`item.${key}.level-${showLevel}`, pt, (c) => {
    // The art is cropped to its opaque bounds and fills most of the cell (small margin for the level).
    const { f, l } = parseItem(key);
    if (f === 'starCoin') { if (!drawArtFit(c, artIdForSprite(`item.${key}`) ?? '', 4)) drawStarToken(c, l); }
    else if (f === 'energyOrb') {
      const [r, g, b] = [[0.45, 1, 0.85], [0.4, 0.7, 1], [0.8, 0.5, 1], [1, 0.8, 0.3]][Math.max(0, Math.min(3, l - 1))];
      const p = Skia.Paint();
      p.setColorFilter(Skia.ColorFilter.MakeMatrix([0.2126*r, 0.7152*r, 0.0722*r, 0, 0, 0.2126*g, 0.7152*g, 0.0722*g, 0, 0, 0.2126*b, 0.7152*b, 0.0722*b, 0, 0, 0, 0, 0, 1, 0]));
      drawArtFit(c, 'icon_energy', 5, p);
    }
    else if (!drawArtFit(c, itemArtId(key), key === 'lantern:2' ? 0 : 4)) drawItem(c, key);
    if (f === 'coin') drawCoinValue(c, coinValue(l));
    else if (f === 'starCoin') drawCoinValue(c, 3 * coinValue(l));
    else if (f === 'energyOrb') { /* value is shown on collection */ }
    else if (showLevel) drawItemLevel(c, l);
  });
}

function drawStarToken(c: Parameters<typeof drawItem>[0], level: number) {
  const palette = ['#B69AF4', '#80E5F3', '#F7A86E', '#F9DB70'];
  const color = palette[Math.max(0, Math.min(3, level - 1))];
  c.drawCircle(50, 44, 41, rad(50, 44, 41, [color, color], [0, 1], [0.45, 0]));
  if (level > 1) {
    const sides = level === 2 ? 4 : level === 3 ? 6 : 10;
    const rim = Skia.PathBuilder.Make();
    for (let i = 0; i < sides; i++) {
      const angle = -Math.PI / 2 + i * 2 * Math.PI / sides;
      const radius = level === 4 && i % 2 ? 33 : 41;
      const x = 50 + Math.cos(angle) * radius, y = 44 + Math.sin(angle) * radius;
      if (i === 0) rim.moveTo(x, y); else rim.lineTo(x, y);
    }
    rim.close();
    const shape = rim.detach();
    c.drawPath(shape, lin(0, 5, 0, 85, [shade(color, 0.45), color, shade(color, -0.4)]));
    c.drawPath(shape, line(colors.honeyRim, 2));
  }
  c.drawCircle(50, 44, 33, fill(shade(color, -0.35)));
  c.drawCircle(50, 42, 31, lin(0, 10, 0, 75, [shade(color, 0.5), color, shade(color, -0.35)]));
  c.drawCircle(50, 42, 29, line(colors.honeyRim, 2));
  const tint = Skia.Paint();
  tint.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color(color), BlendMode.Modulate));
  drawArtFit(c, 'icon_token', 17, tint);
  sparkle(c, 26, 22, 5, colors.white);
  if (level >= 3) sparkle(c, 75, 58, 4, colors.honeySoft);
}

function drawCoinValue(c: Parameters<typeof drawItem>[0], value: number) {
  const digits: Record<string, number[]> = { '0': [0, 1, 2, 3, 4, 5], '1': [1, 2], '2': [0, 1, 6, 4, 3], '3': [0, 1, 6, 2, 3], '4': [5, 6, 1, 2], '5': [0, 5, 6, 2, 3], '6': [0, 5, 6, 4, 3, 2], '7': [0, 1, 2], '8': [0, 1, 2, 3, 4, 5, 6], '9': [0, 1, 2, 3, 5, 6] };
  const segments = [[0,0,6,0],[6,0,6,6],[6,6,6,12],[0,12,6,12],[0,6,0,12],[0,0,0,6],[0,6,6,6]];
  const text = String(value), scale = text.length > 2 ? 1.1 : 1.5;
  const start = 50 - (text.length * 8 - 2) * scale / 2;
  for (const [ink, width] of [[colors.honeySoft, 5], [colors.honeyInk, 2.5]] as const) {
    const paint = line(ink, width);
    for (let i = 0; i < text.length; i++) for (const s of digits[text[i]] ?? []) {
      const [x1,y1,x2,y2] = segments[s], x = start + i * 8 * scale;
      c.drawLine(x + x1 * scale, 42 + y1 * scale, x + x2 * scale, 42 + y2 * scale, paint);
    }
  }
}

function producerImg(id: ProducerId, level: number, pt: number) {
  return boxImage(`producer.${id}.${level}`, pt, (c) => {
    if (!drawArtFit(c, producerArtId(id), 6)) drawProducer(c, id);
    drawLevelPips(c, level, PRODUCER[id].levels.length);
  });
}

/** Legacy bramble look (save v4 removes brambles; kept only as a never-crash fallback). */
function brambleImg(pt: number, hp: number) {
  return boxImage(`bramble.${hp}`, pt, (c) => {
    // Thorny, dark bramble sprite (berries = 2 hits left); never reads as a plant item.
    if (drawArtBox(c, hp > 1 ? 'prop_bramble_2' : 'prop_bramble_1', 4)) return;
    c.drawPath(blob([[12, 86], [10, 50], [30, 26], [56, 20], [82, 34], [90, 70], [70, 90], [34, 92]]), lin(0, 20, 0, 92, [colors.sage, colors.sageDeep]));
    const thorn = line(colors.sageEdge, 3);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const x = 50 + Math.cos(a) * 28;
      const y = 56 + Math.sin(a) * 24;
      c.drawLine(x, y, x + Math.cos(a + 0.6) * 10, y + Math.sin(a + 0.6) * 10, thorn);
    }
    if (hp > 1) for (const [x, y] of [[36, 48], [62, 44], [50, 68]] as const) c.drawCircle(x, y, 4, fill(colors.danger));
  });
}

function lockImg(pt: number) {
  return boxImage('lockcell', pt, (c) => {
    for (const [x, y, r] of [[30, 56, 22], [56, 48, 26], [74, 62, 18], [46, 68, 20]] as const) c.drawCircle(x, y, r, fill(colors.white, 0.5));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(38, 50, 24, 20), 5, 5), fill(shade(colors.borderDeep, -0.1), 0.7));
    c.drawPath(blob([[42, 50], [42, 40], [50, 34], [58, 40], [58, 50]], 0.6), line(shade(colors.borderDeep, -0.2), 4, 0.7));
  });
}

/** Static neighbour preview: only unlocked areas draw sprites; locked areas use a light texture. */
function previewBoard(board: Cell[], state: GameState, cell: number, locked: boolean) {
  const w = cell * BOARD_W + 4, h = cell * BOARD_H + 4;
  const rec = Skia.PictureRecorder();
  const cv = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  cv.drawRect(Skia.XYWHRect(0, 0, w, h), fill(locked ? boardColors.locked : boardColors.bedDeep));
  for (let i = 0; i < BOARD_W * BOARD_H; i++) {
    const x = 2 + (i % BOARD_W) * cell, y = 2 + Math.floor(i / BOARD_W) * cell;
    const cl = board[i];
    const face = locked ? ((i + Math.floor(i / BOARD_W)) % 2 ? boardColors.lockedPreview : boardColors.lockedPreviewAlt) : cl?.t === 'x' ? boardColors.locked : boardColors.tile;
    cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 1.5, y + 1.5, cell - 3, cell - 3), 8, 8), fill(face));
    if (locked || !cl) continue;
    const img = cl.t === 'i' ? itemImg(cl.k, cell, showItemLevels(state.level)) : cl.t === 'p' ? producerImg(cl.p, state.producers[cl.p]?.level ?? 1, cell) : cl.t === 'b' ? brambleImg(cell, cl.hp) : cl.t === 'x' && isOpenable(board, i) ? lockImg(cell) : null;
    if (img) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x + cell * 0.04, y + cell * 0.02, cell * 0.92, cell * 0.92), Skia.Paint());
  }
  return rec.finishRecordingAsPicture();
}

export function BoardScreen() {
  const { state: loadedState, dispatch, t, c, subscribe, now, screen, reduceMotion, open, setScreen, overlays, moments, lang } = useGame();
  const state = loadedState.version >= SAVE_VERSION && loadedState.workshop && loadedState.crate && loadedState.farmReadyAt && loadedState.farmFactories && loadedState.nodes ? loadedState : (migrate(loadedState) ?? repair(loadedState));
  const [box, setBox] = useState({ w: 360, h: 640 });
  const [selected, setSelected] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [harvestFx, setHarvestFx] = useState<{ id: number; key: ItemKey; from: number[] } | null>(null);
  const hidden = useMemo(() => new Set(fx.flatMap(f => f.type === 'merge' ? f.created : f.type === 'fly' ? f.to : [])), [fx]);
  const [farmOpen, setFarmOpen] = useState(false);
  const [grocerOpen, setGrocerOpen] = useState<number | null>(null);
  const [areaAsk, setAreaAsk] = useState<number | null>(null);
  const tutorialBusy = !!(overlays.dialogue || overlays.puzzle || overlays.structure || overlays.node || overlays.source || overlays.settings || overlays.levelInfo || overlays.storage || overlays.energy || overlays.supply || overlays.premium || overlays.season || overlays.resource !== null || overlays.memory || moments.length || farmOpen || grocerOpen !== null || areaAsk !== null);
  const tipItems = state.board.filter((cell): cell is Extract<Cell, { t: 'i' }> => cell.t === 'i');
  const tip = state.level <= 10 && state.flags.introDone && !tutorialBusy && (state.tutorial.skipped || state.tutorial.done.includes('crate'))
    ? [...tipItems].sort((a, b) => Number(b.k.startsWith('energyOrb:')) - Number(a.k.startsWith('energyOrb:'))).find(cell => {
      const family = parseItem(cell.k).f;
      return needsFamilyIntro(state, family);
    }) : undefined;

  // Corner notice when a valley quest becomes ready to hand in while playing here.
  const readyIds = availableQuests(state).filter((q) => canComplete(state, q)).map((q) => q.id).join(',');
  const knownReady = useRef<Set<string> | null>(null);
  const [readyNotice, setReadyNotice] = useState<string | null>(null);
  useEffect(() => {
    const ids = readyIds ? readyIds.split(',') : [];
    const known = knownReady.current;
    knownReady.current = new Set(ids);
    if (!known) return; // first render: only changes from now on are news
    const fresh = ids.find((id) => !known.has(id));
    if (fresh) setReadyNotice(fresh);
    else if (readyNotice && !ids.includes(readyNotice)) setReadyNotice(null);
  }, [readyIds]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!readyNotice) return;
    const h = setTimeout(() => setReadyNotice(null), 9000);
    return () => clearTimeout(h);
  }, [readyNotice]);
  const nextArea = workshopPrice(state.workshop.unlocked.length);
  const [panMode, setPanMode] = useState(false);
  const fxSeq = useRef(0);
  const [ordersTargetRef, ordersTargetMeasure] = useMeasuredTarget('orders');
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [lockedShop, setLockedShop] = useState<number | null>(null);
  const shopItemLabel = useItemLabel();

  layoutFor(box.h);
  // The tray retains its 6 pt rim; narrow outer margins let the board use the phone width.
  const cell = Math.floor(Math.min((box.w - 4) / BOARD_W, (box.h - ORDER_BAR_H - INFO_H - BAG_H - HUD_H - 18) / BOARD_H));
  const bw = cell * BOARD_W;
  const bh = cell * BOARD_H;
  const pad = 2;
  const vw = bw + pad * 2, vh = bh + pad * 2;
  const areaPosition = workshopPosition(state.workshop.active);
  const cameraX = useSharedValue(-areaPosition.col * vw), cameraY = useSharedValue(-areaPosition.row * vh), zoom = useSharedValue(1);
  const panOrigin = useRef({ x: -areaPosition.col * vw, y: -areaPosition.row * vh });
  const worldStyle = useAnimatedStyle(() => ({ transform: [{ translateX: cameraX.value }, { translateY: cameraY.value }, { scale: zoom.value }] }));
  const worldTransform = useDerivedValue(() => [{ translateX: cameraX.value }, { translateY: cameraY.value }, { scale: zoom.value }]);
  useEffect(() => {
    const p = workshopPosition(state.workshop.active);
    cameraX.value = -p.col * vw;
    cameraY.value = -p.row * vh;
    // Recenter only after a layout change, not when the player selects a region.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vw, vh]);

  // Drag state (JS-thread gestures; positions mirrored into shared values for the canvas).
  const dragFrom = useRef<number | null>(null);
  const [dragKey, setDragKey] = useState<{ img: SkImage | null } | null>(null);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);
  const hx = useSharedValue(-999);
  const hy = useSharedValue(-999);
  const hValid = useSharedValue(0);
  const lastHover = useRef(-1);
  const dragTr = useDragTransform(dx, dy);

  const cellAt = useCallback(
    (x: number, y: number) => {
      const cx = Math.floor((x - cameraX.value - areaPosition.col * vw - pad) / cell);
      const cy = Math.floor((y - cameraY.value - areaPosition.row * vh - pad) / cell);
      if (cx < 0 || cy < 0 || cx >= BOARD_W || cy >= BOARD_H) return -1;
      return cy * BOARD_W + cx;
    },
    [cell, cameraX, cameraY, areaPosition.col, areaPosition.row, vw, vh],
  );

  // Effects from engine events.
  useEffect(
    () =>
      subscribe((events: GameEvent[]) => {
        const add: Fx[] = [];
        for (const e of events) {
          fxSeq.current += 1;
          if (e.type === 'merge') {
            const { f, l } = parseItem(e.item);
            add.push({ id: fxSeq.current, type: 'merge', from: e.from, at: e.at, created: e.created, oldKey: itemKey(f, l - 1), newKey: e.item, five: e.count === 5, bonus: e.bonus });
          } else if (e.type === 'collectHarvest') {
            const id = fxSeq.current;
            setHarvestFx({ id, key: e.item, from: e.from });
            setTimeout(() => setHarvestFx((current) => current?.id === id ? null : current), e.from.length * 70 + 700);
          } else if (e.type === 'resourceDelivery') {
            add.push({ id: fxSeq.current, type: 'fly', from: e.from, to: e.to, key: e.item });
          } else if (e.type === 'produce') {
            add.push({ id: fxSeq.current, type: 'fly', from: e.from, to: [e.to], key: e.item });
          } else if (e.type === 'convert') {
            const src = e.to[0];
            add.push({ id: fxSeq.current, type: 'fly', from: src, to: e.to, key: e.output });
          } else if (e.type === 'bramble' && e.cleared) add.push({ id: fxSeq.current, type: 'poof', at: e.at });
          else if (e.type === 'resource' && (e.phase === 'start' || e.phase === 'cleared')) add.push({ id: fxSeq.current, type: 'resource', at: e.at, kind: e.kind });
        }
        if (add.length) {
          setFx((list) => [...list, ...add].slice(-12));
        }
      }),
    [subscribe],
  );

  const doneFx = useCallback((id: number) => {
    setFx(list => list.filter(f => f.id !== id));
  }, []);

  // Only redraw the board when a timed object's ready state changes, not every clock tick.
  const readiness = `${state.farmFactories.merchant.readyAt > 0 && now >= state.farmFactories.merchant.readyAt}:${Object.entries(state.farmReadyAt).filter(([, at]) => at > now).map(([key]) => key).join(',')}`;
  // Board picture (static; re-recorded on state change).
  const picture = useMemo(() => {
    const rec = Skia.PictureRecorder();
    const cv = rec.beginRecording(Skia.XYWHRect(0, 0, bw + pad * 2, bh + pad * 2));
    const skin = state.workshopSkin.active as WorkshopSkinId;
    drawWorkshopFrame(cv, skin, bw + pad * 2, bh + pad * 2);
    state.board.forEach((cl: Cell, i: number) => {
      const x = pad + (i % BOARD_W) * cell;
      const y = pad + Math.floor(i / BOARD_W) * cell;
      const even = ((i % BOARD_W) + Math.floor(i / BOARD_W)) % 2 === 0;
      const r = Skia.XYWHRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      drawWorkshopTile(cv, skin, x, y, cell, even, cl.t === 'x');
      if (cl.t === 'x') {
        const img = lockImg(cell);
        if (img && isOpenable(state.board, i)) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x, y, cell, cell), Skia.Paint());
        return;
      }
      if (i === selected) cv.drawRRect(Skia.RRectXY(r, 9, 9), line(colors.honeyDeep, 3));
      if (hidden.has(i) || i === dragFrom.current) return;
      let img: SkImage | null = null;
      if (cl.t === 'i') img = itemImg(cl.k, cell, showItemLevels(state.level));
      else if (cl.t === 'p') img = producerImg(cl.p, state.producers[cl.p]?.level ?? 1, cell);
      else if (cl.t === 'b') img = brambleImg(cell, cl.hp);
      if (cl.t === 'r') return; // obstacles are drawn in a second pass, above their neighbours
      if (img) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x + cell * 0.04, y + cell * 0.02, cell * 0.92, cell * 0.92), Skia.Paint());
      if (cl.t === 'i' && FARM_OUTPUTS[cl.k] && (state.farmReadyAt[`${state.workshop.active}:${i}`] ?? 0) <= now) {
        cv.drawCircle(x + cell * 0.78, y + cell * 0.2, cell * 0.18, fill(colors.honeySoft));
        cv.save(); cv.translate(x + cell * 0.61, y + cell * 0.03); cv.scale(cell * 0.0034, cell * 0.0034);
        drawArtBox(cv, itemArtId(FARM_OUTPUTS[cl.k])); cv.restore();
      }
      if (cl.t === 'p') {
        if (cl.p === 'merchant') {
          const job = state.farmFactories.merchant;
          if (job.readyAt > 0 && now >= job.readyAt) {
            cv.drawCircle(x + cell * 0.8, y + cell * 0.2, cell * 0.18, fill(colors.honeySoft));
            cv.drawCircle(x + cell * 0.8, y + cell * 0.2, cell * 0.14, line(colors.honeyDeep, 2));
          }
        } else {
          const st = state.producers[cl.p];
          const lv = producerLevel(cl.p, st?.level ?? 1);
          const k = st ? st.charges / lv.charges : 0;
          cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + cell * 0.18, y + cell * 0.06, cell * 0.64, 4), 2, 2), fill(colors.white, 0.7));
          cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + cell * 0.18, y + cell * 0.06, cell * 0.64 * k, 4), 2, 2), fill(k > 0 ? colors.sage : colors.danger));
        }
      }
    });
    // Resource obstacles: one logical cell, drawn ~125% so they read as big objects. Bottom-anchored
    // in their cell, so they overlap the cell above a little but never cover a neighbour's centre.
    state.board.forEach((cl: Cell, i: number) => {
      if (cl.t !== 'r') return;
      const x = pad + (i % BOARD_W) * cell;
      const y = pad + Math.floor(i / BOARD_W) * cell;
      const img = resourceImg(cl.r, Math.min(2, cl.stage), cell);
      const size = cell * 1.25;
      if (img) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x + (cell - size) / 2, y + cell - size + cell * 0.04, size, size), Skia.Paint());
      if (i === selected) cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 1.5, y + 1.5, cell - 3, cell - 3), 9, 9), line(colors.honeyDeep, 3));
    });
    return rec.finishRecordingAsPicture();
  }, [state.board, state.producers, state.level, state.farmReadyAt, state.workshop.active, state.workshopSkin.active, readiness, cell, bw, bh, selected, hidden, dragKey]);
  const lockedPreview = useMemo(() => previewBoard([], state, cell, true), [cell]);
  const previews = useMemo(() => WORKSHOP_GRID.map((area) => state.workshop.unlocked.includes(area) && area !== state.workshop.active ? previewBoard(state.workshop.boards[area], state, cell, false) : lockedPreview), [state.workshop.boards, state.workshop.unlocked, state.workshop.active, state.producers, state.level, cell, lockedPreview]);

  const showHover = useCallback(
    (i: number) => {
      if (i === lastHover.current) return;
      lastHover.current = i;
      if (i < 0) {
        hx.value = -999;
        return;
      }
      hx.value = pad + (i % BOARD_W) * cell;
      hy.value = pad + Math.floor(i / BOARD_W) * cell;
      const from = dragFrom.current;
      const src = from !== null ? state.board[from] : null;
      const dst = state.board[i];
      let valid = 0;
      if (src?.t === 'i' && dst && dst.t !== 'x' && dst.t !== 'b' && dst.t !== 'r') {
        // Green only when dropping here really merges (target matches and has a matching neighbour).
        if (from !== null && mergeTrio(state.board, from, i)) valid = 1;
        else if (from !== i && dst.t === 'i' && dst.k === src.k) valid = -1;
        if (dst.t === 'p' && PRODUCER[dst.p].recipes?.some((r) => r.input === src.k)) valid = 1;
      }
      if (dst?.t === 'x' || dst?.t === 'b' || dst?.t === 'r') valid = -1;
      hValid.value = valid;
    },
    [cell, state.board, hx, hy, hValid],
  );

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(7)
      .maxPointers(1)
      .onStart((e) => {
        panOrigin.current = { x: cameraX.value - e.translationX, y: cameraY.value - e.translationY };
        const i = cellAt(e.x, e.y);
        const cl = i >= 0 ? state.board[i] : null;
        if (panMode || !cl || (cl.t !== 'i' && cl.t !== 'p') || (cl.t === 'p' && cl.p === 'merchant')) {
          dragFrom.current = null;
          return;
        }
        dragFrom.current = i;
        const img = cl.t === 'i' ? itemImg(cl.k, cell, showItemLevels(state.level)) : producerImg(cl.p, state.producers[cl.p]?.level ?? 1, cell);
        dx.value = e.x - cameraX.value - areaPosition.col * vw - cell * 0.6;
        dy.value = e.y - cameraY.value - areaPosition.row * vh - cell * 0.85;
        setDragKey({ img });
        setSelected(i);
        lastHover.current = -2;
        showHover(i);
      })
      .onUpdate((e) => {
        if (dragFrom.current === null) {
          // The camera only moves in explore mode; in normal play an empty drag does nothing.
          if (!panMode) return;
          const z = zoom.value;
          cameraX.value = Math.max(Math.min(0, vw - WORKSHOP_COLS * vw * z), Math.min(0, panOrigin.current.x + e.translationX));
          cameraY.value = Math.max(Math.min(0, vh - WORKSHOP_ROWS * vh * z), Math.min(0, panOrigin.current.y + e.translationY));
          return;
        }
        dx.value = e.x - cameraX.value - areaPosition.col * vw - cell * 0.6;
        dy.value = e.y - cameraY.value - areaPosition.row * vh - cell * 0.85;
        showHover(cellAt(e.x, e.y));
      })
      .onEnd((e) => {
        captureRewardOrigin(e.absoluteX, e.absoluteY);
        const from = dragFrom.current;
        dragFrom.current = null;
        hx.value = -999;
        lastHover.current = -1;
        setDragKey(null);
        if (from === null) return;
        const to = cellAt(e.x, e.y);
        if (to >= 0 && to !== from) {
          const r = dispatch({ type: 'move', from, to });
          if (r.ok) setSelected(to);
          if (r.events.some((x) => x.type === 'merge') && !state.flags.tutMerge) dispatch({ type: 'flag', key: 'tutMerge' });
        }
      })
      .onFinalize(() => {
        if (dragFrom.current !== null) {
          dragFrom.current = null;
          hx.value = -999;
          setDragKey(null);
        }
      });
    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(400)
      .onEnd((e) => {
        captureRewardOrigin(e.absoluteX, e.absoluteY);
        // The star-coin Collect button sits on the board, so its taps arrive here first.
        const bubble = !panMode && selected !== null ? collectBubbleRect(state.board, selected, cell, pad, vw) : null;
        if (bubble && e.x >= bubble.left && e.x <= bubble.left + bubble.width && e.y >= bubble.top && e.y <= bubble.top + bubble.height) {
          dispatch({ type: 'collectCoin', cell: selected! });
          setSelected(null);
          return;
        }
        const wx = (e.x - cameraX.value) / zoom.value, wy = (e.y - cameraY.value) / zoom.value;
        const area = workshopAt(wx, wy, vw, vh);
        if (area === null) return;
        if (!state.workshop.unlocked.includes(area)) {
          const p = workshopPosition(area);
          if (Math.abs(wx - p.col * vw - vw / 2) > 90 || Math.abs(wy - p.row * vh - vh / 2) > 65) return;
          // Opening an area spends coins or star tokens: always confirm first.
          setAreaAsk(area);
          return;
        }
        const p = workshopPosition(area);
        const x = Math.floor((wx - p.col * vw - pad) / cell), y = Math.floor((wy - p.row * vh - pad) / cell);
        if (x < 0 || x >= BOARD_W || y < 0 || y >= BOARD_H) return;
        const i = y * BOARD_W + x;
        const cl = area === state.workshop.active ? state.board[i] : state.workshop.boards[area][i];
        if (area !== state.workshop.active) {
          const result = dispatch({ type: 'switchWorkshop', area });
          if (!result.ok) return;
          setFx([]);
          if (panMode) { exitExplore(area); return; }
        }
        if (panMode) return;
        setSelected(i);
        if (cl.t === 'r') {
          if (cl.readyAt > 0 && Date.now() >= cl.readyAt) dispatch({ type: 'claimResource', cell: i });
          else open('resource', i);
          return;
        }
        if (cl.t === 'p' && cl.p === 'merchant') {
          const job = state.farmFactories.merchant;
          if (job.readyAt > 0 && now >= job.readyAt) dispatch({ type: 'claimFarmReward', factory: 'merchant' });
          else setFarmOpen(true);
          return;
        }
        if (cl.t === 'p' && PRODUCER[cl.p].kind === 'generator') dispatch({ type: 'tap', cell: i });
        // Star coins are never collected by a stray tap: selecting one shows a Collect button above it.
        if (cl.t === 'i' && (cl.k.startsWith('starCoin:') || cl.k.startsWith('energyOrb:'))) return;
        if (cl.t === 'i' && (FARM_OUTPUTS[cl.k] || HARVEST_ITEMS.includes(cl.k)) && (state.farmReadyAt[`${state.workshop.active}:${i}`] ?? 0) <= Date.now()) dispatch({ type: 'tap', cell: i });
      });
    const pinchStart = { z: 1, x: 0, y: 0, fx: 0, fy: 0 };
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .enabled(panMode)
      .onStart((e) => { pinchStart.z = zoom.value; pinchStart.x = cameraX.value; pinchStart.y = cameraY.value; pinchStart.fx = e.focalX; pinchStart.fy = e.focalY; })
      .onUpdate((e) => {
        const z = Math.max(0.45, Math.min(1, pinchStart.z * e.scale));
        const k = z / pinchStart.z;
        zoom.value = z;
        cameraX.value = Math.max(Math.min(0, vw - WORKSHOP_COLS * vw * z), Math.min(0, pinchStart.fx - (pinchStart.fx - pinchStart.x) * k));
        cameraY.value = Math.max(Math.min(0, vh - WORKSHOP_ROWS * vh * z), Math.min(0, pinchStart.fy - (pinchStart.fy - pinchStart.y) * k));
      });
    return Gesture.Simultaneous(pinch, Gesture.Exclusive(pan, tap));
  }, [cellAt, panMode, state.board, state.producers, state.level, state.workshop, state.farmReadyAt, state.farmFactories, areaPosition.col, areaPosition.row, vw, vh, cell, dispatch, dx, dy, hx, cameraX, cameraY, zoom, showHover, now, selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  // Explore mode: free camera and zoom over all areas; "Done" (or tapping an area) returns.
  function exitExplore(area = state.workshop.active) {
    setPanMode(false);
    const p = workshopPosition(area);
    const d = reduceMotion ? 0 : 240;
    zoom.value = withTiming(1, { duration: d });
    cameraX.value = withTiming(-p.col * vw, { duration: d });
    cameraY.value = withTiming(-p.row * vh, { duration: d });
  }

  // Board-side tutorial hints (the shell draws the ones pointing at real buttons).
  const step = pendingTutorial(state, screen);
  const tut = state.workshop.active !== 0 ? null : step === 'merge' ? 'merge' : step === 'crateMerge' ? 'crateMerge' : null;
  // The resource hint points at the real obstacle cell (window coordinates of the board).
  const tutRes = step === 'resource' && state.workshop.active === 0 ? state.board.findIndex((c) => c.t === 'r' && c.readyAt === 0) : -1;
  const boardRef = useRef<{ measureInWindow: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null>(null);
  useEffect(() => {
    if (tutRes < 0) return;
    const id = requestAnimationFrame(() => boardRef.current?.measureInWindow((bx: number, by: number) => {
      setTarget('resource', { x: bx + pad + (tutRes % BOARD_W) * cell, y: by + pad + Math.floor(tutRes / BOARD_W) * cell, w: cell, h: cell });
    }));
    return () => {
      cancelAnimationFrame(id);
      setTarget('resource', null);
    };
  }, [tutRes, cell, box.w, box.h]);
  const ringFor = (): number[] | null => {
    if (tut !== 'merge') return null;
    const lone = 3 + 6 * BOARD_W;
    return state.board[lone]?.t === 'i' ? [lone, 3 + 4 * BOARD_W] : null;
  };
  const ring = ringFor();
  const merchantCell = state.board.findIndex((c) => c.t === 'p' && c.p === 'merchant');

  return (
    <View style={styles.root} onLayout={onLayout}>
      {readyNotice ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.readyNotice}>
          <Pressable onPress={() => { setReadyNotice(null); setScreen('quests'); }} accessibilityRole="button" accessibilityLabel={t('notice.questReady', { q: c(`quest.${readyNotice}`) })} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Sprite id="icon.quests" size={30} />
            <View style={{ flex: 1 }}>
              <Text style={styles.readyNoticeTitle} numberOfLines={1}>{t('notice.questReadyTitle')}</Text>
              <Text style={styles.readyNoticeText} numberOfLines={2}>{t('notice.questReady', { q: c(`quest.${readyNotice}`) })}</Text>
            </View>
          </Pressable>
          <Pressable onPress={() => setReadyNotice(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}><Text style={styles.readyNoticeX}>×</Text></Pressable>
        </Animated.View>
      ) : null}
      {lockedShop !== null ? <InfoModal title={lang === 'tr' ? 'Üretici kilitli' : 'Shop locked'} onClose={() => setLockedShop(null)}><Text style={styles.infoSub}>{Number.isFinite(SHOP_LEVELS[lockedShop]) ? (lang === 'tr' ? `En az ${SHOP_LEVELS[lockedShop]}. seviye ve aşağıdaki tariflerden birinin ürünleri gerekir:` : `Requires level ${SHOP_LEVELS[lockedShop]} and the ingredients for one of these recipes:`) : (lang === 'tr' ? 'Bu dükkân henüz açılmadı.' : 'This shop is not available yet.')}</Text>{(SHOP_RECIPES[lockedShop] ?? []).map(index => <Text key={index} style={styles.infoSub}>• {FARM_RECIPES.grocer[index].inputs.map(x => shopItemLabel(x.item).name).join(' + ')}</Text>)}</InfoModal> : null}
      <View style={{ alignItems: 'center', zIndex: 1 }}>
        <GestureDetector gesture={gesture}>
          <View ref={boardRef as never} style={{ width: vw, height: vh, overflow: 'hidden', borderRadius: 16 }} accessibilityLabel={t('board.title')}>
            <Canvas style={{ position: 'absolute', width: vw, height: vh }} pointerEvents="none">
              <Group transform={worldTransform}>
                {WORKSHOP_GRID.map((area, index) => {
                  const pos = workshopPosition(area), active = area === state.workshop.active;
                  return <Group key={area} transform={[{ translateX: pos.col * vw }, { translateY: pos.row * vh }]}>
                    <Picture picture={active ? picture : previews[index]} />
                    {active ? <>
                      <HoverRect x={hx} y={hy} valid={hValid} size={cell} />
                      {fx.map((f) => <FxView key={f.id} fx={f} cell={cell} pad={pad} onDone={doneFx} reduce={state.settings.reduceMotion} showLevel={showItemLevels(state.level)} />)}
                      {ring ? <TutorialRing from={ring[0]} to={ring[1]} cell={cell} pad={pad} /> : null}
                      {dragKey?.img ? <Group transform={dragTr}><SkImageNode image={dragKey.img} x={0} y={0} width={cell * 1.2} height={cell * 1.2} /></Group> : null}
                    </> : null}
                  </Group>;
                })}
              </Group>
            </Canvas>
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: vw * WORKSHOP_COLS, height: vh * WORKSHOP_ROWS, transformOrigin: 'top left' }, worldStyle]}>
              {WORKSHOP_GRID.map((area) => {
                const pos = workshopPosition(area), active = area === state.workshop.active, open = state.workshop.unlocked.includes(area);
                return <View key={area} style={{ position: 'absolute', left: pos.col * vw, top: pos.row * vh, width: vw, height: vh }}>
                  {active ? <>
                    {fx.filter((f) => f.type === 'merge' && f.bonus).map((f) => f.type === 'merge' ? <Animated.View key={`combo-${f.id}`} pointerEvents="none" entering={FadeIn.duration(100)} style={[styles.combo, { left: Math.max(0, Math.min(vw - 100, center(f.at, cell, pad)[0] - 50)), top: Math.max(0, center(f.at, cell, pad)[1] - cell), width: 100 }]}><Text style={styles.comboText}>KOMBO +1!</Text></Animated.View> : null)}
                    {merchantCell >= 0 ? <MerchantBadge state={state} cell={cell} pad={pad} at={merchantCell} now={now} /> : null}
                    {state.board.map((c, i) => c.t === 'r' && c.readyAt > 0 ? <ResourceBadge key={`r${i}`} at={i} cell={cell} pad={pad} readyAt={c.readyAt} now={now} /> : null)}
                    {state.board.map((c, i) => c.t === 'r' && c.readyAt > now ? <ResourceStageFlash key={`stage${i}`} at={i} cell={cell} pad={pad} stage={c.stage} reduce={state.settings.reduceMotion} /> : null)}
                  </> : !open ? <View style={styles.worldLock}><Sprite id="icon.lock" size={30} /><Text style={styles.worldLockTitle}>{t('area.new')}</Text><View style={styles.worldLockCostRow}><Sprite id={nextArea.currency === 'coins' ? ICON.coin : 'icon.token'} size={20} /><Text style={styles.worldLockCost}>{nextArea.amount}</Text></View><Text style={styles.worldLockHint}>{t('area.tap')}</Text></View> : null}
                </View>;
              })}
            </Animated.View>
            {!panMode ? <ShopRow now={now} reduceMotion={reduceMotion} cell={cell} pad={pad} lang={lang} state={state} onLocked={index => setLockedShop(index)} onMerchant={() => { if (state.farmFactories.merchant.readyAt > 0 && now >= state.farmFactories.merchant.readyAt) dispatch({ type: 'claimFarmReward', factory: 'merchant' }); else setFarmOpen(true); }} onGrocer={shop => { if (state.farmFactories.grocer.readyAt > 0 && now >= state.farmFactories.grocer.readyAt && SHOP_RECIPES[shop]?.includes(state.farmFactories.grocer.recipe)) dispatch({ type: 'claimFarmReward', factory: 'grocer' }); else setGrocerOpen(shop); }} /> : null}
            {(() => {
              // A star coin is collected only from this button (handled by the board's tap gesture),
              // never by the first tap on it.
              const r = !panMode && selected !== null ? collectBubbleRect(state.board, selected, cell, pad, vw) : null;
              return r ? (
                <View key={`collect-${selected}`} pointerEvents="none" style={[styles.collectBubble, { position: 'absolute', zIndex: 30, ...r }]}>
                  <Sprite id={selected !== null && state.board[selected]?.t === 'i' && (state.board[selected] as { k: string }).k.startsWith('energyOrb:') ? "icon.energy" : "icon.token"} size={20} />
                  <Text style={styles.collectText}>{selected !== null && state.board[selected]?.t === 'i' && (state.board[selected] as { k: string }).k.startsWith('energyOrb:') ? `${t('coin.collect')} ${10 * coinValue(parseItem((state.board[selected] as { k: string }).k).l)}` : t('coin.collect')}</Text>
                </View>
              ) : null;
            })()}
          </View>
        </GestureDetector>
        {harvestFx ? harvestFx.from.map((from, i) => <HarvestFlight key={`${harvestFx.id}-${from}-${i}`} item={harvestFx.key} from={from} index={i} cell={cell} pad={pad} boardWidth={vw} viewportWidth={box.w} boardHeight={vh} reduce={reduceMotion} />) : null}
        {panMode ? (
          <View style={[styles.exploreBar, { width: vw - 16 }]}>
            <Text style={styles.exploreText} numberOfLines={2}>{t('explore.on')}</Text>
            <Pressable onPress={() => exitExplore()} style={styles.exploreDone} accessibilityRole="button" accessibilityLabel={t('explore.done')}>
              <Text style={styles.exploreDoneText}>{t('explore.done')}</Text>
            </Pressable>
          </View>
        ) : tut ? (
          <Animated.View entering={FadeIn.duration(250)} style={[styles.tutBubble, { width: bw }]} pointerEvents="box-none">
            <Text style={styles.tutText}>{t(tut === 'merge' ? 'tut.merge' : 'tut.crateMerge')}</Text>
          </Animated.View>
        ) : null}
      </View>
      {ordersOpen ? <Sheet title={state.settings.lang === 'en' ? 'Orders' : 'Siparişler'} onClose={() => setOrdersOpen(false)}><Orders state={state} /></Sheet> : null}
      <Info selected={selected} state={state} now={now} />
      <Bag state={state} onOrders={() => setOrdersOpen(true)} ordersRef={ordersTargetRef} onOrdersLayout={ordersTargetMeasure} onExplore={() => (panMode ? exitExplore() : setPanMode(true))} exploring={panMode} />
      {farmOpen ? <MerchantSheet state={state} now={now} onClose={() => setFarmOpen(false)} /> : null}
      {grocerOpen !== null ? <GrocerSheet shop={grocerOpen} state={state} now={now} onClose={() => setGrocerOpen(null)} /> : null}
      {tip ? <InfoModal title={c(`item.${tip.k}`)} onClose={() => dispatch({ type: 'flag', key: `introItem:${parseItem(tip.k).f}` })}>
        <View style={{ alignItems: 'center', marginVertical: 8 }}><Sprite id={`item.${tip.k}`} size={80} /></View>
        <Text style={styles.infoSub}>{parseItem(tip.k).f === 'energyOrb' ? (lang === 'tr' ? 'Üç aynı enerjiyi birleştirerek daha güçlü enerji elde edebilirsin. Dokunup Topla tuşuna basarak enerjiyi al.' : 'Merge three matching energy items to make a stronger one. Tap it and collect your energy.') : parseItem(tip.k).f === 'coin' ? (lang === 'tr' ? 'Üç aynı parayı birleştirerek değerini artırabilir veya dokunup toplayabilirsin.' : 'Merge three matching coins to increase their value, or tap to collect them.') : (lang === 'tr' ? 'Üç aynı ürünü birleştirerek geliştirebilirsin. Hayvan ve bitkilerin son seviyesine dokunduğunda ürünleri ambara gider.' : 'Merge three matching items to improve them. Tap fully grown animals and plants to send their goods to the barn.')}</Text>
      </InfoModal> : null}
      {!tip && !tutorialBusy && !state.flags.tutStarCoin && state.board.some((c) => c.t === 'i' && c.k.startsWith('starCoin:')) ? (
        // First star coin on the board: explain what it is, how to grow it and what it buys.
        <InfoModal title={t('starTut.title')} onClose={() => dispatch({ type: 'flag', key: 'tutStarCoin' })} okLabel={t('starTut.ok')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: 8 }}>
            {[1, 2, 3].map((l) => <Fragment key={l}>{l > 1 ? <Text style={styles.infoTitle}>→</Text> : null}<Sprite id={`item.starCoin:${l}`} size={44} /></Fragment>)}
          </View>
          <Text style={[styles.infoSub, { marginBottom: 6 }]}>{t('starTut.what')}</Text>
          <Text style={[styles.infoSub, { marginBottom: 6 }]}>{t('starTut.merge')}</Text>
          <Text style={[styles.infoSub, { marginBottom: 6 }]}>{t('starTut.collect')}</Text>
          <Text style={styles.infoSub}>{t('starTut.use')}</Text>
        </InfoModal>
      ) : null}
      {areaAsk !== null ? (
        <InfoModal title={t('area.askTitle')} onClose={() => setAreaAsk(null)} okLabel={t('common.cancel')} footer={<Button tone="sage" icon={nextArea.currency === 'coins' ? ICON.coin : 'icon.token'} label={`${nextArea.amount}`} disabled={nextArea.currency === 'coins' ? state.leaves < nextArea.amount : (state.starTokens ?? 0) < nextArea.amount} onPress={() => { const area = areaAsk; setAreaAsk(null); if (dispatch({ type: 'unlockWorkshop', area }).ok) { setSelected(null); setFx([]); } }} />}>
          <Text style={styles.infoSub}>{nextArea.currency === 'coins' ? t('area.askCoins', { n: nextArea.amount }) : t('area.askStars', { n: nextArea.amount, h: state.starTokens ?? 0 })}</Text>
        </InfoModal>
      ) : null}
    </View>
  );
}

const SHOP_SLOTS = [
  { tr: 'Vadi Tüccarı', en: 'Valley Trader', icon: 'icon.shop' },
  { tr: 'Bakkal', en: 'Grocer', icon: 'st.bakery_2' },
  { tr: 'Çiftlik', en: 'Farm shop', icon: 'st.barn_2' },
  { tr: 'Meyveci', en: 'Fruit shop', icon: 'st.orchard_2' },
  { tr: 'Fırın', en: 'Bakery', icon: 'st.bakery_2' },
  null, null,
] as const;

/** Reserved shop spaces; no purchase or shop action exists until designed. */
/** Board-local rectangle of the Collect button above a selected star coin, or null. */
function collectBubbleRect(board: Cell[], at: number, cell: number, pad: number, vw: number): { left: number; top: number; width: number; height: number } | null {
  const c = board[at];
  if (c?.t !== 'i' || !c.k.startsWith('starCoin:') && !c.k.startsWith('energyOrb:')) return null;
  const col = at % BOARD_W, row = Math.floor(at / BOARD_W);
  const width = 96, height = 38;
  return { left: Math.max(2, Math.min(vw - width - 2, pad + col * cell + cell / 2 - width / 2)), top: row > 0 ? pad + row * cell - height - 4 : pad + cell + 4, width, height };
}

function ShopRow({ now, reduceMotion, cell, pad, lang, state, onMerchant, onGrocer, onLocked }: { now: number; reduceMotion: boolean; cell: number; pad: number; lang: 'tr' | 'en'; state: GameState; onMerchant: () => void; onGrocer: (shop: number) => void; onLocked: (index: number) => void }) {
  return <View accessibilityLabel={lang === 'tr' ? 'Tahta içindeki dükkânlar' : 'Board shops'} style={{ position: 'absolute', left: pad, top: pad + (BOARD_H - 1) * cell, width: BOARD_W * cell, height: cell, flexDirection: 'row' }}>{SHOP_SLOTS.map((shop, i) => {
    const status = shopStatus(state, i, now), locked = status.status === 'locked';
    const name = shop ? shop[lang] : (lang === 'tr' ? `Kilitli alan ${i + 1}` : `Locked slot ${i + 1}`);
    return <Pressable key={i} onPress={locked ? () => onLocked(i) : i === 0 ? onMerchant : () => onGrocer(i)} accessibilityRole="button" accessibilityLabel={`${name}${locked ? ' · kilitli' : status.status === 'complete' ? ' · ödülü topla' : status.status === 'running' ? ` · ${clock(status.readyAt - now)}` : ''}`} style={{ width: cell, height: cell, padding: 2 }}>
      <View style={{ flex: 1, borderRadius: 8, backgroundColor: locked ? colors.disabled : colors.honeySoft, borderWidth: 1.5, borderColor: colors.borderDeep, alignItems: 'center', justifyContent: 'center' }}>
        <Sprite id={shop?.icon ?? 'icon.lock'} size={cell * 0.7} style={locked ? { opacity: 0.55 } : undefined} />
        {locked && shop ? <View style={{ position: 'absolute', right: 0, bottom: 0 }}><Sprite id="icon.lock" size={cell * 0.3} /></View> : null}
        {status.status === 'complete' ? <Animated.View entering={reduceMotion ? FadeIn.duration(100) : ZoomIn.duration(250)} style={{ position: 'absolute', right: 0, top: 0 }}><Sprite id="icon.check" size={16} /></Animated.View> : status.status === 'running' ? <Text style={{ position: 'absolute', bottom: 0, fontFamily: font.black, fontSize: 9, color: colors.ink, backgroundColor: colors.paper }}>{clock(status.readyAt - now)}</Text> : null}
      </View>
    </Pressable>;
  })}</View>;
}

function HarvestFlight({ item, from, index, cell, pad, boardWidth, viewportWidth, boardHeight, reduce }: { item: ItemKey; from: number; index: number; cell: number; pad: number; boardWidth: number; viewportWidth: number; boardHeight: number; reduce: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = withDelay(reduce ? 0 : index * 70, withTiming(1, { duration: reduce ? 100 : 500, easing: Easing.in(Easing.quad) })); }, [progress, index, reduce]);
  const startX = (viewportWidth - boardWidth) / 2 + pad + (from % BOARD_W) * cell;
  const startY = pad + Math.floor(from / BOARD_W) * cell;
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: (68 - startX) * progress.value }, { translateY: (boardHeight + INFO_H + 32 - startY) * progress.value }, { scale: 1 - progress.value * 0.65 }], opacity: 1 - progress.value * 0.5 }));
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: startX, top: startY, zIndex: 20 }, style]}><Sprite id={`item.${item}`} size={cell * 0.9} /></Animated.View>;
}

/** Timer / ready bubble on a resource obstacle being broken. */
function ResourceBadge({ at, cell, pad, readyAt, now }: { at: number; cell: number; pad: number; readyAt: number; now: number }) {
  const x = pad + (at % BOARD_W) * cell;
  const y = pad + Math.floor(at / BOARD_W) * cell;
  const ready = now >= readyAt;
  return (
    <View pointerEvents="none" style={[styles.merchantBadge, { left: x + 1, top: y + 1, width: Math.max(0, cell - 2), height: 16, overflow: 'hidden' }, ready && styles.merchantReady]}>
      {ready ? <Sprite id="icon.check" size={12} /> : null}
      {!ready ? <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.merchantText, { flexShrink: 1, fontSize: Math.min(10, Math.max(6, cell * 0.22)) }]}>{clock(readyAt - now)}</Text> : null}
    </View>
  );
}

function ResourceStageFlash({ at, cell, pad, stage, reduce }: { at: number; cell: number; pad: number; stage: number; reduce: boolean }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = reduce ? 1 : withRepeat(withSequence(withTiming(0.25, { duration: 550 }), withTiming(1, { duration: 550 })), -1);
  }, [pulse, reduce]);
  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const x = pad + (at % BOARD_W) * cell;
  const y = pad + Math.floor(at / BOARD_W) * cell;
  return <View pointerEvents="none" style={{ position: 'absolute', left: x + cell * 0.08, top: y + cell * 0.77, width: cell * 0.84, height: Math.max(10, cell * 0.20), backgroundColor: colors.sageEdge, borderRadius: 5, borderWidth: 1, borderColor: colors.white, flexDirection: 'row', gap: 2, padding: 2 }}>
    {[0, 1, 2].map((i) => <Animated.View key={i} style={[{ flex: 1, borderRadius: 2, backgroundColor: i <= 2 - stage ? colors.honey : colors.borderDeep }, i === 2 - stage && animated]} />)}
  </View>;
}

function resourceImg(kind: ResourceKind, stage: number, pt: number) {
  return boxImage(`res.${kind}.${stage}`, pt * 1.25, (c) => drawResource(c, kind, stage));
}

/** What the merchant wants, drawn right on its cell: item, level and how many you have. */
function MerchantBadge({ state, cell, pad, at, now }: { state: GameState; cell: number; pad: number; at: number; now: number }) {
  const job = state.farmFactories.merchant;
  const x = pad + (at % BOARD_W) * cell;
  const y = pad + Math.floor(at / BOARD_W) * cell;
  const ready = job.readyAt > 0 && now >= job.readyAt;
  if (job.readyAt > 0) {
    return (
      <View pointerEvents="none" style={[styles.merchantBadge, { left: x - 6, top: y + cell - 14, width: cell + 12 }, ready && styles.merchantReady]}>
        <Sprite id={ICON.coin} size={16} />
        <Text style={styles.merchantText}>{ready ? `+${job.payout}` : clock(job.readyAt - now)}</Text>
      </View>
    );
  }
  const recipe = FARM_RECIPES.merchant[job.recipe];
  const first = recipe.inputs[0];
  const have = Math.min(countItem(state, first.item), first.count);
  const { l } = parseItem(first.item);
  return (
    <View pointerEvents="none" style={[styles.merchantBadge, { left: x - 6, top: y + cell - 14, width: cell + 12 }, have >= first.count && styles.merchantReady]}>
      <Sprite id={`item.${first.item}`} size={18} />
      {FAMILY[parseItem(first.item).f].levels > 1 ? <Text style={styles.merchantLv}>{l}</Text> : null}
      <Text style={styles.merchantText}>{have}/{first.count}{recipe.inputs.length > 1 ? '+' : ''}</Text>
    </View>
  );
}

function MerchantSheet({ state, now, onClose }: { state: GameState; now: number; onClose: () => void }) {
  const { dispatch, lang, t, open } = useGame();
  const label = useItemLabel();
  const factory = state.farmFactories.merchant;
  const trader = traderRecipe(state.level);
  const ready = !factory.readyAt && trader.inputs.every((input) => (state.harvestStock[input.item] ?? 0) >= input.count);
  const complete = factory.readyAt > 0 && now >= factory.readyAt;
  const footer = complete ? <Button tone="sage" icon="icon.token" label={lang === 'tr' ? 'Ödülü al' : 'Collect reward'} onPress={() => { dispatch({ type: 'claimFarmReward', factory: 'merchant' }); onClose(); }} />
    : factory.readyAt ? <View><Text style={styles.sheetTimer}>{t('merchant.preparing', { t: clock(Math.max(0, factory.readyAt - now)) })}</Text><HurryButton target={{ kind: 'merchant' }} readyAt={factory.readyAt} /></View>
    : <Button tone={ready ? 'sage' : 'cream'} disabled={!ready} label={t('merchant.deliver')} onPress={() => dispatch({ type: 'startFarmRecipe', factory: 'merchant' })} />;
  return <Sheet title={t('merchant.title')} onClose={onClose} footer={footer}>
    <View style={styles.factory}>
      <Text style={styles.infoTitle}>{factory.readyAt ? (lang === 'tr' ? 'Başlatılmış sipariş' : 'Active order') : lang === 'tr' ? trader.tr : trader.en}</Text>
      <Text style={styles.sectionLabel}>{lang === 'tr' ? 'Ambardan gerekenler' : 'Required from barn'}</Text>
      {factory.readyAt ? <Text style={styles.infoSub}>{lang === 'tr' ? 'Önceden başlatılan sipariş ve ödülü korunuyor.' : 'Your existing order and reward are preserved.'}</Text> : trader.inputs.map((x) => {
        const have = state.harvestStock[x.item] ?? 0;
        return <Pressable key={x.item} onPress={() => open('source', x.item)} accessibilityRole="button" accessibilityLabel={label(x.item).name} style={[styles.wantRow, have >= x.count && styles.wantOk]}>
          <Sprite id={`item.${x.item}`} size={40} />
          <Text style={[styles.infoTitle, { flex: 1 }]}>{label(x.item).name}</Text>
          <Text style={styles.wantCount}>{have}/{x.count}</Text>
        </Pressable>;
      })}
      <Text style={styles.sectionLabel}>{t('merchant.pays')}</Text>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={styles.payChip}><Sprite id="icon.token" size={24} /><Text style={styles.payText}>{lang === 'tr' ? '1. seviye yıldız jetonu' : 'Level 1 star token'}{(factory.readyAt ? (factory.rewardXp ?? 0) : trader.xp) ? ` + ${factory.readyAt ? factory.rewardXp : trader.xp} XP` : ''}</Text></View>
        <View style={styles.payChip}><Sprite id="icon.calendar" size={20} /><Text style={styles.payText}>{clock(trader.seconds * 1000)}</Text></View>
      </View>
      {factory.readyAt && !factory.rewardKind ? <Text style={styles.infoSub}>{lang === 'tr' ? `Önceki sipariş ödülü: ${factory.payout} altın` : `Previous order reward: ${factory.payout} gold`}</Text> : null}
    </View>
  </Sheet>;
}

/** The grocer: harvested bouquets and fruit baskets → a gift basket sold for coins and XP. */
function GrocerSheet({ shop, state, now, onClose }: { shop: number; state: GameState; now: number; onClose: () => void }) {
  const { dispatch, t, open, lang } = useGame();
  const label = useItemLabel();
  const factory = state.farmFactories.grocer;
  const busy = factory.readyAt > 0;
  const complete = busy && now >= factory.readyAt;
  const running = FARM_RECIPES.grocer[factory.recipe] ?? FARM_RECIPES.grocer[0];
  const footer = complete ? <Button tone="sage" icon="icon.coin" label={t('merchant.collect', { n: factory.payout })} onPress={() => { dispatch({ type: 'claimFarmReward', factory: 'grocer' }); onClose(); }} />
    : busy ? <View><Text style={styles.sheetTimer}>{`${lang === 'en' ? running.en : running.tr} · ${t('merchant.preparing', { t: clock(Math.max(0, factory.readyAt - now)) })}`}</Text><HurryButton target={{ kind: 'grocer' }} readyAt={factory.readyAt} /></View>
    : null;
  return <Sheet title={SHOP_SLOTS[shop]?.[lang === 'en' ? 'en' : 'tr'] ?? t('grocer.title')} onClose={onClose} footer={footer}>
    <Text style={styles.infoSub}>{t('grocer.how')}</Text>
    <Text style={styles.infoSub}>{lang === 'tr' ? 'Dükkânlar aynı hazırlık alanını paylaşır; bir seferde bir sipariş hazırlanır.' : 'These shops share a preparation area; one order can be prepared at a time.'}</Text>
    {(SHOP_RECIPES[shop] ?? []).slice().sort((a, b) => FARM_RECIPES.grocer[a].seconds - FARM_RECIPES.grocer[b].seconds).map((index) => {
      const recipe = FARM_RECIPES.grocer[index];
      const unlocked = farmRecipeUnlocked(state, recipe);
      const ok = unlocked && recipe.inputs.every((x) => (state.harvestStock[x.item] ?? 0) >= x.count);
      return <View key={index} style={[styles.factory, { marginTop: 8 }]}>
        <Text style={styles.infoTitle}>{lang === 'en' ? recipe.en : recipe.tr}</Text>
        {recipe.inputs.map((x) => {
          const have = state.harvestStock[x.item] ?? 0;
          return <Pressable key={x.item} onPress={() => open('source', x.item)} accessibilityRole="button" accessibilityLabel={label(x.item).name} style={[styles.wantRow, have >= x.count && styles.wantOk]}>
            <Sprite id={`item.${x.item}`} size={36} />
            <Text style={[styles.infoTitle, { flex: 1 }]}>{label(x.item).name}</Text>
            <Text style={styles.wantCount}>{have}/{x.count}</Text>
          </Pressable>;
        })}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={styles.payChip}><Sprite id="icon.token" size={20} /><Text style={styles.payText}>1</Text></View>
          <View style={styles.payChip}><Sprite id="icon.coin" size={20} /><Text style={styles.payText}>{recipe.gold}</Text></View>
          <View style={styles.payChip}><Sprite id="icon.star" size={18} /><Text style={styles.payText}>{recipe.xp} XP</Text></View>
          <View style={styles.payChip}><Sprite id="icon.calendar" size={18} /><Text style={styles.payText}>{clock(recipe.seconds * 1000)}</Text></View>
          <View style={{ flex: 1 }} />
          <Button small tone={ok && !busy ? 'sage' : 'cream'} disabled={!ok || busy} label={unlocked ? t('grocer.make') : (lang === 'tr' ? 'Ürünler kilitli' : 'Ingredients locked')} onPress={() => dispatch({ type: 'startFarmRecipe', factory: 'grocer', recipe: index })} />
        </View>
      </View>;
    })}
  </Sheet>;
}

function useDragTransform(dx: SharedValue<number>, dy: SharedValue<number>) {
  return useDerivedValue(() => [{ translateX: dx.value }, { translateY: dy.value }]);
}

function HoverRect({ x, y, valid, size }: { x: SharedValue<number>; y: SharedValue<number>; valid: SharedValue<number>; size: number }) {
  const color = useDerivedValue(() => (valid.value > 0 ? colors.dropValid : valid.value < 0 ? colors.dropInvalid : colors.dropNeutral));
  return <RoundedRect x={x} y={y} width={size} height={size} r={10} color={color} />;
}

function TutorialRing({ from, to, cell, pad }: { from: number; to: number; cell: number; pad: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withSequence(withTiming(0, { duration: 250 }), withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 400 })), -1, false);
  }, [p]);
  const fx = pad + (from % BOARD_W) * cell + cell / 2;
  const fy = pad + Math.floor(from / BOARD_W) * cell + cell / 2;
  const tx = pad + (to % BOARD_W) * cell + cell / 2;
  const ty = pad + Math.floor(to / BOARD_W) * cell + cell / 2;
  const cx = useDerivedValue(() => fx + (tx - fx) * p.value);
  const cy = useDerivedValue(() => fy + (ty - fy) * p.value);
  const r = useDerivedValue(() => cell * (0.42 + 0.06 * Math.sin(p.value * Math.PI * 2)));
  return (
    <Group>
      <Circle cx={cx} cy={cy} r={r} color={colors.highlight} />
      <Circle cx={cx} cy={cy} r={r} color={colors.honeyDeep} style="stroke" strokeWidth={4} />
    </Group>
  );
}

function center(i: number, cell: number, pad: number): [number, number] {
  return [pad + (i % BOARD_W) * cell + cell / 2, pad + Math.floor(i / BOARD_W) * cell + cell / 2];
}

function FxView({ fx, cell, pad, onDone, reduce, showLevel }: { fx: Fx; cell: number; pad: number; onDone: (id: number) => void; reduce: boolean; showLevel: boolean }) {
  const p = useSharedValue(0);
  const dur = reduce ? 160 : fx.type === 'merge' ? 520 : 360;
  useEffect(() => {
    p.value = withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }, (fin) => {
      if (fin) scheduleOnRN(onDone, fx.id);
    });
  }, [p, dur, fx.id, onDone]);
  if (fx.type === 'merge') return <MergeFx fx={fx} p={p} cell={cell} pad={pad} showLevel={showLevel} />;
  if (fx.type === 'fly') return <FlyFx fx={fx} p={p} cell={cell} pad={pad} showLevel={showLevel} />;
  const [x, y] = center(fx.at, cell, pad);
  return <PoofFx x={x} y={y} p={p} cell={cell} kind={fx.type === 'resource' ? fx.kind : undefined} />;
}

function Ghost({ img, from, to, p, cell }: { img: SkImage | null; from: [number, number]; to: [number, number]; p: SharedValue<number>; cell: number }) {
  const tr = useDerivedValue(() => {
    const k = Math.min(1, p.value / 0.42);
    const e = k * k;
    return [{ translateX: from[0] + (to[0] - from[0]) * e - cell * 0.46 }, { translateY: from[1] + (to[1] - from[1]) * e - cell * 0.46 }];
  });
  const op = useDerivedValue(() => Math.max(0, 1 - Math.max(0, p.value - 0.3) / 0.15));
  if (!img) return null;
  return (
    <Group transform={tr} opacity={op}>
      <SkImageNode image={img} x={0} y={0} width={cell * 0.92} height={cell * 0.92} />
    </Group>
  );
}

function Bounce({ img, at, p, cell, delay }: { img: SkImage | null; at: [number, number]; p: SharedValue<number>; cell: number; delay: number }) {
  const tr = useDerivedValue(() => {
    const k = Math.max(0, Math.min(1, (p.value - delay) / (1 - delay)));
    // Settles once (to 108% and back), never bounces repeatedly.
    const s = k <= 0 ? 0.01 : k < 0.6 ? 0.6 + (k / 0.6) * 0.48 : 1.08 - 0.08 * ((k - 0.6) / 0.4);
    return [{ translateX: at[0] }, { translateY: at[1] }, { scale: s }, { translateX: -cell * 0.46 }, { translateY: -cell * 0.46 }];
  });
  if (!img) return null;
  return (
    <Group transform={tr}>
      <SkImageNode image={img} x={0} y={0} width={cell * 0.92} height={cell * 0.92} />
    </Group>
  );
}

function Particle({ x, y, a, d, p, color, r }: { x: number; y: number; a: number; d: number; p: SharedValue<number>; color: string; r: number }) {
  const cx = useDerivedValue(() => x + Math.cos(a) * d * Math.max(0, p.value - 0.38) * 1.6);
  const cy = useDerivedValue(() => y + Math.sin(a) * d * Math.max(0, p.value - 0.38) * 1.6 - 6 * p.value);
  const op = useDerivedValue(() => (p.value < 0.38 ? 0 : Math.max(0, 1 - (p.value - 0.38) / 0.62)));
  return <Circle cx={cx} cy={cy} r={r} color={color} opacity={op} />;
}

function MergeFx({ fx, p, cell, pad, showLevel }: { fx: Extract<Fx, { type: 'merge' }>; p: SharedValue<number>; cell: number; pad: number; showLevel: boolean }) {
  const at = center(fx.at, cell, pad);
  const oldImg = itemImg(fx.oldKey, cell, showLevel);
  const newImg = itemImg(fx.newKey, cell, showLevel);
  const glowR = useDerivedValue(() => cell * (0.2 + 0.9 * Math.max(0, Math.min(1, (p.value - 0.3) / 0.4))));
  const glowO = useDerivedValue(() => Math.max(0, Math.min(1, (p.value - 0.3) / 0.12)) * Math.max(0, 1 - (p.value - 0.45) / 0.55) * 0.75);
  const col = FAMILY[parseItem(fx.newKey).f].color;
  const parts = useMemo(() => Array.from({ length: fx.five ? 14 : 9 }, (_, i) => ({ a: (i / (fx.five ? 14 : 9)) * Math.PI * 2 + i * 0.3, d: cell * (0.5 + ((i * 37) % 10) / 20), r: 2 + (i % 3) })), [cell, fx.five]);
  return (
    <Group>
      {fx.from.map((i) => (
        <Ghost key={i} img={oldImg} from={center(i, cell, pad)} to={at} p={p} cell={cell} />
      ))}
      <Circle cx={at[0]} cy={at[1]} r={glowR} color={colors.honeySurface} opacity={glowO} />
      {parts.map((q, i) => (
        <Particle key={i} x={at[0]} y={at[1]} a={q.a} d={q.d} p={p} color={i % 2 ? col : colors.honeySoft} r={q.r} />
      ))}
      {fx.created.map((i, k) => (
        <Bounce key={i} img={newImg} at={center(i, cell, pad)} p={p} cell={cell} delay={0.38 + k * 0.08} />
      ))}
    </Group>
  );
}

function FlyFx({ fx, p, cell, pad, showLevel }: { fx: Extract<Fx, { type: 'fly' }>; p: SharedValue<number>; cell: number; pad: number; showLevel: boolean }) {
  const img = itemImg(fx.key, cell, showLevel);
  const from = center(fx.from, cell, pad);
  return (
    <Group>
      {fx.to.map((i) => {
        const to = center(i, cell, pad);
        return <Flying key={i} img={img} from={from} to={to} p={p} cell={cell} />;
      })}
    </Group>
  );
}

function Flying({ img, from, to, p, cell }: { img: SkImage | null; from: [number, number]; to: [number, number]; p: SharedValue<number>; cell: number }) {
  const tr = useDerivedValue(() => {
    const k = p.value;
    const x = from[0] + (to[0] - from[0]) * k;
    const y = from[1] + (to[1] - from[1]) * k - Math.sin(k * Math.PI) * cell * 0.6;
    const s = 0.5 + 0.5 * k;
    return [{ translateX: x }, { translateY: y }, { scale: s }, { translateX: -cell * 0.46 }, { translateY: -cell * 0.46 }];
  });
  if (!img) return null;
  return (
    <Group transform={tr}>
      <SkImageNode image={img} x={0} y={0} width={cell * 0.92} height={cell * 0.92} />
    </Group>
  );
}

function PoofFx({ x, y, p, cell, kind }: { x: number; y: number; p: SharedValue<number>; cell: number; kind?: ResourceKind }) {
  const parts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ a: (i / 8) * Math.PI * 2, d: cell * 0.5 }));
  return (
    <Group>
      {parts.map((q, i) => kind === 'wood' || kind === 'stone' ? (
        <ResourceFragment key={i} x={x} y={y} a={q.a} d={q.d} p={p} wood={kind === 'wood'} index={i} />
      ) : <Particle key={i} x={x} y={y} a={q.a} d={q.d} p={p} color={i % 2 ? colors.sage : colors.honeyRim} r={2 + i % 3} />)}
    </Group>
  );
}

function ResourceFragment({ x, y, a, d, p, wood, index }: { x: number; y: number; a: number; d: number; p: SharedValue<number>; wood: boolean; index: number }) {
  const transform = useDerivedValue(() => {
    const t = p.value;
    return [{ translateX: x + Math.cos(a) * d * t }, { translateY: y + Math.sin(a) * d * t - 12 * Math.sin(Math.PI * t) + 5 * t * t }, { rotate: a + t * (index % 2 ? 2 : -2) }];
  });
  const opacity = useDerivedValue(() => Math.max(0, 1 - p.value));
  return <Group transform={transform} opacity={opacity}><RoundedRect x={-3} y={-2} width={wood ? 9 : 6} height={wood ? 3 : 5} r={1} color={wood ? (index % 2 ? colors.woodDeep : colors.wood) : (index % 2 ? colors.inkSoft : colors.border)} /></Group>;
}

// ---- orders -------------------------------------------------------------------------------

function Orders({ state }: { state: GameState }) {
  const { t, dispatch } = useGame();
  if (!state.orders.length) return <View style={{ height: ORDERS_H }} />;
  const compact = COMPACT;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: ORDERS_H, flexGrow: 0 }} contentContainerStyle={styles.orders}>
      {state.orders.map((o) => (
        <OrderCard key={o.id} o={o} state={state} compact={compact} onDeliver={() => dispatch({ type: 'deliverOrder', id: o.id })} onReplace={() => dispatch({ type: 'replaceOrder', id: o.id })} t={t} />
      ))}
    </ScrollView>
  );
}

function OrderCard({ o, state, onDeliver, onReplace, t, compact }: { o: Order; state: GameState; onDeliver: () => void; onReplace: () => void; t: ReturnType<typeof useGame>['t']; compact: boolean }) {
  const { open, c, lang } = useGame();
  const freeReplace = orderNeedsLockedItem(state, o);
  const replaceLabel = freeReplace ? (lang === 'tr' ? 'Ücretsiz değiştir' : 'Replace free') : t('board.replace');
  const progress = orderProgress(state, o);
  const ready = canDeliverOrder(state, o);
  return (
    <View style={[styles.order, o.special && styles.orderSpecial]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sprite id={`portrait.${o.giver}.${ready ? 'happy' : 'calm'}`} size={compact ? 26 : 34} />
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {progress.map((it) => {
              const count = it.have;
              const have = it.met;
              const { f, l } = parseItem(it.item);
              return (
                <Pressable key={it.item} onPress={() => open('source', it.item)} style={[styles.orderItem, compact && { width: 28, height: 26 }]} accessibilityRole="button" accessibilityLabel={`${c(`item.${it.item}`)} ${count}/${it.need}`}>
                  <Sprite id={`item.${it.item}`} size={compact ? 26 : 30} silhouette={!have && !state.discovered.includes(it.item)} />
                  {FAMILY[f].levels > 1 ? <Text style={styles.orderLv}>{l}</Text> : null}
                  <Text style={[styles.orderN, have && { color: colors.sageDeep }]}>{count}/{it.need}</Text>
                  {have ? <Sprite id="icon.check" size={13} style={styles.orderCheck} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Sprite id={ICON.coin} size={16} />
          <Text style={styles.orderReward}>{o.leaves}</Text>
          <Sprite id="icon.star" size={14} style={{ marginLeft: 6 }} />
          <Text style={styles.orderReward}>{o.xp}</Text>
        </View>
      </View>
      <View style={styles.orderAction}>
        {ready ? (
          <Button small tone="sage" label={t('board.deliver')} onPress={onDeliver} />
        ) : (
          <Pressable onPress={onReplace} hitSlop={8} accessibilityRole="button" accessibilityLabel={replaceLabel} style={styles.orderReplaceButton}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>{!freeReplace ? <Sprite id={ICON.coin} size={14} /> : null}<Text style={styles.orderReplace}>{replaceLabel}</Text></View>
          </Pressable>
        )}
      </View>
      {o.special ? <Text style={styles.special}>{t('board.special')}</Text> : null}
    </View>
  );
}

// ---- info strip ---------------------------------------------------------------------------

function Info({ selected, state, now }: { selected: number | null; state: GameState; now: number }) {
  const { t, c, dispatch, lang, open } = useGame();
  const cl = selected !== null ? state.board[selected] : null;
  let body: React.ReactNode = <NextGoalChip />;
  if (cl?.t === 'i') {
    const { f, l } = parseItem(cl.k);
    if (f === 'energyOrb') return <View style={[styles.info, { height: INFO_H }]}><View style={styles.infoRow}><Sprite id="icon.energy" size={48} /><Text style={styles.infoTitle}>{10 * coinValue(l)} {lang === 'tr' ? 'enerji' : 'energy'}</Text><Button small label={lang === 'tr' ? 'Topla' : 'Collect'} onPress={() => dispatch({ type: 'collectCoin', cell: selected! })} /></View></View>;
    if (f === 'starCoin') return <View style={[styles.info, { height: INFO_H }]}><View style={styles.infoRow}><Sprite id="icon.token" size={48} /><Text style={styles.infoTitle}>{3 * coinValue(l)} {lang === 'tr' ? 'yıldız jetonu' : 'star tokens'}</Text><Button small label={lang === 'tr' ? 'Topla' : 'Collect'} onPress={() => dispatch({ type: 'collectCoin', cell: selected! })} /></View></View>;
    if (f === 'coin') return <View style={[styles.info, { height: INFO_H }]}><View style={styles.infoRow}>
      <Sprite id={`item.${cl.k}`} size={56} />
      <View style={{ flex: 1 }}><Text style={styles.infoTitle}>{coinValue(l)} {t('hud.coins')}</Text><Text style={styles.infoSub}>{lang === 'tr' ? 'Üç aynı altını birleştir veya topla.' : 'Merge three matching coins or collect.'}</Text></View>
      <Button small tone="honey" label={lang === 'tr' ? 'Al' : 'Collect'} onPress={() => dispatch({ type: 'collectCoin', cell: selected! })} />
    </View></View>;
    const max = FAMILY[f].levels;
    const harvest = FARM_YIELD[cl.k];
    const wait = Math.max(0, (state.farmReadyAt[`${state.workshop.active}:${selected}`] ?? 0) - now);
    body = (
      <View style={styles.infoRow}>
        <Pressable onPress={() => open('source', cl.k)} accessibilityRole="button" accessibilityLabel={t('col.howTo')}>
          <Sprite id={`item.${cl.k}`} size={56} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {c(`item.${cl.k}`)}
          </Text>
          <Text style={styles.infoSub}>
            {c(`family.${f}`)} · {t('common.level')} {l}/{max}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            {harvest ? (
              <>
                <Sprite id={`item.${harvest.item}`} size={20} />
                <Text style={styles.infoSub}>{wait > 0 ? `×${harvest.n} · ${clock(wait)}` : `×${harvest.n} · ${lang === 'tr' ? 'hazır, dokun' : 'ready, tap'}`}</Text>
              </>
            ) : l < max ? (
              <>
                <Text style={styles.infoSub}>{t('board.next')}:</Text>
                <Sprite id={`item.${itemKey(f, l + 1)}`} size={22} silhouette={!state.discovered.includes(itemKey(f, l + 1))} />
              </>
            ) : (
              <Text style={styles.infoSub}>{t('board.maxLevel')}</Text>
            )}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Button small tone="cream" icon="icon.leaf" label={t('board.sell', { n: sellValue(l) })} onPress={() => dispatch({ type: 'sell', cell: selected! })} />
          <Button small tone="cream" icon="icon.bag" label={t('board.store')} onPress={() => dispatch({ type: 'store', cell: selected! })} />
        </View>
      </View>
    );
  } else if (cl?.t === 'p') {
    if (cl.p === 'merchant') {
      const factory = state.farmFactories.merchant;
      const recipe = FARM_RECIPES.merchant[factory.recipe];
      const complete = factory.readyAt > 0 && now >= factory.readyAt;
      body = <View style={styles.infoRow}>
        <Sprite id={`portrait.niko.${complete ? 'happy' : 'calm'}`} size={52} />
        <View style={{ flex: 1 }}><Text style={styles.infoTitle}>{t('merchant.title')}</Text><Text style={styles.infoSub}>{factory.readyAt ? (complete ? t('merchant.collect', { n: factory.payout }) : t('merchant.preparing', { t: clock(factory.readyAt - now) })) : `${lang === 'tr' ? recipe.tr : recipe.en} · ${recipe.gold} ${t('hud.coins').toLowerCase()}`}</Text></View>
      </View>;
      return <View style={[styles.info, { height: INFO_H }]}>{body}</View>;
    }
    const def = PRODUCER[cl.p];
    const st = state.producers[cl.p];
    const lv = producerLevel(cl.p, st?.level ?? 1);
    const nextIn = st && st.charges < lv.charges ? lv.rechargeMs - ((now - st.anchor) % lv.rechargeMs) : 0;
    body = (
      <View style={styles.infoRow}>
        <Sprite id={`producer.${cl.p}`} size={56} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle} numberOfLines={1}>
            {c(`producer.${cl.p}`)} · {t('common.level')} {st?.level ?? 1}
          </Text>
          <Text style={styles.infoSub}>
            {t('board.charges', { a: st?.charges ?? 0, b: lv.charges })}
            {nextIn > 0 ? ` · ${t('board.recharge', { t: clock(nextIn) })}` : ''}
          </Text>
          {def.kind === 'generator' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
              <Text style={styles.infoSub}>{t('board.mayProduce')}:</Text>
              {(lv.outputs ?? []).map((o) => (
                <Sprite key={o.value} id={`item.${o.value}`} size={20} />
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, flexWrap: 'wrap' }}>
              <Text style={styles.infoSub}>{t('board.converter')}</Text>
              {(def.recipes ?? [])
                .filter((r) => !r.secret || state.recipesFound.includes(`${cl.p}:${r.input}`))
                .map((r) => (
                  <View key={r.input} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Sprite id={`item.${r.input}`} size={18} />
                    <Text style={styles.infoSub}>→</Text>
                    <Sprite id={`item.${r.output}`} size={18} />
                    <Text style={styles.infoSub}>×{r.count}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>
        {lv.upgradeLeaves !== undefined ? (
          <Button small tone="honey" icon="icon.upgrade" label={t('board.upgradeCost', { n: lv.upgradeLeaves })} onPress={() => dispatch({ type: 'upgrade', producer: cl.p })} />
        ) : (
          <Text style={styles.infoSub}>{t('board.maxProducer')}</Text>
        )}
      </View>
    );
  } else if (cl?.t === 'x') {
    const can = isOpenable(state.board, selected!);
    body = (
      <View style={styles.infoRow}>
        <Sprite id="icon.lock" size={44} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>{t('board.locked')}</Text>
          {!can ? <Text style={styles.infoSub}>{t('board.openFar')}</Text> : null}
        </View>
        {can ? <Button small icon="icon.leaf" label={t('board.open', { n: openCellCost(state.cellsOpened) })} onPress={() => dispatch({ type: 'openCell', cell: selected! })} /> : null}
      </View>
    );
  } else if (cl?.t === 'b') {
    body = (
      <View style={styles.infoRow}>
        <Text style={[styles.infoSub, { flex: 1 }]}>{t('board.bramble')}</Text>
      </View>
    );
  }
  return <View style={[styles.info, { height: INFO_H }]}>{body}</View>;
}

// ---- bag -------------------------------------------------------------------------------------

function Bag({ state, onExplore, exploring, onOrders, ordersRef, onOrdersLayout }: { state: GameState; onExplore?: () => void; exploring?: boolean; onOrders: () => void; ordersRef: (node: unknown) => void; onOrdersLayout: () => void }) {
  const { t, c, dispatch, lang, now, open, reduceMotion } = useGame();
  const crateScale = useSharedValue(1);
  const crateAnim = useAnimatedStyle(() => ({ transform: [{ scale: crateScale.value }] }));
  const crate = state.crate ?? { charges: 0, refillDay: -1 };
  const [crateSheet, setCrateSheet] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [crateBurst, setCrateBurst] = useState(0);
  const [crateTargetRef, crateTargetMeasure] = useMeasuredTarget('crate');
  const today = localDay(now, state.tzOffset);
  const canClaimDaily = today > crate.refillDay && crate.charges <= 999 - BALANCE.crate.dailyFree;
  const remaining = Math.max(0, (today + 1) * DAY + state.tzOffset * MINUTE - now);
  const autoNext = Math.max(0, BALANCE.crate.refillMs - Math.max(0, Math.max(now, state.clockHigh) - state.crate.anchor));
  const remainingText = `${Math.floor(remaining / HOUR)} ${lang === 'tr' ? 'sa' : 'h'} ${Math.floor((remaining % HOUR) / MINUTE)} ${lang === 'tr' ? 'dk' : 'm'}`;
  const claim = () => {
    const r = dispatch({ type: 'claimDailyCrates' });
    if (!r.ok) return;
    setCrateBurst(10);
    setTimeout(() => setCrateBurst(0), 1200);
    setCrateSheet(false);
  };
  const buy = () => {
    const r = dispatch({ type: 'buyCrates', expectedCharges: crate.charges });
    if (!r.ok) return;
    setCrateBurst(BALANCE.crate.energyPack.charges);
    setTimeout(() => setCrateBurst(0), 1200);
    setCrateSheet(false);
  };
  const bought = state.inventory.length - state.premiumSlots - BALANCE.inventory.startSlots;
  const cost = BALANCE.inventory.slotCostLeaves[bought];
  const energyK = state.energy / BALANCE.energy.max;
  return (
    <View style={[styles.bag, { height: BAG_H }]}>
      <Pressable ref={crateTargetRef} onLayout={crateTargetMeasure} onLongPress={() => setCrateSheet(true)} onPress={() => { if (!crate.charges) { setCrateSheet(true); return; } const result = dispatch({ type: 'openCrate' }); if (result.ok && !reduceMotion) crateScale.set(withSequence(withTiming(0.86, { duration: 80 }), withTiming(1.12, { duration: 140 }), withTiming(1, { duration: 150 }))); }} style={({ pressed }) => [styles.crateBig, pressed && { transform: [{ scale: 0.95 }] }]} accessibilityRole="button" accessibilityLabel={crate.charges ? (lang === 'tr' ? `Tohum kutusu, ${crate.charges} kaldı` : `Seed crate, ${crate.charges} left`) : canClaimDaily ? (lang === 'tr' ? 'Ücretsiz 10 kutu al' : 'Get 10 free crates') : (lang === 'tr' ? `${remainingText} sonra ücretsiz kutu` : `Free crates in ${remainingText}`)}>
        <Animated.View style={crateAnim}><Sprite id="icon.gift" size={30} /></Animated.View>
        <Text style={styles.crateSub} numberOfLines={1}>{crate.charges === 0 ? (canClaimDaily ? (lang === 'tr' ? 'ÜCRETSİZ' : 'FREE') : remainingText) : (lang === 'tr' ? 'KUTU' : 'CRATE')}</Text>
        {crate.charges ? <View style={styles.crateCountBadge}><Text style={styles.crateCountText}>{crate.charges}</Text></View> : null}
        <Pressable onPress={(event) => { event.stopPropagation(); setCrateSheet(true); }} accessibilityRole="button" accessibilityLabel={lang === 'tr' ? 'Kutu seçenekleri' : 'Crate options'} style={{ position: 'absolute', bottom: 0, right: 0, paddingHorizontal: 5, backgroundColor: colors.paper, borderRadius: 8 }}><Text style={{ color: colors.ink, fontWeight: 'bold' }}>⋯</Text></Pressable>
        {crateBurst ? <Animated.View entering={FadeIn.duration(120)} pointerEvents="none" style={styles.crateBurst}><Text style={styles.crateBurstText}>+{crateBurst}</Text></Animated.View> : null}
      </Pressable>
      <Pressable ref={ordersRef} onLayout={onOrdersLayout} onPress={onOrders} style={[styles.slot, { width: 46 }]} accessibilityRole="button" accessibilityLabel={lang === 'en' ? 'Orders' : 'Siparişler'}><Sprite id="icon.quests" size={24} /><Text style={styles.slotCost}>{state.orders.length}</Text>{state.orders.some(o => canDeliverOrder(state, o)) ? <Dot /> : null}</Pressable>
      <Pressable onPress={() => open('storage', true)} style={styles.slot} accessibilityRole="button" accessibilityLabel={t('storage.title')}>
        <Sprite id="icon.bag" size={30} />
        {state.rewardStorage.length || (state.workshopOverflow?.length ?? 0) ? <Dot /> : null}
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center', paddingRight: 8 }}>
        {state.inventory.map((k, i) => (
          <Pressable key={i} onPress={() => k && dispatch({ type: 'retrieve', slot: i })} style={styles.slot} accessibilityRole="button" accessibilityLabel={k ? `${t('board.inventory')} ${i + 1}` : t('board.inventory')}>
            {k ? <Sprite id={`item.${k}`} size={36} /> : null}
          </Pressable>
        ))}
        {cost !== undefined && state.inventory.length - state.premiumSlots < BALANCE.inventory.maxSlots ? (
          <Pressable onPress={() => dispatch({ type: 'buySlot' })} style={[styles.slot, styles.slotAdd]} accessibilityRole="button" accessibilityLabel={t('board.buySlot', { n: cost })}>
            <Text style={styles.slotPlus}>+</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Sprite id={ICON.coin} size={12} /><Text style={styles.slotCost}>{cost}</Text></View>
          </Pressable>
        ) : null}
      </ScrollView>
      <Pressable onPress={() => setSourcesOpen(true)} style={styles.slot} accessibilityRole="button" accessibilityLabel={lang === 'tr' ? 'Üretim yerleri' : 'Production sources'}>
        <Sprite id="producer.lanternStone" size={28} />
        <Text numberOfLines={1} style={{ fontSize: 9, fontFamily: font.bold, color: colors.ink }}>{lang === 'tr' ? 'Üretim' : 'Sources'}</Text>
        {NODES.some((n) => isReady(state, n.id, now)) ? <Dot /> : null}
      </Pressable>
      {sourcesOpen ? <Modal visible transparent animationType="none" onRequestClose={() => setSourcesOpen(false)}>
        <Sheet title={lang === 'tr' ? 'Üretim yerleri' : 'Production sources'} onClose={() => setSourcesOpen(false)}>
          <Text style={styles.infoSub}>{lang === 'tr' ? 'Ürün üretmek veya açılma koşullarını görmek için bir yere dokun.' : 'Choose a source to produce items or see how to unlock it.'}</Text>
          {NODES.map((n) => {
            const unlocked = isNodeUnlocked(state, n);
            const job = nodeState(state, n.id);
            const status = isReady(state, n.id, now) ? (lang === 'tr' ? 'Hazır' : 'Ready') : job.readyAt > now ? clock(job.readyAt - now) : unlocked ? (lang === 'tr' ? 'Açık' : 'Available') : (lang === 'tr' ? 'Kilitli' : 'Locked');
            return <Pressable key={n.id} accessibilityRole="button" accessibilityLabel={`${c(`node.${n.kind}`)} · ${status}`} onPress={() => { setSourcesOpen(false); open('node', n.id); }} style={[styles.wantRow, { marginTop: 6 }]}>
              <Sprite id={nodeIcon(n)} size={38} />
              <Text style={[styles.infoTitle, { flex: 1 }]}>{c(`node.${n.kind}`)}</Text>
              <Text style={styles.infoSub}>{status}</Text>{isReady(state, n.id, now) ? <Sprite id="icon.check" size={22} /> : null}
            </Pressable>;
          })}
        </Sheet>
      </Modal> : null}
      <Pressable onPress={() => open('supply', true)} style={styles.slot} accessibilityRole="button" accessibilityLabel={`${t('supply.title')}: ${state.supply.charges}`}>
        <Sprite id="prop.rock" size={30} />
        {state.supply.charges > 0 ? <View style={styles.supplyBadge}><Text style={styles.supplyBadgeText}>{state.supply.charges}</Text></View> : null}
      </Pressable>
      {onExplore ? (
        <Pressable onPress={onExplore} style={[styles.slot, exploring && { backgroundColor: colors.sageDeep }]} accessibilityRole="button" accessibilityLabel={t('explore.button')}>
          <Sprite id="icon.map" size={22} /><Text numberOfLines={1} style={{ fontSize: 9, fontFamily: font.bold, color: colors.ink }}>{lang === 'tr' ? 'Gezin' : 'Explore'}</Text>
        </Pressable>
      ) : null}
      {crateSheet ? <Modal visible transparent animationType="none" onRequestClose={() => setCrateSheet(false)}><Sheet title={lang === 'tr' ? 'Kutu seçenekleri' : 'Crate options'} onClose={() => setCrateSheet(false)}>
        {crate.wallet ? <Text style={styles.infoSub}>{lang === 'tr' ? `Normal ${crate.wallet.normal} · Günlük ${crate.wallet.daily} · Hediye ${crate.wallet.bonus} · Enerjiyle ${crate.wallet.energy} · Eski kayıt ${crate.wallet.legacy}` : `Normal ${crate.wallet.normal} · Daily ${crate.wallet.daily} · Bonus ${crate.wallet.bonus} · Energy ${crate.wallet.energy} · Legacy ${crate.wallet.legacy}`}</Text> : null}
        <Text style={styles.infoSub}>{lang === 'tr' ? 'Normal kutular 3 saatte 40’a kadar dolar; ayrıca günde bir kez 10 kutu ücretsiz alabilirsin.' : 'Normal crates refill to 40 over 3 hours, plus 10 free crates once a day.'}</Text><Text style={styles.infoSub}>{crate.charges >= BALANCE.crate.autoMax ? (lang === 'tr' ? 'Toplam 40 ve üzerindeyken otomatik dolum durur.' : 'Automatic refill pauses when the total reaches 40.') : (lang === 'tr' ? `Sonraki otomatik kutu: ${clock(autoNext)}` : `Next automatic crate: ${clock(autoNext)}`)}</Text>
        {canClaimDaily ? <>
          <Text style={styles.infoSub}>{lang === 'tr' ? 'Günlük hakkın hazır. 10 kutu sayacına eklenecek.' : 'Your daily claim is ready. 10 crates will be added to your counter.'}</Text>
          <Button small tone="sage" label={lang === 'tr' ? 'Ücretsiz 10 kutuyu al' : 'Get 10 free crates'} onPress={claim} style={{ marginTop: 10 }} />
        </> : <Text style={styles.infoSub}>{lang === 'tr' ? `Sonraki ücretsiz 10 kutu: ${remainingText} sonra, yerel gün değiştiğinde.` : `Next 10 free crates: in ${remainingText}, when the local day changes.`}</Text>}
          {state.energy < BALANCE.crate.energyPack.cost ? <Text style={styles.infoSub}>{lang === 'tr' ? '10 kutu almak için 25 enerji gerekir.' : 'You need 25 energy for 10 crates.'}</Text> : null}
          <Button small tone="energy" disabled={state.energy < BALANCE.crate.energyPack.cost || crate.charges > 999 - BALANCE.crate.energyPack.charges} icon="icon.energy" label={lang === 'tr' ? `${BALANCE.crate.energyPack.charges} kutu al · ${BALANCE.crate.energyPack.cost} enerji` : `Get ${BALANCE.crate.energyPack.charges} crates · ${BALANCE.crate.energyPack.cost} energy`} onPress={buy} style={{ marginTop: 10 }} />
        <Button small tone="cream" label={lang === 'tr' ? 'Kapat' : 'Close'} onPress={() => setCrateSheet(false)} style={{ marginTop: 8 }} />
      </Sheet></Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topControl: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.border },
  shopPopup: { position: 'absolute', left: 6, right: 6, top: ORDER_BAR_H + 2, zIndex: 30, elevation: 30, backgroundColor: colors.cream, borderRadius: 14, borderWidth: 1, borderColor: colors.borderDeep },
  readyNotice: { position: 'absolute', top: 54, right: 6, width: 236, zIndex: 50, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.honeySurface, borderWidth: 2, borderColor: colors.honey, shadowColor: colors.shadowInk, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  readyNoticeTitle: { fontFamily: font.black, fontSize: 13, color: colors.honeyDeep },
  readyNoticeText: { fontFamily: font.bold, fontSize: 12, color: colors.ink },
  readyNoticeX: { fontFamily: font.black, fontSize: 18, color: colors.inkSoft, paddingHorizontal: 2 },
  collectBubble: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 18, backgroundColor: colors.honey, borderWidth: 2, borderColor: colors.honeyRim, borderBottomWidth: 4, borderBottomColor: colors.honeyEdge, shadowColor: colors.shadowInk, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  collectText: { fontFamily: font.black, fontSize: 14, color: colors.honeyInk },
  supplyBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.white },
  supplyBadgeText: { fontFamily: font.black, fontSize: 10, color: colors.white },
  worldLockCostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exploreBar: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingLeft: 12, borderRadius: 20, backgroundColor: colors.glassDark },
  exploreText: { flex: 1, fontFamily: font.bold, fontSize: 12, color: colors.white },
  exploreDone: { paddingHorizontal: 16, height: 38, borderRadius: 19, backgroundColor: colors.honey, alignItems: 'center', justifyContent: 'center' },
  exploreDoneText: { fontFamily: font.black, fontSize: 14, color: colors.honeyInk },
  merchantBadge: { position: 'absolute', height: 22, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.glass, borderWidth: 1.5, borderColor: colors.honeyEdge },
  merchantReady: { backgroundColor: colors.sageSoft, borderColor: colors.sageRim },
  merchantText: { fontFamily: font.black, fontSize: 11, color: colors.ink, fontVariant: ['tabular-nums'] },
  merchantLv: { fontFamily: font.black, fontSize: 9, color: colors.white, backgroundColor: colors.sageDeep, borderRadius: 6, paddingHorizontal: 3, overflow: 'hidden' },
  sheetTimer: { fontFamily: font.black, fontSize: 16, color: colors.ink, textAlign: 'center', paddingVertical: 8, fontVariant: ['tabular-nums'] },
  sectionLabel: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  wantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  wantOk: { backgroundColor: colors.sageSoft },
  wantCount: { fontFamily: font.black, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  payChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  payText: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  orderLv: { position: 'absolute', top: -3, left: -3, fontFamily: font.black, fontSize: 9, color: colors.white, backgroundColor: colors.sageDeep, borderRadius: 6, paddingHorizontal: 3, overflow: 'hidden' },
  crateBig: { width: 58, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.honeySoft, borderWidth: 2, borderColor: colors.white, shadowColor: colors.woodDeep, shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  crateCountBadge: { position: 'absolute', top: 1, right: 1, minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.white },
  crateCountText: { fontFamily: font.black, fontSize: 11, color: colors.white },
  crateSub: { fontFamily: font.black, fontSize: 9, color: colors.honeyInk, marginTop: -2 },
  areas: { height: 34, paddingHorizontal: 6, gap: 5, alignItems: 'center' },
  area: { minWidth: 44, height: 36, paddingHorizontal: 10, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border },
  areaActive: { backgroundColor: colors.sageDeep },
  areaText: { fontFamily: font.black, fontSize: 13, color: colors.ink },
  areaGold: { fontFamily: font.black, fontSize: 11, color: colors.ink, marginHorizontal: 6 },
  worldLock: { position: 'absolute', left: '20%', right: '20%', top: '35%', minHeight: 110, justifyContent: 'center', alignItems: 'center', padding: 8, borderRadius: 18, backgroundColor: colors.glass, borderWidth: 2, borderColor: boardColors.rim },
  worldLockTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  worldLockCost: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  worldLockHint: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft },
  farmButton: { minHeight: 30, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 7, backgroundColor: colors.honeySoft, borderWidth: 1, borderColor: colors.honeyEdge },
  farmButtonReady: { backgroundColor: colors.sageSoft, borderColor: colors.sageDeep, borderWidth: 2 },
  neighbor: { position: 'absolute', top: 25, bottom: 25, width: 21, borderRadius: 8, backgroundColor: boardColors.lockedPreview, borderWidth: 1, borderColor: colors.sageRim, alignItems: 'center', justifyContent: 'center' },
  neighborText: { fontFamily: font.black, fontSize: 12, color: colors.ink },
  factory: { padding: 10, marginBottom: 8, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, gap: 4 },
  factoryReady: { borderColor: colors.sageDeep, backgroundColor: colors.sageSoft },
  combo: { position: 'absolute', alignItems: 'center', zIndex: 10 },
  comboText: { fontFamily: font.black, fontSize: 16, color: colors.honeySoft, textShadowColor: colors.honeyInk, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  crate: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.borderDeep },
  crateRefill: { width: 38, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  crateCount: { fontFamily: font.black, fontSize: 10, color: colors.ink },
  crateLabel: { fontFamily: font.black, fontSize: 8, color: colors.ink, lineHeight: 9 },
  crateBurst: { position: 'absolute', top: 1, backgroundColor: colors.honeySoft, borderRadius: 10, paddingHorizontal: 5, borderWidth: 1, borderColor: colors.honeyEdge },
  crateBurstText: { fontFamily: font.black, fontSize: 11, color: colors.honeyDeep },
  root: { flex: 1, paddingHorizontal: 2, paddingTop: 4 },
  orders: { gap: 8, paddingHorizontal: 4, paddingBottom: 6, alignItems: 'stretch' },
  order: { width: 220, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.m, backgroundColor: colors.paper, padding: 4, borderWidth: 1.5, borderColor: colors.border },
  orderAction: { width: 92 },
  orderReplaceButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  orderSpecial: { borderColor: colors.honey, backgroundColor: colors.honeySurface },
  orderItem: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  orderN: { position: 'absolute', bottom: -4, right: -6, fontFamily: font.black, fontSize: 10, color: colors.ink, backgroundColor: colors.glass, borderRadius: 6, paddingHorizontal: 2, overflow: 'hidden' },
  orderCheck: { position: 'absolute', top: -2, right: -2 },
  orderReward: { fontFamily: font.black, fontSize: 13, color: colors.ink, marginLeft: 2 },
  orderReplace: { fontFamily: font.medium, fontSize: 11, color: colors.inkSoft, textDecorationLine: 'underline' },
  special: { position: 'absolute', top: -1, right: 8, fontFamily: font.black, fontSize: 9, color: colors.honeyDeep },
  info: { height: INFO_H, marginTop: 6, marginHorizontal: 2, borderRadius: radius.l, backgroundColor: colors.paper, padding: 10, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTitle: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  infoSub: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  infoHint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, textAlign: 'center' },
  bag: { height: BAG_H, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  slot: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.glassSoft, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  slotAdd: { borderStyle: 'dashed' },
  slotPlus: { fontFamily: font.black, fontSize: 18, color: colors.inkSoft, marginTop: -4 },
  slotCost: { fontFamily: font.bold, fontSize: 9, color: colors.inkSoft, marginTop: -4 },
  tutBubble: { position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: colors.glassDark, borderRadius: radius.m, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tutText: { flex: 1, color: colors.nightText, fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  pending: { textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.inkSoft },
});

