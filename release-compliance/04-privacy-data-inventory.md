# 04 · Kişisel veri envanteri

Yöntem: kaynak kod taraması (ağ API'si yok; otomatik test ile korunuyor), yüklü SDK listesi, web sürümünde tüm ağ trafiğinin kaydı (Ayarlar, Gizlilik, Lisanslar akışı sırasında **0 dış istek**, `scripts/qa/settings-legal-check.mjs`).

## Cihazda saklanan veriler (sunucuya gitmez)

| Veri | Neden | Nerede | Kimle paylaşılır | Süre | Silme |
|---|---|---|---|---|---|
| Oyun ilerlemesi (tahta, envanter, görevler, altın, jeton, enerji, seviye, keşifler) | Oyunu sürdürmek | AsyncStorage, `luma.save.a` / `luma.save.b` | Kimseyle | Uygulama silinene veya sıfırlanana kadar | Ayarlar → İlerlemeyi sıfırla; uygulamayı silmek |
| Ayarlar (dil, ses, titreşim, hareket, grafik) | Tercihleri hatırlamak | Kayıt içinde | Kimseyle | Aynı | Aynı |
| Son açık sekme | Yeniden açınca aynı ekrana dönmek | AsyncStorage `luma.ui.screen` | Kimseyle | Aynı | Sıfırlama bunu da siler |
| Mağaza işlem kimlikleri (satın alma etkinleşince) | Aynı ürünü iki kez vermemek, geri yükleme | Kayıt içinde | Kimseyle (mağaza zaten sahibi) | Kalıcı | Uygulamayı silmek |

Bu kategorilerin hiçbiri Apple/Google tanımında "toplanan veri" değildir, çünkü cihazdan çıkmaz.

Taranan ve **bulunmayan** veriler: ad, e-posta, telefon, IP (uygulama tarafından), cihaz/reklam tanımlayıcısı, konum, analytics olayı, çökme raporu, bildirim jetonu, destek mesajı, kullanıcı içeriği.

Not: Mağazalar (Apple, Google) ve işletim sistemi indirme, güncelleme ve kendi çökme raporlarını kendi politikalarına göre işler; geliştiricinin SDK'sı yoktur. Satın alma etkinleşince ödeme verisini mağaza işler.

## Mağaza beyan cevapları

**Apple App Privacy:** "Data Not Collected" (Veri toplanmıyor). İzleme: Hayır.

**Google Play Data Safety:** Veri toplanıyor mu: Hayır · Paylaşılıyor mu: Hayır · Aktarımda şifreleme: aktarım yok · Silme talebi: veri toplanmadığı için uygulanmaz · Gizlilik politikası URL'si: barındırılan `legal/privacy-policy.html`.

Bu cevaplar, gelecekte sunucu taraflı makbuz doğrulama eklenirse değişir (işlem kimliği ve satın alma geçmişi "toplanan veri" olur): 11-purchases-and-subscriptions.md.
