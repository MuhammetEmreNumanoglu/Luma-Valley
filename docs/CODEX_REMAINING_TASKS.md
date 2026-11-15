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

## Açık kalanlar
- **Vadi sanatı (Faz 4):** beş bölge için gerçekten farklı ağaç/yol/taş/köprü/bina/dekor setleri ve binaların harabe/onarım/tamam üç ayrı çizimi yok; yalnız beş tamamlanmış dönüm noktası görseli var. Yeni bitmap üretimi ücretli araç gerektirir (onay bekliyor).
- **Etkileşimli NPC'ler (madde 81):** köylüler yalnız animasyon; dokununca diyalog yok. Hamakta sallanan karakter eklenmedi.
- **B4 ve sonrası bölge hızı:** 30 günde B4 açılmıyor; fabric:5 ve yüksek seviye odun/taş istekleri ölçülüp dengelenmeli.
- **Battle Pass:** ücretsiz bot 30. günde 18–26. seviyede; düzenli oyuncunun gerçek hızı ölçülmeden kesin denge denemez. Plan örneklerindeki 10 sipariş/gün, 50/hafta, 300/sezon ve 400 kaynak hedefleri ekonominin ölçülen hızına göre 3–5/gün, 20/hafta, 100 ve 60'a indirildi.
- **Özel Köprü Yardımcısı (madde 83):** prototip yok; gerçek ödeme zaten kapalı.
- **Mevsim parçacıkları, ödül uçuşları, dark mode tam denetimi (madde 91–95):** önceki çalışmadaki hâliyle duruyor, bu oturumda yeniden denetlenmedi.
- **Kart açılış sandık animasyonu (madde 74):** mevcut akış duruyor, sandık iniş/ışık sahnesi ayrıca gözden geçirilmeli.
- `scripts/verify-season-notices.mjs` eski buton adları yüzünden güncellenmeli.
- Gerçek iPhone testi yapılmadı.
