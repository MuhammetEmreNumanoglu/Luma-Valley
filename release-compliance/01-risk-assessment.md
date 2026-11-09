# 01 · Risk değerlendirmesi

Öncelik: **P0** kritik · **P1** yayın engelleyici · **P2** önerilen. Durum: DÜZELTİLDİ / AÇIK / MANUEL.

| # | Bulgu | Öncelik | Durum | Kanıt / dosya |
|---|---|---|---|---|
| 1 | "İlerlemeyi sıfırla", gerçek parayla alınmış kalıcı ürünü (ikinci işçi) ve satın alma işlem kimliklerini de siliyordu | P0 | DÜZELTİLDİ | `resetKeepingPurchases` (`src/engine/state.ts`), test: `tests/release-compliance.test.ts` |
| 2 | İkinci işçi butonu mağaza fiyatı yokken koda gömülü **"49,90 TL"** gösteriyordu (yanıltıcı fiyat) | P1 | DÜZELTİLDİ | Buton yalnız mağaza yapılandırılmış ve fiyat mağazadan gelmişse görünür (`src/screens/Panels.tsx`) |
| 3 | Pazar'da altın paketleri mağaza yokken "fiyat bilinmiyor" + pasif butonla görünüyordu (tamamlanmamış özellik, Apple 2.1) | P1 | DÜZELTİLDİ | Bölüm yalnız `purchases.configured` iken görünür (`src/screens/JournalShop.tsx`) |
| 4 | `expo-audio` eklentisi varsayılanla iOS'a mikrofon izin metni, Android'e `RECORD_AUDIO` ekliyordu; oyun ses kaydetmiyor | P1 | DÜZELTİLDİ | `app.json` eklenti ayarları; `expo config --type introspect` çıktısında mikrofon anahtarı yok |
| 5 | `expo-audio` varsayılanla arka plan ses modu (iOS `UIBackgroundModes: audio`, Android `FOREGROUND_SERVICE_MEDIA_PLAYBACK`) ekliyordu; oyun arka planda ses çalmıyor (Apple 2.5.4, Play ön plan servisi beyanı) | P1 | DÜZELTİLDİ | `enableBackgroundPlayback: false`, izinler `blockedPermissions` |
| 6 | Android şablonundan gelen `READ/WRITE_EXTERNAL_STORAGE` gereksizdi | P1 | DÜZELTİLDİ | `app.json` `blockedPermissions` |
| 7 | iOS gizlilik manifesti uygulama yapılandırmasında yoktu | P1 | DÜZELTİLDİ | `app.json` `ios.privacyManifests` (izleme yok, toplanan veri yok, RN'nin 3 gerekçeli API'si) |
| 8 | Uygulama içinde tam gizlilik politikası, açık kaynak lisansları ve üçüncü taraf bildirimi yoktu (OFL font lisansı bildirimi gerektirir) | P1 | DÜZELTİLDİ | Ayarlar → Yasal ve destek (`src/screens/Sheets.tsx`) |
| 9 | Barındırılan gizlilik politikası URL'si yok (App Store Connect ve Play Data Safety zorunlu kılıyor) | P1 | MANUEL | `legal/privacy-policy.html` hazır; barındırma ve URL sizden |
| 10 | Yayıncı adı ve destek iletişimi bilinmiyor | P1 | MANUEL | `src/content/publisher.ts` alanları boş; boşken uygulamada satır gizlenir |
| 11 | Restore Purchases yoktu (kalıcı ürün "ikinci işçi" için Apple 3.1.1 şartı) | P1 (koşullu) | DÜZELTİLDİ (arayüz) / MANUEL (mağaza) | `PurchaseService.restore`, Ayarlar butonu mağaza açılınca görünür |
| 12 | Rastgele içerikli tohum kutusunun olasılıkları gösterilmiyordu | P2 (koşullu P1) | DÜZELTİLDİ | Kutu ekranı, seviyeye göre yüzde |
| 13 | Gerçek mağaza entegrasyonu ve sunucu taraflı makbuz doğrulama yok | P1 (satış başlayınca) | AÇIK | 11-purchases-and-subscriptions.md |
| 14 | 180 görsel OpenAI ile üretilmiş; telif koruması ve münhasırlık belirsiz | P2 | AÇIK (hukuki görüş) | 08-asset-license-audit.md |
| 15 | Bağımlılıklarda 5 orta seviye açık (yalnız Expo CLI derleme aracında: glob, minimatch) | P2 | AÇIK | 10-security-audit.md, uygulamaya girmiyor |
| 16 | Gerçek iPhone / Android cihaz testi yapılmadı | P1 | MANUEL | 16-device-testing.md |
| 17 | Paket kimliği eski proje adını taşıyor (`com.tamani.game`) | P2 | MANUEL karar | 00-project-audit.md |
| 18 | Bazı küçük metinler 7–8 pt (dükkân satırı) | P2 | AÇIK | 15-accessibility.md |
