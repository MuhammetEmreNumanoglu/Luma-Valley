# Kalan işler ve kabul kapıları

_Son güncelleme: 15 Kasım 2026 akşamı, Claude Code oturumu. Ölçümler `ECONOMY_SIMULATION.md` sonunda._

## Bu oturumda kapananlar
- Simülasyon botunun kilitli dükkân döngüsü (eski ölçümler bu yüzden yanlıştı).
- Aşırı kutu kazanımı: kombo kutusu kaldırıldı; 20 dakikada kazanılan kutu 97–122 → 66–73.
- Ürün ailesi açılış hızı plan hedefine çekildi (2/3/5/7/10).
- Siparişlerin erişilemez yüksek seviye ürün istemesi (seviye tavanı 5).
- Battle Pass: daha zor günlük/haftalık/sezonluk görevler, seviye başına 300 XP, v15 kayıt migrasyonu seviyeyi koruyor; ilk gün en fazla 11. seviye.
- Hazır dükkân işareti (altın çerçeve + kum saati), sipariş şeridi sıralaması, Görevler sekmesinde sayı yerine nokta.
- Vadi köylüleri: yürüyen köpek, bahçe sulayan köylü, top oynayan çocuklar (prosedürel çizim).
- Premium 30. seviye final ödülü tasarımı (yalnız önizleme, verilmiyor).
- `npm run sprites` Node'da yeniden çalışıyor (shim ve asset hook). Not: tüm sprite'ları yeniden üretmek mevcut commit'li çıktıdan çok farklı bir set yazıyor; bu yüzden yalnız yeni ikon eklendi.

## İkinci tur (aynı gün, ürün sahibinin listesi)
- **Vadi sanatı (Faz 4):** ilk beş bölgenin her biri için özgün simge yapı ve köprü/kapı, üç aşamada (yıkık, onarımda, onarılmış); bölge ağacı, bölge dekoru ve bölgeye özel yol (papatya kenarlı toprak, Arnavut kaldırımı, çiçekli kaldırım taşı, ahşap iskele, yosunlu fenerli orman yolu). 40 sprite, ücretsiz three.js hattı, üçüncü taraf varlık yok (`ORIGINAL_REGION_ART.md`). Haritada üç aşamada tarayıcıda doğrulandı.
- **Etkileşimli NPC'ler:** köylüye dokununca diyalog açılır, ilk sohbette küçük hediye (altın/enerji) bir kez verilir.
- **Köprü Yardımcısı prototipi:** odun/taş temizleme süresi %50; yalnız DEV test kaydıyla açılır, mağazada "gerçek ödeme kapalı" kartı.
- **Battle Pass:** 260 XP/seviye; kazanılmış jetonla bir alışveriş yapan ücretsiz oyuncu 21–30. günde 30. seviye. Jeton geliri artırıldı (özel sipariş ve günlük set 30 jeton).
- **B4+ hızı:** B4 ~43–51. gün, B5 ~60–66. gün (15 dk/gün oynayan için B5 90 günü aşıyor).
- **Kutu birikimi:** 30/60/90. günde eldeki kutu 40–101.
- **Karanlık mod:** tüm sekmeler, mağaza alt sekmeleri, ayarlar, depo, enerji, seviye pencereleri tarandı; pasif ve krem düğmeler artık koyu temaya uyuyor (`scripts/verify-dark-mode.mjs`).
- **Mevsim efektleri:** beş tema × yüksek/düşük kalite tarandı (`scripts/verify-season-effects.mjs`), 59–61 fps; kar taneleri açık zeminde okunur hâle getirildi, yoğunluk 40/14 (yüksek/düşük).
- `verify-season-notices.mjs` ve `e2e-web.mjs` güncel arayüze göre düzeltildi; ikisi de geçiyor.

## Açık kalanlar
- Bölge 6 ve sonrası için üç aşamalı özgün set yok (bölge 6 kafesi yalnız onarılmış hâlde eski görselle).
- Yeni bölge çizimleri low-poly kod modelleridir; elle boyanmış/yapay zekâ görseli kalitesinde değildir. Daha yüksek ayrıntı için ücretli araç ürün sahibinin onayını bekler.
- Hamakta sallanan karakter eklenmedi.
- B6+ dengesi ölçülmedi (90 günde açılmıyor).
- **Kart açılış sandık animasyonu (madde 74):** mevcut akış duruyor, ayrıca gözden geçirilmeli.
- Gerçek iPhone testi yapılmadı.
