// UI icons (21) and fixes for weak items, rendered from original procedural models + Kenney kits.
import { writeFileSync } from 'node:fs';
const c = (custom, o = {}) => ({ custom, ...o });
const k = (kit, model, o = {}) => ({ kit, model, ...o });
const ICON = {
  bag: [c('satchel')], board: [c('boardtray')], calendar: [c('calendar')], check: [c('check')], energy: [c('bolt')],
  gift: [k('Holiday Kit', 'present-a-cube', { warm: false })], hint: [c('bulb')], journal: [c('book', { c: 0x8c6bb1 })], leaf: [c('leaf')],
  lock: [k('Platformer Kit', 'lock')], map: [c('mapscroll')], puzzle: [c('puzzletile')], quests: [c('scroll')],
  reset: [c('arrowCircle', { c: 0xf2b544 })], settings: [c('gear')], shop: [k('Fantasy Town Kit', 'stall-red')], star: [k('Platformer Kit', 'star', { tint: '#F6C443', tintK: 0.5 })],
  token: [c('coin')], trophy: [c('trophy')], undo: [c('arrowCircle', { c: 0x7fa7c9, flip: true })], upgrade: [c('upArrow')],
};
const out = {};
for (const [id, items] of Object.entries(ICON)) out[`icon_${id}`] = { size: 160, pad: 0.04, shadow: false, yaw: 22, pitch: 14, warm: false, exposure: 1.3, items };
// weak items
out.item_lantern_2 = { size: 256, pad: 0.07, shadowOpacity: 0.24, glow: '#FFE6A0', glowA: 0.3, items: [c('tealight')] };
out.item_lantern_3 = { size: 256, pad: 0.07, shadowOpacity: 0.24, glow: '#FFE6A0', glowA: 0.34, items: [c('candle')] };
out.item_shell_1 = { size: 256, pad: 0.07, shadowOpacity: 0.24, items: [c('scallop')] };
out.item_shell_2 = { size: 256, pad: 0.07, shadowOpacity: 0.24, items: [c('snail')] };
out.item_shell_4 = { size: 256, pad: 0.07, shadowOpacity: 0.24, items: [k('Food Kit', 'mussel-open', { fit: 1, tint: '#DCE0E8', tintK: 0.9 })] };
out.item_shell_5 = { size: 256, pad: 0.07, shadowOpacity: 0.24, items: [k('Food Kit', 'mussel-open', { fit: 1, tint: '#E6D4E8', tintK: 0.9 }), k('Pirate Kit', 'cannon-ball', { fit: 0.3, x: 0.05, y: 0.12, z: 0.1, ground: false, tint: '#FFFFFF', tintK: 0.95 })] };
out.item_shell_9 = { size: 256, pad: 0.07, shadowOpacity: 0.24, items: [k('Pirate Kit', 'chest', { fit: 1 }), c('scallop', { x: 0.25, z: 0.75, s: 0.6 }), c('snail', { x: -0.45, z: 0.7, s: 0.5 })] };
out.prop_bramble_1 = { size: 192, pad: 0.04, shadowOpacity: 0.22, warm: false, items: [c('bramble')] };
out.prop_bramble_2 = { size: 192, pad: 0.04, shadowOpacity: 0.22, warm: false, items: [c('bramble', { berries: true })] };
writeFileSync(process.argv[2] ?? 'ui.json', JSON.stringify(out));
console.log(Object.keys(out).length);
