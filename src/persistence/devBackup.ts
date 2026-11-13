import type { GameState } from '../engine/types';
import { decode, encode } from './save';
import { SaveStore, type KeyValue } from './storage';

const prefix = (testProfile: boolean) => testProfile ? 'luma.dev.backup.test' : 'luma.dev.backup.normal';
/** Write and verify a snapshot before recording that the save has test-derived state. */
export async function ensureDevBackup(kv: KeyValue, state: GameState, testProfile: boolean, now: number): Promise<void> {
  const key = prefix(testProfile);
  if (await kv.getItem(`${key}.active`)) {
    if (!decode(await kv.getItem(`${key}.snapshot`))) throw new Error('Test öncesi yedek doğrulanamadı.');
    return;
  }
  const raw = encode(state, 1, now);
  await kv.setItem(`${key}.snapshot`, raw);
  const saved = await kv.getItem(`${key}.snapshot`);
  if (saved !== raw || !decode(saved)) throw new Error('Test öncesi yedek doğrulanamadı.');
  await kv.setItem(`${key}.active`, '1');
}
/** Restore before removing the guard. Failure leaves the original backup and marker intact. */
export async function restoreDevBackup(kv: KeyValue, store: SaveStore, testProfile: boolean, now: number): Promise<GameState | null> {
  const key = prefix(testProfile);
  if (!await kv.getItem(`${key}.active`)) return null;
  const backup = decode(await kv.getItem(`${key}.snapshot`));
  if (!backup) throw new Error('Test öncesi yedek bozuk; mevcut kayıt değiştirilmedi.');
  // Load the current sequence first so the restored snapshot wins over both existing slots.
  const current = await store.load();
  if (current) {
    // Keep a recoverable copy of test-era progress even when production restores the clean save.
    const archive = `${key}.archive.${now}`;
    const raw = encode(current, 1, now);
    await kv.setItem(archive, raw);
    if (await kv.getItem(archive) !== raw || !decode(raw)) throw new Error('Mevcut kayıt arşivlenemedi.');
  }
  await store.save(backup.state, now);
  const check = await store.load();
  if (!check || JSON.stringify(check) !== JSON.stringify(backup.state)) throw new Error('Yedek geri yüklemesi doğrulanamadı.');
  await kv.removeItem(`${key}.active`);
  return check;
}
