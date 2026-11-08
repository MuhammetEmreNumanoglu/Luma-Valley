# Kararlar

## v5 Atölye kaynakları ve tek para (2026-11-06)

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-11-06 | Alt navigasyon sırası: Atölye, Vadi, Görevler, Defter, Pazar | Ürün sahibinin isteği |
| 2026-11-06 | Beş malzeme (taş, ahşap, seramik, kabuk, kristal) atölyede tek hücrelik kaynak engelleridir; vadideki kaynak noktaları kaldırıldı. Vadi = hikâye, yapılar, üretim binaları | Ürün sahibinin isteği; aynı malzemenin iki yerde üretilmemesi |
| 2026-11-06 | Kaya: 5/10/15⚡, 1/5/10 dk, 5/8/12 taş; diğer dört kaynak kendi değerleriyle (`content/resources.ts`) | Şartname; seramik/kabuk/kristal daha nadir |
| 2026-11-06 | Yenilenme: oyuncunun yerleştirdiği Kaynak Teslimatı (zamanla ve seviyeyle dolar), yalnız boş kenar hücresine, en çok 6 engel | Sonsuz kaynak, ama temizlenen alan izinsiz kapanmasın |
| 2026-11-06 | Kademeli engel (seviyeyle Sv1→Sv4 malzeme) | Geç görevlerin yüksek seviyeli malzeme ihtiyacı |
| 2026-11-06 | Elle birleştirme: sürüklenen + hedef + hedefe bağlı en yakın eş (BFS N/D/G/B); otomatik/zincirleme/5'li/bonus yok | Ürün sahibinin isteği; deterministik ve uzak ürün tüketmiyor |
| 2026-11-06 | Işık Jetonu ve kıvılcım kaldırıldı; 1 jeton = 30, 1 kıvılcım = 10 altın (ledger, tek sefer) | Tek para; dönüşüm oranı eski enerji fiyatlarından |
| 2026-11-06 | Enerji altınla: 25⚡ 60 altından başlar, aynı gün ×1,5 | Ara para birimi yok, sonsuz döngü yok |
| 2026-11-06 | Kil ailesi kaldırıldı (kil → seramik) | Seramik artık doğrudan çömlek yığınından |
| 2026-11-06 | Çalışma `feat/valley-redesign` dalında sürdü (açık PR'ı olan v4 dalı); `feat/luma-valley` ile ortak geçmiş yok | Force push gerektirmeden kullanıcının değişikliklerini korumak |

## v4 Vadi yeniden tasarımı (2026-11-06)

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-11-06 | Yaprak + alan parası → tek **Altın** (kayıtta `leaves` alanı korunur, migration v3→v4 altını ekler) | İki para aynı işi yapıyordu; oyuncu "coin" bekliyor |
| 2026-11-06 | Doğal kaynaklar vadide: 3 aşamalı tek seferlik birikintiler + yenilenebilir binalar; eski "üretici hediyesi" görev ödülleri ilgili vadi binasını açar | "Her şey aynı kutudan" sorunu; tükenmeyen kaynak ihtiyacı |
| 2026-11-06 | İlk büyük kaya kesin değerlerle: 5/10/15 enerji, 1/5/10 dk, 3/5/8 taş | Ürün sahibinin şartnamesi |
| 2026-11-06 | Dikenler kaldırıldı; eski kayıtlarda diken hücreleri boş hücreye döner, yeni oyunda kilitli hücre olur | Ürün sahibi dikenli görünümü istemedi |
| 2026-11-06 | Kıvılcım = Işık Yolları + onarılan yapı ödülü; anılar, kristal ve ışık görevlerine harcanır. Kristal = fiziksel malzeme | İki kaynağın işlevini ayırmak |
| 2026-11-06 | Eski keşifler migration'da "toplanmış" sayıldı | O ürünler keşif bonusunu zaten ödemişti; çift ödeme olmasın |
| 2026-11-06 | Hayvanlar ve tarlalar tahtada kalır, bekleme süresiyle ürün verir (Sv3: 1, Sv4: 2) | Hayvan zincirine kalıcı anlam; aşırı üretim süreyle sınırlı |
| 2026-11-06 | Tam ekran kutlamalar tek kuyrukta, bir eylemde tek kart; küçük olaylar birleştirilen toast | "Sürekli zıplayan" başarı ekranları şikâyeti |
| 2026-11-06 | Vadi haritası normal modda yalnız dikey kayar; serbest kaydırma/zoom "Gezin" modunda | Harita 7 bölge boyunca uzun; tamamen kilitlemek içeriğe erişimi engellerdi |
| 2026-11-06 | Çalışma `main`'den açılan `feat/valley-redesign` dalında | Yerel `main` uzak `feat/luma-valley` ile ortak geçmişi olmayan, daha yeni çalışma içeriyordu |

## Luma Valley (v1.0, 2026-11-04)

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-11-04 | **Ürün değişti: Luma Valley** (cozy merge + Işık Yolları + restorasyon). Işık Kementi `v0.2-light-lasso` etiketinde ve `feat/light-lasso` dalında | Ürün sahibinin görev belgesi |
| 2026-11-04 | Merge kuralı: bırakılan yerde 3'lü grup → 1, 5'li → 2 (+yaprak), 4 → 1+1 artık; kaskad seviye yükselttiği için sonludur | Hız ile verimlilik arasında karar |
| 2026-11-04 | Motor saf ve deterministik: `apply(state, cmd, now)`, derin kopya, tohumlu RNG, duvar saati yok | Test edilebilirlik, yarım ödül veya çift ödül olmaması |
| 2026-11-04 | Kayıt: AsyncStorage üzerinde çift slot + FNV-1a sağlama toplamı + migration zinciri. **Expo SQLite kullanılmadı** | Bu geliştirme ortamında paket kurulamıyordu (npm erişimi kapalı). Tek belgeli atomik anlık görüntü bu ölçekte yeterli; adaptör değiştirerek SQLite'a geçilebilir |
| 2026-11-04 | Testler Jest yerine **node:test** (Node'un TS tip ayıklaması + resolve hook) | Jest 30'un native çözücüsü bu Linux ortamında yoktu; motor testleri bağımlılıksız çalışır. `jest`, `jest-expo`, `@types/jest` artık kullanılmıyor; `npm uninstall` ile kaldırılabilir (lock dosyası internet erişimi olan makinede güncellenmeli) |
| 2026-11-04 | Bütün görseller prosedürel Skia çizimi; arayüz ikonları aynı koddan PNG'ye pişirilir (`gen-sprites`) | Lisans riski yok, tutarlı stil, tek kaynak |
| 2026-11-04 | Işık Yolları: 1–6 elle, 7–80 sabit tohumlu üretici; hepsi testte doğrulanır | Çözümün yapı gereği var olması ve doğrulanabilirlik |
| 2026-11-04 | Enerji 100, 60 sn'de +1; merge, bulmaca ve görev enerji istemez | Oyuncu hiçbir zaman tamamen kilitlenmez |
| 2026-11-04 | Gerçek ödeme kapalı: `UnconfiguredStore` asla başarı döndürmez | Mağaza hesabı ve doğrulama sunucusu yok; sahte başarı gösterilmez |
| 2026-11-04 | Expo Router yerine tek kabukta durum tabanlı ekranlar | 5 sekme ve kaplamalar için yeterli; daha az bağımlılık |
| 2026-11-04 | Bundle ID `com.tamani.game` ve slug `tam-ani` korundu; görünen ad Luma Valley | Mevcut EAS ve imzalama yapılandırmasını bozmamak; yayından önce kesinleştirilecek |

## Önceki kararlar (Tam Anı / Işık Kementi)

| Tarih | Karar | Gerekçe |
|---|---|---|
| 2026-11-03 | Ürün: **Tam Anı** (fikir #1), 2D hikâyeli fotoğraf-zamanlama oyunu | Ürün sahibi seçti |
| 2026-11-03 | Fotempo'dan ayrışma: 3 kare film, **flaş etkisi** (çekim sahneyi değiştirir), keşif türleri, şehir albümü | Benzer mekanikle birebir rekabetten kaçınma |
| 2026-11-03 | Expo SDK 58 + RN Skia 2.14 + Reanimated 4 | Windows'ta geliştirme, EAS ile Mac'siz build (ARCHITECTURE.md). **Düzeltme:** App Store Expo Go SDK 54'te kalıyor; iPhone testi development build ister |
| 2026-11-03 | Expo Router kullanılmadı; tek oyun ekranı | Oyun akışı doğrusal; router ek karmaşıklık getirir. Ekran sayısı artarsa yeniden değerlendirilecek |
| 2026-11-03 | Sahneler kod ile çizilen vektör illüstrasyon | Telifsiz, her çözünürlükte keskin, kayıt yalnızca zaman damgası |
| 2026-11-03 | Sesler kod ile sentezlendi | Telif/lisans riski yok, küçük dosyalar |
| 2026-11-03 | Font: Nunito (OFL) | Fredoka Türkçe "ş" glifini bozuk gösteriyordu |
| 2026-11-03 | Backend, AI, hesap, abonelik yok | Ürün sahibinin kısıtı; offline-first |
| 2026-11-03 | Bundle ID geçici: `com.tamani.game` | App Store Connect'te kesinleştirilecek |
| 2026-11-03 | Oyun sesleri iPhone sessiz moduna uyar (varsayılan) | Toplu taşımada beklenen davranış |
| 2026-11-03 | **Mekanik değişti: Işık Kementi** (v1 fotoğraf `master`'da) | Ürün sahibi sürekli aktif, beceri tavanı yüksek oyun istedi; karşılaştırma GAME_DESIGN.md |
| 2026-11-03 | 120 Hz sabit adımlı deterministik simülasyon, girdi logu | Aynı girdi = aynı skor; kare hızından bağımsız fizik |
| 2026-11-03 | Göreceli sürükleme (kazanç 1.15) | Parmak kıvılcımı kapatmaz; tek elle tüm alan |
| 2026-11-03 | Manyetik döngü kapanışı (13 px) | Parmaklar izi tam kesmez; adil ve doğal his |
| 2026-11-03 | Kirpilere ömür (takipçi 11 sn, yörünge 15 sn) | Bot testlerinde alan tıkanıyordu |
| 2026-11-03 | Kombo çarpanı 1+⌊kombo/3⌋, en fazla ×6 | ×8 skorları aşırı şişiriyordu |
| 2026-11-03 | Yıldız eşikleri 10.000 / 22.000 (bot kalibrasyonu) | iPhone testinden sonra gerçek oyuncuyla yeniden ayarlanacak |
| 2026-11-03 | Fotoğraf prototipinin modülleri bu branch'ten kaldırıldı | Yeni mimariye uymuyor; tamamı `master`'da duruyor |
| 2026-11-03 | expo-dev-client + EAS `development` profili eklendi | App Store Expo Go SDK 58'i desteklemiyor |
| 2026-11-03 | Ücretsiz iPhone testi: sign.expo.dev (SDK 58 Expo Go, ücretsiz Apple ID, 7 gün) | Ürün sahibi Apple Developer üyeliği almak istemiyor |
| 2026-11-03 | Cihazda FPS göstergesi (dev veya `EXPO_PUBLIC_PERF=1`) | Gerçek cihaz ölçümü olmadan 60 FPS iddia edilmeyecek |
