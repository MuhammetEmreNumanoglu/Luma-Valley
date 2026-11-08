# Luma Valley — Oyun Tasarımı

**Tür:** Cozy macera + merge + mantık bulmacası + köy onarımı + keşif
**Felsefe:** *Her küçük karar, büyük bir dünyayı yeniden canlandırır.*
**Hedef kitle:** 18–40 yaş, cinsiyetten bağımsız, sakin ama düşündüren oyunları sevenler.

## 1. Çekirdek döngü

```
Üret (enerji) ──► Birleştir (alan yönetimi, 3 mü 5 mi?) ──► Teslim et (görev / sipariş)
     ▲                                                             │
     │                                                             ▼
Üretici geliştir ◄── Yaprak, Jeton, XP ◄── Yapıyı onar, bölge aç, hikâye ilerler
                                   ▲
              Işık Yolları bulmacaları (enerji istemez) ───────────┘
```

Üç kaynak birbirine bağlıdır. **Enerji** üretimi sınırlar ama birleştirme, bulmaca, görev teslimi, harita ve defter enerji istemez; enerji bitince oyun durmaz. **Alan** (7×9 tahta, diken çalıları, kilitli hücreler, 4–12 bölmeli çanta) sürekli planlama gerektirir. **Yapraklar** ise üretici geliştirme, hücre açma, çanta bölmesi ve bazı görevler arasında paylaşılır.

## 2. Merge sistemi
- Aynı tür ve seviyeden **3 bağlı nesne** bırakıldığı yerde bir üst seviyeye dönüşür.
- **5 nesne 2 nesne verir** ve ek yaprak kazandırır. 4 nesne 1 sonuç ve 1 artık bırakır, 6 nesne 2 sonuç ve 1 artık. Oyuncu "hemen 3 mü birleştireyim, 5'i mi bekleyeyim?" kararını verir.
- Sonuç oyuncunun bıraktığı hücrede oluşur; sırada birleşme varsa (kaskad) otomatik devam eder. Her kaskad seviyeyi yükselttiği için zincir mutlaka sona erer.
- Geçersiz bırakma eşya kaybettirmez: kilitli hücre veya diken reddedilir, başka bir eşyanın üstü yer değiştirme olur.
- Birleştirmenin yanındaki diken çalıları hasar alır ve temizlenince alan açar. Erken oyunda bu, mekânsal bir hedef oluşturur.
- **12 aile, 111 nesne:** çiçek, ahşap, taş, meyve, fener parçası (10/10/10/10/8), tahıl, bal, kumaş, seramik (10/9/9/9), deniz kabuğu, kristal (9/9) ve eski hatıra (8). Her seviye ayrı bir kompozisyondur: tohum → filiz → saksı → çiçek → demet → sepet → aranjman → taç → antik bahçe süsü → yaşam çiçeği.

## 3. Üreticiler
- **10 jeneratör:** sera, marangoz tezgâhı, taş ocağı, meyve ağacı, eski fener, buğday tarlası, bal kovanı, dokuma tezgâhı, gelgit havuzu ve kristal mağarası. Her dokunuş 1 enerji harcar (fener 2). Kullanım sayısı (12–28) zamanla yeniden dolar. 4 geliştirme seviyesi vardır; her seviye daha yüksek ürün olasılığı, daha fazla kullanım ve daha hızlı dinlenme getirir.
- **2 dönüştürücü:** fırın (un çuvalı → 2 hamur, meyve kâsesi → 2 meyve sepeti) ve seramik fırını (taş → kil/vazo). Bazı **gizli tarifler** (bal kavanozu → ekmek, kristal → vazo, istiridye → testi) deneyerek ya da diyaloglardaki ipuçlarından bulunur ve Defter'e yazılır. Burada da bir karar vardır: üç un çuvalını birleştirip bir hamur mu yapmalı, yoksa her biri iki hamur veren fırına mı koymalı (fırın enerji ve kullanım harcar)?
- Oyuncu her üreticinin olası ürünlerini, kalan kullanımını ve dinlenme süresini bilgi şeridinde önceden görür.

## 4. Işık Yolları (özgün bulmaca)
- Fenerden çıkan ışık, karolarda oyulmuş kanallardan geçer. Dokunmak karoyu 90° çevirir. Her kristal (hedef) **yalnızca kendi rengini** alınca yanar.
- **Parçalar:** düz yol, köşe, üçlü, dörtlü, kör uç, renkli cam filtre (sadece kendi rengini geçirir; renk körlüğü için şekil işareti var: kehribar = elmas, mavi = nokta), çivili sabit taş, kaya.
- **Zorluk eğrisi:** 1–6 elle tasarlanmış öğretici bölümlerdir (4×4–6×5, tek renk). 7–10'da çatallanma ve kör uçlar gelir. 11'den itibaren iki renk, 13'ten itibaren filtreler ve kilitler eklenir. 35+ 6×7, 47+ 7×7, 59+ 7×8, 71–80 ise üç hedefli iki renkli bulmacalardır.
- **Üretici:** Önce her renk için rastgele bir yayılan ağaç büyütür. Yaprakları hedef yapar, maskeleri ağaç kenarlarından türetir. Boş hücrelere yem parçalar ve kayalar koyar, ardından karıştırır. Çözümün var olduğu yapı gereği garantidir ve testler 80 bulmacanın her birini aynı ışık yayılımı koduyla doğrular. Hiçbiri başlangıçta çözülmüş değildir ve hiçbiri önemsiz değildir (par ≥ 2).
- **Yıldız:** par'a eşit veya daha az hamle 3, par×1,5+2 hamleye kadar 2, fazlası 1 yıldız. Hızlı dokunmayı değil plan yapmayı ödüllendirir.
- **İpucu:** Doğru yöne çevrilecek bir karoyu işaretler. Günde 3 ücretsiz, sonrası 2 jetondur. Geri alma ve "baştan" sınırsızdır; oyuncu hiçbir zaman çıkışsız bir duruma düşmez.
- **Günün Yankısı:** Her gün tarihe bağlı tohumla üretilen yeni bir bulmaca (+1 jeton). Patika bittikten sonra da sınırsız içerik sağlar.
- Bulmacalar görevlere bağlıdır: Fener Taşı'nı uyandırmak, bahçeye su götürmek, köprü fenerini yakmak, deniz fenerine ışık vermek. Çözülünce haritada ilgili yapı değişir.

## 5. Vadi: 7 bölge, 72 yapı, 94 görev

| # | Bölge | Kimlik | Yapılar (örnek) |
|---|---|---|---|
| 1 | Güneş Çayırı | Başlangıç, sıcak yeşil | Fener Taşı, Mira'nın evi, Unutulmuş Bahçe, kuyu, dere çarkı, arı çayırı, **Unutulmuş Köprü** |
| 2 | Bal Rüzgârı Köyü | Köy ekonomisi | Değirmen, köy fırını, meydan, çeşme, dokuma evi, çömlek atölyesi, **Eski Saat Kulesi** (4 aşamalı proje) |
| 3 | Fener Limanı | Sahil | İskele, Martı teknesi, Fısıltı Mağarası, deniz feneri (2 aşama), gelgit köprüsü |
| 4 | Kızıl Yaprak Ormanı | Turuncu ve kızıl | Bilge Ağaç (2 aşama), yaprak sunağı, kadim patika, geyik heykeli |
| 5 | Sessiz Tepeler | Rüzgâr | İki değirmen, rüzgâr kulesi, sis feneri, bulut köprüsü |
| 6 | Yıldızlı Göl | Gece paleti | Gözlemevi, ay kayığı, gece serası, gümüş kapı |
| 7 | Kaybolan Bahçe | Final | Gül ve lavanta terasları, ışık ağacı, **Büyük Fener** |

- Her yapının aşama sayısı, onu inşa eden görev sayısıdır (1–4). Her aşamada görünüm değişir: **yıkık** (soluk renkler, kırık duvarlar, çatı yok, moloz) → **iskeleli** (duvarlar, yarım çatı) → **tamam** (sıcak pencere ışıkları, çiçek saksıları, duman, dönen kanatlar, akan çeşme). Köprü tahta tahta tamamlanır.
- **Canlılık:** Bölgenin onarım oranı zeminin rengini geri getirir, sisi azaltır, çiçekleri çoğaltır, kuşları, kelebekleri, arıları ve ateşböceklerini çağırır. Fark ilk bakışta görülür.
- **Kişiselleştirme:** Tamamlanan bahçe, çit ve çatılarda 4 renk ve stil seçeneği vardır. Pazar'dan yaprakla alınan **vadi süslemeleri** (bank, lamba, saksı, şenlik bayrağı, gölet; bölge başına 4, toplam 28) haritada kalıcı olarak görünür.
- **Anı kartları:** 23 yapı tamamlanınca o yerin önceki ve sonraki hâli yan yana gösterilir; altında kısa bir anı metni yer alır (Defter → Anılar).

## 6. Hikâye
Bir zamanlar her evde bir ışık yanardı. Işık Şenliği gecesi Büyük Fener çatladı, saat kulesi gece yarısında durdu ve insanlar birbirini unuttu. Oyuncu, vadinin son bekçisi **Nur**'un torunudur. **Lumi**, Büyük Fener'den kopmuş bir kıvılcımdır. Köprü tahtalarında Nur'un adı, saat kulesinde durmuş zaman, deniz fenerinin bekçi defteri, Bilge Ağacın oyuğundaki fener nakışlı mendil ve balıkçılın anahtarı ipuçlarını bölge bölge birleştirir. Final: Lumi Büyük Fener'e geri girer ama yok olmaz. *"Meğer ışık bölününce azalmıyormuş."* Oyun bitmez; günlük bulmacalar, siparişler, koleksiyon ve başarılar devam eder.

**Karakterler:** Lumi (ışık rehberi), Mira (marangoz), Ada (botanikçi), Bera (haritacı), Niko (aşçı), Deniz (liman bekçisi), Yaren (masalcı). Her biri 6 ifadeli portreye ve kendi görev zincirine sahiptir. Diyaloglar kısadır (1–3 satır), dokununca ilerler ve atlanabilir.

## 7. İlerleme katmanları
Oyuncu seviyesi (XP eğrisi `18·n^1.35+12`), bölge keşfi, yapı aşamaları, üretici seviyeleri (12 × 3–4 seviye), koleksiyon (111 nesne ve gizli tarifler), 80 bulmaca × 3 yıldız, karakter hikâyeleri, bölge canlılığı, 29 başarı, büyük projeler (saat kulesi, deniz feneri, Bilge Ağaç, gözlemevi, Büyük Fener).

**Sürekli içerik:** Siparişler kurallarla üretilir: aynı aile üst üste gelmez, seviyeler oyuncu seviyesine göre ayarlanır, her gün bir "günün siparişi" ×1,5 öder. Her gün 3 değişken görev, her hafta 1 büyük hedef ve Günün Yankısı bulmacası gelir. Oyuna girilmeyen günler hiçbir şey kaybettirmez.

## 8. İlk 30 dakika (uygulandı)
| Dakika | Olan |
|---|---|
| 0–2 | 4 panellik hikâye, fenerin parlaması, Lumi tanışması, elle gösterilen ilk merge (halka animasyonu) |
| 2–5 | Seraya dokunma eğitimi, ilk keşif bildirimi, ilk görev ödülü, Fener Taşı'nın ilk aşaması |
| 5–10 | Uyuyan Bahçe görevi (beşli birleştirme ipucu), Mira ile tanışma, marangoz tezgâhı hediyesi, ilk siparişler, ilk Işık Yolu |
| 10–15 | Mira'nın evinin onarımı (3 aşama: yıkık → iskele → ocak yanıyor), taş ocağı, Fener Taşı'nın yanması, yeni hücreler |
| 15–20 | Ada'nın yan görevi ile ana görev arasında seçim, alan ve yaprak yönetimi, üretici geliştirme kararı |
| 20–30 | Meyve bahçesi (yeni zincir), dere çarkı, Bera ve köprü projesinin görünmesi; köprünün öbür yakasında bekleyen köy |

## 9. Tasarım ilkeleri ve erişilebilirlik
- Bütün etkileşimler tek parmakla yapılır: dokunma, sürükleme ve kaydırma.
- Zaman baskısı, kaybetme ekranı, zorunlu reklam veya şans kutusu yoktur.
- Dokunma alanları en az 44 pt'dir. Renkler şekil işaretleriyle desteklenir (bulmaca filtreleri ve hedefleri, onay işaretleri).
- Hareketi azaltma, düşük grafik kalitesi, müzik, efekt ve titreşim ayarları ayrı ayrı açılıp kapanır ve kalıcı olarak saklanır.
