# Oynanış Döngüsü (v5, 2026-11-06)

> v5 değişiklikleri: Birleştirme bilinçli yapılır (ürünü aynı ürünün **üzerine** bırak; yan yana koymak birleştirmez). Taş, ahşap, seramik, kabuk ve kristal **atölyedeki büyük kaynaklardan** kırılarak gelir; son kırma kareyi açar, yenileri Kaynak Teslimatı ile gelir. Vadi hikâye, yapılar ve üretim binaları içindir. Tek para Altın'dır (Işık Jetonu ve kıvılcım yok). İlk 30 dakikada "vadide ilk kaya" adımı yerine atölyedeki kayanın kırılması öğretilir; alt bar sırası Atölye · Vadi · Görevler · Defter · Pazar.

Bu belge, oyuncunun ilk dokunuştan ana restorasyonun sonuna kadar ne yaptığını anlatır. Sayılar `GAME_ECONOMY.md`'de, açılma şartları `PROGRESSION.md`'de, ürün kaynakları `ITEM_SOURCES.md`'de.

## Temel döngü

```
Tohum kutusu ──► Atölyede birleştir (3→1, 5→2) ──► Koleksiyon keşfi (tek seferlik altın)
      ▲                    │                                   │
      │                    ▼                                   ▼
Seviye ödülü ◄── XP ◄── Sipariş / Tüccar işi (altın + XP) ◄── Hayvan ve tarla ürünleri
      │                                                         │
      ▼                                                         ▼
Vadi: kaya, ağaç, kil yatağı, kristal damarı (enerji + süre) ──► odun, taş, kil, kristal
      │
      ▼
Görev teslimi → yapı onarımı → yeni yenilenebilir bina → yeni bölge
      ▲
Işık Yolları (bulmaca) → kıvılcım → fener işleri, anılar, kristal, ışık görevleri
```

Her kaynak bir sonrakini besler:
- **Altın** siparişlerden, tüccar işlerinden, koleksiyon ödüllerinden, seviye atlamadan ve görevlerden gelir; yeni vadi binalarını kurmaya, onarım bedellerine, atölye alanlarına, hücre açmaya ve çanta bölmesine harcanır.
- **Enerji** yalnızca vadi işlerine (ve isteğe bağlı kutu takasına) harcanır. Birleştirme, teslim, bulmaca ve koleksiyon enerji istemez; enerji bitince oyun durmaz.
- **Kıvılcım** Işık Yolları'ndan ve tamamen onarılan yapılardan gelir; anılar, kristal ve ışıkla ilgili görevler ister.
- **XP** seviye atlatır; her seviye bir sonraki seviyede neyin açılacağını önceden gösterir (sol üstteki seviye rozeti).

## İlk 30 dakika (gerçekte kodlanan akış)

| Dakika | Ne olur | Nasıl öğretilir |
|---|---|---|
| 0–1 | Kısa giriş hikâyesi, atölye açılır | — |
| 1–2 | İlk üçlü birleştirme (tek tohumu diğer ikisinin yanına sürükle) | Tahtada halka + balon |
| 2 | Ekran hafifçe kararır, sol alttaki **tohum kutusu** çerçevelenir: "Yeni ürünler üretmek için bu kutuya dokun!" | Gerçek butonun konumu ölçülür; tek sakin parıltı |
| 2–4 | Kutudan gelen tohumlar birleştirilir, ilk filizler ve fideler | Balon: "Kutudan gelenleri üçlü birleştir" |
| 4 | İlk hikâye görevi kendini tanıtır (Lumi); Görevler sekmesi işaretlenir | Sekme halkası |
| 5 | İlk görev tamamlanır → tek bir onarım kartı (önce/sonra) | Moment kuyruğu |
| 5–6 | İlk keşif ödülleri: Defter'de kırmızı nokta → "Hepsini topla" | Sekme halkası |
| 6–8 | Seviye 2: sol üstteki rozet işaretlenir; modal sonraki seviyenin ödüllerini ve açılanlarını gösterir | Rozet halkası |
| 8–10 | İlk siparişler (Uyuyan Bahçe görevinden sonra) → altın ve XP | Sipariş şeridi halkası |
| 10–12 | "Odun ve taş vadiden gelir" → Vadi; kamera ilk büyük kayaya döner; 1. aşama başlar (5 enerji, 1 dk) | Kaya halkası + balon |
| 12–20 | Kayanın 2. aşaması, ilk ağaç; Mira'nın evi için odun birleştirme; tüccara çiçek/yumurta | Sıradaki hedef çipi |
| 20–30 | Mira görevi → Kereste Bahçesi ve Taş Ocağı açılır (bir kez kurulur); Çiftlik Ağılı (seviye 3) civciv ve buzağı getirir; büyüyen hayvanlar yumurta/süt verir | Kaynak paneli ve "Nereden bulunur?" |

Kurallar (motor `engine/tutorial.ts`):
- Her ipucu yalnızca sistemi gerçekten kullanılabilir olduğunda çıkar; aynı anda tek ipucu.
- Tamamlanma kayda yazılır; uygulama yeniden açılınca ipucu tekrar başlamaz.
- Her balonda "Eğitimi atla" vardır; Ayarlar → Eğitim → "Eğitimi baştan göster" ile yeniden oynatılır.
- Yalnızca kutu adımı ekranı karartır (tek zorunlu eylem); diğerleri halka + balondur ve oyunu kilitlemez.
- Hiçbir adım imkânsız bir işlem istemez: ilk kutular yalnız tohum verir (birleştirme garanti).

## Aşamalar

| Aşama | İçerik | Tipik süre (30 dk/gün) |
|---|---|---|
| A — İlk keşif | Birleştirme, tohum kutusu, ilk ürünler, koleksiyon, ilk görev | 1. gün |
| B — Üretim | Buğday/domates tarlaları, Çiftlik Ağılı, yumurta ve süt, tüccar işleri, siparişler | 1–3. gün |
| C — Vadiyi onarma | Büyük kayalar ve ağaçlar, Mira'nın evi, köprü; Taş Ocağı, Kereste Bahçesi, Çiçek Serası | 1–2. hafta |
| D — Yeni üretim zincirleri | 2. bölge: kil yatakları, Kil Ocağı, Çömlek Fırını (kil→seramik), Değirmen, Dokuma Tezgâhı, Arı Kovanları | 2–5. hafta |
| E — Özel kaynaklar | 3–4. bölge: Gelgit Havuzu, kristal damarları ve Kristal Mağarası (kıvılcım), Fener Taşı'nda anılar | 5–10. hafta |
| F — Gelişmiş vadi | 5–6. bölge, büyük projeler (saat kulesi, deniz feneri, gözlemevi), yüksek seviyeli işler | 3–6. ay |
| G — Uzun süreli | Kaybolan Bahçe ve Büyük Fener (bölüm sonu); sonrasında günlük Yankı bulmacası, günlük/haftalık görevler, siparişler, koleksiyon tamamlama, süslemeler | sınırsız |

Ana restorasyon hedefi **Büyük Fener**'dir (`r7_great2`). Bittikten sonra oyun çevrimdışı devam eder: Yankı bulmacası her gün yenilenir, siparişler ve tüccar işleri sonsuzdur, yenilenebilir vadi binaları hiç tükenmez, koleksiyonun nadir parçaları ve süslemeler kalır.

## Bir oturum neye benzer?

1. Sıradaki hedef çipine bak (atölyenin üstünde ve vadinin altında).
2. Vadide biten işleri topla (haritada sarı baloncuk), yenilerini başlat.
3. Atölyede kutudan ve vadiden gelenleri birleştir; hazır hayvanlara dokun (ambar).
4. Siparişleri ve tüccarı teslim et; Defter'deki keşif ödüllerini topla.
5. Görev hazırsa teslim et; onarım kartı tek seferlik oynar.
Enerji bitse bile birleştirme, bulmaca, teslim ve koleksiyon açıktır.
