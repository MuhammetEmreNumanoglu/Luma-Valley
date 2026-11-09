# 05 · KVKK ve GDPR değerlendirmesi

> Bu bir teknik değerlendirmedir, hukuki görüş değildir. Kesin sonuç için bir hukukçuya danışın (18-manual-actions-required.md).

## Temel tespit

Uygulama, yayıncının erişebildiği hiçbir kişisel veriyi işlemiyor: sunucu, hesap, analytics, reklam, çökme raporu ve ağ isteği yok (04-privacy-data-inventory.md). Cihazdaki oyun kaydı kullanıcının kendi cihazında kalır ve yayıncıya ulaşmaz.

| Konu | Değerlendirme | Durum |
|---|---|---|
| KVKK (6698) aydınlatma yükümlülüğü | Yayıncı kişisel veri işlemediği sürece kapsam sınırlı. Yine de şeffaflık için uygulama içi gizlilik politikası ve `legal/kvkk-notice.md` hazırlandı | PASS (metin) |
| Açık rıza | Rıza gerektiren işlem yok; rıza penceresi eklenmedi (gereksiz pencere eklenmemesi istendi) | UYGULANMAZ |
| Veri minimizasyonu, amaçla sınırlılık | Yalnız oyun durumu, yalnız cihazda | PASS |
| Saklama süresi, silme | Kullanıcı kendisi siler: İlerlemeyi sıfırla / uygulamayı sil | PASS |
| Erişim, düzeltme, taşınabilirlik talepleri | Yayıncıda kayıt yok; talep kanalı destek e-postası olacak | MANUEL (e-posta) |
| Yurt dışına aktarım | Yayıncı tarafından aktarım yok. Mağaza (Apple/Google) kendi işleme faaliyetlerinden sorumludur | UYGULANMAZ |
| VERBİS | Kişisel veri işlenmediğinde kayıt yükümlülüğü konu dışı görünür; istisna kriterleri ve şirketleşme durumunuz hukukçuyla teyit edilmeli | MANUEL (hukuki teyit) |
| GDPR kapsamı / AB temsilcisi (m. 27) | AB'deki kişilerin verisi işlenmediği için temsilci gerekmesi beklenmez; satın alma doğrulama sunucusu eklenirse yeniden değerlendirin | UYGULANMAZ (şimdilik) |
| ePrivacy / çerez | Uygulamada çerez veya cihaz erişimli izleme yok. Web sürümü yayınlanırsa yalnız `localStorage` (oyun kaydı) kullanır: kullanıcının istediği hizmet için zorunlu depolama | PASS |
| Çocukların verileri | Hiçbir yaşta veri toplanmıyor | PASS |
| Veri ihlali müdahalesi | Yayıncıda veri yok; cihaz verisi işletim sisteminin korumasında | UYGULANMAZ |

## Gelecekte değişirse

Sunucu taraflı makbuz doğrulama, bulut kayıt, analytics veya reklam eklenirse: veri envanteri, gizlilik politikası, App Privacy ve Data Safety beyanları, KVKK aydınlatma metni, gerekirse VERBİS ve yurt dışı aktarım değerlendirmesi **özellik yayımlanmadan önce** güncellenmelidir.
