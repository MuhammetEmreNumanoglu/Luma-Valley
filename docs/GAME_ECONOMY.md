# Oyun Ekonomisi (v5)

Sayılar kodda tek yerde: `src/content/balance.ts`, `resources.ts`, `progression.ts`, `valley.ts`, `farm.ts`.

## Birimler (v5'te yalnızca bunlar)
| Birim | Anlamı | Nereden gelir | Nereye gider |
|---|---|---|---|
| **Altın (Coin)** — tek harcanabilir para (kayıtta `leaves`) | Temel oyun parası | Siparişler, tüccar işleri (30–180), koleksiyon ödülleri (5–290), seviye (20+10·sv), görevler, başarılar, bulmaca (3 yıldız +20, Yankı +15), satış | Vadi binası kurma (30–120), görev/onarım bedelleri (L120–L1000), atölye alanları (100–5000), hücre açma, çanta bölmesi, **enerji**, ipucu (15), süslemeler |
| **Enerji** | İşlem kaynağı, yenilenir | 60 sn'de +1 (en çok 100), seviye +40, görevler, altınla satın alma | Kaynak kırma, vadi bina işleri, isteğe bağlı kutu takası |
| **XP** | Seviye | Birleştirme, sipariş, tüccar, görev, bulmaca | — |
| Taş, Ahşap, Seramik, Deniz Kabuğu, Kristal | Malzeme (birleştirilebilir ürün) | Atölye kaynak engelleri | Onarım görevleri, siparişler |

Altın her kapıyı tek başına açmaz: bölgeler ve yapılar ayrıca ürün, malzeme ve bulmaca ister; altın yalnızca bunların yanındaki bedeldir.

## Işık Jetonu ve kıvılcım kaldırıldı (v5)
- **Kullanım yerleri (eksiksiz tarandı):** jeton başarılar, seviye atlama (çift seviyede 1, 5'in katında 5), 3 yıldızlı ilk çözüm, Yankı bulmacası, günlük/haftalık görevler, görevlerdeki `T` ödülleri, Sv6+ koleksiyon ödülleri ve (hiç etkinleşmemiş) mağaza paketlerinden geliyordu; yalnızca ipucu (2) ve tam enerji dolumu (8) için harcanıyordu. Kıvılcım (v4) bulmacalardan ve onarımdan geliyor, anı/kristal işleri ve ışık görevleri için harcanıyordu.
- **Dönüşüm (kayıt v5, tek seferlik, ledger kimliğiyle):** 1 jeton = **30 altın** (eski fiyatlarda 8 jeton = 100 enerji ve 120 altın = 50 enerji → 1 jeton ≈ 30 altın), 1 kıvılcım = 10 altın. Aynı kayıt tekrar migration'dan geçse bile ikinci kez ödenmez.
- **Gerçek para:** Mağaza hiç yapılandırılmadığı için (`UnconfiguredStore` asla başarı döndürmez) gerçek parayla alınmış jeton olamaz. Yine de `purchases` listesi doluysa jetonlar aynı oranla dönüştürülür ve kayda `v5PaidTokensConverted` destek işareti yazılır. Mağaza ürünleri artık altın paketleridir (gerçek ödeme kapalı).
- Ödül tablolarındaki eski jeton sayıları aynı değerde altına çevrildi (başarı ×30, görev `T5` → 150 altın, günlük görev +30).
- Işık Yolları korunur: ilk çözüm altın + XP, 3 yıldız +20 altın, Yankı +15 altın; ve hikâye görevlerinin bulmaca adımlarını açar. Ayrı para birimi üretmez.

## Enerji satın alma
`25 Enerji` — ilk alım **60 altın**, aynı gün her alım ×1,5 (60 → 90 → 135 → 203 …), ertesi gün sıfırlanır. Erişim: üstteki enerji göstergesine dokun veya Pazar. 1 enerji ≈ 2,4 altın'dan başlar; en ucuz kaynak kırma enerjisi (Büyük Kaya: 30⚡ → 25 taş Sv1, satış değeri 25 altın) bu fiyatla satıştan geri kazanılamaz, artan fiyat da sonsuz altın→enerji→altın döngüsünü kapatır.

## Birleştirme (v5) ve ekonomiye etkisi
Üç aynı ürün; yalnız biri diğerinin üzerine bırakıldığında birleşir. Kombo: başarılı bir birleştirme %25 olasılıkla bir üst seviye ürün daha verir (`BALANCE.mergeBonusChance`). Hemen bitirme: 1 jeton = 1 dakika = 14 altın (`content/hurry.ts`). XP = yeni seviye. Daha yavaş ama öngörülebilir; kaynak engellerinin kademeli verimi yüksek seviye ihtiyacını dengeler.

## Denge v7 (2026-11-09)
Hedef: 30 dk/gün oynayan bir oyuncu bölgeleri düzenli aralıklarla açsın (≈20–30 gün), hiçbir görev haftalarca tek bir ürüne takılmasın ve her kutu başlangıcının bir alıcısı olsun. Ölçüm `npm run balance -- 30 300 7,11,23,31,47` (5 tohum, medyan gün; bot `scripts/autoplay.ts`).

Kurallar:
- **Zincirin tepesi istenmez.** Hiçbir görev bir zincirin en üst seviyesini istemez (final dahil); bir alt seviye, aynı adet. Çiçek ve meyvede 4. seviye hasat aşamasıdır, istenebilir.
- **Geç açılan malzemeler bir seviye düşük istenir:** kristal (4. bölgede açılır) 5. bölgede en çok Sv5, 6.'da Sv6, 7.'de Sv7; deniz kabuğu 6. bölgede Sv7. Kristal yalnız tek işçiyle kırılan engellerden gelir; istek bu hıza göre.
- **Kumaş:** 2. bölgede en çok Sv5. Dokuma: iplik 1 fide → 2 iplik (eskiden 2 → 2), kumaş topu 1 açmış çiçek → 2 (eskiden 1).
- **Fener Taşı geç kademeleri:** Sv30 ışıldak feneri (Sv4 fener ×3), Sv32 aile yadigârı (Sv4 anı ×3); diğer binaların Sv5 işleri gibi.
- **Kombo:** hasat edilen zincirler (hayvan, tarla, çiçek, meyve) %30, diğerleri %25.
- **Kutu:** çiçek ağırlığı 3 → 4 (en çok istenen aile), civciv ve buzağı 3.
- **Bakkal beş teklif** (her biri ayrıca 1 yıldız jetonu): buket + meyve sepeti, yumurta + domates, mısır + süt, üzüm + karpuz, balkabağı + buğday (v9: fasulye, arpa ve mercimek yerine üzüm, balkabağı, karpuz; kayıt v7 bunları aynı seviyede dönüştürür). Eskiden domates, mısır, fasulye, arpa, mercimek ve yumurtanın hiçbir kullanımı yoktu.

Simülasyon (medyan gün, 5 tohum):

| Profil | B2 | B3 | B4 | B5 | B6 | B7 | Final | Görev |
|---|---|---|---|---|---|---|---|---|
| Önce, 30 dk | 10 | 33 | 63 | 83 | 106 | 174 | — | 90/94 (210 gün) |
| Sonra, 10 dk | 15 | 40 | 71 | 103 | 136 | 180 | 210 | 94/94 |
| Sonra, 30 dk | 9 | 31 | 61 | 82 | 105 | 133 | 161 | 94/94 |
| Sonra, 90 dk | 7 | 30 | 54 | 77 | 98 | 120 | 135 | 93–94/94 |
| v8 (hasat ürünü istenmez), 10 dk | 13 | 43 | 73 | 111 | 151 | 193 | 242 | 93/94 |
| v8, 30 dk | 9 | 26 | 51 | 81 | 100 | 125 | 159 | 94/94 |
| v8, 90 dk | 7 | 30 | 73 | 88 | 106 | 144 | 163 | 94/94 |
| v9, 10 dk | 12 | 38 | 64 | 99 | 132 | 161 | 193 | 94/94 |
| v9, 30 dk | 8 | 28 | 48 | 69 | 93 | 118 | 135 | 94/94 |
| v9, 90 dk | 7 | 26 | 48 | 67 | 91 | 113 | 130 | 94/94 |

**v9 (2026-11-09):**
- Yeni başlangıç ürünleri 2–3 seviyede bir gelir (kutu: çiçek 1, buğday 3, tavuk 5, inek 7, meyve 9, domates 12, tahıl 14, mısır 16, sonra 19/22/25); Ağıl Sv5, buzağı Sv7. Bir test, kutu açılımlarının en az 2 seviye arayla geldiğini denetler.
- Siparişler yalnız oyuncunun o an üretebildiği ailelerden gelir (açık kutu havuzu, gelmiş malzeme teslimatları, açık vadi binaları). Önceden ilk 9 aile seviyeden bağımsız seçiliyordu.
- Hasat: 4. seviye inek 6 süt, diğerleri 5 ürün (önce 2). Dükkân tarifleri 3'er ürün ister; bir hasat ≈ iki teslimat.
- Atölye alanları: ilk ek alan 150 altın, sonrakiler yıldız jetonu (9, 18, 30, 45, 60, 80, 100), her zaman onay sorulur.
- Bot: açık bir görevin beklediği malzemenin engelini önce kırar (önceden yarım kalan odun/taşa devam edip hikâyeyi bekletebiliyordu).

**Kilitlenme düzeltmesi (oyun hatası):** Atölye malzemeleri (taş, odun, seramik, kabuk, kristal) yalnız engellerden gelir ve engelin kademesi oyuncu seviyesine bağlıydı (Sv26+ → hep Sv4 malzeme). Ürün seviye düşürülemediği için yüksek seviyede "Kristal Sv3" isteyen bir göreve gelen oyuncu o isteği hiç karşılayamıyordu. Artık Kaynak Teslimatı'nda Sv1'den mevcut kademeye kadar malzeme seviyesi seçilir (`placeResource` `tier`); düşük kademe daha az enerji ister.

Sınırlar: Bot mükemmel bir oyuncu değildir (tek atölye alanında oynar, ek alan açmaz, hızlandırma kullanmaz); tohumlar arası fark büyüktür, tablo medyandır. Gerçek oyuncu testi yapılmadı.

Bot düzeltmeleri (2026-11-09): eski tüccar tarifi yüzünden her oturumu ilk adımda bitiriyordu (önceki simülasyon sonuçları geçersizdi); şimdi hasat ürünlerini kaynağına çevirir, işçi meşgulken kırma denemez, engel sınırı dolunca istenmeyen engeli kırar, istenen en düşük malzeme seviyesini getirir, hedef seviyeyi aşan birleştirme yapmaz, tahta sıkışıkken kutu açmaz, depo doluyken bina işi başlatmaz, artan altını enerjiye çevirir.

## Çiçek ve meyve (kayıt v6, 2026-11-08)
Çiçek ve meyve zinciri 4. seviyede biter. 4. seviye ürüne dokununca hasat edilir: Açmış Çiçek → 2 Çiçek Buketi, Meyve Kâsesi → 2 Meyve Sepeti (ambara). Bakkal: 2 buket + 2 sepet → 3 dk → 90 altın + 12 XP. Vadi işlerinde eski 5+ seviye çıktı seviye başına 2 hasat ürünüdür; eski kayıtlardaki 5+ seviye ürünler 2 × (L − 3) hasat ürününe dönüşür.

**Görevler hasat edilen ürün istemez (2026-11-09):** 4. seviye hayvan, tarla, çiçek ve meyve dokununca hasat edilip kaybolduğu için görev istemez; hasat ürünü (buket, sepet, süt…) de istenmez. Eski istekler: 4. seviye çiçek/meyve → 3. seviye ×2; daha yükseği → iki seviye düşük atölye malzemesi (çiçek → odun, meyve → 1. bölgede taş, sonra seramik). `tests/harvest-flowers.test.ts` bunu denetler.

**Dükkânlar ve yıldız jetonu:** Vadi Tüccarı ve Bakkal her teslimatta 1. seviye yıldız jetonu verir (Bakkal ayrıca altın ve XP). Dükkân işleri yalnız altınla hızlandırılır; yıldız jetonu kaynak engelleri ve vadi işleri için kullanılır.

Kutular: her teslim edilen sipariş ve her toplanan keşif 5 tohum kutusu verir (`BALANCE.crate.orderBonus`, `discoveryBonus`).

## Simülasyon (`npm run simulate`, 2026-11-06, 210 gün)
| Profil | 30. gün | 90. gün | 210. gün | Bölge açılış günleri |
|---|---|---|---|---|
| İlk kez merge oynayan (20 dk, yavaş, bulmacadan kaçınır) | B2, 30 görev | B4, 55 | B6, 79 | B2=16, B3=45, B4=71, B5=102, B6=162 |
| 10 dk/gün | B2, 28 | B3, 46 | B4, 50 | B2=21, B3=48, B4=106 |
| 30 dk/gün | B3, 39 | B5, 64 | **B7, 83** | B2=11, B3=28, B4=59, B5=78, B6=123, B7=201 |
| Uzun süre aktif (90 dk/gün) | B3, 47 | B6, 78 | **B7, 93/94** | B2=5, B3=15, B4=33, B5=46, B6=68, B7=124 |
| Yalnızca görev (30 dk/gün) | B3, 37 | B5, 69 | B7, 87 | B2=11 … B7=177 |

Okuma: v4'e göre ilerleme daha akıcı (v4'te 30 dk/gün profili 5. bölgede takılıyordu; şimdi 201. günde 7. bölge). Tahta dolması nadir (0–26 oturum / 210 gün). 10 dk/gün oyuncu 4. bölgede yavaşlıyor ve altın biriktiriyor (26 bin) — altın harcama alanları (atölye alanları, süslemeler) bot tarafından kullanılmıyor; gerçek oyuncu testiyle ölçülmeli. "Erken biten oturum" hâlâ yüksek: bot, işler beklerken yapacak iş bulamıyor.
