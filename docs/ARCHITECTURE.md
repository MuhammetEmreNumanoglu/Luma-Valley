# Mimari

## Yığın
Expo SDK 58, React Native 0.88, React 19.3, TypeScript (strict), **React Native Skia 2.14** (tüm oyun grafikleri), **Reanimated 4.7 + Worklets 0.13** (UI thread animasyonları), **Gesture Handler 3.3** (tek parmak sürükleme, dokunma, kaydırma), **AsyncStorage** (kalıcı kayıt), **expo-audio** ve **expo-haptics**, Nunito (OFL). Yeni bir native bağımlılık eklenmedi; projedeki her modül Expo Go SDK 58 ile uyumludur.

## Katmanlar

```
content/  (saf veri)  ──►  engine/  (saf kurallar)  ──►  state/GameProvider  ──►  screens/ + render/
puzzles/  (saf)       ──┘          ▲                          │
core/ (rng, zaman)  ───────────────┘                  persistence/ (kayıt)
                                                     services/purchases (arayüz)
```

- **Motor UI'dan bağımsızdır.** `apply(state, command, now)` bir **derin kopya** üzerinde çalışır ve `{ state, events }` döndürür. Reddedilen komut çağıranın durumunu hiç değiştirmez. Kabul edilen komut ya tamamen uygulanır ya hiç uygulanmaz; bu yüzden yarım ödül veya çift ödül oluşmaz.
- Komutlar: `move`, `tap` (üret), `sell`, `store`, `retrieve`, `openCell`, `buySlot`, `upgrade`, `completeQuest`, `deliverOrder`, `replaceOrder`, `solvePuzzle` (çevirmeler motor tarafından yeniden doğrulanır), `useHint`, `refillEnergy`, `claimTask`, `setDecor`, `settings`, `grantPurchase` (yalnızca doğrulanmış satın alma için, işlem kimliğiyle idempotent) ve `tick`.
- **Determinizm:** Rastgelelik tohumlu ve serileştirilebilir RNG (`state.rng`, mulberry32) ile sağlanır. Motor duvar saatini kendisi okumaz; `now` dışarıdan verilir. Aynı kayıt ve aynı komut dizisi aynı sonucu verir; `tests/fuzz.test.ts` bunu test eder. Günlük görevler `hash(gün)` ile, siparişler kayıt RNG'si ile üretilir.
- **Saat koruması (`core/time.ts`):** Saat geri alınırsa bütün çapalar "şimdi"ye taşınır; oyuncu hiçbir şey kaybetmez ve kazanmaz. İleri alınırsa yenilenme en fazla doluluğa kadar sürer (enerji 100, kullanımlar kapasiteye kadar), en fazla 3 günlük boşluk sayılır. Kayıt asla silinmez.

## Kayıt (`persistence/`)
- Durumun tamamı tek bir JSON belgesidir.
- **Çift slot:** `luma.save.a` ve `luma.save.b` sırayla yazılır. Her zarf `{seq, savedAt, sum: FNV-1a(data), data}` içerir. Yükleme, sağlama toplamı geçerli olan en yeni slotu seçer. Yazma sırasında uygulama kapanırsa en fazla son birkaç saniye kaybolur.
- **Yazma zamanları:** 600 ms gecikmeli kayıt; görev, bulmaca, bölge açılışı ve seviye atlamada anında kayıt; uygulama arka plana geçerken anında kayıt. Yazmalar sıraya alınır ve bekleyen yalnızca en yeni durum tutulur.
- **Migration:** `SAVE_VERSION` ile birlikte `MIGRATIONS[n]` (n → n+1) zinciri kullanılır. Daha yeni bir sürümden gelen kayıt reddedilir (bozulmaz). Eski Tam Anı kayıtları tanınır ve yok sayılır.
- **Onarım (`repair`):** Eksik alanlar varsayılanla doldurulur. Negatif ve sayı olmayan bakiyeler sıfırlanır, bilinmeyen nesneler atılır. Çift üreticiler kaldırılır, sahip olunup tahtada olmayan üreticiler kuyruğa alınır. Envanter sınırları da düzeltilir.
- Expo SQLite yerine AsyncStorage seçildi: bu ortamda yeni paket kurulamıyordu ve tek belgeli atomik anlık görüntü modeli bu ölçek için yeterli. Geçiş gerekirse yalnızca `KeyValue` adaptörü değişir (`DECISIONS.md`).

## Çizim
- Bütün görseller **kodla çizilir** (`render/`): `kit.ts` (degrade, kenar ışığı, temas gölgesi, yaprak, taç yaprağı, parıltı), `items.ts` (111 nesne), `producers.ts`, `portraits.ts` (7 karakter × 6 duygu), `icons.ts`, `structures.ts` (32 yapı tipi × aşamalar), `map.ts` (biyom sahnesi, derinlik sıralı), `puzzle.ts`, `ambient.ts` (worklet).
- **İki kullanım:**
  1. Canlı Skia (tahta, harita, bulmaca). Sık yeniden çizilen ekranlar için çizimler bir kez **SkImage'e rasterleştirilir** (`imageCache.ts`): sürükleme ve kaydırma sırasında bulanıklık ve degrade yeniden hesaplanmaz, sadece doku çizilir. Bölge resimleri yalnızca o bölgenin görünümü değişince yeniden oluşturulur (en fazla 6 tanesi önbellekte tutulur).
  2. `scripts/gen-sprites.ts` aynı fonksiyonları Node'da CanvasKit ile çalıştırıp **186 PNG** üretir: liste ve kart ikonları, portreler. `assets/sprites/manifest.json` her varlığın kimliğini, kategorisini, dosyasını, boyutunu, kullanıldığı ekranı, kaynağını ve lisansını içerir.
- **Animasyon:** Merge efekti (merkeze çekilme, ışık, parçacık, zıplama), üretim yayı, diken temizleme ve bulmaca karosunun dönüşü Reanimated paylaşılan değerleriyle UI thread'de çalışır. Haritadaki ortam hareketi (duman, kanat, çark, kelebek, arı, ateşböceği, kuş, fener ışını, çeşme) zamandan prosedürel olarak hesaplanır, sadece görünen alan çizilir ve "hareketi azalt" açıkken kapanır.
- **Durum değiştirilmez:** Çizim kodu oyun durumunu yalnızca okur.

## Ses
`scripts/gen-sfx.mjs` 15 efekti ve 45 saniyelik döngüsel müziği (piyano, marimba ve pad; I–vi–IV–V) sentezler. Üçüncü taraf ses kullanılmaz. iPhone'un sessiz düğmesine uyulur ve diğer uygulamaların sesiyle karışmasına izin verilir.

## Yerelleştirme
- `i18n/strings.ts`: arayüz metinleri (TR ve EN, anahtar eşitliği test edilir).
- `i18n/content.ts`: nesne, üretici, yapı, görev, bölge, karakter, başarı ve anı metinleri.
- `i18n/dialogues.ts`: 94 görev × başlangıç ve bitiş diyalogları ile giriş hikâyesi.
Yeni dil eklemek için her üç dosyaya bir sütun eklenir.

## Ölçeklenme
Oyun **local-first** çalışır: merge, sürükleme, görev ve bulmaca hamlelerinin hiçbiri sunucu isteği üretmez. Gelecekteki servisler (hesap, bulut kayıt, satın alma doğrulama, analitik, canlı etkinlik) `services/` altında arayüz olarak bağlanır; motor hiçbir sağlayıcıya bağımlı değildir. Kayıt zarfı (`seq`, `savedAt`, sağlama toplamı) ve token defteri (`ledger`, `purchases` idempotency kümesi), çok cihazlı uzlaştırma için başlangıç noktasıdır. Sunucu tarafı tasarlanmadı ve yük testi yapılmadı. "Bir milyon kullanıcıyı destekler" iddiasında bulunulmamaktadır.

## Performans önlemleri
Rasterleştirilmiş sprite ve bölgeler, sadece görünür ortam elemanlarının çizilmesi, düşük kalite modu (daha az çimen ve ağaç), harita resimleri için en fazla 2x piksel yoğunluğu, sürükleme sırasında tahtanın yeniden kaydedilmemesi (sadece paylaşılan değerler değişir). **Gerçek cihazda FPS ölçümü yapılmadı** (`TEST_REPORT.md`).
