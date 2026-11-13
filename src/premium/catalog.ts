/** Product prices below are examples for the isolated development simulator only. */
export type MockProductId = 'light.120' | 'light.300' | 'light.750' | 'light.1650' | 'light.3500' | 'pass.moon' | 'starter' | 'worker';
export interface MockProduct { id: MockProductId; name: string; price: string; kind: 'consumable' | 'permanent' | 'season'; tokens?: number }
export const MOCK_PRODUCTS: readonly MockProduct[] = [
  { id: 'light.120', name: 'Bir Avuç Işık', price: '₺24,99', kind: 'consumable', tokens: 120 },
  { id: 'light.300', name: 'Parlayan Kese', price: '₺49,99', kind: 'consumable', tokens: 300 },
  { id: 'light.750', name: 'Işık Sandığı', price: '₺99,99', kind: 'consumable', tokens: 750 },
  { id: 'light.1650', name: 'Büyük Hazine', price: '₺189,99', kind: 'consumable', tokens: 1650 },
  { id: 'light.3500', name: 'Efsanevi Hazine', price: '₺349,99', kind: 'consumable', tokens: 3500 },
  { id: 'pass.moon', name: 'Vadi Yolculuğu', price: '₺79,99', kind: 'season' },
  { id: 'starter', name: 'Yeni Maceracı Paketi', price: '₺19,99', kind: 'permanent' },
  { id: 'worker', name: 'Ek İşçi', price: '₺49,99', kind: 'permanent' },
];
export type ThemeId = 'classic' | 'sakura' | 'winter' | 'moonlight' | 'autumn';
export const THEMES: readonly { id: ThemeId; name: string; cost: number; detail: string; tint: string }[] = [
  { id: 'classic', name: 'Klasik Vadi', cost: 0, detail: 'Yeşil çayırlar ve sıcak ışık', tint: '#DCEBD6' },
  { id: 'sakura', name: 'Sakura Vadisi', cost: 450, detail: 'Kiraz çiçekleri ve pastel pembe', tint: '#F7DCE6' },
  { id: 'winter', name: 'Kış Masalı', cost: 550, detail: 'Kar ve buz mavisi', tint: '#D7EDF2' },
  { id: 'moonlight', name: 'Ay Işığı Vadisi', cost: 400, detail: 'Gece ışıkları ve mor gökyüzü', tint: '#E6DDF2' },
  { id: 'autumn', name: 'Altın Sonbahar', cost: 350, detail: 'Sıcak yapraklar ve altın ışık', tint: '#F5E3C4' },
];
export const SEASON_ID = 'moonlight-festival-01';
export const SEASON_DAYS = 30;
export const SEASON_LEVELS = 30;

export type ConvenienceId = 'energy30' | 'energy100' | 'slots5' | 'slots10' | 'speed15' | 'speed30';
export const CONVENIENCE: readonly { id: ConvenienceId; name: string; cost: number; energy?: number; slots?: number; speedMs?: number }[] = [
  { id: 'energy30', name: '+30 Enerji', cost: 20, energy: 30 },
  { id: 'energy100', name: '+100 Enerji', cost: 55, energy: 100 },
  { id: 'speed15', name: '15 dakika hızlandır', cost: 35, speedMs: 15 * 60000 },
  { id: 'speed30', name: '30 dakika hızlandır', cost: 60, speedMs: 30 * 60000 },
  { id: 'slots5', name: '+5 Envanter Alanı', cost: 100, slots: 5 },
  { id: 'slots10', name: '+10 Envanter Alanı', cost: 180, slots: 10 },
];
export const PREMIUM_INVENTORY_LIMIT = 100;

export type WorkshopSkinId = 'classic' | 'forest' | 'crystal' | 'sakura' | 'moonlight';
export const WORKSHOP_SKINS: readonly { id: WorkshopSkinId; name: string; cost: number; frame: string; bed: string; tile: string; tileAlt: string; edge: string; locked: string }[] = [
  { id: 'classic', name: 'Klasik Atölye', cost: 0, frame: '#5F8060', bed: '#A4BA98', tile: '#F7F3E0', tileAlt: '#EEF1DC', edge: '#A9BE9A', locked: '#B0C3A4' },
  { id: 'forest', name: 'Orman Atölyesi', cost: 300, frame: '#35654A', bed: '#648E68', tile: '#E2F1D4', tileAlt: '#D4E8C8', edge: '#81A879', locked: '#83A681' },
  { id: 'crystal', name: 'Kristal Atölye', cost: 450, frame: '#47879D', bed: '#7AAAB7', tile: '#E3F9F8', tileAlt: '#D4EFF1', edge: '#89C4CE', locked: '#8CB8C1' },
  { id: 'sakura', name: 'Sakura Atölyesi', cost: 400, frame: '#A86482', bed: '#D4A4B5', tile: '#FCECF0', tileAlt: '#F8E1EA', edge: '#E4AFC2', locked: '#D0A9B9' },
  { id: 'moonlight', name: 'Ay Işığı Atölyesi', cost: 500, frame: '#575178', bed: '#8A82AD', tile: '#EEEAF9', tileAlt: '#E3DEF2', edge: '#AFA3CF', locked: '#A09AB9' },
];
