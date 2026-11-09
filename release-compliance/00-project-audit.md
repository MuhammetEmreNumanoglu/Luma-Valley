# 00 · Proje denetimi (keşif)

Tarih: 2026-11-09 · Dal: `main` · Başlangıç commit'i: `fe2a9c6` · İzlenen dosya: 804 (kaynak `src/`: 78)

## Teknoloji

| Alan | Değer | Kanıt |
|---|---|---|
| Framework | Expo SDK 58.0.23, React Native 0.88.1, React 19.3, TypeScript ~6.0 | `package.json`, `node_modules/*/package.json` |
| Çizim | @shopify/react-native-skia 2.14 (web'de CanvasKit kendi sunucusundan: `src/boot.web.ts` `locateFile → /canvaskit.wasm`) | |
| Animasyon / jest | react-native-reanimated 4.7, react-native-gesture-handler 3.3, worklets 0.13 | |
| Kayıt | `@react-native-async-storage/async-storage` 2.2 (çift slot, sağlama toplamı, migration zinciri v1→v7) | `src/persistence/` |
| Ses | `expo-audio` (yerel `.wav` dosyaları, kod ile sentezlenmiş) | `src/feedback.ts`, `scripts/gen-sfx.mjs` |
| Yazı tipi | Nunito (`@expo-google-fonts/nunito`, paket içindeki TTF, OFL-1.1) | `src/App.tsx` |
| Diğer Expo modülleri | expo-asset, expo-font, expo-haptics, expo-localization, expo-splash-screen, expo-status-bar, expo-dev-client (yalnız geliştirme derlemesi) | `app.json` plugins |
| iOS | Bundle ID `com.tamani.game`, buildNumber 1, iPhone (tablet yok), en düşük iOS 15.1 (RN 0.88 varsayılanı) | `app.json`, `react-native/scripts/cocoapods/helpers.rb` |
| Android | Paket `com.tamani.game`, minSdk 24, **targetSdk 36**, compileSdk 37 | `react-native/gradle/libs.versions.toml` |
| EAS | development / preview / production profilleri, `appVersionSource: remote`, `autoIncrement` | `eas.json` |

Not: `slug: tam-ani` ve paket kimliği `com.tamani.game` önceki "Tam Anı" projesinden kalma. Mağazaya ilk yüklemeden sonra paket kimliği değiştirilemez; adın kalıcı olarak bu mu olacağına **siz karar vermelisiniz** (18-manual-actions-required.md).

## Özellik sınıflandırması

| Özellik | Projede | Sınıf | Not |
|---|---|---|---|
| Kullanıcı hesabı / giriş | Yok | UYGULANMAZ | Hesap silme şartları uygulanmaz |
| Sunucu / backend | Yok | UYGULANMAZ | Kaynak kodda `fetch`, `XMLHttpRequest`, `WebSocket` yok (test: `tests/release-compliance.test.ts`) |
| Analytics / crash raporlama | Yok | UYGULANMAZ | |
| Reklam / ATT | Yok | UYGULANMAZ | IDFA kullanılmıyor |
| Bildirim (push/yerel) | Yok | UYGULANMAZ | |
| Kamera, mikrofon, konum, rehber vb. | Kullanılmıyor | ZORUNLU (izin temizliği) | `expo-audio` eklentisinin eklediği mikrofon ve arka plan izinleri kaldırıldı |
| Uygulama içi satın alma | Arayüz ve motor hazır, mağaza **yapılandırılmamış** (`UnconfiguredStore`) | KOŞULLU | Etkinleştirilince 11-purchases-and-subscriptions.md |
| Abonelik | Yok | UYGULANMAZ | |
| Rastgele içerikli ödül (tohum kutusu) | Var; enerjiyle alınır, gerçek parayla doğrudan satılmaz | KOŞULLU | Olasılıklar artık kutu ekranında gösteriliyor |
| Kullanıcı içeriği / sohbet | Yok | UYGULANMAZ | |
| Web sürümü | Geliştirme ve E2E testi için (`expo export -p web`) | ÖNERİLEN | Yayınlanacaksa 24. madde: barındırma yok |
| Yerel veri | Oyun kaydı, ayarlar, son sekme (AsyncStorage) | ZORUNLU (beyan) | Cihazdan çıkmaz |

## Git durumu (başlangıç)

Temiz çalışma ağacı; yalnızca izlenmeyen `e2e-out/` (test çıktıları, commit edilmedi). Başkasına ait commit edilmemiş değişiklik yoktu.
