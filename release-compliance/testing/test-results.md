# Test sonuçları (2026-11-09)

| Test | Komut | Sonuç |
|---|---|---|
| TypeScript | `npm run typecheck` | **PASS** |
| Birim + entegrasyon (kayıt migration v1→v7 dahil) | `npm test` | **PASS** — 149/149 |
| Yayın uyumluluk testleri (yeni) | `tests/release-compliance.test.ts` | **PASS** — 7/7 (sıfırlamada satın almalar, geri yükleme, mağazasız asla başarı yok, izinler, privacy manifest, ağ isteği yok, lisans listesi) |
| ESLint | `npx eslint src tests` | **PASS** — 0 hata, 32 uyarı (kullanılmayan değişkenler vb.) |
| Web uçtan uca | `npm run e2e` (Chromium 390×844) | **PASS** — 15 kontrol, konsol hatası yok |
| Ayarlar → Yasal, ağ trafiği | `scripts/qa/settings-legal-check.mjs` | **PASS** — 0 dış istek |
| Expo proje doktoru | `npx expo-doctor` | **PASS** — 20/20 |
| Native yapılandırma (Info.plist, Android izinleri) | `npx expo config --type introspect` | **PASS** — mikrofon ve arka plan anahtarları yok, istenmeyen izinler engelli |
| Ses dosyaları yeniden üretilebilirlik | `npm run sfx` + `git status` | **PASS** — 0 fark |
| iOS native derleme / TestFlight | — | **BLOCKED** — Apple hesabı, EAS Build |
| Android native derleme / gerçek cihaz | — | **BLOCKED** — EAS Build, cihaz |
| Satın alma (sandbox) | — | **NOT APPLICABLE** bu sürümde (mağaza kapalı) |
| Abonelik, hesap silme | — | **NOT APPLICABLE** |
