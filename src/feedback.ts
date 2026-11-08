// Sound, music and haptics. Every sound is synthesised by scripts/gen-sfx.mjs (no third-party
// audio). Feedback is decoration: failures are swallowed so they can never break play.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SOURCES = {
  tap: require('../assets/sfx/tap.wav'),
  select: require('../assets/sfx/select.wav'),
  merge: require('../assets/sfx/merge.wav'),
  merge5: require('../assets/sfx/merge5.wav'),
  produce: require('../assets/sfx/produce.wav'),
  deny: require('../assets/sfx/deny.wav'),
  quest: require('../assets/sfx/quest.wav'),
  build: require('../assets/sfx/build.wav'),
  coin: require('../assets/sfx/coin.wav'),
  token: require('../assets/sfx/token.wav'),
  solve: require('../assets/sfx/solve.wav'),
  rotate: require('../assets/sfx/rotate.wav'),
  unlock: require('../assets/sfx/unlock.wav'),
  levelup: require('../assets/sfx/levelup.wav'),
  page: require('../assets/sfx/page.wav'),
  music: require('../assets/sfx/music.wav'),
} as const;

export type Sfx = Exclude<keyof typeof SOURCES, 'music'>;

const players: Partial<Record<keyof typeof SOURCES, AudioPlayer>> = {};
let sfxOn = true;
let musicOn = true;
let hapticsOn = true;
let modeSet = false;

function player(name: keyof typeof SOURCES): AudioPlayer | null {
  try {
    if (!players[name]) players[name] = createAudioPlayer(SOURCES[name]);
    return players[name] ?? null;
  } catch {
    return null;
  }
}

export function configureFeedback(opts: { sfx: boolean; music: boolean; haptics: boolean }) {
  sfxOn = opts.sfx;
  hapticsOn = opts.haptics;
  const wasMusic = musicOn;
  musicOn = opts.music;
  if (!modeSet) {
    modeSet = true;
    // Respect the iPhone silent switch and mix with other apps' audio.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }
  if (!musicOn) stopMusic();
  else if (!wasMusic) startMusic();
}

export function play(name: Sfx, volume = 0.8) {
  if (!sfxOn) return;
  const p = player(name);
  if (!p) return;
  try {
    p.volume = volume;
    p.seekTo(0);
    p.play();
  } catch {}
}

export function startMusic() {
  if (!musicOn) return;
  const p = player('music');
  if (!p) return;
  try {
    p.loop = true;
    p.volume = 0.32;
    if (!p.playing) p.play();
  } catch {}
}

export function stopMusic() {
  try {
    players.music?.pause();
  } catch {}
}

const native = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  light() {
    if (hapticsOn && native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  medium() {
    if (hapticsOn && native) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  select() {
    if (hapticsOn && native) Haptics.selectionAsync().catch(() => {});
  },
  success() {
    if (hapticsOn && native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  warn() {
    if (hapticsOn && native) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
