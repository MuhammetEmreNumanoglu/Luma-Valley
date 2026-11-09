# 17 · Yayın kontrol listesi

## Kodda tamam (bu çalışmada yapıldı veya doğrulandı)
- [x] Gereksiz izinler kaldırıldı (mikrofon, arka plan ses, ön plan servisi, harici depolama)
- [x] iOS gizlilik manifesti yapılandırması (`app.json`)
- [x] Export compliance: şifreleme yok
- [x] Uygulama içi gizlilik politikası, açık kaynak lisansları, font lisans bildirimi
- [x] Mağaza kapalıyken satın alma arayüzü gizli, koda gömülü fiyat yok
- [x] Kalıcı satın almalar sıfırlamada korunuyor; geri yükleme altyapısı hazır
- [x] Rastgele ödül olasılıkları gösteriliyor
- [x] Ağ isteği yok (otomatik test), sır yok (geçmiş dahil)
- [x] Testler, typecheck, lint, E2E, expo-doctor

## Sizin yapmanız gerekenler (ayrıntı: 18-manual-actions-required.md)
- [ ] Yayıncı adı + destek e-postası → `src/content/publisher.ts`
- [ ] `legal/privacy-policy.html` barındırma → URL'yi `publisher.ts` ve mağazalara girin
- [ ] Paket kimliği kararı (`com.tamani.game`)
- [ ] Apple Developer + App Store Connect: uygulama kaydı, App Privacy ("Data Not Collected"), yaş derecelendirmesi, destek URL'si, ekran görüntüleri, açıklama
- [ ] Google Play Console: uygulama kaydı, Data Safety, içerik derecelendirmesi, hedef kitle, kapalı test şartı
- [ ] EAS Build (iOS + Android) ve gerçek cihaz testleri (16)
- [ ] (Satış açılacaksa) mağaza ürünleri, `PurchaseService` gerçeklemesi, makbuz doğrulama, sandbox testleri (11)
- [ ] Hukuki görüş: KVKK/VERBİS, vergi/ticari durum, AI görsellerinin münhasırlığı
