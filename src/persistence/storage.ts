// Double-slot persistence on top of a key-value store (AsyncStorage in the app, a Map in tests).
import type { GameState } from '../engine/types';
import { encode, pickSlot } from './save';

export interface KeyValue {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const SLOT_A = 'luma.save.a';
const SLOT_B = 'luma.save.b';

export class SaveStore {
  private seq = 0;
  private writing: Promise<void> = Promise.resolve();
  private queued: { state: GameState; now: number } | null = null;

  private kv: KeyValue;

  constructor(kv: KeyValue) {
    this.kv = kv;
  }

  async load(): Promise<GameState | null> {
    const [a, b] = await Promise.all([this.kv.getItem(SLOT_A).catch(() => null), this.kv.getItem(SLOT_B).catch(() => null)]);
    const picked = pickSlot(a, b);
    if (!picked) return null;
    this.seq = picked.seq;
    return picked.state;
  }

  /** Writes are serialised; while one is in flight only the newest pending state is kept. */
  save(state: GameState, now: number): Promise<void> {
    this.queued = { state, now };
    this.writing = this.writing.then(() => this.flush()).catch(() => {});
    return this.writing;
  }

  private async flush(): Promise<void> {
    const job = this.queued;
    if (!job) return;
    this.queued = null;
    this.seq += 1;
    const key = this.seq % 2 === 0 ? SLOT_A : SLOT_B;
    await this.kv.setItem(key, encode(job.state, this.seq, job.now));
  }

  async wipe(): Promise<void> {
    this.queued = null;
    await this.writing.catch(() => {});
    await Promise.all([this.kv.removeItem(SLOT_A), this.kv.removeItem(SLOT_B)]);
    this.seq = 0;
  }
}
