import { emitReward } from '../ui/rewardEvents';
// Holds the game state, runs commands through the pure engine, saves, and turns engine events
// into sound, haptics and toasts. UI state (current screen, overlays) lives here too.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, AppState, Text, View } from 'react-native';

import { QUEST } from '../content/quests';
import { apply, type Command } from '../engine/commands';
import { newGame, resetKeepingPurchases, SAVE_VERSION } from '../engine/state';
import { applyDevGrant, type DevGrant } from '../engine/devEconomy';
import { ensureDevBackup, restoreDevBackup } from '../persistence/devBackup';
import type { DenyReason, GameEvent, GameState } from '../engine/types';
import { configureFeedback, haptic, play, startMusic, stopMusic } from '../feedback';
import { CONTENT } from '../i18n/content';
import { DIALOGUES, type Line } from '../i18n/dialogues';
import { format, STRINGS, type Lang, type StringKey } from '../i18n/strings';
import { SaveStore } from '../persistence/storage';
import { migrate, repair } from '../persistence/save';

export type Screen = 'map' | 'board' | 'quests' | 'journal' | 'shop';

export interface Toast {
  id: number;
  kind: 'reward' | 'levelUp' | 'discover' | 'achievement' | 'region' | 'info' | 'deny' | 'memory';
  text: string;
  icon?: string;
  leaves?: number;
  xp?: number;
  energy?: number;
  /** Merged toasts (e.g. several discoveries). */
  count?: number;
}

/**
 * A "moment" is a full-screen celebration (restoration, new region, level up). The notification
 * manager shows at most one at a time, coalesces moments from one action into one card and never
 * stacks them on top of dialogues or puzzles. Minor news are small toasts.
 */
export type Moment =
  | { kind: 'structure'; id: string; complete: boolean; region?: number; level?: number; quest?: string }
  | { kind: 'region'; n: number; level?: number }
  | { kind: 'level'; level: number };

export interface Overlays {
  dialogue: { lines: Line[]; then?: () => void } | null;
  puzzle: { id: string; onSolved?: () => void } | null;
  structure: string | null;
  node: string | null;
  source: string | null;
  levelInfo: boolean;
  storage: boolean;
  energy: boolean;
  supply: boolean;
  premium: boolean;
  season: boolean;
  /** Board cell of the resource obstacle whose panel is open. */
  resource: number | null;
  settings: boolean;
  memory: string | null;
}

const NO_OVERLAYS: Overlays = { dialogue: null, puzzle: null, structure: null, node: null, source: null, levelInfo: false, storage: false, energy: false, supply: false, premium: false, season: false, resource: null, settings: false, memory: null };

interface Api {
  ready: boolean;
  state: GameState;
  now: number;
  lang: Lang;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  c: (key: string, vars?: Record<string, string | number>) => string;
  dispatch: (cmd: Command) => { ok: boolean; events: GameEvent[] };
  screen: Screen;
  setScreen: (s: Screen) => void;
  overlays: Overlays;
  open: <K extends keyof Overlays>(k: K, v: Overlays[K]) => void;
  toasts: Toast[];
  toast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  /** Queue of full-screen moments; the Shell shows `moments[0]`. */
  moments: Moment[];
  dismissMoment: () => void;
  /** Game setting OR the device's "reduce motion" accessibility setting. */
  reduceMotion: boolean;
  /** Board animation listeners (merge, produce…). */
  subscribe: (fn: (events: GameEvent[]) => void) => () => void;
  /** Plays a quest's dialogue, then runs `then`. */
  talk: (questId: string, part: 'start' | 'end', then?: () => void) => void;
  savedAt: number;
  resetAll: () => Promise<void>;
  testProfile: boolean;
  switchTestProfile: (enabled: boolean) => Promise<void>;
  addTestTokens: (amount: number) => void;
  devGrant: (grant: DevGrant) => Promise<boolean>;
  restoreDevSave: () => Promise<boolean>;
}

const Ctx = createContext<Api | null>(null);
const NORMAL_STORE = new SaveStore(AsyncStorage);
const TEST_STORE = new SaveStore(AsyncStorage, 'luma.dev.save');
const TEST_PROFILE_KEY = 'luma.dev.active';
const DEV = typeof __DEV__ !== 'undefined' && __DEV__;
/** Last open tab (UI preference, not game state), so a reload or relaunch returns to it. */
const SCREEN_KEY = 'luma.ui.screen';
const SCREENS: readonly Screen[] = ['map', 'board', 'quests', 'journal', 'shop'];

function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';
  } catch {
    return 'tr';
  }
}

function tzOffset(): number {
  return new Date().getTimezoneOffset();
}

const DENY_KEYS: Record<DenyReason, StringKey> = {
  noEnergy: 'deny.noEnergy',
  noCharges: 'deny.noCharges',
  boardFull: 'deny.boardFull',
  noLeaves: 'deny.noLeaves',
  noStars: 'deny.noStars',
  inventoryFull: 'deny.inventoryFull',
  missingItems: 'deny.missingItems',
  locked: 'deny.locked',
  notAvailable: 'deny.notAvailable',
  invalid: 'deny.invalid',
};

export function GameProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testProfile, setTestProfile] = useState(false);
  const testProfileRef = useRef(false);
  const storeRef = useRef(NORMAL_STORE);
  const switching = useRef(false);
  const [state, setState] = useState<GameState>(() => newGame(Date.now(), (Math.random() * 2 ** 31) | 0, tzOffset()));
  const stateRef = useRef(state);
  const [now, setNow] = useState(() => Date.now());
  const [screen, setScreen] = useState<Screen>('board');
  const [overlays, setOverlays] = useState<Overlays>(NO_OVERLAYS);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [osReduce, setOsReduce] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const listeners = useRef(new Set<(e: GameEvent[]) => void>());
  const toastSeq = useRef(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lang: Lang = state.settings.lang ?? deviceLang();
  const t = useCallback((key: StringKey, vars?: Record<string, string | number>) => format(STRINGS[lang][key] ?? key, vars), [lang]);
  const c = useCallback((key: string, vars?: Record<string, string | number>) => format(CONTENT[lang][key] ?? key, vars), [lang]);

  const persistNow = useCallback((s: GameState) => {
    const at = Date.now();
    storeRef.current.save(s, at).then(() => setSavedAt(at)).catch(() => {});
  }, []);

  const scheduleSave = useCallback(
    (s: GameState, urgent: boolean) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (urgent) persistNow(s);
      else saveTimer.current = setTimeout(() => persistNow(stateRef.current), 600);
    },
    [persistNow],
  );

  // Load once.
  useEffect(() => {
    let alive = true;
    let failed = false;
    Promise.all([DEV ? AsyncStorage.getItem(TEST_PROFILE_KEY).catch(() => null) : Promise.resolve(null), AsyncStorage.getItem(SCREEN_KEY).catch(() => null)])
      .then(async ([active, lastScreen]) => {
        const isTest = DEV && active === 'test'; storeRef.current = isTest ? TEST_STORE : NORMAL_STORE; testProfileRef.current = isTest; setTestProfile(isTest);
        // Production must never load a save containing development-derived purchases.
        if (!DEV) await restoreDevBackup(AsyncStorage, NORMAL_STORE, false, Date.now());
        const loaded = await storeRef.current.load();
        if (!alive) return;
        const base = loaded ?? newGame(Date.now(), (Math.random() * 2 ** 31) | 0, tzOffset());
        base.tzOffset = tzOffset();
        const ticked = apply(base, { type: 'tick' }, Date.now()).state;
        stateRef.current = ticked;
        setState(ticked);
        setScreen(ticked.flags.introDone && SCREENS.includes(lastScreen as Screen) ? (lastScreen as Screen) : 'board');
        if (!loaded || ticked.crate.charges !== loaded.crate?.charges || ticked.crate.anchor !== loaded.crate?.anchor || ticked.freeSeason.day !== loaded.freeSeason?.day || ticked.freeSeason.week !== loaded.freeSeason?.week) persistNow(ticked);
      })
      .catch(() => { failed = true; if (alive) setLoadError('Kayıt güvenliği doğrulanamadı. Kayıt değiştirilmedi; uygulamayı yeniden açmayı dene.'); })
      .finally(() => { if (alive && !failed) setReady(true); });
    return () => {
      alive = false;
    };
  }, [persistNow]);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(SCREEN_KEY, screen).catch(() => {});
  }, [ready, screen]);

  useEffect(() => {
    configureFeedback({ sfx: state.settings.sfx, music: state.settings.music, haptics: state.settings.haptics });
  }, [state.settings.sfx, state.settings.music, state.settings.haptics]);

  useEffect(() => {
    if (ready && state.flags.introDone) startMusic();
  }, [ready, state.flags.introDone]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setOsReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOsReduce);
    return () => sub.remove();
  }, []);

  // Toasts: at most two on screen; a burst of the same kind within a moment merges into one
  // ("3 new discoveries") instead of stacking up.
  const toast = useCallback((tt: Omit<Toast, 'id'>) => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToasts((list) => {
      const last = list[list.length - 1];
      if (last && tt.kind === 'discover' && last.kind === 'discover') {
        const n = (last.count ?? 1) + 1;
        return [...list.slice(0, -1), { ...last, count: n, text: format(STRINGS[lang]['toast.discoverMany'], { n }), icon: tt.icon }];
      }
      if (last && tt.kind === 'reward' && last.kind === 'reward' && !tt.text && !last.text) {
        return [...list.slice(0, -1), { ...last, leaves: (last.leaves ?? 0) + (tt.leaves ?? 0), energy: (last.energy ?? 0) + (tt.energy ?? 0) }];
      }
      if (last && last.kind === tt.kind && last.text === tt.text && tt.kind === 'deny') return list; // same warning twice
      return [...list.slice(-1), { ...tt, id }];
    });
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), tt.kind === 'achievement' ? 3000 : 2200);
  }, [lang]);
  const dismissMoment = useCallback(() => setMoments((m) => m.slice(1)), []);
  const dismissToast = useCallback((id: number) => setToasts((list) => list.filter((x) => x.id !== id)), []);

  const react = useCallback(
    (events: GameEvent[]) => {
      const L = lang;
      // One action → at most one full-screen moment.
      const st = [...events].reverse().find((e): e is Extract<GameEvent, { type: 'structure' }> => e.type === 'structure');
      const rg = events.find((e): e is Extract<GameEvent, { type: 'region' }> => e.type === 'region');
      const lv = [...events].reverse().find((e): e is Extract<GameEvent, { type: 'levelUp' }> => e.type === 'levelUp');
      const qe = events.find((e): e is Extract<GameEvent, { type: 'quest' }> => e.type === 'quest');
      const moment: Moment | null = st
        ? { kind: 'structure', id: st.id, complete: st.complete, region: rg?.n, level: lv?.level, quest: qe?.id }
        : rg
          ? { kind: 'region', n: rg.n, level: lv?.level }
          : lv
            ? { kind: 'level', level: lv.level }
            : null;
      if (moment) setMoments((m) => [...m, moment].slice(-3));
      for (const e of events) {
        switch (e.type) {
          case 'merge':
            if (e.giftCrates) toast({ kind: 'reward', text: L === 'tr' ? `Kombo hediyesi: +${e.giftCrates} kutu!` : `Combo gift: +${e.giftCrates} crates!`, icon: 'icon.gift' });
            play(e.count === 5 ? 'merge5' : 'merge', 0.8);
            haptic.light();
            break;
          case 'produce':
            play('produce', 0.6);
            haptic.select();
            break;
          case 'convert':
            play('merge', 0.7);
            if (e.secret) toast({ kind: 'discover', text: STRINGS[L]['toast.secret'], icon: `item.${e.output}` });
            break;
          case 'discover':
            toast({ kind: 'discover', text: format(STRINGS[L]['toast.discover'], { x: CONTENT[L][`item.${e.item}`] }), icon: `item.${e.item}` });
            break;
          case 'levelUp':
            if (e === lv) {
              play('levelup', 0.8);
              haptic.success();
            }
            break;
          case 'resource':
            if (e.phase === 'start') {
              play('tap', 0.7);
              haptic.medium();
            } else if (e.phase === 'claimed' || e.phase === 'cleared') {
              play(e.phase === 'cleared' ? 'build' : 'produce', 0.7);
              haptic.light();
            } else play('select', 0.5);
            break;
          case 'collect':
            play('coin', 0.7);
            haptic.light();
            toast({ kind: 'reward', text: format(STRINGS[L]['toast.collect'], { n: e.coins, x: CONTENT[L][`item.${e.item}`] }) + (e.crates ? ` · ${format(STRINGS[L]['toast.crates'], { n: e.crates })}` : ''), icon: `item.${e.item}` });
            break;
          case 'node':
            if (e.claimed) {
              play('produce', 0.7);
              haptic.light();
            } else {
              play('select', 0.6);
              haptic.select();
            }
            break;
          case 'achievement': {
            play('token', 0.8);
            toast({ kind: 'achievement', text: `${format(STRINGS[L]['toast.achievement'], { x: CONTENT[L][`ach.${e.id}`] })} · ${L === 'tr' ? ['Bronz', 'Gümüş', 'Altın'][e.stage] : ['Bronze', 'Silver', 'Gold'][e.stage]} · +${e.stars} ${L === 'tr' ? 'yıldız jetonu' : 'star tokens'}`, icon: 'icon.trophy', leaves: e.coins });
            break;
          }
          case 'reward':
            if (e.leaves) play('coin', 0.6);
            if (e.leaves || e.energy) toast({ kind: 'reward', text: '', leaves: e.leaves, energy: e.energy });
            break;
          case 'quest':
            if (!st) play('quest', 0.85);
            haptic.success();
            break;
          case 'structure':
          case 'region':
            break; // shown as a moment
          case 'memory':
            toast({ kind: 'memory', text: STRINGS[L]['toast.memory'], icon: 'item.memory:2' });
            break;
          case 'gift':
            break;
          case 'order':
            haptic.success();
            if (e.crates) toast({ kind: 'reward', text: format(STRINGS[L]['toast.crates'], { n: e.crates }), icon: 'icon.gift' });
            break;
          case 'sell':
            play('coin', 0.5);
            break;
          case 'puzzle':
            play('solve', 0.9);
            haptic.success();
            break;
          case 'denied':
            play('deny', 0.5);
            haptic.warn();
            toast({ kind: 'deny', text: STRINGS[L][DENY_KEYS[e.reason]] });
            break;
        }
      }
    },
    [lang, toast],
  );

  const dispatch = useCallback(
    (cmd: Command) => {
      if (switching.current) return { ok: false, events: [] };
      const at = Date.now();
      // Development refresh can retain an old in-memory object even though persisted saves are
      // migrated during load. Repair before the first command so the new board rules are safe.
      const current = stateRef.current.version < SAVE_VERSION ? (migrate(stateRef.current) ?? repair(stateRef.current)) : stateRef.current;
      const r = apply(current, cmd, at);
      const ok = !r.events.some((e) => e.type === 'denied');
      if (ok && DEV && (testProfileRef.current || (current.devTestLedger?.length ?? 0) > 0) && r.state !== current && r.state.starTokens !== current.starTokens) {
        const delta = r.state.starTokens - current.starTokens;
        r.state.devTestLedger = [...(r.state.devTestLedger ?? []), { at, amount: delta, reason: cmd.type, currency: 'tokens' as const }].slice(-100);
      }
      if (ok && cmd.type !== 'tick' && r.state !== current) {
        if (r.state.leaves > current.leaves) emitReward('gold');
        if (r.state.energy > current.energy) emitReward('energy');
        if (r.state.starTokens > current.starTokens) emitReward('token');
      }
      if (r.state !== stateRef.current) {
        stateRef.current = r.state;
        setState(r.state);
        setNow(at);
        // Rewards, spending and timers are written at once (not debounced), so closing the app
        // right after a claim can never lose or repeat it.
        const urgent = (cmd.type === 'tick' && current.crate.charges !== r.state.crate.charges) || r.events.some((e) => e.type === 'quest' || e.type === 'puzzle' || e.type === 'region' || e.type === 'levelUp' || e.type === 'node' || e.type === 'collect' || e.type === 'order') || cmd.type === 'claimCosmeticCollection' || cmd.type === 'buyPremiumDecor' || cmd.type === 'placePremiumDecor' || cmd.type === 'buyCardPack' || cmd.type === 'unlockCardCosmetic' || cmd.type === 'buyWorkshopSkin' || cmd.type === 'equipWorkshopSkin' || cmd.type === 'buyConvenience' || cmd.type === 'claimSeasonTask' || cmd.type === 'claimSeasonReward' || cmd.type === 'buyTheme' || cmd.type === 'equipTheme' || cmd.type === 'claimAchievement' || cmd.type === 'claimDailyBonus' || cmd.type === 'claimFarmReward' || cmd.type === 'startFarmRecipe' || cmd.type === 'buildNode' || cmd.type === 'unlockWorkshop' || cmd.type === 'breakResource' || cmd.type === 'cancelResource' || cmd.type === 'claimResource' || cmd.type === 'placeResource' || cmd.type === 'buyMarketOffer' || cmd.type === 'claimDailyCrates' || cmd.type === 'openCrate' || cmd.type === 'buyCrates' || cmd.type === 'buyEnergy' || cmd.type === 'hurry' || cmd.type === 'exchangeHurryToken' || cmd.type === 'collectCoin' || cmd.type === 'tap';
        if (cmd.type !== 'tick' || r.events.length || current.crate.charges !== r.state.crate.charges) scheduleSave(r.state, urgent);
      }
      if (r.events.length) {
        // Quiet denials for drags onto locked cells; everything else gets feedback.
        const evs = cmd.type === 'move' ? r.events.filter((e) => !(e.type === 'denied' && (e.reason === 'locked' || e.reason === 'invalid'))) : r.events;
        react(evs);
        for (const fn of listeners.current) fn(r.events);
      }
      return { ok, events: r.events };
    },
    [react, scheduleSave],
  );

  // Clock: refresh regeneration once a second (cheap; does not save unless something changed).
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      if (switching.current) return;
      const at = Date.now();
      setNow(at);
      const current = stateRef.current.version < SAVE_VERSION ? (migrate(stateRef.current) ?? repair(stateRef.current)) : stateRef.current;
      const r = apply(current, { type: 'tick' }, at);
      const s = r.state;
      const prev = stateRef.current;
      if (s.energy !== prev.energy || s.crate.charges !== prev.crate?.charges || s.crate.refills !== prev.crate?.refills || s.crate.refillDay !== prev.crate?.refillDay || s.crate.baseDay !== prev.crate?.baseDay || s.daily.day !== prev.daily.day || s.freeSeason.day !== prev.freeSeason.day || s.freeSeason.week !== prev.freeSeason.week || s.orders.length !== prev.orders.length || s.pending.length !== prev.pending.length || JSON.stringify(s.producers) !== JSON.stringify(prev.producers)) {
        stateRef.current = s;
        setState(s);
        scheduleSave(s, s.crate.charges !== prev.crate?.charges);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [ready, scheduleSave]);

  // Save immediately when the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') {
        if (switching.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        persistNow(stateRef.current);
        stopMusic();
      } else {
        dispatch({ type: 'tick' });
        if (stateRef.current.flags.introDone) startMusic();
      }
    });
    return () => sub.remove();
  }, [dispatch, persistNow]);

  const open = useCallback(<K extends keyof Overlays>(k: K, v: Overlays[K]) => setOverlays((o) => ({ ...o, [k]: v })), []);

  const talk = useCallback(
    (questId: string, part: 'start' | 'end', then?: () => void) => {
      const d = DIALOGUES[questId];
      if (!d) {
        then?.();
        return;
      }
      if (part === 'start') dispatch({ type: 'seeQuest', id: questId });
      const q = QUEST[questId];
      if (q && !stateRef.current.metChars.includes(q.giver)) dispatch({ type: 'meet', char: q.giver });
      play('page', 0.5);
      setOverlays((o) => ({ ...o, dialogue: { lines: d[part], then } }));
    },
    [dispatch],
  );

  const resetAll = useCallback(async () => {
    await storeRef.current.wipe();
    AsyncStorage.removeItem(SCREEN_KEY).catch(() => {});
    // Paid permanent items (second worker, store transaction ids) survive a progress reset.
    const fresh = resetKeepingPurchases(stateRef.current, Date.now(), (Math.random() * 2 ** 31) | 0, tzOffset());
    stateRef.current = fresh;
    setState(fresh);
    setScreen('board');
    setOverlays(NO_OVERLAYS);
    setMoments([]);
    persistNow(fresh);
    stopMusic();
  }, [persistNow]);

  const switchTestProfile = useCallback(async (enabled: boolean) => {
    if (!DEV || switching.current || enabled === testProfileRef.current) return;
    switching.current = true;
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const snapshot = stateRef.current;
      await storeRef.current.save(snapshot, Date.now());
      const nextStore = enabled ? TEST_STORE : NORMAL_STORE;
      const saved = await nextStore.load();
      const next = saved ?? (JSON.parse(JSON.stringify(snapshot)) as GameState);
      if (!saved && enabled) next.devTestLedger = [];
      await nextStore.save(next, Date.now());
      await AsyncStorage.setItem(TEST_PROFILE_KEY, enabled ? 'test' : 'normal');
      storeRef.current = nextStore; testProfileRef.current = enabled; setTestProfile(enabled);
      stateRef.current = next; setState(next); setMoments([]); setToasts([]);
    } finally { switching.current = false; }
  }, []);
  const devGrant = useCallback(async (grant: DevGrant): Promise<boolean> => {
    if (!DEV || switching.current) return false;
    switching.current = true;
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const at = Date.now(), previous = stateRef.current;
      const next = applyDevGrant(previous, grant, at, DEV);
      if (!next) return false;
      await ensureDevBackup(AsyncStorage, previous, testProfileRef.current, at);
      await storeRef.current.save(next, at);
      stateRef.current = next; setState(next); setSavedAt(at);
      return true;
    } finally { switching.current = false; }
  }, []);
  const restoreDevSave = useCallback(async (): Promise<boolean> => {
    if (!DEV || switching.current) return false;
    switching.current = true;
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const restored = await restoreDevBackup(AsyncStorage, storeRef.current, testProfileRef.current, Date.now());
      if (!restored) return false;
      stateRef.current = restored; setState(restored); setMoments([]); setToasts([]);
      return true;
    } finally { switching.current = false; }
  }, []);
  const addTestTokens = useCallback((amount: number) => { void devGrant({ currency: 'tokens', amount }); }, [devGrant]);

  const subscribe = useCallback((fn: (e: GameEvent[]) => void) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  const reduceMotion = state.settings.reduceMotion || osReduce;
  const api = useMemo<Api>(
    () => ({ ready, state, now, lang, t, c, dispatch, screen, setScreen, overlays, open, toasts, toast, dismissToast, moments, dismissMoment, reduceMotion, subscribe, talk, savedAt, resetAll, testProfile, switchTestProfile, addTestTokens, devGrant, restoreDevSave }),
    [ready, state, now, lang, t, c, dispatch, screen, overlays, open, toasts, toast, dismissToast, moments, dismissMoment, reduceMotion, subscribe, talk, savedAt, resetAll, testProfile, switchTestProfile, addTestTokens, devGrant, restoreDevSave],
  );
  if (loadError) return <View style={{ flex: 1, padding: 24, justifyContent: 'center' }}><Text>{loadError}</Text></View>;
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useGame(): Api {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGame outside GameProvider');
  return v;
}
