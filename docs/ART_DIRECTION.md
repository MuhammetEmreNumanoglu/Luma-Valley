# Sanat Yönetimi (v4)

## Hedef
Modern, sıcak, pastel, izometrik/2.5D "cozy valley". Çocukça basit şekiller değil; hipergerçekçi ve karanlık da değil. Bütün nesneler aynı dünyaya ait görünmeli.

## Palet (`src/ui/theme.ts`)
Çimen yeşili `#B6D39B`, adaçayı `#71947B`/`#416957`, krem `#F1F4E8`/`#FBFCF3`, pastel şeftali `#F2865A`, sıcak açık kahve `#B07A4A`, gökyüzü `#A8D8EE`, lavanta `#B9A3E3`, altın vurgu `#EFC26A`/`#F2B544`. Para birimleri renkle ayrılır: Altın = altın sikke, Işık Jetonu = lavanta sikke, Kıvılcım = sıcak parıltı, Enerji = turkuaz şimşek.

## Varlık kuralları
- Kamera: ortografik, yaw 45°, pitch 30°; ışık sol üstten sıcak, yumuşak gökyüzü dolgusu, temas gölgesi. Her sprite'ın zemin çapası kayıtlıdır (`registry.generated.ts`), haritada derinlik `y`'ye göre sıralanır.
- Kaynaklar: Kenney CC0 3D kitlerinden render (yapılar, portreler, bir kısım dekor) ve önceki sürümde projeye özel üretilmiş, manifestte "OpenAI-generated; not represented as CC0" olarak işaretli eşya/üretici görselleri. Lisansı belirsiz dosya eklenmez; her dosya `assets/art/manifest.json`'da kaynak ve lisansla listelenir (`tests/art.test.ts`).
- Türev varlıklar betikle üretilir ve tekrar üretilebilir: `scripts/art-tools/derive-clay.py` (kil zinciri = taş sprite'larının terrakotaya renk dönüşümü), `derive-icons.py` (Işık Jetonu lavantaya, Kıvılcım ikonu).
- Arayüzde emoji kullanılmaz; ikonlar sprite'tır. Kapatma (X) ve oklar view'larla çizilir.
- Yüksek seviyeli ürünler yalnız büyük değil, kompozisyon olarak daha zengindir (mevcut 10 seviyeli zincirler). Nadirlik etiketi: Yaygın / Az bulunur / Nadir / Efsanevi (koleksiyon ve kaynak panelinde, zarif renkli rozet).

## Atölye kaynakları (`src/render/resources.ts`, v5)
Tek hücreye bağlı, hücrenin ~%125'i boyutunda, hücresine alttan oturan büyük nesneler (dokunma alanı tek hücre). Her biri 3/3 sağlam → 2/3 çatlamış → 1/3 büyük kısmı parçalanmış; altında üç dayanıklılık çubuğu. Kaya: kaya sprite'ı + çatlaklar + çakıl; Kütük: kütük yığını → kırık kütükler; Seramik: çömlek kümesi → kırıklar; Kabuk: kum tümseği üstünde kabuk kümesi; Kristal: kaya üstünde kristal kümesi + yumuşak parıltı. Kırma başlarken ve kaynak yok olurken kısa toz efekti; süre boyunca sürekli animasyon yok. Sayaç ve "hazır" rozeti hücrenin altında.

## Vadi binaları (`src/render/nodes.ts`)
- **Büyük Kaya:** bütün → çatlaklar ve çakıllar → küçük kaya ve moloz → çiçekli açıklık. **Yaşlı Ağaç:** bütün → küçülmüş ağaç + kütükler → kütük + odun yığını → kütük ve çiçekler. **Kil Yatağı:** ıslak toprak, su parlaması ve kil yığınları, aşamalarla azalır. **Kristal Damarı:** kaya içinde kristaller, her aşamada biri eksilir.
- Binalar üretici sprite'larıyla (taş ocağı, marangoz, sera, fırın, kovan…) çizilir; kilitliyken soluk + kilit, kurulmamışken yarı soluk + "Kur" rozeti; çalışırken canlı süre rozeti, bitince ürün baloncuğu (raster değil, canlı katman).
- Doğal ağaç/çalı dekoru kaynakların önünü kapatmasın diye kaynak çevresinde dekor yerleştirilmez.

## Animasyon dili
| Olay | Animasyon | Süre |
|---|---|---|
| Birleştirme | Parçalar merkeze çekilir, tek parıltı, yeni ürün %108'e çıkıp oturur | ~520 ms |
| Üretim/kutu | Kısa yay ile hücreye uçuş | ~360 ms |
| Keşif, ödül | Küçük toast (yukarıdan kayar); aynı türler birleşir ("3 yeni keşif"); en çok 2 toast | 2.2 sn |
| Seviye, onarım, bölge | **Tek kart** (moment kuyruğu): solma + tek seferlik parıltı; aynı eylemdeki onarım, bölge ve seviye tek kartta birleşir | 180–700 ms |
| Eğitim | Halka bir kez belirir; sürekli zıplama yok | 600 ms |
| Paneller | Sheet 240 ms kayar (yaylanmaz), modal %96'dan solarak gelir | 150–240 ms |
Yasak: tekrarlanan zoom, sürekli zıplama, üst üste tam ekran pop-up. "Hareketi azalt" (oyun ayarı **veya** cihaz erişilebilirlik ayarı) açıkken animasyonlar solmaya iner, ortam hareketi kapanır.

## Mobil standartlar
- Dokunma hedefi ≥ 44 pt (sekme, rozet, X, gezin, kutu 58×52).
- Güvenli alan: üst HUD ve alt navigasyon `react-native-safe-area-context` ile; sheet içerikleri kaydırılabilir ve alt butonlar sabit (kesilme yok).
- Tahta: 390×844'te hücre 46 pt (önce ~40), 375×667'de 36 pt.
- Alt navigasyon: Görevler · **Vadi** · **Atölye** · Defter · Pazar — iki ana yer ortada ve büyük (başparmak erişimi).

## Dürüst durum
Yeni harici lisanslı sanat eklenmedi (ücretli varlık satın alınmadı). Kayalar/ağaçlar mevcut CC0 prop'larıyla, kil mevcut taş görsellerinden türetilerek yapıldı. Tam bir "App Store kalitesinde" yeniden çizim için bir illüstratörden veya lisansı net bir paketten özel kaya/ağaç/kil yatağı aşama sprite'ları ve yeni UI çerçeveleri gerekir.
