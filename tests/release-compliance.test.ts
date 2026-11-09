// Release-compliance guards: things a store review or a privacy claim depends on. If one of these
// fails, update release-compliance/ together with the code (see 20-final-compliance-report.md).
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { OSS_PACKAGES } from '../src/content/licenses.generated';
import { resetKeepingPurchases } from '../src/engine/state';
import { decode, encode } from '../src/persistence/save';
import { PRODUCTS, UnconfiguredStore } from '../src/services/purchases';
import { blank, run, T0 } from './helpers';

const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;

test('a progress reset keeps what was bought with real money', () => {
  let s = blank();
  s = run(s, { type: 'grantWorkerPurchase', transactionId: 'tx-worker-1' }).s;
  s = run(s, { type: 'grantPurchase', transactionId: 'tx-coins-1', coins: 1800 }).s;
  s.level = 12;
  const reset = resetKeepingPurchases(s, T0, 99, 0);
  assert.equal(reset.workerCapacity, 2);
  assert.deepEqual([...reset.purchases].sort(), ['tx-coins-1', 'tx-worker-1']);
  assert.equal(reset.level, 1);
  // A restore after the reset cannot grant the same transactions again.
  assert.equal(run(reset, { type: 'grantPurchase', transactionId: 'tx-coins-1', coins: 1800 }).s, reset);
  assert.equal(run(reset, { type: 'grantWorkerPurchase', transactionId: 'tx-worker-1' }).s, reset);
  // And it survives a save round trip.
  const loaded = decode(encode(reset, 1, T0))!.state;
  assert.equal(loaded.workerCapacity, 2);
});

test('restoring the second worker is idempotent; a second worker is never stacked', () => {
  let s = blank();
  s = run(s, { type: 'grantWorkerPurchase', transactionId: 'tx-a' }).s;
  assert.equal(s.workerCapacity, 2);
  assert.equal(run(s, { type: 'grantWorkerPurchase', transactionId: 'tx-a' }).s, s);
  assert.equal(run(s, { type: 'grantWorkerPurchase', transactionId: 'tx-b' }).s, s);
});

test('without a configured store nothing is ever reported as bought or restored', async () => {
  const store = new UnconfiguredStore();
  assert.equal(store.configured, false);
  for (const p of PRODUCTS) assert.notEqual((await store.purchase(p.id, true)).status, 'verified');
  assert.equal((await store.restore(true)).status, 'unavailable');
  assert.equal(await store.workerPrice(), null);
  for (const p of await store.products()) assert.equal(p.price, null);
});

test('no unused sensitive permission or background mode is declared', () => {
  const audio = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-audio');
  assert.ok(audio, 'expo-audio is configured explicitly');
  assert.equal(audio[1].microphonePermission, false);
  assert.equal(audio[1].recordAudioAndroid, false);
  assert.equal(audio[1].enableBackgroundPlayback, false);
  for (const p of ['android.permission.RECORD_AUDIO', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE']) {
    assert.ok(app.android.blockedPermissions.includes(p), `${p} is blocked`);
  }
  assert.equal(app.ios.infoPlist.ITSAppUsesNonExemptEncryption, false);
});

test('the iOS privacy manifest declares no tracking, no collected data and real reasons only', () => {
  const m = app.ios.privacyManifests;
  assert.equal(m.NSPrivacyTracking, false);
  assert.deepEqual(m.NSPrivacyTrackingDomains, []);
  assert.deepEqual(m.NSPrivacyCollectedDataTypes, []);
  const reasons = Object.fromEntries(m.NSPrivacyAccessedAPITypes.map((x: { NSPrivacyAccessedAPIType: string; NSPrivacyAccessedAPITypeReasons: string[] }) => [x.NSPrivacyAccessedAPIType, x.NSPrivacyAccessedAPITypeReasons]));
  // The three APIs React Native core uses, with the reasons its own manifest gives.
  assert.deepEqual(reasons, {
    NSPrivacyAccessedAPICategoryFileTimestamp: ['C617.1'],
    NSPrivacyAccessedAPICategoryUserDefaults: ['CA92.1'],
    NSPrivacyAccessedAPICategorySystemBootTime: ['35F9.1'],
  });
});

test('the game code makes no network requests (the privacy policy says so)', () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(f) && !/\.generated\.ts$/.test(f)) files.push(p);
    }
  };
  walk('src');
  const offenders = files.filter((f) => /\bfetch\(|XMLHttpRequest|WebSocket\(|EventSource\(|navigator\.sendBeacon/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
});

test('the in-app open-source notices list every runtime package with a license', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const names = new Set(OSS_PACKAGES.map((p) => p.name));
  for (const dep of Object.keys(pkg.dependencies)) assert.ok(names.has(dep), `${dep} missing from licenses.generated.ts (run node scripts/compliance/licenses.mjs)`);
  for (const p of OSS_PACKAGES) assert.ok(p.license && p.license !== 'UNKNOWN', `${p.name} has no license`);
});
