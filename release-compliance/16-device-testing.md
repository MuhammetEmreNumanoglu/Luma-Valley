# 16 · Cihaz testleri

| Test | Durum | Not |
|---|---|---|
| Web (Chromium, 390×844), uçtan uca oyun akışı | PASS | `npm run e2e`: tüm kontroller geçti, konsol hatası yok |
| Web, Ayarlar → Gizlilik / Lisanslar, ağ trafiği | PASS | 0 dış istek (`scripts/qa/settings-legal-check.mjs`) |
| Gerçek iPhone (TestFlight) | **BLOCKED** | Apple Developer hesabı ve EAS Build gerekli |
| Gerçek Android cihaz (iç test) | **BLOCKED** | Play Console hesabı veya `eas build -p android --profile preview` + cihaz gerekli |
| iOS/Android native derleme | **BLOCKED** | Bu ortamda Xcode/Android SDK ile derleme yapılmadı; yapılandırma `expo config --type introspect` ve `expo-doctor` (20/20) ile doğrulandı |

## Gerçek cihazda yapılması gerekenler

1. `eas build --profile preview -p ios` ve `-p android` (hesap gerekli).
2. İlk açılış, kapat-aç, telefonu yeniden başlat, uygulamayı güncelle (eski sürüm kaydıyla), uçak modunda oyna.
3. Çentikli iPhone ve küçük ekranlı Android'de taşma kontrolü.
4. 60 FPS, bellek ve pil (birkaç dakikalık oynanış).
5. Ses: sessiz mod, kulaklık, telefon araması sırasında kesinti.
6. Satın alma etkinse: sandbox satın alma, iptal, bekleyen, geri yükleme, internetsiz deneme.
