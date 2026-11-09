# 20 · Son uyumluluk raporu — Luma Valley

Tarih: 2026-11-09 · Dal: `main` · Başlangıç commit'i: `fe2a9c6` · Bu raporla gelen değişiklikler tek commit'te.

> Hiçbir düzenleme kesin mağaza onayı veya sıfır hukuki risk garanti etmez. Hukuki ve mali uzman görüşü gereken konular işaretlenmiştir.

## A. Proje durumu

- İzlenen dosya: 804 (kaynak `src/`: 78). Expo SDK 58, React Native 0.88.1, TypeScript, Skia.
- Özellikler: çevrimdışı birleştirme oyunu, yerel kayıt (v7), TR/EN, ses/titreşim, satın alma altyapısı (mağaza kapalı).
- SDK'lar: yalnız Expo/React Native modülleri, Skia, AsyncStorage, Nunito. **Analytics, reklam, crash, bildirim, ödeme SDK'sı yok.**
- Hedef: Apple App Store ve Google Play (Türkiye öncelikli, AB dahil olabilir).

## B. Yapılan işlemler

| Dosya | Önceki sorun | Çözüm | Etkilenen özellik | Test |
|---|---|---|---|---|
| `app.json` | expo-audio varsayılanları: iOS mikrofon izin metni, `UIBackgroundModes: audio`; Android `RECORD_AUDIO`, ön plan servisi izinleri; şablondan gelen depolama izinleri | Eklenti seçenekleri + `blockedPermissions` | Ses (değişmedi: ön planda çalar) | introspect, expo-doctor, E2E, release-compliance.test |
| `app.json` | iOS gizlilik manifesti yok | `ios.privacyManifests`: izleme yok, toplanan veri yok, RN'nin 3 gerekçeli API'si | iOS derleme | release-compliance.test |
| `src/engine/state.ts`, `src/state/GameProvider.tsx` | Sıfırlama ödenmiş kalıcı ürünü siliyordu (P0) | `resetKeepingPurchases`; son sekme tercihi de silinir | Ayarlar → Sıfırla | release-compliance.test |
| `src/screens/Panels.tsx` | Koda gömülü "49,90 TL"; mağaza kapalıyken satın alma önerisi | Buton yalnız mağaza + gerçek fiyat varken; metin i18n'e taşındı | İşçi meşgul penceresi | typecheck, testler |
| `src/screens/JournalShop.tsx` | Mağaza yokken pasif altın paketleri | Bölüm mağaza yokken gizli | Pazar | E2E |
| `src/services/purchases.ts` | Geri yükleme yoktu | `restore()` arayüzü; mağaza yokken `unavailable` | Ayarlar | release-compliance.test |
| `src/screens/Sheets.tsx`, `src/content/publisher.ts`, `src/content/licenses.generated.ts` | Uygulama içi tam gizlilik politikası, lisans bildirimi, destek, gerçek sürüm yok | "Yasal ve destek" kartı, gizlilik ve lisans sayfaları, boşken gizlenen destek satırı, `app.json`'dan sürüm | Ayarlar | E2E (settings-legal-check), testler |
| `src/screens/BoardScreen.tsx` | Rastgele kutu olasılıkları gösterilmiyordu | Kutu ekranında seviye bazlı yüzdeler | Tohum kutusu | typecheck, testler |
| `src/i18n/strings.ts` | — | Tüm yeni metinler TR + EN | — | i18n eşleşme testi |
| `scripts/compliance/licenses.mjs` | Lisans envanteri yoktu | Üretim bağımlılık ağacı taraması + uygulama içi liste | — | release-compliance.test |
| `tests/release-compliance.test.ts` | — | 7 koruyucu test | — | PASS |
| `release-compliance/**`, `ASSET_LICENSE_AUDIT.md` | — | Denetim belgeleri, yasal metinler (MD + HTML) | — | — |

## C. Uyumluluk tablosu

| Kontrol | Durum | Öncelik | Kanıt | Açıklama |
|---|---|---|---|---|
| Gizlilik politikası (uygulama içi) | PASS | P1 | Ayarlar → Gizlilik politikası | Gerçek davranışla tutarlı |
| Gizlilik politikası (URL) | BLOCKED | P1 | `legal/privacy-policy.html` | Barındırma sizde |
| Yayıncı/destek bilgisi | BLOCKED | P1 | `src/content/publisher.ts` | Bilgi verilmedi, uydurulmadı |
| Privacy Manifest | PASS (yapılandırma) / BLOCKED (derleme) | P1 | `app.json`, test | Derlenmiş paket içinden doğrulanmalı |
| Required Reason API gerekçeleri | PASS | P1 | RN çekirdek manifesti ile aynı | Apple sayfası otomatik okunamadı, teyit edin |
| ATT / izleme | N/A | — | Takip yok | |
| İzinler | PASS | P1 | introspect | Çalışma anında izin istenmiyor |
| Arka plan modları | PASS | P1 | introspect | Kaldırıldı |
| Export compliance | PASS | P2 | `ITSAppUsesNonExemptEncryption: false` | |
| Font lisansları | PASS | P1 | 07, uygulama içi bildirim | Yerel, OFL |
| Bağımlılık lisansları | PASS | P1 | 06, 489 paket | Yalnız-GPL yok |
| Görsel lisansları | PASS / UYARI | P1/P2 | 08, manifest 0 eksik | 180 AI görseli: münhasırlık hukuki görüş |
| Ses lisansları | PASS | P1 | 09, yeniden üretim 0 fark | |
| Hesap silme | N/A | — | Hesap yok | |
| Veri silme | PASS | P2 | Sıfırla / uygulamayı sil | |
| Satın almalar | PASS (bugünkü sürüm) / BLOCKED (gerçek mağaza) | P1 | 11, testler | Mağaza kapalı, güvenli |
| Geri yükleme | PASS (altyapı) / BLOCKED (mağaza) | P1 koşullu | testler | |
| Abonelikler | N/A | — | Yok | |
| Rastgele ödül olasılıkları | PASS | P2 | Kutu ekranı | |
| Veri güvenliği / sırlar | PASS | P0 | 10, geçmiş taraması 0 | |
| Bağımlılık açıkları | UYARI | P2 | 5 orta (yalnız CLI) | Expo güncellemesiyle |
| Ağ / dış istek | PASS | P0 | Test + 0 dış istek | |
| KVKK / GDPR | PASS (teknik) / hukuki teyit | P1 | 05 | VERBİS, ticari durum |
| Yaş derecelendirmesi | BLOCKED | P1 | 14 | Anketi siz doldurursunuz; beklenen 4+ / PEGI 3 |
| Erişilebilirlik | KISMEN | P2 | 15 | Küçük metinler, tahta öğeleri ekran okuyucuda tek tek yok |
| App Store yayını | BLOCKED | P1 | 02 | Hesap, derleme, TestFlight |
| Google Play yayını | BLOCKED | P1 | 03 | Hesap, derleme, Data Safety |
| Gerçek cihaz testi | BLOCKED | P1 | 16 | |
| Kayıt koruma (güncelleme, bozulma) | PASS | P0 | save/migration testleri | Bulut kayıt yok ve söz verilmiyor |

## D. Tamamlanamayan işler

| İş | Neden | Gerekli | Yayına engel mi | Nasıl |
|---|---|---|---|---|
| Gizlilik politikası URL'si | Barındırma yok | Bir web adresi | **Evet** | GitHub Pages/Netlify'a HTML'i yükleyin |
| Yayıncı adı, destek e-postası | Bilgi yok | Sizin bilginiz | **Evet** | `publisher.ts` + yasal metinlerdeki alanlar |
| iOS/Android derleme, TestFlight, cihaz testi | Hesap ve cihaz yok | Apple/Google hesabı, EAS | **Evet** | 16 |
| App Privacy, Data Safety, yaş anketi | Konsol erişimi yok | Hesap | **Evet** | 04, 14'teki cevaplar |
| Gerçek satın alma | Mağaza ürünleri, kütüphane, doğrulama yok | Hesap + geliştirme | Hayır (satış olmadan yayın mümkün) | 11 |
| Hukuki/mali teyit | Uzmanlık | Avukat/mali müşavir | Duruma göre | 18 #7 |

## E. Manuel yapılması gerekenler

18-manual-actions-required.md'de adım adım: yayıncı bilgisi, politika barındırma, paket kimliği kararı, Apple ve Google konsol adımları ve inceleme notu, satın almaları açma, hukuki/mali teyit, gerçek cihaz testleri.

## Öz denetim (33. madde)

1. Eski sürümle uyumlu mu? **Evet** — kayıt sürümü değişmedi (v7), tüm migration testleri geçiyor.
2. Oyun özellikleri çalışıyor mu? **Web'de evet** (E2E); gerçek cihazda doğrulanmadı.
3. Kayıtlar korunuyor mu? **Evet**; sıfırlamada artık ödenmiş ürünler de korunuyor.
4. Gizlilik belgeleri var mı? **Evet** (uygulama içi + MD/HTML); URL barındırılmadı.
5. Belgeler veri akışıyla tutarlı mı? **Evet** — ağ isteği yok, test ile korunuyor.
6. Bütün lisanslar doğrulandı mı? Paket/font/ses/görsel kaydı **evet**; AI görsellerinin münhasırlığı hukuki konu.
7. Lisansı bilinmeyen dosya? **Yok.**
8. Dışarıya gereksiz veri? **Yok** (0 dış istek).
9. Fontlar dış istek yapıyor mu? **Hayır.**
10. Tüm SDK'lar incelendi mi? **Evet** (06).
11. Privacy Manifest doğru mu? Yapılandırma **evet**; derlenmiş paket kontrolü **bekliyor**.
12. Data Safety doğru mu? Cevaplar hazır (04); formu siz gireceksiniz.
13. Hesap silme? **Uygulanmaz.**
14. Geri yükleme? Altyapı hazır; mağaza etkinleşince test edilmeli.
15. Abonelik? **Uygulanmaz.**
16. Çevrimdışı çalışma korundu mu? **Evet.**
17. Gereksiz izinler kaldırıldı mı? **Evet.**
18. Mağaza açıklamaları tutarlı mı? Henüz yazılmadı; satın alma "etkin değil" denmeli.
19–20. iOS/Android derleme? **Doğrulanmadı (BLOCKED).**
21. Gerçek cihaz testi? **Yapılmadı.**
22. Kritik güvenlik açığı? **Yok.**
23. Hukuki inceleme gereken konu? **Var:** VERBİS/ticari durum, AI görselleri, (satışta) tüketici/vergi.
24. Sizin yapmanız gereken? **Var** (D, E).
25. Yayını engelleyen sorun? **Kodda yok; hesap/URL/bilgi kaynaklı engeller var.**

## F. Yayına hazır olma kararı

**CONDITIONALLY READY (koşullu hazır).** Kodda bilinen bir yayın engeli kalmadı. Yayından önce şunların tamamlanması gerekiyor:

1. Yayıncı ve destek bilgisi.
2. Barındırılan gizlilik politikası URL'si.
3. Mağaza hesaplarında beyanlar (App Privacy, Data Safety, yaş derecelendirmesi).
4. iOS ve Android derlemesi ile gerçek cihaz testi.

Gerçek parayla satış, ayrı bir geliştirme ve test aşaması gerektiriyor (11).
