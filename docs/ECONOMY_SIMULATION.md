# Ekonomi denemesi

Bu rapor oyuncu verisi veya cihaz testi değildir. 7 ve 30 günlük veriler sipariş/keşif kutu bonusu 1 iken, 90 günlük veriler önceki 2 kutu ayarıyla alınmıştır; 90 günlük model yeni ayarla yeniden çalıştırılmamıştır. `scripts/balance-gates.ts`, gerçek motor komutlarını kullanan basit ve açgözlü bir botla, tohumlar 7, 11 ve 23 için 90 günü modeller. Bot günde üç oturuma ayrılmış 15, 30, 60 veya 90 dakikalık bütçeyle oynar; bulmacaları mükemmel çözer, erişilebilir ücretsiz başarı ve sezon ödüllerini alır. Bir oturumda birkaç kez ilerleme bulamazsa bekler; bütün olası oyuncu stratejilerini veya ücretli profili temsil etmez. Süreler tahmindir, gelir veya tamamlanabilirlik garantisi değildir.

Çalıştırma örneği: `node --no-warnings --import ./scripts/ts-register.mjs scripts/balance-gates.ts 30 90 7,11,23`

30 günlük güncel denemede bölge açılışının medyan günü şöyledir; Bölge 4 her profilde 30 gün içinde açılmadı:

| Günlük süre | Bölge 2 | Bölge 3 |
| --- | ---: | ---: |
| 15 dk | 3 | 26 |
| 30 dk | 2 | 20 |
| 60 dk | 1 | 18 |
| 90 dk | 1 | 20 |

Önceki iki kutu ayarıyla yapılan 90 günlük denemede Bölge 4 medyanı sırasıyla 63, 47, 42 ve 40. gündü; Bölge 5 hiçbir profilde 90 gün içinde medyana ulaşmadı.

Önceki iki kutuluk ayarda iki tohum 90. güne kadar bölge 5'e ulaştı; üçlü medyan hâlâ ulaşmadı. Çeşitli senaryolarda kumaş, odun ve sonraki köprüdeki jeton şartı beklemeye neden oluyor. Gerçek oyuncuların hızını bilmek için daha geniş bot ve oyuncu testleri gerekir.

| Günlük süre | 7. gün jeton / kutu aralıkları | 30. gün jeton / kutu aralıkları | 90. gün jeton / kutu aralıkları |
| --- | --- | --- | --- |
| 15 dk | 300–393 / 20–38 | 272–544 / 266–410 | 65–129 / 934–998 |
| 30 dk | 435–557 / 45–105 | 387–489 / 337–433 | 282–356 / 991–999 |
| 60 dk | 521–636 / 44–100 | 472–672 / 286–469 | 296–383 / 990–999 |
| 90 dk | 471–614 / 105–120 | 362–585 / 434–530 | 51–392 / 996–999 |

Jetonlar önceki köprü ödemeleri düşüldükten sonra kalan bakiyedir. Bot en az 10 boş hücre görmedikçe kutu açmıyor; uygun hamle bulamayınca da art arda üç beklemeden sonra o oturumu sonlandırıyor. Bu kısıtlar gerçek oyuncu davranışı değildir ve özellikle 30, 60 ve 90 dakikalık profilleri birbirine yaklaştırır. Önceki iki kutuluk kombo hediyesi korunsa ve sipariş/keşif ödülleri beşten bire indirilse bile modelde kutu yığılması çözülmedi; bunu bitmiş denge olarak göstermeyin.

Ücretsiz jeton kaynakları arasında tüccar, alınabilir başarılar, Battle Pass, üç günlük görevin tamamlanma ödülü ve günde bir teslim edilen özel köylü siparişi vardır. Son iki kaynak 20'şer jetondur; özel sipariş ödülü gün bazında kaydedilir ve saat geriye alınsa bile ikinci kez verilmez. Belirlenen ilk beş köprü fiyatı 2.000 altın, sonra 200/300/400/500 Işık Jetonudur. Toplam jeton şartı 1.400'dür. Model yalnızca bu kaynakların varlığını ve örnek bot sonuçlarını gösterir; B5 ve sonrasının makul sürede ücretsiz tamamlanması henüz kanıtlanmadı.

Bir kombo sonrasında enerji düşme olasılığı %7'dir. Kombo olasılığı normal birleştirmede %30, hasat ailelerinde %35 olduğundan, bağımsız iki çekilişte birleşme başına teorik etkin düşme oranı sırasıyla %2,1 ve %2,45'tir. Görünür/açılabilir eşya ailelerinin temel kutu ağırlıkları eşittir; dolmak üzere olan tahtayı birleştirilebilir tutmaya çalışan koruma mekanizması ayrıca sonuçları etkileyebilir.

## Battle Pass: 30 günlük bağımsız model

`scripts/simulate-season.ts` aynı üç tohum için günde 08.00, 14.00 ve 20.00'de üç oturum ve 15/30/60/90 dakikalık toplam bütçe varsayar. Gerçek motor, ücretsiz sezon görevlerinin ve erişilebilir seviye ödüllerinin alınmasını işler. Üç senaryo birbirinden ayrıdır:

- **Ücretsiz, alışverişsiz:** Satın alma yapılmaz.
- **Ücretsiz, kazanılmış jetonla alışverişli:** Bot, oyun içinde kazandığı en az 20 jetonla uygun olduğunda +30 enerji satın alır; geliştirici bakiyesi veya gerçek para kullanılmaz. Ardından hak kazanılan alışveriş görevi alınır.
- **Geliştirme premium mock:** `MockPurchaseProvider(true)` ile `pass.moon` yalnız ayrı `DemoState` üzerinde etkinleşir. `seasonLevel` mock formülü botun istatistikleriyle hesaplanır. Bu, gerçek oyun kaydına ücretli hak veya ödül verildiği anlamına gelmez. Mevcut mock düzey formülü gerçek ücretsiz Pass XP formülünden farklıdır.

Çalıştırma örneği: `node --no-warnings --import ./scripts/ts-register.mjs scripts/simulate-season.ts 30 7,11,23`.

| Günlük süre | Ücretsiz alışverişsiz 1. gün | 7. gün | 14. gün | 30. gün | Kazanılan jetonla alışveriş, 1. gün | 3. gün | 7. gün | Mock premium 1. gün | Mock premium 3. gün |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 15 dk | 2 | 20–23 | 30 | 30 | 22 | 29 | 30 | 5–6 | 30 |
| 30 dk | 7 | 21–25 | 30 | 30 | 27 | 30 | 30 | 24–25 | 30 |
| 60 dk | 7 | 23–25 | 30 | 30 | 27 | 30 | 30 | 30 | 30 |
| 90 dk | 7–9 | 21–23 | 30 | 30 | 29 | 30 | 30 | 30 | 30 |

Rakamlar üç tohumun seviye aralığıdır; tüm alışverişli botlar ilk oyun gününde kazanılmış jetonlarla alım yaptı. Modelde bot başarıları ve sezon ödüllerini gecikmeden alır, bulmacaları kusursuz çözer ve yeterli boş hücre yoksa kutu açmaz. Bu yüzden gerçek oyuncunun Pass'i aynı sürede bitireceği veya daha uzun süreli oturumun mutlaka daha hızlı ilerleyeceği söylenemez. Özellikle 30/60/90 dakika değerleri botun erken durma kararından etkilenir.

Günlük görev havuzunda birleştirme 8/10/12 adet için 20 XP; sipariş 1/2/1 adet veya bir satış için 25 XP; üretim 5/6/7 için 30 XP; kaynak yığını 1 için 35 XP; kutu 5/6/7 için 40 XP verir. Bir günde sipariş veya satış görevlerinden yalnız biri görünür. Bu nedenle normal günlük görevlerin teorik toplamı 150 XP'dir. Haftalık 100 birleştirme, 20 sipariş ve 50 üretim görevleri ayrı ayrı 150'şer XP'dir. Sezonluk 500 birleştirme, 100 sipariş ve 250 üretim görevleri ayrı ayrı 300 XP'dir; ilk geçerli oyun içi alışveriş ise bir kez 2.000 XP verir. Eski kayıttan devreden bazı günlerde günlük hedefler ve 50 XP'lik eski ödüller korunur.

Sezon sınırı 3.000 XP, her seviye 100 XP'dir. Dolayısıyla alışveriş ödülü tek başına sezonun **üçte ikisini ve 20 seviyeyi** karşılar. Sıfırdan başlandığı ve diğer bütün günlük görevlerin başarıldığı teorik örnekte, alışveriş sonrası kalan 1.000 XP en erken yedi tam günlük 150 XP setiyle tamamlanabilir; haftalık ve diğer sezonluk ödüller bu süreyi azaltabilir. Bot sonuçlarında satın alma daha da erken hızlanma yarattı. Tavan sonrası XP artmadığından sonraki görevlerin ilerleme değeri azalır. İstenen 2.000 XP değerini değiştirmedik; bu durum denge riski olarak kaydedilmiştir.

### Kabul ve ileride değerlendirilebilecek tasarım

Bu ölçümler 30 günlük sezonda 30. seviyeye dengeli dağılan ilerleme kabulünü **karşılamıyor**. Olası bir alternatif, satın alma görevinin vaat edilen toplam 2.000 XP'sini açıkça göstererek ödülü bir sezon bankasına kaydetmek, bu bankadan kullanılabilir XP'yi haftalara yaymak ve tüm günlük/haftalık görevlerin akışını ayrıca yeniden dengelemektir. Örneğin 1.000 XP hemen, sonraki dört haftanın her birinde 250 XP kullanılabilir olabilir. Bu yaklaşım dahi tek başına diğer görevlerle 14. günde tavana ulaşmayı engellemez; o yüzden bütün görev ödüllerinin ve ilerleme eğrisinin birlikte tasarlanıp tekrar simüle edilmesi gerekir. Oyuncuya gecikmeli kullanılabilirliği satın almadan önce açıkça göstermek ve sezon sonunda bekleyen XP'ye ne olacağını belirtmek gerekir.

Bu sadece tasarım önerisidir: şu anki sistemde alışveriş ödülü alındığında 2.000 XP doğrudan uygulanır, sessizce değiştirilmedi. Ayrıca 20 seviyeyi hemen vermek, 3.000 XP'lik Pass tavanı ve ilerlemeyi yaklaşık 30 güne yaymak hedeflerinin üçünü birlikte sağlamak için ek bir zamanlama kuralı gereklidir; bu kural gerçek oyuncu verileriyle doğrulanmadan kabul edilmiş sayılmamalıdır.


## 15 Kasım 2026 akşamı — Claude Code oturumu, güncel ölçüm

**Önce bir hata bulundu:** dükkân açılış sayaçları eklendikten sonra simülasyon botu kilitli dükkâna sürekli teslimat deniyor, reddedilince oturumu bitiriyordu. Yukarıdaki tablolar bu yüzden gerçekçi değildi (bot 30 günde 7. seviyede kalıyordu). `scripts/autoplay.ts` artık `shopOpen` kontrol ediyor.

Değişiklikler: kombo başına 2 kutu kaldırıldı (`comboGift: 0`), ürün aileleri 1/3/5/6/8/10/12/14/15/18. seviyelerde açılıyor (L1: 2, L3: 3, L6: 5, L10: 7, L15: 10 aile), siparişler en fazla 5. seviye ürün istiyor (eski kural 15. seviyede 9. seviye odun istiyordu).

### İlk dakikalarda kutu (scripts/crate-pace.ts, 5 tohum)

| | 10. dk eldeki | 20. dk eldeki | 20 dk'da kazanılan |
|---|---:|---:|---:|
| Önce (kombo 2 kutu) | 61–67 | 42–79 | 97–122 |
| Şimdi | 59–64 | 12–27 | 66–73 |

Başlangıç 50 (40 normal + 10 günlük) korunuyor. Kalan kazanım seviye ödülleri (L2–5: 8/9/10/11 kutu; L4 = 20 enerji + 10 kutu), keşif ve sipariş başına 1 kutu ve otomatik dolumdan geliyor.

### Bölge kapıları (scripts/balance-gates.ts, 30 gün, tohum 7/11/23, medyan gün)

| Günlük süre | B2 | B3 | B4 | 30. gün seviye |
|---|---:|---:|---:|---|
| 15 dk | 3 | 23 | açılmadı | 17–19 |
| 30 dk | 2 | 18 | açılmadı | 18–19 |
| 60 dk | 2 | 19 | açılmadı | 18–20 |
| 90 dk | 1 | 18 | açılmadı | 18–19 |

B4 köprüsü (300 jeton + odun 8/taş 7) 30 gün içinde açılmıyor; en çok bekleten istekler `fabric:5` (r2_clock3, r3_hut_a) ve 6–7. seviye odun/taş. Bu, DECISIONS.md'deki "bölgeler 20–30 günde bir" kararıyla uyumlu ama B4+ için ayrıca ölçülmeli.

### Battle Pass (scripts/simulate-season.ts, seviye başına 300 XP, 3 tohum, min–maks seviye)

| Günlük süre | Profil | 1. gün | 7. gün | 14. gün | 30. gün |
|---|---|---|---|---|---|
| 15 dk | ücretsiz | 0 | 11 | 15–16 | 21–26 |
| 15 dk | kazanılmış jetonla 1 alışveriş | 6–7 | 17–18 | 20–23 | 27–29 |
| 30 dk | ücretsiz | 2 | 8–10 | 11–16 | 18–23 |
| 30 dk | alışverişli | 8–9 | 15–17 | 20–21 | 28–29 |
| 60 dk | ücretsiz | 2 | 8–9 | 13 | 18–20 |
| 60 dk | alışverişli | 9–11 | 15–16 | 19 | 27–29 |
| 90 dk | ücretsiz | 4–5 | 8–10 | 12–16 | 19–24 |
| 90 dk | alışverişli | 11 | 15–16 | 18–20 | 25–26 |

İlk gün hiçbir profil 11. seviyeyi geçmiyor; 2.000 XP'lik alışveriş görevi korunuyor ve artık sezonun ~%22'si (9.000 XP'nin 2.000'i). Bot ilk haftadan sonra tahta/enerji nedeniyle yavaşlıyor (günde ~30 birleştirme, ~0 sipariş); bu yüzden ücretsiz 30. gün değerleri gerçek düzenli oyuncu için alt sınır sayılmalı. Daha uzun oynamak botta hız kazandırmıyor; bu botun sınırı, oyuncu davranışı değil.
