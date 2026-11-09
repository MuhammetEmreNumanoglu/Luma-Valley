# Satın alma test sonuçları (2026-11-09)

| Senaryo | Durum | Kanıt |
|---|---|---|
| Mağaza yokken satın alma asla "başarılı" dönmez, altın verilmez | **PASS** | release-compliance.test.ts |
| Mağaza yokken satın alma arayüzü gizli, koda gömülü fiyat yok | **PASS** | Kod incelemesi + E2E Pazar ekranı |
| Aynı işlem kimliği iki kez uygulanmaz (altın, ikinci işçi) | **PASS** | economy.test.ts, release-compliance.test.ts |
| İlerleme sıfırlamada kalıcı ürün + işlem kimlikleri korunur | **PASS** | release-compliance.test.ts |
| Geri yükleme tekrar vermez | **PASS** | release-compliance.test.ts |
| Gerçek StoreKit / Play Billing satın alma, iptal, bekleyen, iade, geri yükleme | **BLOCKED** | Mağaza entegrasyonu ve sandbox hesapları yok (11) |
| İnternet kesintisi sırasında satın alma | **BLOCKED** | Aynı |
