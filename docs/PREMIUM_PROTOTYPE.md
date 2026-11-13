# Premium sistemin mevcut durumu

Üst çubuktaki yıldız jetonundan mağazaya ulaşılır. `npm install` ve `npm run web` geliştirme sürümünü başlatır. Para paketleri, test satın alımları ve premium sezon yolu `luma.premium.demo.v1` adlı ayrı geliştirme kaydındadır. Ana oyuna gerçek veya sahte satın alma jetonu aktarmaz. Production sürümünde test paneli ve mock satın alma kapalıdır; gerçek StoreKit henüz kurulmamıştır.

## Ana oyun

- 30 seviyeli ücretsiz sezon: gerçek birleştirme, sipariş, tüccar ödülü ve üretilen ürün istatistikleri günlük/haftalık/sezonluk görevleri ilerletir. XP ve tek seferlik ücretsiz altın/enerji/yıldız ödülleri ana oyuna kaydedilir. Üretim sayacı üretilen **ürün adedidir**, farklı üretim türlerinin sayısı değildir. Günler UTC esaslıdır. Görev XP'si oyuncunun talebiyle alınır. Sezon bitse bile kazanılmış ücretsiz ödüller alınabilir.
- Beş atölye görünümü oyun içi jetonla açılır ve tahtanın renklerini değiştirir; konumları ve etkileşimleri etkilemez.
- On dekorasyon oyun içi jetonla alınabilir, sahip olunan bölgedeki hazır güvenli noktalara yerleştirilir, taşınır veya envantere kaldırılır. Yerleşim bölgede yapı dokunma alanlarının ve eski dekor noktalarının dışında tutulur. Noktalar serbest sürüklemeye kıyasla sınırlıdır; ilk bölgede çok az nokta vardır. Görseller mevcut oyun varlıkları ile Skia efektlerinin birleşimidir, her ürün için yeni özgün çizim henüz oluşturulmamıştır. Çit ve şelale haritada Skia ile çizilir; mağaza kartlarındaki önizlemeler ve diğer özgün dekorasyon varlıkları hâlâ iyileştirilmelidir.
- Üç kozmetik koleksiyon gerçek tema, atölye ve dekorasyon sahipliğini gösterir; tamamlama ödülü bir kere alınır.
- Jetonla enerji, envanter genişletme ve tek bir devam eden üretime/atölye kaynağına 15 veya 30 dakika hızlandırma eklenmiştir. Değişmiş süreyi veya yinelenen istek kimliğini reddeder; tüccarın jeton üreten işi hızlandırıcı dışında tutulur. Üretim hedeflerinin adları henüz tümüyle yerelleştirilmemiş olabilir.
- v9 kayıtları v10'a taşınır, eski v8→v9 göçü korunur. v9'dan gelen oyuncu yeni ücretsiz sezonu ilk ziyaretinde başlatır.

Bölge satın alma eklenmedi: mevcut yedi vadi bölgesinin açılışı köprü/kapı görevlerine bağlıdır; bu bağımlılıkları güvenle atlamadan iki para birimli erken açma tasarımı henüz tamamlanmamıştır. Önceki gibi görev yoluyla ücretsiz açılırlar. Eksik bölgeler satılmaz.

## Teorik ekonomi denemesi

`SIM_PROFILE='15 dk/gün' npm run simulate -- 90` ve diğer üç profil motor üzerindeki otomatik oynayıcıyla çalışır. Tek tohum kullanır; oyuncu davranışı veya gerçek denge kanıtı değildir. Mock profilindeki para yalnızca ayrı mock cüzdana eklenir. Jeton harcayan profil 15 dakikalık hızlandırmayı 11 defa kullandı. Bölge satın alma stratejisi bu özellik henüz olmadığından denenmedi.

| Profil | 7. gün bölge / görev | 30. gün bölge / görev | 90. gün bölge / görev |
| --- | --- | --- | --- |
| 15 dk ücretsiz | 2 / 20 | 2 / 34 | 4 / 59 |
| 60 dk ücretsiz | 2 / 32 | 3 / 38 | 6 / 74 |
| 60 dk oyun jetonu harcayan | 2 / 32 | 4 / 51 | 6 / 76 |
| 60 dk ayrı mock profili | 2 / 32 | 3 / 38 | 6 / 74 |

60 dk ücretsiz profilde erken biten oturumların 252'sinde devam eden bir zamanlayıcı, 3'ünde reddedilen bot eylemi vardı. Bu öncelikli sınıflamadır; zamanlayıcı bulunması tek başına neden-sonuç kanıtı değildir. Bot iki 30 saniyelik bekleme sonrasında oturumu kapatır, bu yüzden uzun oturumları modellemekte sınırlıdır. 60 dk jeton harcayan profilde 248/3 aynı şekilde sınıflandı. Oyunun ekonomi dengesi bu sonuçlarla doğrulanmış sayılmaz.

## Üretim ve App Store öncesi

Çevrimdışı sezon yerel saat kullanır: kaydedilmiş en yüksek saatin gerisine dönüş görevleri geri açmaz, ancak ileri saat değişimi ve yerel kayıt değiştirme güvenilir biçimde engellenemez. Ücretli sezon/jeton satışından önce güvenilir sunucu saati, doğrulanmış StoreKit işlemleri, merkezi transaction/entitlement kaydı, iade ve kalıcı satın alma geri yükleme, cihazlar arası kurtarma gerekir. Yerel mock veri finansal kayıt değildir. Apple Developer üyeliği ve App Store Connect ürünleri henüz yok; fiyat etiketleri örnektir ve gerçek ödeme fiyatı sayılmaz. Çocuklar, gizlilik ve App Review ayrıca değerlendirilmelidir.

Resmi belgeler: https://developer.apple.com/app-store/review/guidelines/ ve https://developer.apple.com/documentation/storekit/in-app-purchase . Oyunda reklam veya reklam SDK'sı eklenmedi.
