# 09 · Ses ve müzik lisans denetimi

| Dosya | Adet | Kaynak | Lisans | Kanıt |
|---|---|---|---|---|
| `assets/sfx/*.wav` (tap, select, merge, merge5, produce, coin, token, quest, levelup, unlock, build, solve, rotate, deny, page) | 15 | `scripts/gen-sfx.mjs` ile kodla sentezlendi | Özgün çalışma | Betik deterministik |
| `assets/sfx/music.wav` (müzik döngüsü) | 1 | Aynı betik | Özgün çalışma | Aynı |

**Doğrulama (2026-11-09):** `npm run sfx` yeniden çalıştırıldı; `git status assets/sfx` → **0 değişiklik**. Depodaki 16 ses dosyası bayt bayt bu koddan üretiliyor; üçüncü taraf ses, sample veya müzik yok.

Ses ve müzik Ayarlar'dan ayrı ayrı kapatılabilir; sessiz modda (iOS `playsInSilentMode: false`) çalmaz; arka planda çalmaz.
