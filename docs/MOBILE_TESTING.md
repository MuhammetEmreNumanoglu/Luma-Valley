# Telefonda Test (Mac veya Windows'tan iPhone ve Android)

Bu sürümde **özel native modül yok**. Kullanılan her şey Expo Go SDK 58'in içinde geliyor: Skia, Reanimated, Gesture Handler, AsyncStorage, expo-audio, expo-haptics ve expo-localization. Yani SDK 58'i destekleyen bir Expo Go ile oyunun tamamı test edilebilir.

## 0. Hazırlık (Mac'te veya Windows'ta aynı)
```bash
cd App            # proje klasörü
npm install       # node_modules yoksa (bir kez)
npm run sprites   # assets/sprites yoksa (bir kez; depoda hazır geliyor)
```

## 1. En hızlı yol: Expo Go
```bash
npx expo start            # aynı Wi-Fi
npx expo start --tunnel   # okul/iş ağı, VPN vb. (Expo hesabıyla giriş gerekir: npx expo login)
```
- **iPhone:** Normal Kamera uygulamasıyla QR'ı okut ve "Expo Go'da aç"a dokun. Mac ile aynı Expo hesabına giriş yaptıysan Expo Go'nun ana ekranında "Development servers" altında da görünür.
- **Android:** Expo Go içinden "Scan QR code".
- **"Project is incompatible with this version of Expo Go" / SDK uyarısı:** Telefondaki Expo Go SDK 58'i desteklemiyor demektir. Expo'nun duyurusuna göre SDK 58 için Expo Go mağazalara "birkaç hafta içinde" gelecekti. Mayıs 2026 itibarıyla App Store'da SDK 54 sürümü vardı ([kaynak](https://expo.dev/changelog/expo-go-and-app-store-may-2026)). Bu durumda 2. veya 3. yolu kullan.

## 2. Telefon tarayıcısında oyna (kurulum gerektirmez)
Web önizlemesi tam oyundur: aynı kod ve aynı Skia çizimleri, CanvasKit üzerinde çalışır.
```bash
npx expo start --web
```
Terminalde görünen adresi (`http://192.168.x.x:8081`) telefonun Safari'sinde veya Chrome'unda aç. İlerleme o tarayıcıda saklanır.
> Web, his ve oynanış için iyidir ama native performansı (60 FPS, dokunma gecikmesi, haptik) **kanıtlamaz**.

## 3. Development build (Expo Go'ya bağlı kalmadan, gerçek uygulama gibi)
- **Android (ücretsiz):** `npx eas-cli@latest build --profile development --platform android` komutu bir APK üretir. Telefona indirip kur, sonra `npx expo start --dev-client` çalıştır.
- **iPhone:** `npx eas-cli@latest build --profile development --platform ios` komutu **Apple Developer Program** (yıllık 99 $) ister. Ücretsiz Apple ID ile 7 günlük imza seçeneği olarak sign.expo.dev vardır; Expo'nun resmî belgelerinde yer almadığı için güvenilirliğini kendin değerlendirmelisin.
- Mac'te Xcode varsa: `npx expo run:ios --device` (iPhone'u kabloyla bağla). Ücretsiz Apple ID ile 7 gün geçerli olur.

## Hangi özellik nerede test edilir?
| Özellik | Expo Go | Telefon tarayıcısı | Development build |
|---|---|---|---|
| Bütün oynanış, harita, bulmaca, kayıt | ✔ | ✔ | ✔ |
| Ses ve müzik | ✔ | ✔ (ilk dokunuştan sonra) | ✔ |
| Titreşim | ✔ | ✘ | ✔ |
| Gerçek performans ölçümü | kısmen (dev mode yavaştır: `npx expo start --no-dev --minify`) | ✘ | ✔ |
| Gerçek parayla satın alma (gelecekte) | ✘ | ✘ | ✔ (+ mağaza hesapları) |

## Kontrol listesi (gerçek cihazda yapılacak)
1. İlk açılış, hikâye, Lumi diyaloğu ve eğitim: tek tohumu sürükle, birleştir.
2. Seraya dokun, görevi teslim et, Fener Taşı'nın değiştiğini haritada gör.
3. Uygulamayı tamamen kapatıp yeniden aç. Yapraklar, görevler ve tahta aynı kalmalı.
4. Uçak modunda aç ve bir bulmaca çöz. İlerleme kaydedilmeli.
5. Küçük ekran (iPhone SE/mini) ve çentikli ekranda alt menü ve üst bilgi çubuğu görünür olmalı.
6. Ayarlar: müzik, efekt ve titreşim kapatılınca gerçekten kapanmalı, uygulama yeniden açılınca hatırlanmalı.
7. Haritada hızlı kaydırma ve tahtada hızlı sürükleme takılmadan çalışmalı. Takılma olursa Ayarlar → Grafik kalitesi → Düşük ile karşılaştır.
