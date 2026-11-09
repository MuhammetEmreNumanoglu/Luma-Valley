# 02 · Apple App Store uyumu

Kaynaklar 19-official-policy-sources.md'de, kontrol tarihi 2026-11-09.

| Kontrol | Durum | Kanıt / açıklama |
|---|---|---|
| 2.1 Uygulama bütünlüğü (yer tutucu, çalışmayan özellik yok) | PASS (kod) | Mağaza yokken satın alma bölümleri gizleniyor; yayıncı/destek alanları boşken satır gösterilmiyor. Destek URL'si App Store Connect'te zorunlu → MANUEL |
| 2.3.1(a) Yanlış fiyat gösterilmemesi | PASS | Koda gömülü "49,90 TL" kaldırıldı; fiyatlar yalnız mağazadan |
| 2.5.4 Arka plan modları yalnız amacına uygun | PASS | `UIBackgroundModes` artık eklenmiyor (`expo config --type introspect` ile doğrulandı) |
| 3.1.1 IAP, kalıcı ürün için geri yükleme | KOŞULLU | Mağaza yapılandırılmadığı için satın alma kapalı. Etkinleştirilince Ayarlar → "Satın alımları geri yükle" görünür; motor tarafı tekrar vermeyi engeller (test) |
| 3.1.1 Rastgele ödül olasılık açıklaması | PASS | Tohum kutusu ekranında olasılıklar |
| 3.1.1 Satın alınan kredilerin süresi dolmaz | PASS | Altın süresiz; sıfırlamada kalıcı ürünler korunur |
| 5.1.1 Gizlilik politikası (uygulama içi + URL) | KISMEN | Uygulama içi: Ayarlar → Gizlilik politikası. URL: `legal/privacy-policy.html` barındırılmalı → MANUEL |
| 5.1.1(v) Hesap silme | UYGULANMAZ | Hesap yok |
| 5.1.2 Veri kullanımı / izleme | PASS | Veri toplama ve izleme yok; ATT gerekmiyor |
| Privacy Manifest | PASS (yapılandırma) | `app.json` `ios.privacyManifests`: `NSPrivacyTracking=false`, boş toplanan veri, `FileTimestamp C617.1`, `UserDefaults CA92.1`, `SystemBootTime 35F9.1` (React Native çekirdeğinin kendi manifestindeki gerekçelerle aynı). Prebuild çıktısı EAS derlemesinde doğrulanmalı → BLOCKED (macOS/Xcode derlemesi yapılmadı) |
| İzin açıklamaları (Info.plist) | PASS | Kullanım açıklaması gerektiren izin yok. `NSLocalNetworkUsageDescription` yalnız geliştirme derlemesinde; `expo-dev-launcher` Release'te siliyor |
| Export Compliance | PASS | `ITSAppUsesNonExemptEncryption: false` (uygulama şifreleme kullanmıyor; kayıt sağlaması `hashString` bir bütünlük kontrolüdür, şifreleme değildir) |
| App Privacy formu ("Data Not Collected") | MANUEL | 04-privacy-data-inventory.md'deki yanıtlar |
| 1.3 Kids Category | KARAR | Çocuk kategorisinde yayın planlanıyorsa satın alma öncesi ebeveyn kapısı gerekir (14-age-rating). Önerilen: genel kategori, 4+ |
| Yaş derecelendirmesi | MANUEL | Beklenen cevaplar 14-age-rating-and-child-safety.md |
| Xcode / iOS SDK şartı | BLOCKED | EAS Build sunucusu güncel Xcode ile derler; yerel derleme yapılmadı |
| TestFlight / gerçek iPhone | BLOCKED | Apple Developer hesabı ve cihaz gerekiyor |
| Mağaza metinleri, ekran görüntüleri | MANUEL | 17-release-checklist.md |
