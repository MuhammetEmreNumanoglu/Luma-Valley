// The merge workshop: orders on top, the 7×9 board, an info strip for the selected cell and the
// bag. Drag with one finger to move/merge; the crate supplies merge starters and the merchant
// turns delivered goods into unlock currency.
import { Canvas, Circle, Group, Image as SkImageNode, Picture, RoundedRect, Skia, type SkImage } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, FadeIn, useAnimatedStyle, useDerivedValue, useSharedValue, withDelay, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BALANCE, BOARD_H, BOARD_W, openCellCost, sellValue } from '../content/balance';
import { FAMILY, isMaxLevel, itemKey, parseItem, type ItemKey } from '../content/families';
import { FARM_OUTPUTS, FARM_RECIPES, FARM_YIELD, HARVEST_ITEMS, TRADER_RECIPE } from '../content/farm';
import { coinValue } from '../content/coins';
import { WORKSHOP_GRID, WORKSHOP_PRICES, workshopAt, workshopPosition } from '../content/workshop';
import { PRODUCER, producerLevel, type ProducerId } from '../content/producers';
import { QUEST } from '../content/quests';
import { countItem, findGroup, isOpenable } from '../engine/board';
import { DAY, HOUR, MINUTE, localDay } from '../core/time';
import { canComplete } from '../engine/quests';
import type { Cell, GameEvent, GameState, Order } from '../engine/types';
import { drawArtBox, drawArtFit } from '../art/art';
import { itemArtId, producerArtId } from '../art/ids';
import { boxImage } from '../render/imageCache';
import { drawItem } from '../render/items';
import { blob, fill, lin, line, shade } from '../render/kit';
import { drawLevelPips, drawProducer } from '../render/producers';
import { useGame } from '../state/GameProvider';
import { migrate, repair } from '../persistence/save';
import { SAVE_VERSION } from '../engine/state';
import { Bar, Button, clock, Dot, Sheet, Sprite } from '../ui/components';
import { colors, font, radius } from '../ui/theme';
import { showItemLevels } from '../ui/boardPresentation';
import { useMeasuredTarget } from '../ui/targets';
import { pendingTutorial } from '../engine/tutorial';
import { mergeTrio } from '../engine/board';
import type { ResourceKind } from '../content/resources';
import { drawResource } from '../render/resources';
import { setTarget } from '../ui/targets';
import { HurryButton } from '../ui/HurryButton';
import { ICON, NextGoalChip, useItemLabel } from './Panels';

// Strip heights. The board gets everything else: the strips were trimmed in v4 so cells grew
// ~12–15% on every iPhone; on short screens (SE class) they shrink further so cells stay ≥ 40 pt.
// v5: the separate goal row is gone (the goal sits in the info strip while nothing is selected)
// and explore/supply live in the bag row, so the board takes the space: ~53 pt cells at 390×844.
let ORDERS_H = 76;
let INFO_H = 70;
let BAG_H = 58;
const HUD_H = 0;
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
  const outline = line('#FFFDF1', 6);
  const ink = line('#355445', 3);
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
    if (!drawArtFit(c, key.startsWith('starCoin:') ? 'icon_token' : itemArtId(key), 7)) drawItem(c, key);
    const { f, l } = parseItem(key);
    if (f === 'coin') drawCoinValue(c, coinValue(l));
    else if (f === 'starCoin') drawCoinValue(c, 3 * coinValue(l));
    else if (showLevel) drawItemLevel(c, l);
  });
}

function drawCoinValue(c: Parameters<typeof drawItem>[0], value: number) {
  const digits: Record<string, number[]> = { '0': [0, 1, 2, 3, 4, 5], '1': [1, 2], '2': [0, 1, 6, 4, 3], '3': [0, 1, 6, 2, 3], '4': [5, 6, 1, 2], '5': [0, 5, 6, 2, 3], '6': [0, 5, 6, 4, 3, 2], '7': [0, 1, 2], '8': [0, 1, 2, 3, 4, 5, 6], '9': [0, 1, 2, 3, 5, 6] };
  const segments = [[0,0,6,0],[6,0,6,6],[6,6,6,12],[0,12,6,12],[0,6,0,12],[0,0,0,6],[0,6,6,6]];
  const text = String(value), scale = text.length > 2 ? 1.1 : 1.5;
  const start = 50 - (text.length * 8 - 2) * scale / 2;
  for (const [ink, width] of [['#FFF4BF', 5], ['#603A0F', 2.5]] as const) {
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
    c.drawPath(blob([[12, 86], [10, 50], [30, 26], [56, 20], [82, 34], [90, 70], [70, 90], [34, 92]]), lin(0, 20, 0, 92, ['#7E9A5A', '#4E6E3A']));
    const thorn = line('#3E5A2E', 3);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const x = 50 + Math.cos(a) * 28;
      const y = 56 + Math.sin(a) * 24;
      c.drawLine(x, y, x + Math.cos(a + 0.6) * 10, y + Math.sin(a + 0.6) * 10, thorn);
    }
    if (hp > 1) for (const [x, y] of [[36, 48], [62, 44], [50, 68]] as const) c.drawCircle(x, y, 4, fill('#B8443A'));
  });
}

function lockImg(pt: number) {
  return boxImage('lockcell', pt, (c) => {
    for (const [x, y, r] of [[30, 56, 22], [56, 48, 26], [74, 62, 18], [46, 68, 20]] as const) c.drawCircle(x, y, r, fill('#FFFFFF', 0.5));
    c.drawRRect(Skia.RRectXY(Skia.XYWHRect(38, 50, 24, 20), 5, 5), fill(shade('#B7A88E', -0.1), 0.7));
    c.drawPath(blob([[42, 50], [42, 40], [50, 34], [58, 40], [58, 50]], 0.6), line(shade('#B7A88E', -0.2), 4, 0.7));
  });
}

/** Static neighbour preview: only unlocked areas draw sprites; locked areas use a light texture. */
function previewBoard(board: Cell[], state: GameState, cell: number, locked: boolean) {
  const w = cell * BOARD_W + 12, h = cell * BOARD_H + 12;
  const rec = Skia.PictureRecorder();
  const cv = rec.beginRecording(Skia.XYWHRect(0, 0, w, h));
  cv.drawRect(Skia.XYWHRect(0, 0, w, h), fill(locked ? '#A8B9A0' : '#89A68A'));
  for (let i = 0; i < BOARD_W * BOARD_H; i++) {
    const x = 6 + (i % BOARD_W) * cell, y = 6 + Math.floor(i / BOARD_W) * cell;
    const cl = board[i];
    const face = locked ? ((i + Math.floor(i / BOARD_W)) % 2 ? '#BAC8AE' : '#C3CFB8') : cl?.t === 'x' ? '#A1B59D' : '#F2F5E7';
    cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 1.5, y + 1.5, cell - 3, cell - 3), 8, 8), fill(face));
    if (locked || !cl) continue;
    const img = cl.t === 'i' ? itemImg(cl.k, cell, showItemLevels(state.level)) : cl.t === 'p' ? producerImg(cl.p, state.producers[cl.p]?.level ?? 1, cell) : cl.t === 'b' ? brambleImg(cell, cl.hp) : cl.t === 'x' && isOpenable(board, i) ? lockImg(cell) : null;
    if (img) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x + cell * 0.04, y + cell * 0.02, cell * 0.92, cell * 0.92), Skia.Paint());
  }
  return rec.finishRecordingAsPicture();
}

export function BoardScreen() {
  const { state: loadedState, dispatch, t, subscribe, now, screen, reduceMotion, open } = useGame();
  const state = loadedState.version >= SAVE_VERSION && loadedState.workshop && loadedState.crate && loadedState.farmReadyAt && loadedState.farmFactories && loadedState.nodes ? loadedState : (migrate(loadedState) ?? repair(loadedState));
  const [box, setBox] = useState({ w: 360, h: 640 });
  const [selected, setSelected] = useState<number | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const [harvestFx, setHarvestFx] = useState<{ id: number; key: ItemKey; from: number[] } | null>(null);
  const hidden = useMemo(() => new Set(fx.flatMap(f => f.type === 'merge' ? f.created : f.type === 'fly' ? f.to : [])), [fx]);
  const [farmOpen, setFarmOpen] = useState(false);
  const [grocerOpen, setGrocerOpen] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const fxSeq = useRef(0);
  const [ordersTargetRef, ordersTargetMeasure] = useMeasuredTarget('orders');

  layoutFor(box.h);
  // box is the root including its 6 pt side padding; the tray adds 6 pt per side.
  const cell = Math.floor(Math.min((box.w - 24) / BOARD_W, (box.h - ORDERS_H - INFO_H - BAG_H - HUD_H - 58) / BOARD_H));
  const bw = cell * BOARD_W;
  const bh = cell * BOARD_H;
  const pad = 6;
  const vw = bw + pad * 2, vh = bh + pad * 2;
  const cameraX = useSharedValue(-vw), cameraY = useSharedValue(-vh), zoom = useSharedValue(1);
  const panOrigin = useRef({ x: -vw, y: -vh });
  const areaPosition = workshopPosition(state.workshop.active);
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
    // Wooden tray: outer frame with a lit top rim, recessed felt-like bed.
    cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, bw + pad * 2, bh + pad * 2), 18, 18), lin(0, 0, 0, bh, ['#71947B', '#416957']));
    cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(1.5, 1.5, bw + pad * 2 - 3, bh + pad * 2 - 3), 16.5, 16.5), line('#D5E5BB', 1.5, 0.9));
    cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(3.5, 3.5, bw + pad * 2 - 7, bh + pad * 2 - 7), 14, 14), lin(0, 0, 0, bh, ['#9BB99B', '#789C82']));
    state.board.forEach((cl: Cell, i: number) => {
      const x = pad + (i % BOARD_W) * cell;
      const y = pad + Math.floor(i / BOARD_W) * cell;
      const even = ((i % BOARD_W) + Math.floor(i / BOARD_W)) % 2 === 0;
      const r = Skia.XYWHRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
      if (cl.t === 'x') {
        cv.drawRRect(Skia.RRectXY(r, 9, 9), fill(even ? '#A1B59D' : '#94AA93'));
        cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 2.5, y + 2.5, cell - 5, cell * 0.3), 7, 7), fill('#000000', 0.06));
        const img = lockImg(cell);
        if (img && isOpenable(state.board, i)) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x, y, cell, cell), Skia.Paint());
        return;
      }
      // Raised tile: darker lip, lit face, soft top highlight.
      cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 1.5, y + 2.5, cell - 3, cell - 3), 9, 9), fill(even ? '#C3D2B6' : '#B7C9AF'));
      cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 1.5, y + 1.5, cell - 3, cell - 4.5), 9, 9), fill(even ? '#F9F7E8' : '#EDF3DF'));
      cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + 4, y + 3, cell - 8, cell * 0.22), 6, 6), fill('#FFFFFF', 0.35));
      if (i === selected) cv.drawRRect(Skia.RRectXY(r, 9, 9), line(colors.honeyDeep, 3));
      if (hidden.has(i) || i === dragFrom.current) return;
      let img: SkImage | null = null;
      if (cl.t === 'i') img = itemImg(cl.k, cell, showItemLevels(state.level));
      else if (cl.t === 'p') img = producerImg(cl.p, state.producers[cl.p]?.level ?? 1, cell);
      else if (cl.t === 'b') img = brambleImg(cell, cl.hp);
      if (cl.t === 'r') return; // obstacles are drawn in a second pass, above their neighbours
      if (img) cv.drawImageRect(img, Skia.XYWHRect(0, 0, img.width(), img.height()), Skia.XYWHRect(x + cell * 0.04, y + cell * 0.02, cell * 0.92, cell * 0.92), Skia.Paint());
      if (cl.t === 'i' && FARM_OUTPUTS[cl.k] && (state.farmReadyAt[`${state.workshop.active}:${i}`] ?? 0) <= now) {
        cv.drawCircle(x + cell * 0.78, y + cell * 0.2, cell * 0.18, fill('#FFF6C7'));
        cv.save(); cv.translate(x + cell * 0.61, y + cell * 0.03); cv.scale(cell * 0.0034, cell * 0.0034);
        drawArtBox(cv, itemArtId(FARM_OUTPUTS[cl.k])); cv.restore();
      }
      if (cl.t === 'p') {
        if (cl.p === 'merchant') {
          const job = state.farmFactories.merchant;
          if (job.readyAt > 0 && now >= job.readyAt) {
            cv.drawCircle(x + cell * 0.8, y + cell * 0.2, cell * 0.18, fill('#FFF4BF'));
            cv.drawCircle(x + cell * 0.8, y + cell * 0.2, cell * 0.14, line('#A66A17', 2));
          }
        } else {
          const st = state.producers[cl.p];
          const lv = producerLevel(cl.p, st?.level ?? 1);
          const k = st ? st.charges / lv.charges : 0;
          cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + cell * 0.18, y + cell * 0.06, cell * 0.64, 4), 2, 2), fill('#FFFFFF', 0.7));
          cv.drawRRect(Skia.RRectXY(Skia.XYWHRect(x + cell * 0.18, y + cell * 0.06, cell * 0.64 * k, 4), 2, 2), fill(k > 0 ? '#5FB86A' : '#D9604A'));
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
  }, [state.board, state.producers, state.level, state.farmReadyAt, state.workshop.active, readiness, cell, bw, bh, selected, hidden, dragKey]);
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
      .minDistance(4)
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
          cameraX.value = Math.max(Math.min(0, vw - 3 * vw * z), Math.min(0, panOrigin.current.x + e.translationX));
          cameraY.value = Math.max(Math.min(0, vh - 3 * vh * z), Math.min(0, panOrigin.current.y + e.translationY));
          return;
        }
        dx.value = e.x - cameraX.value - areaPosition.col * vw - cell * 0.6;
        dy.value = e.y - cameraY.value - areaPosition.row * vh - cell * 0.85;
        showHover(cellAt(e.x, e.y - cell * 0.25));
      })
      .onEnd((e) => {
        const from = dragFrom.current;
        dragFrom.current = null;
        hx.value = -999;
        lastHover.current = -1;
        setDragKey(null);
        if (from === null) return;
        const to = cellAt(e.x, e.y - cell * 0.25);
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
          const result = dispatch({ type: 'unlockWorkshop', area });
          if (result.ok) { setSelected(null); setFx([]); }
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
        if (cl.t === 'i' && cl.k.startsWith('starCoin:')) return;
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
        cameraX.value = Math.max(Math.min(0, vw - 3 * vw * z), Math.min(0, pinchStart.fx - (pinchStart.fx - pinchStart.x) * k));
        cameraY.value = Math.max(Math.min(0, vh - 3 * vh * z), Math.min(0, pinchStart.fy - (pinchStart.fy - pinchStart.y) * k));
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
      <View ref={ordersTargetRef} onLayout={ordersTargetMeasure}>
        <Orders state={state} />
      </View>
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
            <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: vw * 3, height: vh * 3, transformOrigin: 'top left' }, worldStyle]}>
              {WORKSHOP_GRID.map((area) => {
                const pos = workshopPosition(area), active = area === state.workshop.active, open = state.workshop.unlocked.includes(area);
                return <View key={area} style={{ position: 'absolute', left: pos.col * vw, top: pos.row * vh, width: vw, height: vh }}>
                  {active ? <>
                    {fx.filter((f) => f.type === 'merge' && f.bonus).map((f) => f.type === 'merge' ? <Animated.View key={`combo-${f.id}`} pointerEvents="none" entering={FadeIn.duration(100)} style={[styles.combo, { left: Math.max(0, Math.min(vw - 100, center(f.at, cell, pad)[0] - 50)), top: Math.max(0, center(f.at, cell, pad)[1] - cell), width: 100 }]}><Text style={styles.comboText}>KOMBO +1!</Text></Animated.View> : null)}
                    {merchantCell >= 0 ? <MerchantBadge state={state} cell={cell} pad={pad} at={merchantCell} now={now} /> : null}
                    {state.board.map((c, i) => c.t === 'r' && c.readyAt > 0 ? <ResourceBadge key={`r${i}`} at={i} cell={cell} pad={pad} readyAt={c.readyAt} now={now} /> : null)}
                  </> : !open ? <View style={styles.worldLock}><Sprite id="icon.lock" size={30} /><Text style={styles.worldLockTitle}>{t('area.new')}</Text><View style={styles.worldLockCostRow}><Sprite id={ICON.coin} size={20} /><Text style={styles.worldLockCost}>{WORKSHOP_PRICES[area]}</Text></View><Text style={styles.worldLockHint}>{t('area.tap')}</Text></View> : null}
                </View>;
              })}
            </Animated.View>
            {(() => {
              // A star coin is collected only from this button (handled by the board's tap gesture),
              // never by the first tap on it.
              const r = !panMode && selected !== null ? collectBubbleRect(state.board, selected, cell, pad, vw) : null;
              return r ? (
                <View key={`collect-${selected}`} pointerEvents="none" style={[styles.collectBubble, { position: 'absolute', zIndex: 30, ...r }]}>
                  <Sprite id="icon.token" size={20} />
                  <Text style={styles.collectText}>{t('coin.collect')}</Text>
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
      <ShopRow width={vw} lang={state.settings.lang === 'en' ? 'en' : 'tr'} ready={state.farmFactories.merchant.readyAt > 0 && now >= state.farmFactories.merchant.readyAt} grocerReady={state.farmFactories.grocer.readyAt > 0 && now >= state.farmFactories.grocer.readyAt} merchantCan={canDeliver(state, 'merchant')} grocerCan={canDeliver(state, 'grocer')} onMerchant={() => { if (state.farmFactories.merchant.readyAt > 0 && now >= state.farmFactories.merchant.readyAt) dispatch({ type: 'claimFarmReward', factory: 'merchant' }); else setFarmOpen(true); }} onGrocer={() => { if (state.farmFactories.grocer.readyAt > 0 && now >= state.farmFactories.grocer.readyAt) dispatch({ type: 'claimFarmReward', factory: 'grocer' }); else setGrocerOpen(true); }} />
      <Info selected={selected} state={state} now={now} />
      <Bag state={state} onExplore={() => (panMode ? exitExplore() : setPanMode(true))} exploring={panMode} />
      {farmOpen ? <MerchantSheet state={state} now={now} onClose={() => setFarmOpen(false)} /> : null}
      {grocerOpen ? <GrocerSheet state={state} now={now} onClose={() => setGrocerOpen(false)} /> : null}
    </View>
  );
}

const SHOP_SLOTS = [
  { tr: 'Vadi Tüccarı', en: 'Valley Trader', icon: 'icon.shop' },
  { tr: 'Bakkal', en: 'Grocer', icon: 'st.bakery_2' },
  null, null, null, null, null,
] as const;

/** Reserved shop spaces; no purchase or shop action exists until designed. */
/** Board-local rectangle of the Collect button above a selected star coin, or null. */
function collectBubbleRect(board: Cell[], at: number, cell: number, pad: number, vw: number): { left: number; top: number; width: number; height: number } | null {
  const c = board[at];
  if (c?.t !== 'i' || !c.k.startsWith('starCoin:')) return null;
  const col = at % BOARD_W, row = Math.floor(at / BOARD_W);
  const width = 96, height = 38;
  return { left: Math.max(2, Math.min(vw - width - 2, pad + col * cell + cell / 2 - width / 2)), top: row > 0 ? pad + row * cell - height - 4 : pad + cell + 4, width, height };
}

/** Whether a shop is idle and the barn holds everything its delivery needs. */
function canDeliver(state: GameState, factory: 'merchant' | 'grocer'): boolean {
  const offers = factory === 'grocer' ? FARM_RECIPES.grocer.map((r) => r.inputs) : [TRADER_RECIPE.inputs];
  return !state.farmFactories[factory].readyAt && offers.some((inputs) => inputs.every((x) => (state.harvestStock[x.item] ?? 0) >= x.count));
}

function ShopRow({ width, lang, ready, grocerReady, merchantCan, grocerCan, onMerchant, onGrocer }: { width: number; lang: 'tr' | 'en'; ready: boolean; grocerReady: boolean; merchantCan: boolean; grocerCan: boolean; onMerchant: () => void; onGrocer: () => void }) {
  const open = (i: number) => i === 0 || i === 1;
  const done = (i: number) => (i === 0 ? ready : i === 1 ? grocerReady : false);
  const can = (i: number) => (i === 0 ? merchantCan : i === 1 ? grocerCan : false);
  return <View style={{ width, alignSelf: 'center', flexDirection: 'row', gap: 2, height: 40, marginTop: 2 }} accessibilityLabel={lang === 'tr' ? 'Dükkân alanları' : 'Shop spaces'}>
    {SHOP_SLOTS.map((shop, i) => <Pressable onPress={i === 0 ? onMerchant : i === 1 ? onGrocer : undefined} disabled={!open(i)} accessibilityRole="button" key={i} accessibilityLabel={shop ? (open(i) ? `${shop[lang]}${done(i) ? (lang === 'tr' ? ' · ödülü topla' : ' · collect reward') : can(i) ? (lang === 'tr' ? ' · teslimat hazır' : ' · delivery ready') : ''}` : `${shop[lang]} · ${lang === 'tr' ? 'kilitli' : 'locked'}`) : (lang === 'tr' ? 'Kilitli dükkân alanı' : 'Locked shop space')} style={{ flex: 1, borderRadius: 6, backgroundColor: shop ? '#F4E4BD' : '#DDE6D6', borderWidth: 1, borderColor: '#C1B697', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 1 }}>
      {shop ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Sprite id={shop.icon} size={19} style={!open(i) ? { opacity: 0.55 } : undefined} />
          {!open(i) ? <Sprite id="icon.lock" size={11} style={{ position: 'absolute', right: -7, bottom: 0 }} /> : null}
        </View>
        {/* Top-right corner: reward to collect, or every delivery item is in the barn. */}
        {done(i) ? <Sprite id="icon.gift" size={16} style={{ position: 'absolute', right: -3, top: -5 }} /> : can(i) ? <Sprite id="icon.check" size={15} style={{ position: 'absolute', right: -3, top: -5 }} /> : null}
        <Text numberOfLines={2} style={{ textAlign: 'center', fontFamily: font.black, fontSize: 7, lineHeight: 8, color: '#69583F' }}>{shop[lang]}</Text>
      </> : <Sprite id="icon.lock" size={16} style={{ opacity: 0.7 }} />}
    </Pressable>)}
  </View>;
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
    <View pointerEvents="none" style={[styles.merchantBadge, { left: x + 1, top: y + cell - 17, width: Math.max(0, cell - 2), height: 16, overflow: 'hidden' }, ready && styles.merchantReady]}>
      {ready ? <Sprite id="icon.check" size={12} /> : null}
      {!ready ? <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.merchantText, { flexShrink: 1, fontSize: Math.min(10, Math.max(6, cell * 0.22)) }]}>{clock(readyAt - now)}</Text> : null}
    </View>
  );
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
  const ready = !factory.readyAt && TRADER_RECIPE.inputs.every((input) => (state.harvestStock[input.item] ?? 0) >= input.count);
  const complete = factory.readyAt > 0 && now >= factory.readyAt;
  const footer = complete ? <Button tone="sage" icon="icon.token" label={lang === 'tr' ? 'Ödülü al' : 'Collect reward'} onPress={() => { dispatch({ type: 'claimFarmReward', factory: 'merchant' }); onClose(); }} />
    : factory.readyAt ? <View><Text style={styles.sheetTimer}>{t('merchant.preparing', { t: clock(Math.max(0, factory.readyAt - now)) })}</Text><HurryButton target={{ kind: 'merchant' }} readyAt={factory.readyAt} /></View>
    : <Button tone={ready ? 'sage' : 'cream'} disabled={!ready} label={t('merchant.deliver')} onPress={() => dispatch({ type: 'startFarmRecipe', factory: 'merchant' })} />;
  return <Sheet title={t('merchant.title')} onClose={onClose} footer={footer}>
    <View style={styles.factory}>
      <Text style={styles.infoTitle}>{lang === 'tr' ? 'Süt ve buğday siparişi' : 'Milk and wheat order'}</Text>
      <Text style={styles.sectionLabel}>{lang === 'tr' ? 'Ambardan gerekenler' : 'Required from barn'}</Text>
      {TRADER_RECIPE.inputs.map((x) => {
        const have = state.harvestStock[x.item] ?? 0;
        return <Pressable key={x.item} onPress={() => open('source', x.item)} accessibilityRole="button" accessibilityLabel={label(x.item).name} style={[styles.wantRow, have >= x.count && styles.wantOk]}>
          <Sprite id={`item.${x.item}`} size={40} />
          <Text style={[styles.infoTitle, { flex: 1 }]}>{label(x.item).name}</Text>
          <Text style={styles.wantCount}>{Math.min(have, x.count)}/{x.count}</Text>
        </Pressable>;
      })}
      <Text style={styles.sectionLabel}>{t('merchant.pays')}</Text>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={styles.payChip}><Sprite id="icon.token" size={24} /><Text style={styles.payText}>{lang === 'tr' ? '1. seviye yıldız jetonu' : 'Level 1 star token'}</Text></View>
        <View style={styles.payChip}><Sprite id="icon.calendar" size={20} /><Text style={styles.payText}>{clock(TRADER_RECIPE.seconds * 1000)}</Text></View>
      </View>
      {factory.readyAt && !factory.rewardKind ? <Text style={styles.infoSub}>{lang === 'tr' ? `Önceki sipariş ödülü: ${factory.payout} altın` : `Previous order reward: ${factory.payout} gold`}</Text> : null}
    </View>
  </Sheet>;
}

/** The grocer: harvested bouquets and fruit baskets → a gift basket sold for coins and XP. */
function GrocerSheet({ state, now, onClose }: { state: GameState; now: number; onClose: () => void }) {
  const { dispatch, t, open, lang } = useGame();
  const label = useItemLabel();
  const factory = state.farmFactories.grocer;
  const busy = factory.readyAt > 0;
  const complete = busy && now >= factory.readyAt;
  const running = FARM_RECIPES.grocer[factory.recipe] ?? FARM_RECIPES.grocer[0];
  const footer = complete ? <Button tone="sage" icon="icon.coin" label={t('merchant.collect', { n: factory.payout })} onPress={() => { dispatch({ type: 'claimFarmReward', factory: 'grocer' }); onClose(); }} />
    : busy ? <View><Text style={styles.sheetTimer}>{`${lang === 'en' ? running.en : running.tr} · ${t('merchant.preparing', { t: clock(Math.max(0, factory.readyAt - now)) })}`}</Text><HurryButton target={{ kind: 'grocer' }} readyAt={factory.readyAt} /></View>
    : null;
  return <Sheet title={t('grocer.title')} onClose={onClose} footer={footer}>
    <Text style={styles.infoSub}>{t('grocer.how')}</Text>
    {FARM_RECIPES.grocer.map((recipe, index) => {
      const ok = recipe.inputs.every((x) => (state.harvestStock[x.item] ?? 0) >= x.count);
      return <View key={index} style={[styles.factory, { marginTop: 8 }]}>
        <Text style={styles.infoTitle}>{lang === 'en' ? recipe.en : recipe.tr}</Text>
        {recipe.inputs.map((x) => {
          const have = state.harvestStock[x.item] ?? 0;
          return <Pressable key={x.item} onPress={() => open('source', x.item)} accessibilityRole="button" accessibilityLabel={label(x.item).name} style={[styles.wantRow, have >= x.count && styles.wantOk]}>
            <Sprite id={`item.${x.item}`} size={36} />
            <Text style={[styles.infoTitle, { flex: 1 }]}>{label(x.item).name}</Text>
            <Text style={styles.wantCount}>{Math.min(have, x.count)}/{x.count}</Text>
          </Pressable>;
        })}
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={styles.payChip}><Sprite id="icon.coin" size={20} /><Text style={styles.payText}>{recipe.gold}</Text></View>
          <View style={styles.payChip}><Sprite id="icon.star" size={18} /><Text style={styles.payText}>{recipe.xp} XP</Text></View>
          <View style={styles.payChip}><Sprite id="icon.calendar" size={18} /><Text style={styles.payText}>{clock(recipe.seconds * 1000)}</Text></View>
          <View style={{ flex: 1 }} />
          <Button small tone={ok && !busy ? 'sage' : 'cream'} disabled={!ok || busy} label={t('grocer.make')} onPress={() => dispatch({ type: 'startFarmRecipe', factory: 'grocer', recipe: index })} />
        </View>
      </View>;
    })}
  </Sheet>;
}

function useDragTransform(dx: SharedValue<number>, dy: SharedValue<number>) {
  return useDerivedValue(() => [{ translateX: dx.value }, { translateY: dy.value }]);
}

function HoverRect({ x, y, valid, size }: { x: SharedValue<number>; y: SharedValue<number>; valid: SharedValue<number>; size: number }) {
  const color = useDerivedValue(() => (valid.value > 0 ? 'rgba(95,184,106,0.45)' : valid.value < 0 ? 'rgba(217,96,74,0.3)' : 'rgba(242,181,68,0.35)'));
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
      <Circle cx={cx} cy={cy} r={r} color="rgba(255,255,255,0.35)" />
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
      <Circle cx={at[0]} cy={at[1]} r={glowR} color="#FFF4C8" opacity={glowO} />
      {parts.map((q, i) => (
        <Particle key={i} x={at[0]} y={at[1]} a={q.a} d={q.d} p={p} color={i % 2 ? col : '#FFE9A8'} r={q.r} />
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
      ) : <Particle key={i} x={x} y={y} a={q.a} d={q.d} p={p} color={i % 2 ? '#7E9A5A' : '#E9D2A6'} r={2 + i % 3} />)}
    </Group>
  );
}

function ResourceFragment({ x, y, a, d, p, wood, index }: { x: number; y: number; a: number; d: number; p: SharedValue<number>; wood: boolean; index: number }) {
  const transform = useDerivedValue(() => {
    const t = p.value;
    return [{ translateX: x + Math.cos(a) * d * t }, { translateY: y + Math.sin(a) * d * t - 12 * Math.sin(Math.PI * t) + 5 * t * t }, { rotate: a + t * (index % 2 ? 2 : -2) }];
  });
  const opacity = useDerivedValue(() => Math.max(0, 1 - p.value));
  return <Group transform={transform} opacity={opacity}><RoundedRect x={-3} y={-2} width={wood ? 9 : 6} height={wood ? 3 : 5} r={1} color={wood ? (index % 2 ? '#80502D' : '#CE9C5B') : (index % 2 ? '#807E77' : '#C8C1B3')} /></Group>;
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
  const { open, c } = useGame();
  const ready = o.items.every((it) => countItem(state, it.item) >= it.n);
  return (
    <View style={[styles.order, o.special && styles.orderSpecial]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Sprite id={`portrait.${o.giver}.${ready ? 'happy' : 'calm'}`} size={compact ? 26 : 34} />
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {o.items.map((it) => {
            const count = Math.min(countItem(state, it.item), it.n);
            const have = count >= it.n;
            const { f, l } = parseItem(it.item);
            return (
              <Pressable key={it.item} onPress={() => open('source', it.item)} style={styles.orderItem} accessibilityRole="button" accessibilityLabel={`${c(`item.${it.item}`)} ${count}/${it.n}`}>
                <Sprite id={`item.${it.item}`} size={compact ? 26 : 30} silhouette={!have && !state.discovered.includes(it.item)} />
                {FAMILY[f].levels > 1 ? <Text style={styles.orderLv}>{l}</Text> : null}
                <Text style={[styles.orderN, have && { color: '#3E7A47' }]}>{count}/{it.n}</Text>
                {have ? <Sprite id="icon.check" size={13} style={styles.orderCheck} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Sprite id={ICON.coin} size={16} />
          <Text style={styles.orderReward}>{o.leaves}</Text>
          <Sprite id="icon.star" size={14} style={{ marginLeft: 6 }} />
          <Text style={styles.orderReward}>{o.xp}</Text>
        </View>
        {ready ? (
          <Button small tone="sage" label={t('board.deliver')} onPress={onDeliver} />
        ) : (
          <Pressable onPress={onReplace} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('board.replace')}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Sprite id={ICON.coin} size={14} /><Text style={styles.orderReplace}>{t('board.replace')}</Text></View>
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

function Bag({ state, onExplore, exploring }: { state: GameState; onExplore?: () => void; exploring?: boolean }) {
  const { t, dispatch, lang, now, open, reduceMotion } = useGame();
  const crateScale = useSharedValue(1);
  const crateAnim = useAnimatedStyle(() => ({ transform: [{ scale: crateScale.value }] }));
  const crate = state.crate ?? { charges: 0, refillDay: -1 };
  const [crateSheet, setCrateSheet] = useState(false);
  const [crateBurst, setCrateBurst] = useState(0);
  const [crateTargetRef, crateTargetMeasure] = useMeasuredTarget('crate');
  const today = localDay(now, state.tzOffset);
  const canClaimDaily = crate.charges === 0 && today > crate.refillDay;
  const remaining = Math.max(0, (today + 1) * DAY + state.tzOffset * MINUTE - now);
  const remainingText = `${Math.floor(remaining / HOUR)} ${lang === 'tr' ? 'sa' : 'h'} ${Math.floor((remaining % HOUR) / MINUTE)} ${lang === 'tr' ? 'dk' : 'm'}`;
  const claim = () => {
    const r = dispatch({ type: 'claimDailyCrates' });
    if (!r.ok) return;
    setCrateBurst(10);
    setTimeout(() => setCrateBurst(0), 1200);
    setCrateSheet(false);
  };
  const buy = () => {
    const r = dispatch({ type: 'buyCrates' });
    if (!r.ok) return;
    setCrateBurst(25);
    setTimeout(() => setCrateBurst(0), 1200);
    setCrateSheet(false);
  };
  const bought = state.inventory.length - BALANCE.inventory.startSlots;
  const cost = BALANCE.inventory.slotCostLeaves[bought];
  const energyK = state.energy / BALANCE.energy.max;
  return (
    <View style={[styles.bag, { height: BAG_H }]}>
      <Pressable ref={crateTargetRef} onLayout={crateTargetMeasure} onPress={() => { if (!crate.charges) { setCrateSheet(true); return; } const result = dispatch({ type: 'openCrate' }); if (result.ok && !reduceMotion) crateScale.set(withSequence(withTiming(0.86, { duration: 80 }), withTiming(1.12, { duration: 140 }), withTiming(1, { duration: 150 }))); }} style={({ pressed }) => [styles.crateBig, pressed && { transform: [{ scale: 0.95 }] }]} accessibilityRole="button" accessibilityLabel={crate.charges ? (lang === 'tr' ? `Tohum kutusu, ${crate.charges} kaldı` : `Seed crate, ${crate.charges} left`) : canClaimDaily ? (lang === 'tr' ? 'Ücretsiz 10 kutu al' : 'Get 10 free crates') : (lang === 'tr' ? `${remainingText} sonra ücretsiz kutu` : `Free crates in ${remainingText}`)}>
        <Animated.View style={crateAnim}><Sprite id="icon.gift" size={30} /></Animated.View>
        <Text style={styles.crateSub} numberOfLines={1}>{crate.charges === 0 ? (canClaimDaily ? (lang === 'tr' ? 'ÜCRETSİZ' : 'FREE') : remainingText) : (lang === 'tr' ? 'KUTU' : 'CRATE')}</Text>
        {crate.charges ? <View style={styles.crateCountBadge}><Text style={styles.crateCountText}>{crate.charges}</Text></View> : null}
        {crateBurst ? <Animated.View entering={FadeIn.duration(120)} pointerEvents="none" style={styles.crateBurst}><Text style={styles.crateBurstText}>+{crateBurst}</Text></Animated.View> : null}
      </Pressable>
      <Pressable onPress={() => open('storage', true)} style={styles.slot} accessibilityRole="button" accessibilityLabel={t('storage.title')}>
        <Sprite id="icon.bag" size={30} />
        {state.rewardStorage.length ? <Dot /> : null}
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: 'center', paddingRight: 8 }}>
        {state.inventory.map((k, i) => (
          <Pressable key={i} onPress={() => k && dispatch({ type: 'retrieve', slot: i })} style={styles.slot} accessibilityRole="button" accessibilityLabel={k ? `${t('board.inventory')} ${i + 1}` : t('board.inventory')}>
            {k ? <Sprite id={`item.${k}`} size={36} /> : null}
          </Pressable>
        ))}
        {cost !== undefined && state.inventory.length < BALANCE.inventory.maxSlots ? (
          <Pressable onPress={() => dispatch({ type: 'buySlot' })} style={[styles.slot, styles.slotAdd]} accessibilityRole="button" accessibilityLabel={t('board.buySlot', { n: cost })}>
            <Text style={styles.slotPlus}>+</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}><Sprite id={ICON.coin} size={12} /><Text style={styles.slotCost}>{cost}</Text></View>
          </Pressable>
        ) : null}
      </ScrollView>
      <Pressable onPress={() => open('supply', true)} style={styles.slot} accessibilityRole="button" accessibilityLabel={`${t('supply.title')}: ${state.supply.charges}`}>
        <Sprite id="prop.rock" size={30} />
        {state.supply.charges > 0 ? <View style={styles.supplyBadge}><Text style={styles.supplyBadgeText}>{state.supply.charges}</Text></View> : null}
      </Pressable>
      {onExplore ? (
        <Pressable onPress={onExplore} style={[styles.slot, exploring && { backgroundColor: colors.sageDeep }]} accessibilityRole="button" accessibilityLabel={t('explore.button')}>
          <Sprite id="icon.map" size={22} /><Text numberOfLines={1} style={{ fontSize: 9, fontFamily: font.bold, color: colors.ink }}>{lang === 'tr' ? 'Gezin' : 'Explore'}</Text>
        </Pressable>
      ) : null}
      {crateSheet ? <Modal visible transparent animationType="none" onRequestClose={() => setCrateSheet(false)}><Sheet title={canClaimDaily ? (lang === 'tr' ? 'Ücretsiz 10 Kutu' : '10 Free Crates') : (lang === 'tr' ? 'Kutular tükendi' : 'Out of crates')} onClose={() => setCrateSheet(false)}>
        {canClaimDaily ? <>
          <Text style={styles.infoSub}>{lang === 'tr' ? 'Günlük hakkın hazır. 10 kutu sayacına eklenecek.' : 'Your daily claim is ready. 10 crates will be added to your counter.'}</Text>
          <Button small tone="sage" label={lang === 'tr' ? 'Ücretsiz 10 kutuyu al' : 'Get 10 free crates'} onPress={claim} style={{ marginTop: 10 }} />
        </> : <>
          <Text style={styles.infoSub}>{lang === 'tr' ? `Sonraki ücretsiz 10 kutu: ${remainingText} sonra, yerel gün değiştiğinde.` : `Next 10 free crates: in ${remainingText}, when the local day changes.`}</Text>
          <Button small tone="energy" disabled={state.energy < 50} icon="icon.energy" label={lang === 'tr' ? '25 kutu al · 50 enerji' : 'Get 25 crates · 50 energy'} onPress={buy} style={{ marginTop: 10 }} />
        </>}
        <Button small tone="cream" label={lang === 'tr' ? 'Kapat' : 'Close'} onPress={() => setCrateSheet(false)} style={{ marginTop: 8 }} />
      </Sheet></Modal> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  collectBubble: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 18, backgroundColor: '#EFC26A', borderWidth: 2, borderColor: '#FFE2A6', borderBottomWidth: 4, borderBottomColor: '#BD8839', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  collectText: { fontFamily: font.black, fontSize: 14, color: '#473619' },
  supplyBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  supplyBadgeText: { fontFamily: font.black, fontSize: 10, color: '#FFFFFF' },
  worldLockCostRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  exploreBar: { position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingLeft: 12, borderRadius: 20, backgroundColor: 'rgba(41,63,53,0.9)' },
  exploreText: { flex: 1, fontFamily: font.bold, fontSize: 12, color: '#FFFFFF' },
  exploreDone: { paddingHorizontal: 16, height: 38, borderRadius: 19, backgroundColor: colors.honey, alignItems: 'center', justifyContent: 'center' },
  exploreDoneText: { fontFamily: font.black, fontSize: 14, color: '#473619' },
  merchantBadge: { position: 'absolute', height: 22, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: 'rgba(255,253,244,0.97)', borderWidth: 1.5, borderColor: '#E3C27A' },
  merchantReady: { backgroundColor: '#E4F4D8', borderColor: '#6FAE52' },
  merchantText: { fontFamily: font.black, fontSize: 11, color: colors.ink, fontVariant: ['tabular-nums'] },
  merchantLv: { fontFamily: font.black, fontSize: 9, color: '#FFFFFF', backgroundColor: colors.sageDeep, borderRadius: 6, paddingHorizontal: 3, overflow: 'hidden' },
  sheetTimer: { fontFamily: font.black, fontSize: 16, color: colors.ink, textAlign: 'center', paddingVertical: 8, fontVariant: ['tabular-nums'] },
  sectionLabel: { fontFamily: font.bold, fontSize: 12, color: colors.inkSoft, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  wantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 12, backgroundColor: 'rgba(65,105,87,0.07)' },
  wantOk: { backgroundColor: 'rgba(111,174,82,0.16)' },
  wantCount: { fontFamily: font.black, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  payChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  payText: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  orderLv: { position: 'absolute', top: -3, left: -3, fontFamily: font.black, fontSize: 9, color: '#FFFFFF', backgroundColor: colors.sageDeep, borderRadius: 6, paddingHorizontal: 3, overflow: 'hidden' },
  crateBig: { width: 58, height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6E7C3', borderWidth: 2, borderColor: '#FFFFFF', shadowColor: '#7A5232', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  crateCountBadge: { position: 'absolute', top: 1, right: 1, minWidth: 22, height: 20, borderRadius: 10, paddingHorizontal: 4, backgroundColor: colors.sageDeep, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
  crateCountText: { fontFamily: font.black, fontSize: 11, color: '#FFFFFF' },
  crateSub: { fontFamily: font.black, fontSize: 9, color: '#6B471B', marginTop: -2 },
  areas: { height: 34, paddingHorizontal: 6, gap: 5, alignItems: 'center' },
  area: { minWidth: 44, height: 36, paddingHorizontal: 10, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border },
  areaActive: { backgroundColor: colors.sageDeep },
  areaText: { fontFamily: font.black, fontSize: 13, color: colors.ink },
  areaGold: { fontFamily: font.black, fontSize: 11, color: colors.ink, marginHorizontal: 6 },
  worldLock: { position: 'absolute', left: '20%', right: '20%', top: '35%', minHeight: 110, justifyContent: 'center', alignItems: 'center', padding: 8, borderRadius: 18, backgroundColor: 'rgba(248,250,237,0.94)', borderWidth: 2, borderColor: '#E8F0D9' },
  worldLockTitle: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  worldLockCost: { fontFamily: font.black, fontSize: 15, color: colors.ink },
  worldLockHint: { fontFamily: font.bold, fontSize: 11, color: colors.inkSoft },
  farmButton: { minHeight: 30, justifyContent: 'center', borderRadius: 10, paddingHorizontal: 7, backgroundColor: '#F6E6B3', borderWidth: 1, borderColor: '#D9B973' },
  farmButtonReady: { backgroundColor: '#BFE7A8', borderColor: colors.sageDeep, borderWidth: 2 },
  neighbor: { position: 'absolute', top: 25, bottom: 25, width: 21, borderRadius: 8, backgroundColor: '#B6C9AE', borderWidth: 1, borderColor: '#6F927A', alignItems: 'center', justifyContent: 'center' },
  neighborText: { fontFamily: font.black, fontSize: 12, color: colors.ink },
  factory: { padding: 10, marginBottom: 8, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border, gap: 4 },
  factoryReady: { borderColor: colors.sageDeep, backgroundColor: '#E7F4DD' },
  combo: { position: 'absolute', alignItems: 'center', zIndex: 10 },
  comboText: { fontFamily: font.black, fontSize: 16, color: '#FFF5BD', textShadowColor: '#66421A', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  crate: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E5F0DA', borderWidth: 1, borderColor: colors.borderDeep },
  crateRefill: { width: 38, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  crateCount: { fontFamily: font.black, fontSize: 10, color: colors.ink },
  crateLabel: { fontFamily: font.black, fontSize: 8, color: colors.ink, lineHeight: 9 },
  crateBurst: { position: 'absolute', top: 1, backgroundColor: '#FFF4BF', borderRadius: 10, paddingHorizontal: 5, borderWidth: 1, borderColor: '#B57C1C' },
  crateBurstText: { fontFamily: font.black, fontSize: 11, color: '#76501B' },
  root: { flex: 1, paddingHorizontal: 6, paddingTop: 4 },
  orders: { gap: 8, paddingHorizontal: 4, paddingBottom: 6, alignItems: 'stretch' },
  order: { width: 158, borderRadius: radius.m, backgroundColor: colors.paper, padding: 7, borderWidth: 1.5, borderColor: 'rgba(65,105,87,0.25)' },
  orderSpecial: { borderColor: colors.honey, backgroundColor: '#FFF4D6' },
  orderItem: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  orderN: { position: 'absolute', bottom: -4, right: -6, fontFamily: font.black, fontSize: 10, color: colors.ink, backgroundColor: 'rgba(255,253,244,0.92)', borderRadius: 6, paddingHorizontal: 2, overflow: 'hidden' },
  orderCheck: { position: 'absolute', top: -2, right: -2 },
  orderReward: { fontFamily: font.black, fontSize: 13, color: colors.ink, marginLeft: 2 },
  orderReplace: { fontFamily: font.medium, fontSize: 11, color: colors.inkSoft, textDecorationLine: 'underline' },
  special: { position: 'absolute', top: -1, right: 8, fontFamily: font.black, fontSize: 9, color: colors.honeyDeep },
  info: { height: INFO_H, marginTop: 6, marginHorizontal: 2, borderRadius: radius.l, backgroundColor: colors.paper, padding: 10, borderWidth: 1.5, borderColor: 'rgba(65,105,87,0.22)', justifyContent: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoTitle: { fontFamily: font.black, fontSize: 16, color: colors.ink },
  infoSub: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  infoHint: { fontFamily: font.medium, fontSize: 13, color: colors.inkSoft, textAlign: 'center' },
  bag: { height: BAG_H, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 6 },
  slot: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(249,251,242,0.9)', borderWidth: 1.5, borderColor: 'rgba(65,105,87,0.25)', alignItems: 'center', justifyContent: 'center' },
  slotAdd: { borderStyle: 'dashed' },
  slotPlus: { fontFamily: font.black, fontSize: 18, color: colors.inkSoft, marginTop: -4 },
  slotCost: { fontFamily: font.bold, fontSize: 9, color: colors.inkSoft, marginTop: -4 },
  tutBubble: { position: 'absolute', bottom: 8, alignSelf: 'center', backgroundColor: 'rgba(62,46,34,0.86)', borderRadius: radius.m, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tutText: { flex: 1, color: '#FFF8EA', fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  pending: { textAlign: 'center', fontFamily: font.medium, fontSize: 11, color: colors.inkSoft },
});

