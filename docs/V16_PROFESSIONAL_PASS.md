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
- Altın (`scripts/gold-report.ts 90`, medyan; eldeki / kazanılan / harcanan):

  | dk/gün | 15. gün | 30. gün | 90. gün |
  |---|---|---|---|
  | 15 | 19.943 / 30.522 / 11.065 | 28.022 / 43.880 / 16.360 | 60.497 / 88.044 / 26.445 |
  | 30 | 22.039 / 33.064 / 11.065 | 29.792 / 46.817 / 17.065 | 65.791 / 91.231 / 26.005 |
  | 60 | 23.737 / 34.629 / 10.360 | 31.738 / 48.058 / 16.360 | 88.273 / 113.693 / 26.565 |
  | 90 | 25.095 / 42.120 / 16.840 | 42.124 / 60.284 / 18.200 | 115.725 / 157.913 / 39.788 |

- Altın: bot satın almadığı için altın birikiyor (30. gün ~30 bin). Açık uçlu harcama Kutu Kartı (1000 altın); bot bunu almıyor. Gerçek oyuncu testi gerekli.

## Bilerek yapılmayanlar / eksikler

1. Gerçek iPhone testi yok (dokunma, 60 FPS, çentik). Ölçümler Chromium web çıktısında.
2. Bölge görselleri mevcut özgün çizimlerdir; yeni ücretli görsel üretilmedi (onay gerekirdi). Bölge NPC'leri mevcut köylülerdir; her bölgeye yeni karakter çizilmedi.
3. Altın birikimi botta yüksek; gerçek oyuncu harcamasıyla yeniden ölçülmeli.
4. Eski `verify-mobile-layout.mjs` ve `verify-reward-flights.mjs` bu PR'dan önce de artık olmayan etiketleri (`Üreticiler`, `Sezon`) arıyordu; güncellenmedi.

---

# Ek talimat (2026-11-16): yerleşim animasyonu, BP dengesi, dinamik kutu olasılığı, DEV TEST

## 1. Tahtaya gelen ürün
Motor, dışarıdan tahtaya konan her ürün için gerçek hedef hücreyi ve kaynağı (`origin`: depo, çanta, kutu, dükkân, görev, vadi) olay olarak verir; arayüz yeniden tahmin etmez. Ürün kaynağından hücresine uçar (~0,5 sn), bir kez yerleşir (%112 → %100), altın + turkuaz çerçeve ve hafif parıltı ~1,2 sn'de söner, 6 küçük kıvılcım. Birden fazla ürün 220 ms arayla sırayla gelir. Gezinme modunda hedef ekran dışındaysa kamera kayar (parmak bir ürünü sürüklerken asla). Azaltılmış hareket: uçuş yok, yalnız çerçeve. "Tahtaya al" depo panelini kapatır ki ürünler görünsün. Tahta doluysa komut reddedilir ("Tahtada boş yer yok…"), dükkân ödülü depoya gider.
Testler: `tests/board-arrival.test.ts` (tek, beş, hızlı art arda, son hücre, dolu tahta, çanta, kutu, dükkân ödülü), `scripts/verify-arrivals.mjs` (tarayıcı: depo 1 + 5, çanta, hızlı kutu, son hücre, gezinme/kaydırma sonrası).

## 2. Battle Pass görevleri
Tablo `docs/BATTLE_PASS.md`. Haftalık görevlere günde en çok hedefin 1/3'ü, sezonluk görevlere 1/10'u sayılır; bu yüzden uzun bir ilk oturum bile haftalığı 3 günden, sezonluğu 10 günden önce bitiremez. Simülasyon `scripts/bp-tasks-report.ts` (5 profil, 1/3/4/7/10/15/20/30. günler) → `docs/bp-tasks-report-v16.txt`. Bot (alt sınır): 1. gün haftalık/sezonluk 0; 3. gün 4 haftalık; 15. gün 3/5 sezonluk; 30. gün BP 22–26.

## 3. Dinamik kutu olasılığı (`src/engine/crateOdds.ts`)
- Stok: tüm atölye tahtaları + çanta + depo + taşan eşyalar + hasat stoğu, her yer bir kez. Seviye L ürün = 3^(L−1) temel ürün, en çok 9 (tek bir büyük ürün hesabı bozmasın). Hasat ürünü (yumurta, süt…) kendi ailesine 1 sayılır.
- Ağırlık: `w = taban / (s + 1)`, `s = max(0, stok − 0,5·talep) / 10`; açık sipariş ve tüccar talebi ayrıca en çok +%50 çarpan verir (garanti yok).
- Normalize edilir (toplam %100); hiçbir açık aile adil payının %40'ının altına düşmez. Kilitli aile havuza hiç girmez. Aynı tek tohumlu RNG çekilişi kullanılır, saf ve deterministik; sabit tarifler değişmez.

| Durum | Sonuç |
|---|---|
| Başlangıç (inek, buğday) | %50 / %50 |
| A: 10 yumurta / 10 domates | %50 / %50 |
| B: 50 yumurta / 5 domates | yumurta %20, domates %80 |
| C: 40 yumurta / 5 domates / 15 buğday | domates %52,6, buğday %31,6, yumurta %15,8 |
| D: 30 yumurta / 0 domates | yumurta %20 (sıfır değil), domates %80 |
| 30 süt / 2 domates, tüccar 5 domates istiyor | süt %20, domates %80 |

Testler `tests/crate-odds.test.ts` (A–G, 10.000 tohumlu çekiliş). Bölge simülasyonu (60 dk/gün): B2 2, B3 19, B4 51, B5 80. gün; görevler 81/94 (önce 71/94), ekonomi bozulmadı.

## 4. DEV TEST araçları
Işık Mağazası → İşlemler (yalnız geliştirme derlemesi): "DEV TEST — GERÇEK OYUN DURUMU DEĞİŞİR". +1 / +5 / +10 Level, Level N'e Git (yalnız ileri, en çok 60; XP 0'dan başlar, atlanan seviye ödülleri verilmez). Vadi Bölgeleri: her bölge için ad, Açık/Kilitli, Test İçin Aç (tekrar basmak bir şey değiştirmez), Bölgeye Git, Harabe / Onarımda / Tamamlanmış önizlemesi (yalnız görünüm, kayıt değişmez). İlk işlemden önce kayıt yedeklenir; "Test Öncesi Kayda Dön" geri alır. Üretim derlemesinde İşlemler sekmesi yoktur ve `applyDevGrant` her isteği reddeder (`tests/dev-test-tools.test.ts`, `scripts/verify-dev-test-tools.mjs`).
