# 18 · Elle yapılması gerekenler

Hiçbiri uydurma bilgiyle doldurulmadı. Her adım sizin hesabınız, kararınız veya bilginiz gerektiriyor.

1. **Yayıncı ve destek bilgisi** — `src/content/publisher.ts` içine gerçek yayıncı adı (kişi ya da şirket) ve destek e-postası yazın. Boşken uygulamada bu satırlar gizlidir; mağazalar destek iletişimi ister. Aynı bilgileri `legal/*.md` ve `legal/privacy-policy.html` içindeki `[YAYINCI ADI]`, `[DESTEK E-POSTASI]` alanlarına girin.
2. **Gizlilik politikasını barındırın** — `legal/privacy-policy.html` tek dosya, harici kaynak yüklemez. Ücretsiz seçenekler: GitHub Pages, Netlify. URL'yi `publisher.ts` → `privacyUrl`, App Store Connect ve Play Console'a girin.
3. **Paket kimliği** — `com.tamani.game` ilk yüklemeden sonra değiştirilemez. Değiştirecekseniz şimdi `app.json` → `ios.bundleIdentifier`, `android.package`.
4. **Apple** — Developer Program üyeliği; App Store Connect'te uygulama kaydı; App Privacy: "Data Not Collected"; yaş derecelendirme anketi (14); destek URL'si; ekran görüntüleri (gerçek oyun görüntüsü); `eas build -p ios` + TestFlight; inceleme notu: "Offline game, no account, no login, no network. In-app purchases are not enabled in this version."
5. **Google Play** — geliştirici hesabı; Data Safety: veri toplanmıyor/paylaşılmıyor + gizlilik URL'si; içerik derecelendirmesi (IARC); hedef kitle; reklam yok; Play App Signing; `eas build -p android`; yeni kişisel hesaplarda Console'un gösterdiği kapalı test şartı.
6. **Satın almaları açmak** (isteğe bağlı, sonraki sürüm) — 11-purchases-and-subscriptions.md adımları; vergi/banka formları; Paid Apps sözleşmesi (Apple) ve ödeme profili (Google).
7. **Hukuki ve mali** — KVKK/VERBİS teyidi; bireysel mi şirket mi yayın, vergi (gelir/KDV) ve faturalama; AB'de satış yapılacaksa DSA "trader" beyanı (AB'de satış yapan ticari yayıncılar için iletişim bilgilerinin mağazada görünmesi gerekir); AI görsellerinin ticari kullanım koşullarının ve hesap kayıtlarının saklanması.
8. **Gerçek cihaz testleri** — 16-device-testing.md.
9. **Web sürümü** yayınlanacaksa — HTTPS, güvenlik başlıkları, aynı gizlilik politikası; şu an gerekli değil.
