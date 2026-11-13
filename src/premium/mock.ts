/** Isolated, offline-only simulator. This state is never part of the player's real save. */
import { MOCK_PRODUCTS, SEASON_DAYS, SEASON_ID, SEASON_LEVELS, THEMES, type MockProductId, type ThemeId } from './catalog';

export interface DemoStats { merges: number; orders: number; produced: number }
export interface DemoReceipt { id: string; product: MockProductId; kind: 'consumable' | 'permanent' | 'season' }
export interface DemoState {
  version: 1; tokens: number; coins: number; energy: number; slots: number;
  receipts: DemoReceipt[]; owned: string[]; theme: ThemeId;
  season: { id: string; start: number; highTime: number; baseline: DemoStats; claimed: string[]; premium: boolean; manualLevel: number };
}
export type DemoOutcome = 'success' | 'cancelled' | 'failed' | 'offline';
export type DemoResult = { ok: true; state: DemoState } | { ok: false; state: DemoState; reason: string };
const copy = (s: DemoState): DemoState => JSON.parse(JSON.stringify(s));
const reject = (state: DemoState, reason: string): DemoResult => ({ ok: false, state, reason });
export function newDemo(now: number, baseline: DemoStats): DemoState {
  return { version: 1, tokens: 0, coins: 0, energy: 100, slots: 4, receipts: [], owned: ['classic'], theme: 'classic', season: { id: SEASON_ID, start: now, highTime: now, baseline: { ...baseline }, claimed: [], premium: false, manualLevel: 0 } };
}
export function seasonLevel(s: DemoState, stats: DemoStats): number {
  const delta = (k: keyof DemoStats) => Math.max(0, stats[k] - s.season.baseline[k]);
  const xp = delta('merges') * 10 + delta('orders') * 40 + delta('produced') * 3;
  return Math.min(SEASON_LEVELS, Math.max(s.season.manualLevel, Math.floor(xp / 100)));
}
export function remainingSeason(s: DemoState, now: number): number {
  return Math.max(0, s.season.start + SEASON_DAYS * 86400000 - Math.max(now, s.season.highTime));
}
export interface PurchaseProvider {
  readonly mode: 'mock' | 'unconfigured';
  purchase(state: DemoState, id: MockProductId, transactionId: string, outcome: DemoOutcome): DemoResult;
  restore(state: DemoState): DemoResult;
}
/** Constructor is guarded by the actual build flag supplied by the application. */
export class MockPurchaseProvider implements PurchaseProvider {
  readonly mode = 'mock' as const;
  private readonly development: boolean;
  constructor(development: boolean) { this.development = development; }
  purchase(state: DemoState, id: MockProductId, transactionId: string, outcome: DemoOutcome): DemoResult {
    if (!this.development) return reject(state, 'Test satın alımı üretimde kullanılamaz.');
    if (outcome !== 'success') return reject(state, outcome === 'cancelled' ? 'Satın alma iptal edildi.' : outcome === 'offline' ? 'Bağlantı yok.' : 'Test ödemesi başarısız.');
    const product = MOCK_PRODUCTS.find(p => p.id === id);
    if (!product || !transactionId.trim()) return reject(state, 'Geçersiz işlem.');
    if (state.receipts.some(r => r.id === transactionId)) return reject(state, 'Bu işlem daha önce işlendi.');
    if (product.kind !== 'consumable' && state.owned.includes(id)) return reject(state, 'Bu ürün zaten sahip olundu.');
    const s = copy(state);
    s.receipts.push({ id: transactionId, product: id, kind: product.kind });
    if (product.kind !== 'consumable') s.owned.push(id);
    if (product.tokens) s.tokens += product.tokens;
    if (id === 'starter') { s.tokens += 150; s.energy += 100; s.coins += 500; s.owned.push('starter-decoration'); }
    if (id === 'pass.moon') s.season.premium = true;
    return { ok: true, state: s };
  }
  restore(state: DemoState): DemoResult {
    if (!this.development) return reject(state, 'Geri yükleme kullanılamıyor.');
    const s = copy(state);
    for (const receipt of s.receipts) if (receipt.kind !== 'consumable') {
      if (!s.owned.includes(receipt.product)) s.owned.push(receipt.product);
      if (receipt.product === 'pass.moon') s.season.premium = true;
      if (receipt.product === 'starter' && !s.owned.includes('starter-decoration')) s.owned.push('starter-decoration');
    }
    return { ok: true, state: s };
  }
}
/** No StoreKit implementation is configured. Never grants unverified entitlements. */
export class StoreKitPurchaseProvider implements PurchaseProvider {
  readonly mode = 'unconfigured' as const;
  purchase(state: DemoState): DemoResult { return reject(state, 'Gerçek satın alma henüz kurulmadı.'); }
  restore(state: DemoState): DemoResult { return reject(state, 'Gerçek satın alma henüz kurulmadı.'); }
}
export function buyDemoTheme(state: DemoState, id: ThemeId, development: boolean): DemoResult {
  if (!development) return reject(state, 'Test modu kapalı.');
  const theme = THEMES.find(t => t.id === id);
  if (!theme) return reject(state, 'Tema bulunamadı.');
  if (state.owned.includes(id)) return reject(state, 'Bu tema zaten sahip olundu.');
  if (state.tokens < theme.cost) return reject(state, 'Test jetonu yetersiz.');
  const s = copy(state); s.tokens -= theme.cost; s.owned.push(id);
  return { ok: true, state: s };
}
export function equipDemoTheme(state: DemoState, id: ThemeId, development: boolean): DemoResult {
  if (!development || !state.owned.includes(id) || !THEMES.some(t => t.id === id)) return reject(state, 'Tema kullanılamıyor.');
  const s = copy(state); s.theme = id; return { ok: true, state: s };
}
export function claimDemoReward(state: DemoState, track: 'free' | 'premium', level: number, stats: DemoStats, now: number, development: boolean): DemoResult {
  if (!development || !Number.isInteger(level) || level < 1 || level > SEASON_LEVELS || level > seasonLevel(state, stats)) return reject(state, 'Ödül henüz açılmadı.');
  if (remainingSeason(state, now) <= 0) return reject(state, 'Test sezonu sona erdi.');
  if (track === 'premium' && !state.season.premium) return reject(state, 'Premium bilet gerekli.');
  const key = `${SEASON_ID}:${track}:${level}`;
  if (state.season.claimed.includes(key)) return reject(state, 'Ödül zaten alındı.');
  const s = copy(state); s.season.highTime = Math.max(s.season.highTime, now); s.season.claimed.push(key);
  if (track === 'free') { if (level % 3 === 0) s.tokens += 5; else if (level % 3 === 1) s.coins += 100; else s.energy += 15; }
  else { if (level % 3 === 0) s.tokens += 15; else s.owned.push(`season-cosmetic-${level}`); }
  return { ok: true, state: s };
}
