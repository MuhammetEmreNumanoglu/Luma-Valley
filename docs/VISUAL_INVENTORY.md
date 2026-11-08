# Görsel Envanter ve Kalite Değerlendirmesi (v1.2, 2026-11-04)

Yedekler:
- `v1.0-procedural-art`: ilk prosedürel çizimler
- `v1.1-iso-art`: ilk izometrik yenileme
- `v1.2-art-direction`: bu sürüm

## Sanat yönü
Her şey aynı "sıcak izometrik oyuncak" dilinde:
- düşük poligonlu 3D modeller
- tek bir kamera (ortografik, yaw 45° / pitch 30°)
- sol üstten sıcak ana ışık, soğuk arka dolgu ve yumuşak temas gölgesi
- krem, bal ve adaçayı rengi bir arayüz

Sahne, nesne, portre ve ikonların hepsi aynı stüdyoda (`scripts/art-studio/`), aynı ışık ve aynı ton eşlemeyle render edildi.

## Envanter
| Alan | v1.0 | v1.1 | v1.2 (şimdi) |
|---|---|---|---|
| 111 merge nesnesi | Skia vektör | Kenney 3D render | Fitil (tealight), Mum (şamdanlı mum), Minik Kabuk (tarak), Deniz Salyangozu (spiral kabuk), İstiridye, İnci, Gelgit Kandili için **özgün 3D modeller** (`custom.js`) |
| 12 üretici | vektör | 3D | aynı |
| 72 yapı × 3 aşama | vektör | 3D | Kuleler yeniden yapıldı: saat kulesinde 3 katlı taş kule, saat kadranı ve sivri çatı; deniz fenerinde kırmızı-beyaz şerit, ışıklı fener odası ve konik çatı; gözlemevinde taş kule, bakır kubbe ve çanak anten; kulede sivri çatı ve flama. Tekne her aşamada aynı boyuta sığdırıldı |
| Harita dekoru ve süslemeler | vektör | 3D | aynı, ayrıca Pazar'da süslemenin kendi görseli |
| **42 portre** | vektör | değişmemişti | **Kenney Mini Characters** 3D modelleri karaktere göre yeniden renklendirildi. Modelin kendi yüzü kaldırıldı ve yerine **özgün bir yüz ifadesi düzeneği** (göz, kaş, ağız, yanak, gözyaşı) eklendi. Lumi özgün bir ışıklı damla modeli. Karakter başına 6 duygu: aynı kafa, saç ve kıyafet |
| **21 arayüz ikonu** | vektör | değişmemişti | **Özgün 3D ikonlar** (ekstrüzyon ve pah): yaprak, jeton, enerji, yıldız, kupa, harita, defter, çanta, takvim, ampul, dişli, oklar, onay, parşömen, bulmaca karosu, tahta. Hediye, kilit ve dükkân Kenney modelleri |
| **Dikenli çalı** | vektör | vektör | Özgün 3D: koyu yaprak kümesi, dikenler, dallar. 2 can için kırmızı meyveler. Filizden açıkça ayrılıyor |
| **Harita zemini** | düz gradyan | aynı | Biyoma göre zemin lekeleri, çim tutamları, yaprak/çiçek/çakıl serpintisi; toprak yol (kenar, yatak, iz) veya arnavut kaldırımı; dere ve gölde kum ve taş kıyı; her yapının altında taban ve temas gölgesi |
| **Bulmaca karoları** | düz vektör | aynı | Gölgeli, yan yüzlü ve kenar ışıklı taş karolar; oyuk kanallar. Kaynaklar 3D fener, hedefler 3D kristal sprite'ı, kayalar 3D kaya. Renk körlüğü işaretleri korundu |
| **Butonlar** | düz renk + alt çizgi | aynı | Katmanlı: koyu dudak, yüz, açık kenar ve parlaklık. Basınca dudak kısalıyor, buton 3 pt iniyor ve %97'ye küçülüyor. İkon büyük ve taşan |
| **Paneller ve kartlar** | ince kenarlı | aynı | Beyaz kenar, alt dudak, yumuşak gölge; başlıklarda bal rengi işaret; sayfa başlığında alt çizgi |
| **Alt sekme çubuğu** | düz | aynı | Yuvarlak köşeli yüzen çubuk; seçili sekme bal rengi kabarcıkta yukarı kalkıyor |
| **Ödül pencereleri** | düz kart | aynı | Kutlama ve bulmaca sonucunda yavaş dönen ışık huzmeleri ("hareketi azalt" açıkken duruyor), kalın kartlar, gölgeli bildirimler |
| Mağaza, koleksiyon, başarılar | düz | aynı | Aynı panel dili; koleksiyon hücreleri kabartmalı; mağaza paketleri kartlı |
| Merge tahtası | düz hücreler | aynı | Ahşap tepsi, kenar ışığı, kabartmalı hücreler (dudak + yüz + parlaklık), kilitli hücrelerde içe gömük gölge |

## Kaynaklar
- **github.com/shorepine/kenney:** Kenney'nin tüm kütüphanesinin bir aynası. Lisans dosyası Kenney'nin resmî CC0 metni.
  - İncelenen 2D paketler: UI Pack, UI Pack Adventure, Game Icons, Character Pack, Emote Pack.
  - Bu paketlerden bir dosya **alınmadı.** Hepsi düz 2D tasarım ve oyunun 3D izometrik diliyle aynı ekranda uyumsuz duruyordu. İkon ve butonlar bu yüzden aynı ışıkta render edilen özgün 3D modellerle yapıldı.
  - Bu depoda da bulunan Kenney 3D kitleri (Mini Characters dahil) kullanıldı. Dosyalar daha önce indirilen kopyadan geldi; içerik ve CC0 lisansı aynı.
- Bütün varlıkların lisansı ve kaynağı: `ASSET_LICENSES.md`, `assets/art/manifest.json`.

## Eski kalanlar (dürüst liste)
- Uygulama ikonu, açılış ekranı ve giriş hikâyesi arka planları. Giriş hikâyesinde 3D sprite'lar kullanılıyor, arka plan düz renk.
- Ortam animasyonları (kelebek, ateş böceği, su ışıltısı) Skia ile çiziliyor. Küçük oldukları için stil farkı sorun yaratmıyor.
- Prosedürel yedek çizimler kodda duruyor. Bir sprite yüklenemezse kullanılıyorlar ve kaldırılmadılar.

## Bilinen zayıf noktalar
- Portreler küçük kafalı "oyuncak" stilinde. Kenney karakterlerinin oranları bu. Gerçek illüstrasyon portreleri olmadığı için bir sanatçının elinden çıkmış kadar ifadeli değiller.
- Bera'nın koyu teninde göz kontrastı düşük.
- Bazı üst seviye nesneler (Vadi Haritası, Aile Albümü) hâlâ temsilî kompozisyonlar.
- Harita zemini prosedürel boyama, gerçek karo dokusu değil.
