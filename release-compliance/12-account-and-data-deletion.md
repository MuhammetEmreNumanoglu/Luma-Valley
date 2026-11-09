# 12 · Hesap ve veri silme

| Gereksinim | Durum | Açıklama |
|---|---|---|
| Apple 5.1.1(v) uygulama içi hesap silme | UYGULANMAZ | Uygulamada hesap oluşturma yok |
| Google Play hesap silme (uygulama içi + web) | UYGULANMAZ | Hesap yok; Data Safety'de "hesap oluşturma yok" seçilir |
| Cihazdaki oyun verisini silme | PASS | Ayarlar → Kayıt → "İlerlemeyi sıfırla" (iki adımlı onay). Kayıt slotları ve son sekme tercihi silinir; gerçek parayla alınmış kalıcı ürünler ve işlem kimlikleri korunur (`resetKeepingPurchases`, test) |
| Tüm verinin silinmesi | PASS | Uygulamayı silmek cihazdaki her şeyi kaldırır; bulut kaydı yok |
| Sahte silme butonu yok | PASS | Sıfırlama gerçekten AsyncStorage anahtarlarını siler (`SaveStore.wipe`) |

Not: Yerel kayıtlar uygulama silinince işletim sistemi tarafından silinir; cihaz değişiminde ilerleme taşınmaz. Gizlilik politikası bunu açıkça söyler; bulut kayıt sözü verilmez. Kalıcı satın almalar mağaza hesabından geri yüklenebilir (mağaza etkinleşince).
