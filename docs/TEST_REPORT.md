# Test Raporu

## v5 (2026-11-06) — yalnız gerçekten çalıştırılanlar
| Komut | Sonuç |
|---|---|
| `npm test` | **107/107** (yeni: `resources.test.ts`; yeniden yazılan: `merge.test.ts`, `nodes.test.ts`; v4→v5 migration testi) |
| `npm run typecheck` | hatasız |
| `npx expo lint` | 0 hata |
| Web E2E (`scripts/e2e-web.mjs`) 390×844 TR ve 375×667 EN | **15/15**, konsol hatası yok |
| `npm run simulate` 210 gün, 5 profil | `GAME_ECONOMY.md` |

E2E kontrolleri: navigasyon sırası (sekmelerin x konumu Atölye<Vadi<Görevler<Defter<Pazar), başlangıçta 4 tek hücrelik engel, **yanına koyunca birleşmeme**, üstüne bırakınca birleşme, kutu ipucu ve gerçek ürün, kutu ürünlerinin birleşmesi, kaya 1. kırma **tam 5 enerji** ve kaya yerinde kalıyor, süre **1 dakika**, seviye modalı, koleksiyon ödülü bir kez, enerji **60 altınla** alındı, yeniden yüklemede altın/koleksiyon/**kırma sayacı** korunuyor, kayıtta jeton/kıvılcım yok.
Birim testleri: kaya 3 aşaması (5⚡/1dk/5, 10⚡/5dk/8, 15⚡/10dk/12, toplam 25 taş, kare boşalır, boşalan kareye ürün konabilir), beş kaynak türünün tamamı, çift dokunma/çift ödeme yok, kapalı uygulamada süre işler, tahta doluyken Depo, normal ürünler (civciv, inek, çiçek, süt, taş Sv1) kırılamaz, teslimat yalnız boş kenar hücresine ve sınırlı, saat geri alma; birleştirme: yanına koyma birleştirmez, üstüne bırakma tam 3'ü birleştirir, iki tane varken hiçbir şey kaybolmaz, uzak eş seçilmez, 4 eş varken deterministik seçim, zincirleme yok, farklı ürünler takas olur, engel/kilit hedef değildir; jeton→altın idempotent migration, kil→seramik, kaldırılan vadi işleri Depo'ya ve kurulum iadesi, engeller yalnız eski kilitli hücrelere.
**Çalıştırılmayanlar:** gerçek iPhone, FPS, haptik, TestFlight.

---

# Test Raporu

## v4 (2026-11-06) — yalnız gerçekten çalıştırılanlar
| Komut | Sonuç |
|---|---|
| `npm test` | **105/105 geçti** (yeni: `nodes.test.ts`, `collection.test.ts`; güncellenen: farm, workshop, quests, content, fuzz, crate, merge, art) |
| `npm run typecheck` | hatasız |
| `npx expo lint` | 0 hata (uyarılar önceden de vardı) |
| `npx expo export -p web` + `node scripts/serve-dist.mjs` + `node scripts/e2e-web.mjs` | **390×844 (TR)** ve **375×667 (EN)**: 10/10 kontrol geçti, konsol hatası yok |
| `npm run simulate` (210 gün, 5 profil) | sonuçlar `GAME_ECONOMY.md` |

E2E'nin doğruladıkları: ilk üçlü birleştirmeden hemen sonra kutu ipucunun çıkması; kutuya dokununca tahtaya gerçek ürün gelmesi; kutu ürünlerinin birleştirilebilmesi; seviye modalında XP; ilk görev ve tek onarım kartı; koleksiyonda toplanmamış ödüller ve "Hepsini topla"nın altını bir kez ödemesi; vadide ilk kayanın 1. aşamasının **tam 5 enerji** düşürmesi; tüccar paneli ve gezinme modu; **yeniden yüklemede** altın, koleksiyon ve **çalışan kaya zamanlayıcısının** korunması.
Hücre boyutu: 390×844'te 46 pt (önce ≈40), 375×667'de 36 pt.

Birim testlerinin kapsadığı kritik senaryolar: kaya 3 aşaması (5⚡/1 dk/3, 10⚡/5 dk/5, 15⚡/10 dk/8), çift dokunmada ikinci iş/ödeme olmaması, süre dolmadan ödül olmaması, kayanın bir daha doğmaması, kapalı uygulamada sürenin işlemesi (kaydet → 2 saat sonra yükle → topla), tahta doluyken ödüllerin Depo'ya gitmesi, saat geri alınınca zamanlayıcı kelepçesi, kıvılcım yetersizliği, işleme binası girdileri, koleksiyon ödülünün yeniden yüklemeden sonra da tekrar alınamaması, v3→v4 migration (altın, keşifler, dikenler, çalışan taş işi, kıvılcım, eğitim), kutunun asla doğal malzeme vermemesi, **softlock testi** (her görevin istediği aile, görevden önce yenilenebilir bir kaynaktan elde edilebilir), 5×1000 rastgele komutluk fuzz (yeni komutlar ve değişmezler dahil) ve determinizm.

**Çalıştırılmayanlar:** gerçek iPhone/iOS build, FPS/bellek ölçümü, haptik, TestFlight. Ses kalitesi dinlenmedi.

---

# Test Raporu (2026-11-04)

Bu raporda yalnızca **gerçekten çalıştırılan** testler var. Doğrulanmayan konular en altta ayrıca listelendi.

## 1. Otomatik testler: `npm test` → **70/70 geçti**
Node 22 `node:test` ile çalıştı. Testler hem geliştirme konteynerinde (Linux x64) hem Mac'teki Linux VM'de (arm64) geçti.

| Dosya | Kapsam |
|---|---|
| `merge.test.ts` (9) | Verim tablosu (3→1, 4→1+1, 5→2, 6→2, 8→3, 10→4), merge-3, merge-5 yaprak bonusu, en uzak artığın kalması, kaskad, geçersiz sürüklemede eşya kaybı olmaması (kilit, diken, aralık dışı, takas), son seviye, diken hasarı ve temizliği, tek seferlik keşif |
| `economy.test.ts` (16) | Vadi süslemeleri (yaprakla bir kez alınır, kilitli bölgede reddedilir),  Çay molası (yaprakla enerji, aynı gün fiyat ikiye katlanır ve ertesi gün sıfırlanır), üretim maliyeti ve yerleşimi, enerjinin negatife düşmemesi, çevrimdışı yenilenme ve tavan, saat geri ve ileri alınınca çift sayım olmaması, kullanımların dolması, dolu tahtada üretimin reddi, satış ve geliştirme, jeton yetersizliği ve defter, çanta, hücre açma, dönüştürücü, gizli tarif, satın alma idempotency, seviye atlama |
| `quests.test.ts` (8) | Başlangıç görevi, teslimde eşyanın tüketilmesi ve ödülün bir kez verilmesi, üretici hediyesinin tek olması, yanlış bulmaca çözümünün ödül vermemesi, kilitli bulmaca, köprünün 2. bölgeyi açması, canlılık, siparişler, günlük görevler (kaçırılan günün cezasız olması) |
| `puzzles.test.ts` (9) | Maske döndürme, **80 bulmacanın hepsi çözülebilir, başlangıçta çözülmüş değil, önemsiz değil**, zorluk artışı, determinizm, ipucu ile çözüme ulaşma, ipucunun her zaman mesafeyi azaltması, yanlış rengin kabul edilmemesi, yıldız eşikleri, 30 günlük Yankı bulmacası |
| `content.test.ts` (11) | 12 aile ve 8–12 seviye, benzersiz kimlikler, 7 bölge, 72 yapı, 94 görev, bütün referansların çözülmesi, her yapının en az bir görevi olması, görev grafiğinin döngüsüz ve tamamen ulaşılabilir olması, **her istenen nesnenin istendiği anda üretilebilir olması**, TR ve EN arayüz metinlerinin eşleşmesi, bütün içerik adları ve diyalogların iki dilde bulunması |
| `save.test.ts` (6) | Kodlama ve çözme, yırtık veya elle değiştirilmiş kaydın sağlama toplamıyla reddi, en yeni geçerli slotun seçilmesi, bozuk slottan bir öncekine dönüş, yabancı veya gelecek sürüm kaydının reddi, alan onarımı, çift üretici onarımı |
| `fuzz.test.ts` (3) | **5 × 1000 rastgele komut** (geçerli ve geçersiz, saat geri ve ileri sıçramaları dahil). Her adımda değişmezler kontrol edildi: bakiyeler ≥ 0 ve tam sayı, enerji ≤ tavan, geçerli nesne kimlikleri, üreticinin tekliği, görevin iki kez ödüllendirilmemesi, defter kimliklerinin benzersizliği, çanta sınırı. Ayrıca determinizm (aynı tohum ve aynı komutlar = aynı durum) ve üretim olmadan nesne sayısının artmaması test edildi. |
| `art.test.ts` (5) | 42 portre, 21 ikon (kaynak koddaki her `icon.*` kimliği dahil) ve dikenli çalı sprite'ları; görsel yenileme: 111 nesne, 12 üretici, 72 yapının 3 aşaması, biyom ağaçları, dekor ve süslemeler için sprite'ın registry'de ve diskte olması; PNG başlığından boyut ve RGBA kontrolü, çapa ve lisans alanı; eski kayıt kimliklerinin art'a çözülmesi |
| `integration.test.ts` (3) | Eğitim merge'ü → görev → ödül → kayıt → yükleme. **Autoplay botu yalnızca çevrimdışı komutlarla 1. bölgeyi bitirip 2. bölgeyi açtı.** Çevrimdışı bulmaca → görev → yeniden başlatma → üretime devam. |

`npm run typecheck` (TypeScript strict) **hatasız**.

## 2. Web E2E (gerçek tarayıcı): `scripts/e2e-web.mjs`
Web export Chromium'da (headless, SwiftShader) çalıştırıldı. İki ekran boyutu denendi: **390×844** (iPhone 14 sınıfı) ve **375×667** (iPhone SE sınıfı). Her ikisinde de 19 ekran görüntüsü alındı ve **konsol hatası yoktu**.

Senaryo: giriş hikâyesi → Lumi diyaloğu → eğitim sürüklemesi (sürükleme sırasında hedef hücre yeşil yanıyor) → merge animasyonu ve "Yeni keşif" bildirimi → seraya 6 dokunuş → Görevler'de ilk görevin tamamlanması → bitiş diyaloğu → onarım kutlaması (önce/sonra) → yeni hikâye görevinin kendini tanıtması → harita (işaretçiler, yıkık bölge, sis) → haritada yapıya dokunup yapı sayfasının açılması → haritanın kaydırılması → Işık Yolları #1'in dokunarak çözülmesi (4 hamle, 3 yıldız, başarı bildirimi) → Defter → Pazar (gerçek ödeme kapalı uyarısı) → Ayarlar → **sayfanın yeniden yüklenmesi: ilk görev tamamlanmış, bulmaca 1/80 ve 3 yıldız olarak kaldı (kayıt korunuyor)**.

E2E sırasında bulunan ve düzeltilen hatalar:
- Web'de bulmacaya dokunulduğunda `locationX` tanımsız geldiği için oyun çöküyordu. Dokunma Gesture Handler'a taşındı ve sınır kontrolü eklendi.
- Defter sekme şeridi web'de görünmüyordu (yükseklik 0). Sabit yükseklik verildi.
- Küçük ekranda tahta hücreleri 30 pt'ye düşüyordu. Kompakt yerleşimle 35 pt'ye çıkarıldı.

## 2b. Görsel yenileme sonrası E2E (v1.1)
Yeni sprite'larla web export tekrar alındı. TypeScript hatasız. Aynı 19 adımlık senaryo 390×844 (EN) ve 375×667 (TR) boyutlarında **konsol hatası olmadan** geçti. Küçük ekranda yassı yapılara (bahçe, yol) dokunma kaçıyordu; dokunma alanına parmak boyunda bir alt sınır eklendi ve test tekrarlandı. Sprite yükleme başarılı, kayıt yeniden yüklemede korundu. Ekran görüntüleri: `docs/screenshots/`.

## 2c. v1.2 sanat yönetimi sonrası
- TypeScript hatasız, web export alındı, 70/70 test hem bulutta hem Mac'te geçti.
- 19 adımlık E2E iki boyutta konsol hatası olmadan geçti: 390×844 (EN) ve 375×667 (TR, küçük iPhone). Senaryo şunları kapsıyor: temel merge, üretim, görev tamamlama, onarım kutlaması, bulmaca çözümü, Defter, Pazar, Ayarlar ve yeniden yükleme sonrası kayıt.
- **Hazır kayıtla ekran turu** (`scripts/qa/gen-save.ts` + `scripts/qa/shots.mjs`): Gerçek motorda autoplay botuyla 2. ve 3. bölgeye kadar oynanmış kayıtlar uygulamanın kendi kayıt biçiminde üretildi ve tarayıcıya yüklendi. Bunlar yeni grafik sisteminde sorunsuz açıldı ve konsolda hata yoktu. Ekran görüntüleri: harita (restore edilmiş ve soluk bölgeler), tahta, görevler, koleksiyon, karakterler, başarılar, mağaza, diyalog (`docs/screenshots/v1.2/`).
- **Offline varlık:** Bütün sprite'lar paket içi dosya. `tests/art.test.ts` her kimliğin diskte geçerli bir RGBA PNG olduğunu kontrol ediyor. Tarayıcı turlarında bütün sprite'lar yüklendi (yedek çizime düşen olmadı).
- **Ekran ekran değerlendirme ve yapılan düzeltmeler:**
  - Harita: Teknenin boyutu aşırıydı, sabit boyuta sığdırıldı. Soluk bölgelerin zemini fazla griydi, solukluk azaltıldı.
  - Diyalog: Niko'nun isim şeridi açık renk kıyafet yüzünden okunmuyordu. Kontrast kuralı eklendi.
  - Pazar: Süslemeler genel hediye ikonuyla görünüyordu. Her süsleme artık kendi görseliyle görünüyor.
  - Küçük ekranda eğitim balonu tahtanın üst sırasını kısmen örtüyor. Bu yalnızca eğitimde oluyor ve düzeltilmedi.

## 3. Görsel denetim
`npm run preview-art` ile üretilen kontak baskıları tek tek incelendi: 111 nesne, 12 üretici, 7×6 portre, 21 ikon, 7 bölgenin yıkık ve onarılmış hâli, 1. bölgenin yarı onarılmış hâli, sis, 3 bulmacanın başlangıç ve çözülmüş hâli. Zayıf bulunan "Anı Kırıntısı" çizimi yeniden yapıldı.

## 4. Ekonomi simülasyonu: `npm run simulate`
Autoplay botu, gerçek motoru oyuncunun kullanabileceği komutlarla oynar. Her komut için insan süresi hesaplanır (dokunma 1,2 sn, sürükleme 2,2 sn, bulmaca 25 sn + par başına 3,5 sn, görev ve diyalog 12 sn). Oturumlar arasında gerçek zaman geçer ve enerji ile kullanımlar dolar.

| Profil | 7. gün | 30. gün | 90. gün | 210. gün | Bölge açılış günleri |
|---|---|---|---|---|---|
| 10 dk/gün | B2, 19 görev | B3, 43 görev | B5, 61 görev | B6, 78/94 görev | B2=7, B3=21, B4=44, B5=88, B6=145 |
| 30 dk/gün | B2, 36 görev | B5, 62 görev | B6, 80 görev | B7, 89/94 görev | B2=3, B3=8, B4=15, B5=28, B6=50, B7=94 |
| 60 dk/gün | B3, 45 görev | B6, 74 görev | B7, 86 görev | **B7, 94/94 (final ~180. gün)** | B2=2, B3=4, B4=9, B5=16, B6=25, B7=50 |
| 120 dk/gün | B3, 43 görev | B6, 77 görev | B7, 84 görev | B7, 84/94 (bot 90. günden sonra takılıyor) | B2=1, B3=2, B4=9, B5=13, B6=23, B7=68 |
| 30 dk + 160 jeton/ay | B3, 38 görev | B5, 61 görev | B6, 80 görev | B7, 90/94 görev | B2=3, B3=7, B4=15, B5=30, B6=49, B7=95 |

**Yorum:**
- Hedef "düzenli oynayan biri 6–7 ay boyunca ilerlesin" idi. Günde 10–30 dakika oynayan profiller 210. günde hâlâ finali bitirmemiş durumda ve yeni bölge ile görevlerle karşılaşıyor. Bu hedefle uyumlu bir sonuç.
- Bot gerçek bir oyuncu değil. Bazen verimsiz birleştiriyor ve bulmacaları anında çözüyor. Gerçek süre **oyuncu testleriyle** doğrulanmalı; bu tablo kesin oynama süresi iddiası değildir.
- **Bulunan ve düzeltilen denge sorunları:**
  1. Fener üreticisinin kapasitesi çok düşüktü (6 kullanım/120 sn). Fener zinciri darboğaz oluyordu; kapasite 10/14/18 kullanım ve 90/75/60 sn olarak artırıldı.
  2. Enerji yenilenmesi 90 sn'den 60 sn'ye indirildi.
  3. Simülasyon yaprağın geç oyunda biriktiğini gösterdi (30 dk profilinde 210. günde yaklaşık 74 bin; çay molasından sonra 1,4 bin). Buna karşı **Çay molası** eklendi: yaprakla +50 enerji alınıyor, fiyat aynı gün her alımda ikiye katlanıyor (120, 240, 480…) ve ertesi gün sıfırlanıyor. Yukarıdaki tablo bu değişiklikten sonraki koşudan alındı.
- **Açık denge konusu:** Çok sık oynayan profilde yaprak hâlâ birikebilir. Dekorasyon kataloğu ve artan geliştirme maliyetleri bir sonraki denge turunda ele alınacak.
- Ödeme yapmayan oyuncu 30 günde yaklaşık 200–320 jeton biriktiriyor. Ayda 160 jeton alan profil, ödemeyen 30 dk profiliyle neredeyse aynı hızda ilerliyor (B7: 95. gün ve 94. gün). Yani **premium jeton haksız üstünlük sağlamıyor**: yalnızca enerji beklemesini kısaltıyor ve darboğaz enerjiden çok planlama ile üretici kapasitesi.
- 120 dk profilinde botun 84 görevde durması, botun çok aileli son görevlerdeki sezgilerinin sınırından kaynaklanıyor. İçeriğin baştan sona ulaşılabilir olduğunu statik içerik testi kanıtlıyor; 60 dk profili de 94 görevin hepsini bitirdi.

## 5. Doğrulanmayanlar (dürüst liste)
- **Gerçek iPhone ve Android cihazda hiç çalıştırılmadı.** Bu oturumda cihaza erişim yoktu. 60 FPS, dokunma gecikmesi, haptik, ses gecikmesi, güvenli alan ve Dynamic Island yerleşimi, uzun oturumda bellek kullanımı ölçülmedi. Web önizlemesi native davranışı kanıtlamaz.
- Expo Go'nun SDK 58 sürümünün mağazalarda olup olmadığı doğrulanmadı (`MOBILE_TESTING.md`).
- Tablet yerleşimi denenmedi (`supportsTablet: false`).
- Gerçek oyuncu testi yapılmadı: zorluk, yıldız eşikleri ve içerik süresi bot ve simülasyonla kalibre edildi.
- Ses dosyaları üretildi ve paketlendi, ama kulakla dinlenerek kalite kontrolü yapılmadı (bu ortamda ses çıkışı yok).
- Görsel yenilemeden sonra sprite'ların cihazda yüklenme süresi, bellek (yaklaşık 8 MB PNG, çözülmüş hâli daha büyük) ve FPS ölçülmedi.
- Satın alma yalnızca "yapılandırılmamış" durumda test edildi (sahte başarı yok, jeton verilmiyor).
