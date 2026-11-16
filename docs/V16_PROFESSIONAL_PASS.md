# v16 — Profesyonel düzenleme (2026-11-16)

Dal: `claude/project-thread-hsynpr`. Kayıt sürümü 16 (migration 15 → 16, idempotent).

## Ne değişti

| Faz | Değişiklik | Doğrulama |
|---|---|---|
| 1 Atölye araçları | Araç düğmeleri 48–52 pt (ekran genişliğine göre), kaynak taşı düğmenin %80'i, sayı rozeti kaldırıldı. Kaynak Teslimatı paneli ekranın ~%91'i, kaydırılabilir; 72 px görsel, taş/enerji/dakika/ürün çipleri, 44 pt düğmeler | `scripts/verify-v16-layout.mjs` (375/390/393/430, açık+koyu) |
| 2 Tahta yerleşimi | Tahta ~100 pt aşağıda; Çanta ve Sat tahtanın üstünde, yan yana, aralık ≥ 12 pt, Sat düğmesi altın tutarını gösterir | Aynı betik: köşe/kenar/alt hücre dokunuşları doğru ürünü seçer; `verify-workshop-touch.mjs` sürükleme doğru |
| 3 Ürün açılışları | Kutu aileleri: 1 inek+buğday, 4 tavuk, 6 domates, 8 çiçek, 10 meyve, 11 tahıl, 12 mısır, 13 üzüm, 14 balkabağı, 15 karpuz; eşit olasılık. Vadi işleri, tüccar, dükkânlar ve siparişler açılmamış ürünü istemez. Köy Bakkalı yumurta+domates üretilebilince 30 dk sayar. Dükkânlar soldan sağa açılır. "Yeni Ürün Açıldı" kartı aile başına bir kez | `tests/progression-v16.test.ts` |
| 4 Defter | Koyu modda ödül çipleri, kilitli siluetler, ipuçları ≥ 4,5:1 kontrast | `tests/ui-contrast.test.ts`, `verify-v16-journal.mjs` |
| 5 Ödüller | Başarımlar emeğe göre (10 → 1200 altın); koleksiyon ödülü seviye ve nadirliğe göre, eski ödülün altına inmez, tek sefer | `progression-v16` testleri |
| 6 Satış | 1, 3, 9, 24, 55, 135, 320, 900, 1850, 3500; tek fiyat kaynağı `sellValue`. Giderler: envanter yuvaları, enerji (80), pazar kutuları (120), atölye alanı (400), dekor | `gold-report.ts`, ekonomi testleri |
| 7 Battle Pass | "İlk Alışverişini Yap" 300 BP XP, tek sefer; geliştirici bakiyesi ve reddedilen alım sayılmaz | testler + `verify-season-purchase.mjs` |
| 8 Bölgeler | Bölge görünümü, canlılığı (hayvan, ışık, bayrak) ve üç aşamalı görselleri `content/regionIdentity.ts` içinde bölge başına bir veri kaydı; yeni bölge kod gerektirmez. Yeni bölge haritada bir kez tanıtılır: kamera kayar, bulutlar açılır, ad ve giriş cümlesi görünür; Geç ile biter. Kozmetik temalar yolu boyar ama bölgenin yol desenini korur | `tests/region-reveal.test.ts`, `verify-v16-region-reveal.mjs` |
| 9 Işık Yolları | Başarı kartı bir kez açılır ve sabit kalır; yıldızlar 120 ms arayla dolar (~0,5 sn); azaltılmış hareket desteklenir; çözümden sonra dokunuş ödülü tekrarlamaz | `verify-v16-puzzle.mjs` |
| 10 Dükkân rozetleri | Altın dişli = başlatılabilir, kum saati = üretimde, yeşil tik = ödül hazır, eksik malzemede rozet yok; gerçek veriden, yanıp sönmez | `tests/shop-ready.test.ts`, `verify-v16-shops.mjs` |

## Simülasyonlar (bot, tohum 7/11/23)

- Battle Pass, ücretsiz, 30 gün: 30 dk/gün oyuncu 24–30. seviyeye ulaşır; 7. günde 12–15.
- Bölge kapıları (60 dk/gün, medyan gün): B2 = 2, B3 = 18, B4 = 49. B5 ve sonrası Işık Jetonu köprü bedeliyle (400/500) sınırlı; bu PR jeton ekonomisini değiştirmedi.
- Altın: bot satın almadığı için altın birikiyor (30. gün ~30 bin). Açık uçlu harcama Kutu Kartı (1000 altın); bot bunu almıyor. Gerçek oyuncu testi gerekli.

## Bilerek yapılmayanlar / eksikler

1. Gerçek iPhone testi yok (dokunma, 60 FPS, çentik). Ölçümler Chromium web çıktısında.
2. Bölge görselleri mevcut özgün çizimlerdir; yeni ücretli görsel üretilmedi (onay gerekirdi). Bölge NPC'leri mevcut köylülerdir; her bölgeye yeni karakter çizilmedi.
3. Altın birikimi botta yüksek; gerçek oyuncu harcamasıyla yeniden ölçülmeli.
4. Eski `verify-mobile-layout.mjs` ve `verify-reward-flights.mjs` bu PR'dan önce de artık olmayan etiketleri (`Üreticiler`, `Sezon`) arıyordu; güncellenmedi.
