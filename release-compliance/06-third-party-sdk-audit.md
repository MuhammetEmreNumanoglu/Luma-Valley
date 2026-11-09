# 06 · Üçüncü taraf SDK ve bağımlılık denetimi

Ayrıntılı paket listesi: [06-dependency-licenses.md](06-dependency-licenses.md) (`node scripts/compliance/licenses.mjs` ile üretilir; aynı liste uygulamada Ayarlar → Açık kaynak lisansları'nda gösterilir).

## Doğrudan bağımlılıklar

| Paket | Lisans | Veri toplama / ağ | Not |
|---|---|---|---|
| expo, expo-asset, expo-font, expo-haptics, expo-localization, expo-splash-screen, expo-status-bar, @expo/metro-runtime | MIT | Çalışma anında ağ yok (expo-updates kurulu değil) | |
| expo-audio | MIT | Yok | Mikrofon ve arka plan ses yapılandırması kapatıldı |
| expo-dev-client | MIT | Yalnız geliştirme derlemesinde yerel ağdan Metro sunucusunu bulur | Release derlemesine girmez |
| react, react-dom, react-native, react-native-web | MIT | Yok | |
| @shopify/react-native-skia | MIT (Skia: BSD-3-Clause) | Yok; web'de CanvasKit kendi sunucusundan | |
| react-native-reanimated, -gesture-handler, -worklets, -safe-area-context | MIT | Yok | |
| @react-native-async-storage/async-storage | MIT | Yok; yerel depolama | |
| @expo-google-fonts/nunito | MIT (paket) + OFL-1.1 (font) | Yok; TTF paket içinde | 07-font-license-audit.md |

**Analytics, reklam, ödeme, crash, bildirim SDK'sı yok.**

## Lisans taraması (çalışma zamanı ağacı, 489 paket)

MIT 430 · ISC 23 · BSD-3-Clause 10 · BlueOak-1.0.0 6 · Apache-2.0 5 · BSD-2-Clause 3 · MPL-2.0 2 · Unlicense 2 · (MIT OR CC0-1.0) 2 · 0BSD 1 · (MIT OR Apache-2.0) 1 · Python-2.0 1 · CC-BY-4.0 1 · (BSD-3-Clause OR GPL-2.0) 1 · MIT AND OFL-1.1 1.

İnceleme:
- **GPL/AGPL/LGPL-yalnız paket yok.** `node-forge` (BSD-3-Clause **veya** GPL-2.0) BSD seçeneğiyle kullanılabilir ve yalnız Expo CLI'nin derleme aracıdır.
- **MPL-2.0** `lightningcss`: dosya düzeyinde copyleft, yalnız değiştirilen dosyalar için; derleme aracı, uygulamaya girmez.
- **CC-BY-4.0** (`caniuse-lite`), **Python-2.0** (`argparse`): derleme araçları; atıf bildirim listesinde.
- Lisans dosyası paket içinde bulunmayan 44 paket (lisans türü `package.json`'da beyan edilmiş; çoğu `metro`, `@react-native/*` alt paketleri, biri MPL'li lightningcss değil): lisans metni ana depolarında (facebook/react-native, facebook/metro) MIT. Bildirim listesinde lisans türüyle yer alıyor.
- Liste, Expo'nun derleme araçlarını da içerdiği için uygulamada gerçekte bulunan paketlerden fazladır; fazladan bildirim zarar vermez.

## Güvenlik açıkları

`npm audit --omit=dev`: 0 kritik, 0 yüksek, 5 orta (`glob`, `minimatch` → `@expo/cli`, `@expo/fingerprint`). Hepsi geliştirici makinesinde çalışan CLI araçları; uygulama paketine girmez. `npm audit fix --force` Expo sürümünü bozacağı için uygulanmadı; Expo'nun bir sonraki yama sürümünde güncellenmeli.
