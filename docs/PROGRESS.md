# Durum Raporu

## v5 — Atölye kaynakları, elle birleştirme, tek para (2026-11-06)

| Alan | Durum |
|---|---|
| Navigasyon | Alt bar: Atölye · Vadi · Görevler · Defter · Pazar (E2E konum sırasıyla doğruluyor) |
| Kaynaklar | Taş, ahşap, seramik, deniz kabuğu, kristal artık **atölye tahtasında** tek hücrelik büyük engeller; 3 kırma (kaya: 5/10/15⚡, 1/5/10 dk, 5/8/12 taş); son kırma kareyi boşaltır. Vadideki kaynak noktaları kaldırıldı |
| Yenilenme | Kaynak Teslimatı: 75 dk'da bir hak (en çok 3), seviye başına +1; oyuncu türü seçer, yalnız boş kenar hücresine konur, tahtada en çok 6 engel |
| Birleştirme | Otomatik birleşme yok. Ürünü aynı ürünün üzerine bırak; hedefin bağlı bir eşi varsa tam 3'ü birleşir; zincirleme ve 5'li/bonus yok |
| Para | Işık Jetonu ve kıvılcım kaldırıldı; tek para Altın. Enerji doğrudan altınla (25⚡ = 60 altın, aynı gün ×1,5) |
| Tahta | 390×844'te hücre 52 pt (v4: 46, v3: ~40); 375×667'de 38 pt |
| Kayıt | v5 migration: jeton ×30 ve kıvılcım ×10 altına (ledger, tek sefer), kil → seramik, kaldırılan vadi kaynaklarının işleri Depo'ya ve kurulum altını iade, yalnız eski kilitli hücrelere en çok 4 engel |
| Test | 107 otomatik test, tsc temiz, lint 0 hata, web E2E iki boyutta 15/15, 210 günlük simülasyon |

### Doğrulanmayan / eksik
1. **Gerçek iPhone testi yapılmadı** (dokunma hissi, 60 FPS, güvenli alan çentiği, haptik).
2. Kaynak görselleri mevcut lisanslı sprite'lardan (kaya, kütük, çömlek, kabuk, kristal ürün görselleri) birleştirilip kodla çatlak/moloz eklenerek yapıldı; kaynağa özel çizilmiş aşama görselleri yok.
3. Kırma tamamlandığında "parçalanma" efekti kısa toz parçacığıdır; aşamalar arası geçişte ayrı bir morph animasyonu yok.
4. Ekonomi botla dengelendi; gerçek oyuncu testi yok.

---

# Durum Raporu

## v4 — Vadi yeniden tasarımı (2026-11-06, dal `feat/valley-redesign`, `main` üzerinden)

| Alan | Durum |
|---|---|
| Kaynak ekonomisi | Odun/taş/kil/kristal artık vadiden: 3 aşamalı tek seferlik birikintiler + görevle açılan, altınla kurulan yenilenebilir binalar + işleme (kil→seramik). Tohum kutusu yalnız tohum/fide verir |
| Para | Yaprak ve alan parası tek **Altın**'da birleşti; **Kıvılcım** gerçek bir döngüye bağlandı |
| Koleksiyon | Keşif ve ödül ayrı kalıcı veri; tek seferlik altın (Sv6+ jeton); kırmızı nokta; "Hepsini topla" |
| Eğitim | Bağlamsal, kayıtlı, atlanabilir, ayarlardan yeniden oynatılabilir; gerçek buton konumuna bağlı |
| Arayüz | Seviye modalı, kaynak paneli, "Nereden bulunur?", sıradaki hedef çipi, tüccar paneli ve tahtada istek önizlemesi, bölge panelinde ad/seviye/miktar ve ilerleme %, moment kuyruğu, gezinme modu, büyük tahta, yeni alt navigasyon |
| Kayıt | v4 migration (eski kayıtlar korunur), tüm ödül/harcama/zamanlayıcı komutları anında yazılır |
| Test | 105 otomatik test, tsc temiz, lint 0 hata, web E2E iki ekran boyutunda, 5 profilli 210 günlük simülasyon |

### Doğrulanmayan / eksik
1. **Gerçek iPhone testi yapılmadı** (his, 60 FPS, bellek, haptik, güvenli alan çentiği). Development build gerekir (`MOBILE_TESTING.md`).
2. Yeni kaya/ağaç aşamaları mevcut CC0 prop'larıyla + kod çizimiyle yapıldı; özel çizilmiş aşama sprite'ları ve yeni UI çerçeveleri yok (`ART_DIRECTION.md`).
3. Vadi haritası normal modda dikey kaydırılır (7 bölge uzunluğunda); yatay kaydırma ve yakınlaştırma yalnız "Gezin" modunda. Atölye kamerası yalnız "Gezin"de hareket eder.
4. Ekonomi botla dengelendi; gerçek oyuncu testi yok. Jeton birikimi ve geç oyun kıvılcım akışı izlenmeli (`GAME_ECONOMY.md`).
5. 3–7. bölgelerin vadi kaynak yerleşimi ekran görüntüsüyle tek tek kontrol edilmedi (1. bölge kontrol edildi).
6. Kullanılmayan `jest` paketleri ve depoda izlenen `node_modules` klasörü (önceki commit'lerden) temizlenmedi.

---

# Durum Raporu: Luma Valley v1.0 (2026-11-04, dal `feat/luma-valley`)

Önceki oyun (Işık Kementi) `v0.2-light-lasso` etiketinde ve `feat/light-lasso` dalında saklanıyor. Fotoğraf prototipi `master` dalında.

## Tamamlanan ve test edilenler
| Alan | Durum |
|---|---|
| Eski oyunun kaldırılması | Sim, render ve ekranlar silindi, Git'te yedekli. Expo yapılandırması, bundle ID ve EAS profilleri korundu |
| Oyun motoru | Saf ve deterministik: merge-3/5, kaskad, diken, 12 üretici (10 jeneratör + 2 dönüştürücü, gizli tarifler), enerji ve kullanım yenilenmesi (saat korumalı), envanter, hücre açma, siparişler, günlük ve haftalık görevler, başarılar, seviye, jeton defteri, satın alma idempotency |
| İçerik | 12 aile / 111 nesne, 7 bölge / 72 yapı (1–4 aşama), 94 görev (hikâye, yan, proje), 7 karakter, 29 başarı, 23 anı kartı, 94 görev × TR/EN diyalog, giriş hikâyesi |
| Işık Yolları | Motor, üretici, 6 elle tasarlanmış ve 74 üretilmiş bulmaca (hepsi doğrulanmış), ipucu, geri alma, baştan başlama, yıldız, günlük Yankı (sınırsız) |
| Kayıt | Çift slot, sağlama toplamı, migration zinciri, onarım, arka plana geçişte kayıt; web'de yeniden yüklemeyle doğrulandı |
| Görseller (v1.1 yenileme) | 111 nesne, 12 üretici, 32 yapı tipi × 3 aşama (yıkık, onarımda, onarılmış) ve harita dekoru artık izometrik sprite. Kenney CC0 3D kitlerinden tek kamera ve tek ışıkla render edildi; 255 PNG, sprite registry, manifest (`docs/VISUAL_INVENTORY.md`). Portreler, ikonlar, zemin ve bulmaca karoları hâlâ özgün Skia çizimi |
| Ses | 15 efekt ve döngüsel müzik (sentez) |
| Arayüz | Vadi haritası (kaydırma, dokunma, yapı sayfası, canlılık, sis, işaretçiler), Atölye (sürükle-bırak, hedef vurgusu, merge/üretim/diken animasyonları, siparişler, bilgi şeridi, çanta), Görevler, Defter (koleksiyon, karakterler, anılar, başarılar, tarifler), Pazar, Ayarlar, diyalog, kutlama, bildirimler, eğitim |
| Ekonomi | Yaprak ve jeton; mağaza tasarımı ve satın alma arayüzü hazır; gerçek ödeme kapalı, sahte başarı yok |
| Test | 65 otomatik test, iki ekran boyutunda web E2E, 210 günlük simülasyon (`TEST_REPORT.md`) |
| Belgeler | README, GAME_DESIGN, ARCHITECTURE, CONTENT_GUIDE, MONETIZATION, TEST_REPORT, ASSET_LICENSES, MOBILE_TESTING, DECISIONS |

## Dış bağımlılıklar yüzünden tamamlanamayanlar
| Konu | Gereken |
|---|---|
| Gerçek parayla satın alma | App Store Connect ve Google Play hesapları, ürün kayıtları, RevenueCat (veya doğrulama sunucusu), development build (`MONETIZATION.md`) |
| Gerçek cihaz testi ve FPS ölçümü | Telefon. iPhone için SDK 58 destekleyen Expo Go veya development build (`MOBILE_TESTING.md`) |
| Mağazaya yayın | Apple Developer Program, kesin bundle ID, gizlilik etiketi, ekran görüntüleri, marka adı araştırması |
| Bulut kayıt ve çoklu cihaz | Hesap ve sunucu. Ürün kararı gerektirir; mimari hazır (`ARCHITECTURE.md`) |

## Görsel yenileme (v1.2, `v1.2-art-direction`)
Portreler (42), ikonlar (21), dikenli çalı, harita zemini, bulmaca karoları, butonlar, paneller, sekme çubuğu, ödül pencereleri, mağaza, koleksiyon ve başarı ekranları tek sanat diline getirildi (`VISUAL_INVENTORY.md`).

## Aşama durumu (gerçek test sonuçlarına göre)
| Aşama | Durum | Kanıt | Doğrulanmayan |
|---|---|---|---|
| F: ekonomi ve ekranlar | **Web'de doğrulandı** | Yaprak ve jeton kazanma/harcama ekonomi testlerinde; tarayıcıda görev ödülü, başarı jetonu, mağaza ("gerçek ödeme kapalı"), koleksiyon, başarılar, ayarlar; yeniden yükleme sonrası kayıt korunuyor | Ses kalitesi (dinlenmedi), gerçek ödeme (hesap gerekli) |
| H: kalite ve teslim | **Kısmen** | tsc, 70 test, web export, E2E 390×844 ve 375×667, hazır kayıtlarla ekran turu, offline varlık testi, belgeler, Git etiketi | **Gerçek iPhone/Android cihaz, FPS, bellek, dokunma hissi, haptik: hiç çalıştırılmadı** |

## Bilinen eksikler ve sıradaki işler
1. **Gerçek cihaz turu:** his, performans, haptik, güvenli alan. Ayarlar → Grafik kalitesi → Düşük ile karşılaştırma.
2. **Yaprak birikimi:** Çay molası ve 28 parçalık vadi süslemeleri eklendi. Simülasyonla yeniden ölçülmeli.
3. 3–7. bölgelerin görev diyaloglarına ikinci bir karakter tepkisi eklendi; yine de 1–2. bölgeler kadar uzun değiller. Görsel aşamaları genel yapı tiplerinden geliyor.
4. Tablet yerleşimi.
5. Küçük ekranda tahta hücresi 35 pt (Apple'ın önerdiği 44 pt'nin altında). Gerçek cihazda hissine bakılmalı.
6. Kullanılmayan `jest`, `jest-expo` ve `@types/jest` paketleri internet erişimi olan bir makinede `npm uninstall` ile kaldırılmalı.
7. Kişiselleştirme: 3 yapı tipinde 4 renk seçeneği ve 28 vadi süslemesi. Süsleme yerlerinin görsel kontrolü (`npm run preview-art`) Mac açılınca yapılacak.
