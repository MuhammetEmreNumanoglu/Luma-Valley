# Ürünler Nereden Gelir? (v5)

Tek doğruluk kaynağı koddur: `src/content/resources.ts` (atölye kaynakları), `src/content/progression.ts` (tohum kutusu), `src/content/valley.ts` (vadi binaları), `src/content/farm.ts` (hayvan/tarla ürünleri, tüccar). Oyunda aynı bilgi **"Nereden bulunur?"** panelinde görünür (ürüne, görev satırına veya sipariş ikonuna dokununca). `tests/content.test.ts` her ailenin bir kaynağı olduğunu ve hiçbir görevin, kendisinden sonra açılan bir kaynağa bağlı olmadığını (softlock yok) denetler.

## İki ayrı ürün türü (mimaride de ayrı)
| Tür | Hücre | Ne yapılır |
|---|---|---|
| **Normal ürün** (civciv, inek, tohum, çiçek, süt, taş Sv1… dahil) | `{ t: 'i' }` | Sürüklenir; aynı ürünün üzerine bırakılınca birleşir; satılır, çantaya konur |
| **Kaynak engeli** (Büyük Kaya, Kütük Yığını, Eski Çömlek Yığını, Deniz Kabuğu Kümesi, Kristal Oluşumu) | `{ t: 'r' }` | Sürüklenmez, birleşmez; dokununca kırma paneli açılır; 3 kırmada malzeme verir; son kırmada kare boşalır |

Kırma paneli yalnız `t: 'r'` hücrelerde açılır; `breakResource` komutu başka hücreleri reddeder (`tests/resources.test.ts`: "ordinary items are never breakable resources").

## Atölye kaynakları (beş kategori)
| Kaynak | Malzeme | 1. kırma | 2. kırma | 3. kırma (kare boşalır) | Toplam | Açılma |
|---|---|---|---|---|---|---|
| Büyük Kaya | Taş | 5⚡ · 1 dk · 5 | 10⚡ · 5 dk · 8 | 15⚡ · 10 dk · 12 | 30⚡ · 16 dk · **25 taş** | başlangıç |
| Kütük Yığını | Ahşap | 4⚡ · 1 dk · 5 | 8⚡ · 4 dk · 8 | 12⚡ · 8 dk · 12 | 24⚡ · 13 dk · 25 | başlangıç |
| Eski Çömlek Yığını | Seramik | 6⚡ · 2 dk · 4 | 12⚡ · 6 dk · 6 | 18⚡ · 12 dk · 9 | 36⚡ · 20 dk · 19 | 2. bölge |
| Deniz Kabuğu Kümesi | Deniz kabuğu | 5⚡ · 2 dk · 4 | 10⚡ · 6 dk · 7 | 15⚡ · 12 dk · 10 | 30⚡ · 20 dk · 21 | 3. bölge |
| Kristal Oluşumu | Kristal | 8⚡ · 3 dk · 3 | 14⚡ · 8 dk · 5 | 20⚡ · 15 dk · 8 | 42⚡ · 26 dk · 16 | 4. bölge |

Değerler `RESOURCES` içinde tek yerdedir. **Kademe:** Engel yerleştirildiği andaki oyuncu seviyesine göre kademe alır (Sv1–9: 1, Sv10–17: 2, Sv18–25: 3, Sv26+: 4). Kademe n engel `malzeme:n` verir; enerji kademe başına %50 artar. Böylece geç görevlerin istediği yüksek seviyeler de ulaşılabilir kalır.

## Kaynaklar nasıl yenilenir?
- Yeni oyun 4 engelle başlar (2 kaya, 2 kütük); hepsi tahtanın kenarındadır, ortadaki birleştirme alanı boştur.
- **Kaynak Teslimatı** (çantadaki kaya ikonu): 1 hak 75 dakikada dolar (en çok 3), her seviye atlamada +1. Oyuncu ne zaman ve hangi türden getireceğini seçer; engel **yalnızca boş bir kenar hücresine** konur, hiçbir zaman ürünün üstüne konmaz. Bir tahtada aynı anda en çok 6 engel bulunabilir. Engeller kendiliğinden doğmaz; temizlenen alan oyuncunun izni olmadan kapanmaz.
- Böylece taş, ahşap, seramik, kabuk ve kristal **sonsuza kadar** elde edilebilir.

## Diğer kaynaklar
| Kategori | Ürünler | Nerede |
|---|---|---|
| Tohum kutusu (atölye, sol alt) | Çiçek (Sv1), Buğday (Sv3), Tavuk (Sv5), İnek (Sv7), Meyve (Sv9), Domates (Sv12), Tahıl (Sv14), Mısır (Sv16), Üzüm (Sv19), Balkabağı (Sv22), Karpuz (Sv25) | Seviye 1 ürünleri. Doğal malzeme asla çıkmaz |
| Vadi binaları (hikâyeyle onarılır) | Çiçek (Sera, Sv2), meyve (Meyve Bahçesi), civciv/buzağı (Çiftlik Ağılı, Sv3), tahıl (Tarla), bal (Arı Kovanları), un (Değirmen: buğday→tahıl), kumaş (Dokuma: çiçek→kumaş), fener parçası ve anı (Fener Taşı) | Bir kez altınla kurulur, hiç tükenmez. **Vadi beş atölye malzemesinden hiçbirini üretmez** (`tests/nodes.test.ts`) |
| Hayvan/tarla ürünleri | Yumurta, süt, buğday, domates, mısır… | 3. seviye hayvan/tarla 1, 4. seviye 2 ürün; bekleme 150–240 sn; Ambar'a gider |
| Tüccar ve siparişler | Altın, XP | Atölyede |

## Tahta dolarsa
Kırılan kaynağın malzemesi önce kaynağın çevresindeki boş hücrelere, yer yoksa **Depo**'ya gider (çanta ikonu, kırmızı nokta). "Tahtaya al" ile geri alınır. Hiçbir ödül kaybolmaz.

## v5'te kaldırılanlar
- **Kil** ailesi (seramik doğrudan çömlek yığınından gelir). Eski kil ürünleri aynı seviyede seramiğe dönüştürüldü.
- Vadideki kaya/ağaç/kil yatağı/kristal damarı ve Taş Ocağı, Kereste Bahçesi, Kil Ocağı, Gelgit Havuzu, Kristal Mağarası, Çömlek Fırını. Bunlar için harcanan kurulum altını iade edildi, devam eden işlerin ürünleri Depo'ya kondu.
