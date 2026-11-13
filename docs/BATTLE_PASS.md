# Battle Pass ve oyun içi mağaza

Battle Pass XP'si oyuncu seviyesi XP'sinden ayrıdır. Dikey ödül yolunda her 100 BP XP bir seviyeyi açar; toplam 30 seviye, 3.000 XP. Günlük görevler Türkiye saatine göre gece yarısında değişir. Tamamlanıp alınmamış günlük veya haftalık XP ödülleri sonraki dönemde görevler bölümünde korunur. Seviye ödülleri tek tek alınır. 10. ve 20. seviyeyi eski kayıtta daha önce almış oyunculara sadece yeni eklenen 150'şer altınlık fark migrasyonda verilir; 30. seviyeyi almış oyunculara fener eklenir.

| Seviye | Ücretsiz ödül | Premium önizleme (yakında) |
| --- | --- | --- |
| 1 | 100 altın | 250 altın |
| 2 | 15 enerji | 30 enerji |
| 3 | 5 yıldız jetonu | 15 yıldız jetonu |
| 4 | 100 altın | 250 altın |
| 5 | 15 enerji + 2 Kış Kartı | 30 enerji |
| 6 | 5 yıldız jetonu | 15 yıldız jetonu |
| 7 | 100 altın | 250 altın |
| 8 | 15 enerji | 30 enerji |
| 9 | 5 yıldız jetonu | 15 yıldız jetonu |
| 10 | 250 altın + 2 Ay Işığı Kartı | 250 altın |
| 11 | 15 enerji | 30 enerji |
| 12 | 5 yıldız jetonu | 15 yıldız jetonu |
| 13 | 100 altın | 250 altın |
| 14 | 15 enerji | 30 enerji |
| 15 | 5 yıldız jetonu + 2 Kristal Atölye Kartı | 15 yıldız jetonu |
| 16 | 100 altın | 250 altın |
| 17 | 15 enerji | 30 enerji |
| 18 | 5 yıldız jetonu | 15 yıldız jetonu |
| 19 | 100 altın | 250 altın |
| 20 | 15 enerji + 150 altın + 2 Ay Işığı Atölye Kartı | 30 enerji |
| 21 | 5 yıldız jetonu | 15 yıldız jetonu |
| 22 | 100 altın | 250 altın |
| 23 | 15 enerji | 30 enerji |
| 24 | 5 yıldız jetonu | 15 yıldız jetonu |
| 25 | 100 altın + 2 Kış Kartı | 250 altın |
| 26 | 15 enerji | 30 enerji |
| 27 | 5 yıldız jetonu | 15 yıldız jetonu |
| 28 | 100 altın | 250 altın |
| 29 | 15 enerji | 30 enerji |
| 30 | 5 yıldız jetonu + Ay Işığı Feneri + 2 Ay Işığı Kartı | 15 yıldız jetonu |

Ay Işığı Feneri alınca dekorasyon envanterine girer ve açık bir vadi bölgesindeki uygun yere yerleştirilebilir. Premium satır gelecekteki içerik önizlemesidir; şu anda premium sahipliği veya ödülü vermez.

Pazara Türkiye günü başına birer kez alınabilen iki teklif eklendi: **5 tohum kutusu 80 altın**, **bir dal ve bir çakıl 40 altın**. Tema, atölye görünümü, dekorasyon, enerji, kapasite ve uygun devam eden üretime hızlandırıcı alışverişleri gerçek oyunda kazanılan yıldız jetonunu kullanır. TL etiketli ürünlerde gerçek ödeme kapalıdır. Geliştirme simülatörü ayrı kayıttadır; gerçek oyuna jeton veya ücretli hak aktarmaz.

Çevrimdışı yerel saat geriye alınırsa kaydedilen en yüksek saat kullanılır. Ancak sunucusuz bir oyunda cihaz saatini ileri almak ve yerel veriyi değiştirmek kesin olarak engellenemez; gerçek ödeme hakları için güvenilir sunucu ve mağaza doğrulaması gerekir.

Tarayıcı kontrolü: `npm run web` çalışırken `node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-season-web.mjs`. Test ayrı tarayıcı profili ve geçici oyun kaydı kullanır; `CHROME_PATH` ve `LUMA_WEB_URL` ortam değişkenleri isteğe bağlıdır. Test geçici ekran görüntülerini `/tmp` altında oluşturur.

Kart paketleri garantili iki kart içerir: Kış 80, Ay Işığı 100, Kristal Atölye 85 ve Ay Işığı Atölyesi 100 yıldız jetonu. On kart ilgili kozmetiği açar ve otomatik uygular. Her beşinci ücretsiz sezon ödülü ile altın aşamasındaki başarılar kart kazandırabilir. Daha önce alınan sezon dönüm noktalarına ait kartlar kayıt geçişinde korunarak eklenir.
