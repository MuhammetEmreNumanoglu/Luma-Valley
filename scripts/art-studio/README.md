# Art studio (isometric sprites from Kenney CC0 3D kits)

All map, item and producer sprites in `assets/art/` are rendered here from **Kenney** 3D kits
(CC0 1.0, https://kenney.nl). The kits and three.js are *not* committed (size; re-download).

1. Get the kits (GLB): Fantasy Town, Nature, Food, Survival, Graveyard, Mini Dungeon, Platformer,
   Furniture, Holiday, Mini Market, Cube Pets, Pirate, Castle, Space, Watercraft from kenney.nl
   (or the mirror github.com/eturner58/game-assets). Put them in `studio/kenney/<Kit>/Models/GLB format/`.
2. three.js r187: `studio/build/three.module.js` and `studio/examples/jsm/`.
3. Copy this folder's files into `studio/`, serve it: `python3 -m http.server 8095`.
4. `node gen-items.mjs items.json && node render.mjs items.json out_items`
   `node gen-struct.mjs struct.json && node render.mjs struct.json out_st`
5. `python3 pack-art.py` → trims, records ground anchors, writes `assets/art/**`,
   `assets/art/manifest.json` and `src/art/registry.generated.ts`.
6. `python3 sheet.py out_items sheet.png` for a contact sheet; `npm test` checks coverage.

Lighting: warm key light from upper-left, soft sky fill, contact shadow; camera is orthographic,
yaw 45°, pitch 30° for every sprite so perspective is consistent. Ruins are graded in the
palette texture (desaturated); teal greens are warmed (`warmRGB`).
