# Ekonomi ve Monetizasyon

> **Güncel (kayıt v15).** Para birimleri: **Altın** (`leaves`, eski adı Yaprak) ve **Işık Jetonu** (`starTokens`).
> - Jeton kazanımı: tüccar/bakkal yıldız paraları (toplanınca jeton), günlük özel sipariş (+20, günde bir), günlük görev setini bitirme (+20), Battle Pass her 3. seviye (+5), kozmetik koleksiyon ödülleri, geliştirici test bakiyesi (yalnız dev).
> - Jeton harcaması: köprüler (B2 2.000 altın, B3–B6 200/300/400/500 jeton), atölye alanları, Işık Mağazası (temalar, kart paketleri, atölye görünümleri, dekor), kolaylıklar (+enerji, hızlandırma, envanter), hızlandırma eksik jetonu.
> - Gerçek ödeme kapalı; `grantPurchase` yalnız doğrulanmış işlemle altın verir; mock ürünler ayrı demo durumunda kalır.
> - Aşağıdaki tablo ilk tasarımdan kalmadır (Yaprak = bugünkü Altın).

## Para birimleri
| | Yaprak (normal) | Işık Jetonu (premium) |
|---|---|---|
| Kazanım | Siparişler, görevler, bulmacalar (ilk çözüm), satış, keşif, beşli birleştirme, seviye atlama, günlük ve haftalık görevler, diken temizleme | Başarılar (29), 3 yıldızlı bulmacalar, Günün Yankısı, keşif (seviye 6+), görev ödülleri, bazı seviye atlamaları, günlük ve haftalık görevler |
| Harcama | Üretici geliştirme, hücre açma, çanta bölmesi, bazı görev gereksinimleri, sipariş değiştirme, **Çay molası** (+50 enerji; fiyat aynı gün 120 → 240 → 480…, ertesi gün sıfırlanır), **vadi süslemeleri** (28 parça, 150–4200 yaprak) | Enerji doldurma (8), ipucu (günlük 3 ücretsizden sonra 2), gelecekte kozmetik temalar ve ek çanta |

- **Ana hikâye gerçek parayla satın alınmaz.** Köprü jetonları oyun içinde ücretsiz kazanılır; jetonun diğer etkileri zaman tasarrufu ve kozmetiktir.
- Yeni oyuncu 0 jetonla başlar (v15). Güncel 30 günlük jeton ölçümü `ECONOMY_SIMULATION.md` içindedir.
- Kumar mekaniği, rastgele ücretli kutu, sahte indirim veya zaman baskılı teklif **yoktur**.

## Jeton defteri
Her jeton değişikliği `changeTokens(state, delta, reason, id)` ile yapılır:
- Bakiye asla negatife düşmez; yetersiz bakiyede işlem reddedilir ve hiçbir şey değişmez.
- `ledger` son 200 kaydı `{id, delta, reason, at}` olarak tutar. **Aynı `id` ikinci kez işlenmez** (görev, başarı ve 3 yıldız ödülleri çift verilmez).
- Gerçek satın almalar `grantPurchase(transactionId, tokens)` ile gelir: `purchases` kümesi idempotency sağlar ve yalnızca pozitif tam sayılar kabul edilir.

## Satın alma altyapısı (bu sürümde **etkin değil**)
`src/services/purchases.ts`:
- Ürün kimlikleri: `luma.tokens.small` (60), `luma.tokens.medium` (160, +%10), `luma.tokens.large` (360, +%20), `luma.tokens.extra` (800, +%35). **Fiyatlar kodda yoktur**; mağazanın yerel fiyatı gösterilir.
- `UnconfiguredStore`: Ürünleri fiyatsız listeler. `purchase()` her zaman `unavailable` döner (çevrimdışıysa `offline`, değilse `notConfigured`). **Asla başarı döndürmez ve jeton vermez.** Pazar ekranında satın alma düğmeleri devre dışıdır ve "Gerçek ödeme bu sürümde etkin değil" yazar.

### Üretime geçiş planı
1. App Store Connect ve Google Play Console'da 4 tüketilebilir ürünü oluşturun. Bunun için Apple Developer Program (yıllık 99 $) ve Google Play geliştirici hesabı (tek seferlik 25 $) gerekir.
2. Bakımı süren, Expo ile uyumlu bir kütüphane ekleyin. **RevenueCat** (`react-native-purchases`) önerilir: StoreKit 2, Play Billing, makbuz doğrulama ve iadeleri tek yerden yönetir. Native modül olduğu için **Expo Go'da çalışmaz**; development build gerekir (`eas build --profile development`).
3. `PurchaseService` arayüzünü uygulayan bir `RevenueCatStore` yazın. `purchase()` yalnızca sunucu doğrulamasından sonra `verified` döner. `transactionId` mağazanın işlem kimliğidir.
4. **Doğrulama istemcide yapılmaz.** RevenueCat webhook'ları veya kendi sunucunuz makbuzu doğrular. Tüketilebilir ürünler cihaz değişiminde otomatik geri yüklenmez; bunun için hesap ve sunucu tarafında bir bakiye gerekir (aşağıya bakın).
5. İade ve iptal: Sunucu, iade edilen işlem kimliğini işaretler. İstemci bir sonraki senkronizasyonda negatif bir defter kaydı uygular (bakiye 0'ın altına inmez; açık sunucuda takip edilir).
6. Test ve gerçek ortam ayrımı: Sandbox ve test kullanıcıları ile `__DEV__` ve `EXPO_PUBLIC_STORE_ENV` ayrımı kullanılır. Test ortamında bile sahte başarı gösterilmez.

## Çevrimdışı ve güvenlik sınırları
- Oyun içinde kazanılan jetonlar tamamen çevrimdışı kazanılır ve harcanır (yerel defter).
- Gerçek para ile satın alma çevrimdışıyken **başlatılmaz**.
- Gelecekte satın alınmış jeton için önerilen model şudur: Sunucu "satın alınmış bakiye"nin tek doğru kaynağıdır. İstemci çevrimdışı harcamaları işlem kimliğiyle defterde biriktirir, bağlantı gelince sunucuya gönderir ve sunucu idempotent biçimde uzlaştırır.
- Tamamen çevrimdışı bir istemcide kusursuz hile önleme mümkün değildir. Hedef, gerçek parayla alınan değerin sunucuda korunması ve hilenin yalnızca hile yapan kişinin yerel oyununu etkilemesidir.

## Reklam
İlk sürümde reklam yoktur ve monetizasyonun reklama dayanması planlanmıyor.

### Second workshop worker

`luma.worker.second` is a non-consumable entitlement, not a coin pack. Configure the
product in both stores and implement `PurchaseService.workerPrice()` using the store's
localized price. The 49,90 TL shown before configuration is a design target, not a
confirmed price. Implement `purchase()` using the native store sheet and server-side
receipt verification; return `verified` with the matching product ID and transaction ID
only after validation. Restore verified ownership on reinstall or device change and grant
it through `grantWorkerPurchase`; cancelled, pending, and failed purchases must never
grant capacity. The current unconfigured service always returns unavailable.
