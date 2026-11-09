# 11 · Uygulama içi satın almalar ve abonelikler

## Bugünkü durum

`src/services/purchases.ts` → `UnconfiguredStore`: ürünler fiyatsız, her satın alma `unavailable`, geri yükleme `unavailable`. **Hiçbir yolla başarı bildirmez, altın vermez** (test). Arayüz buna göre:
- Pazar'daki altın paketleri bölümü gizli.
- "İkinci işçi" satın alma butonu gizli (koda gömülü fiyat kaldırıldı).
- Ayarlar'daki "Satın alımları geri yükle" gizli.

Bu haliyle sürüm satın alma içermeden yayınlanabilir.

## Ürün kataloğu (planlanan)

| Kimlik | Tür | İçerik |
|---|---|---|
| `luma.coins.small` / `medium` / `large` / `extra` | Consumable | 1800 / 4800 / 10800 / 24000 altın |
| `luma.worker.second` | **Non-consumable** | Kalıcı ikinci işçi (geri yüklenebilir olmalı) |

Abonelik: **yok** (eklenmedi; gereksiz abonelik eklenmemesi istendi). Harita/alan satışı: atölye alanları oyun içi altın ve yıldız jetonuyla açılır, gerçek parayla satılmıyor.

## Motor tarafı güvenceler (hazır, test edildi)

| Kural | Durum | Kanıt |
|---|---|---|
| Aynı işlem iki kez uygulanmaz | PASS | `grantPurchase` / `grantWorkerPurchase` işlem kimliğini `purchases` listesinde tutar (tests/economy.test.ts, tests/release-compliance.test.ts) |
| Başarısız/iptal/bekleyen satın almada ürün verilmez | PASS | Arayüz yalnız `status: 'verified'` iken komut gönderir |
| Kalıcı ürün sıfırlamada kaybolmaz | PASS | `resetKeepingPurchases` |
| Geri yükleme iki kez vermez, ikinci işçi üst üste binmez | PASS | `grantWorkerPurchase` idempotent |
| Satın alınan altının süresi dolmaz | PASS | Altın süresiz |
| Güncellemede haklar kaybolmaz | PASS | Kayıt migration zinciri v1→v7, `purchases` ve `workerCapacity` korunur |

## Satışa açmadan önce yapılacaklar (MANUEL + geliştirme)

1. App Store Connect ve Play Console'da ürünleri yukarıdaki kimliklerle oluşturun (vergi/banka bilgileri dahil).
2. Bakımlı bir Expo uyumlu kütüphaneyle (ör. `react-native-iap` veya RevenueCat SDK) `PurchaseService`'i gerçekleyin: `products()` fiyatı mağazadan, `purchase()` yalnız doğrulamadan sonra `verified`, `restore()` kalıcı ürünler için.
3. Makbuz doğrulama: sunucu taraflı (önerilen) ya da mağaza SDK'sının imzalı işlem doğrulaması. Sunucu eklenirse 04 ve 05 belgeleri, App Privacy ve Data Safety beyanları güncellenmeli.
4. Bekleyen (Ask to Buy / Play pending) işlemleri, iadeleri (Apple App Store Server Notifications, Play voided purchases) ele alın: iade edilen consumable için altın geri alma politikası yazılı olmalı.
5. Sandbox / lisans test hesaplarıyla satın alma, iptal, bekleyen, iade, geri yükleme, internetsiz deneme, cihaz değişimi senaryolarını gerçek cihazda test edin.
6. Gerçek paralı rastgele ödül yok; tohum kutusu olasılıkları zaten gösteriliyor.
