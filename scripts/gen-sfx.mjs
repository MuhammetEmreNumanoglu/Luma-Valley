// Synthesises every sound and the music loop as small mono WAV files, so the game ships no
// third-party audio. Deterministic: re-running produces identical files.
// Run: node scripts/gen-sfx.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RATE = 22050;
const OUT = join(process.cwd(), 'assets', 'sfx');
mkdirSync(OUT, { recursive: true });

let seed = 1234567;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x3fffffff - 1;
};

const buf = (seconds) => new Float32Array(Math.floor(seconds * RATE));
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

/** Soft bell / marimba / piano-ish voice: a few decaying harmonics. */
function voice(out, start, freq, dur, amp, kind = 'marimba') {
  const harm =
    kind === 'marimba' ? [[1, 1], [4, 0.25], [10, 0.05]] : kind === 'bell' ? [[1, 1], [2.76, 0.4], [5.4, 0.2]] : kind === 'piano' ? [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1]] : [[1, 1], [2, 0.2]];
  const decay = kind === 'marimba' ? 7 : kind === 'bell' ? 3 : kind === 'piano' ? 2.4 : 1.2;
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const attack = Math.min(1, t / 0.006);
    let v = 0;
    for (const [h, a] of harm) v += Math.sin(2 * Math.PI * freq * h * t) * a * Math.exp(-t * decay * (1 + h * 0.15));
    out[s0 + i] += v * amp * attack;
  }
}

function pad(out, start, freqs, dur, amp) {
  const s0 = Math.floor(start * RATE);
  const n = Math.floor(dur * RATE);
  for (let i = 0; i < n && s0 + i < out.length; i++) {
    const t = i / RATE;
    const env = Math.sin(Math.PI * Math.min(1, t / dur)) ** 1.5;
    let v = 0;
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t + Math.sin(t * 0.7) * 0.3) + 0.3 * Math.sin(2 * Math.PI * f * 2.003 * t);
    out[s0 + i] += (v / freqs.length) * amp * env;
  }
}

function lowpass(b, k) {
  let y = 0;
  for (let i = 0; i < b.length; i++) {
    y += k * (b[i] - y);
    b[i] = y;
  }
  return b;
}

function normalize(b, peak = 0.85) {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  const g = m > 0 ? peak / m : 1;
  for (let i = 0; i < b.length; i++) b[i] *= g;
  return b;
}

function fadeEdges(b, ms = 8) {
  const n = Math.floor((ms / 1000) * RATE);
  for (let i = 0; i < n && i < b.length; i++) {
    b[i] *= i / n;
    b[b.length - 1 - i] *= i / n;
  }
  return b;
}

function write(name, b) {
  const data = Buffer.alloc(b.length * 2);
  for (let i = 0; i < b.length; i++) data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i])) * 32767), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, data]));
  console.log(`${name}.wav ${(data.length / 1024).toFixed(1)} KB`);
}

// ---- effects ----
{
  const b = buf(0.08);
  voice(b, 0, midi(84), 0.08, 0.5, 'marimba');
  write('tap', normalize(fadeEdges(b), 0.5));
}
{
  const b = buf(0.12);
  voice(b, 0, midi(79), 0.12, 0.6, 'marimba');
  write('select', normalize(fadeEdges(b), 0.55));
}
{
  const b = buf(0.45);
  [72, 76, 79].forEach((n, i) => voice(b, i * 0.045, midi(n), 0.4, 0.5, 'marimba'));
  voice(b, 0.14, midi(84), 0.3, 0.35, 'bell');
  write('merge', normalize(fadeEdges(b), 0.8));
}
{
  const b = buf(0.7);
  [72, 76, 79, 84, 88].forEach((n, i) => voice(b, i * 0.05, midi(n), 0.5, 0.45, 'marimba'));
  voice(b, 0.26, midi(91), 0.45, 0.35, 'bell');
  for (let i = 0; i < b.length; i++) b[i] += noise() * 0.02 * Math.exp(-i / RATE / 0.1);
  write('merge5', normalize(fadeEdges(b), 0.85));
}
{
  const b = buf(0.22);
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    b[i] = Math.sin(2 * Math.PI * (500 + 900 * t) * t) * Math.exp(-t * 14) * 0.6 + noise() * 0.05 * Math.exp(-t * 30);
  }
  write('produce', normalize(fadeEdges(lowpass(b, 0.5)), 0.6));
}
{
  const b = buf(0.22);
  voice(b, 0, midi(60), 0.2, 0.6, 'soft');
  voice(b, 0.07, midi(57), 0.15, 0.5, 'soft');
  write('deny', normalize(fadeEdges(lowpass(b, 0.3)), 0.45));
}
{
  const b = buf(1.1);
  [67, 72, 76, 79, 84].forEach((n, i) => voice(b, i * 0.09, midi(n), 0.9, 0.45, 'bell'));
  pad(b, 0, [midi(60), midi(64), midi(67)], 1.1, 0.25);
  write('quest', normalize(fadeEdges(b), 0.85));
}
{
  const b = buf(1.8);
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < RATE * 0.08; i++) {
      const s = Math.floor(k * 0.16 * RATE) + i;
      if (s < b.length) b[s] += noise() * 0.5 * Math.exp(-i / RATE / 0.02);
    }
  }
  [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => voice(b, 0.6 + i * 0.07, midi(n), 1.1, 0.4, 'bell'));
  pad(b, 0.55, [midi(48), midi(55), midi(64)], 1.2, 0.35);
  write('build', normalize(fadeEdges(lowpass(b, 0.6)), 0.9));
}
{
  const b = buf(0.3);
  voice(b, 0, midi(88), 0.25, 0.5, 'bell');
  voice(b, 0.06, midi(93), 0.25, 0.45, 'bell');
  write('coin', normalize(fadeEdges(b), 0.6));
}
{
  const b = buf(0.6);
  [84, 88, 91, 96].forEach((n, i) => voice(b, i * 0.06, midi(n), 0.5, 0.4, 'bell'));
  write('token', normalize(fadeEdges(b), 0.7));
}
{
  const b = buf(1.4);
  [72, 74, 76, 79, 81, 84].forEach((n, i) => voice(b, i * 0.08, midi(n), 1, 0.4, 'marimba'));
  pad(b, 0.3, [midi(60), midi(67), midi(76)], 1.1, 0.3);
  voice(b, 0.5, midi(96), 0.8, 0.25, 'bell');
  write('solve', normalize(fadeEdges(b), 0.85));
}
{
  const b = buf(0.1);
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    b[i] = (noise() * 0.6 + Math.sin(2 * Math.PI * 180 * t) * 0.4) * Math.exp(-t * 45);
  }
  write('rotate', normalize(fadeEdges(lowpass(b, 0.35)), 0.5));
}
{
  const b = buf(2.2);
  pad(b, 0, [midi(55), midi(62), midi(67), midi(71)], 2.2, 0.4);
  [67, 71, 74, 79, 83, 86].forEach((n, i) => voice(b, 0.2 + i * 0.12, midi(n), 1.4, 0.35, 'bell'));
  write('unlock', normalize(fadeEdges(b), 0.85));
}
{
  const b = buf(1.2);
  [72, 76, 79, 84].forEach((n, i) => voice(b, i * 0.1, midi(n), 0.8, 0.45, 'piano'));
  [84, 88, 91].forEach((n) => voice(b, 0.45, midi(n), 0.7, 0.25, 'bell'));
  write('levelup', normalize(fadeEdges(b), 0.85));
}
{
  const b = buf(0.18);
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    b[i] = noise() * Math.sin(Math.PI * Math.min(1, t / 0.18)) * 0.5;
  }
  write('page', normalize(fadeEdges(lowpass(lowpass(b, 0.25), 0.25)), 0.35));
}

// ---- music: a calm 32-bar loop (piano + marimba + pad), I–vi–IV–V in C, 84 bpm ----
{
  const bpm = 84;
  const beat = 60 / bpm;
  const bars = 16;
  const len = bars * 4 * beat;
  const b = buf(len);
  const chords = [
    [48, 52, 55, 60],
    [45, 52, 57, 60],
    [41, 48, 53, 57],
    [43, 50, 55, 59],
  ];
  const melody = [76, 79, 81, 79, 76, 74, 72, 74, 76, 74, 72, 69, 72, 74, 76, 79, 81, 79, 76, 74, 72, 72, 74, 76, 79, 76, 74, 72, 69, 72, 74, 72];
  for (let bar = 0; bar < bars; bar++) {
    const ch = chords[bar % 4];
    const t0 = bar * 4 * beat;
    pad(b, t0, ch.map(midi), 4 * beat + 0.4, 0.18);
    voice(b, t0, midi(ch[0] - 12), 2.5, 0.3, 'piano');
    for (let k = 0; k < 8; k++) {
      const n = ch[(k * 2 + bar) % ch.length] + 12;
      if (k % 2 === 0 || bar % 2 === 1) voice(b, t0 + k * beat * 0.5, midi(n), 0.6, 0.12, 'marimba');
    }
    if (bar >= 4) {
      const m1 = melody[(bar * 2) % melody.length];
      const m2 = melody[(bar * 2 + 1) % melody.length];
      voice(b, t0, midi(m1), beat * 2, 0.22, 'piano');
      voice(b, t0 + beat * 2, midi(m2), beat * 2, 0.2, 'piano');
    }
  }
  // Seamless loop: crossfade the tail into the head.
  const xf = Math.floor(0.4 * RATE);
  for (let i = 0; i < xf; i++) {
    const k = i / xf;
    b[i] = b[i] * k + b[b.length - xf + i] * (1 - k);
  }
  const loop = b.slice(0, b.length - xf);
  write('music', normalize(lowpass(loop, 0.55), 0.7));
}
