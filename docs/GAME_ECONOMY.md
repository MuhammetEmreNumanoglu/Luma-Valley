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

## Simülasyon (`npm run simulate`, 2026-11-06, 210 gün)
| Profil | 30. gün | 90. gün | 210. gün | Bölge açılış günleri |
|---|---|---|---|---|
| İlk kez merge oynayan (20 dk, yavaş, bulmacadan kaçınır) | B2, 30 görev | B4, 55 | B6, 79 | B2=16, B3=45, B4=71, B5=102, B6=162 |
| 10 dk/gün | B2, 28 | B3, 46 | B4, 50 | B2=21, B3=48, B4=106 |
| 30 dk/gün | B3, 39 | B5, 64 | **B7, 83** | B2=11, B3=28, B4=59, B5=78, B6=123, B7=201 |
| Uzun süre aktif (90 dk/gün) | B3, 47 | B6, 78 | **B7, 93/94** | B2=5, B3=15, B4=33, B5=46, B6=68, B7=124 |
| Yalnızca görev (30 dk/gün) | B3, 37 | B5, 69 | B7, 87 | B2=11 … B7=177 |

Okuma: v4'e göre ilerleme daha akıcı (v4'te 30 dk/gün profili 5. bölgede takılıyordu; şimdi 201. günde 7. bölge). Tahta dolması nadir (0–26 oturum / 210 gün). 10 dk/gün oyuncu 4. bölgede yavaşlıyor ve altın biriktiriyor (26 bin) — altın harcama alanları (atölye alanları, süslemeler) bot tarafından kullanılmıyor; gerçek oyuncu testiyle ölçülmeli. "Erken biten oturum" hâlâ yüksek: bot, işler beklerken yapacak iş bulamıyor.
