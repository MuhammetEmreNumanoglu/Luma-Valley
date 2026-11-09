# 15 · Erişilebilirlik ve kullanıcı deneyimi

| Kontrol | Durum | Kanıt / not |
|---|---|---|
| Ekran okuyucu etiketleri | KISMEN | Ana butonlar, sekmeler, tahta, dükkânlar, kutu, jeton "Topla", olasılık çipleri `accessibilityLabel` taşıyor. Tahtadaki tek tek ürünler Skia ile çizildiği için ekran okuyucuya ayrı ayrı açıklanmıyor (bilinen sınır) |
| Dokunma hedefleri | KISMEN | Alt sekmeler ≥54 pt, tahta hücresi 390 pt ekranda 52 pt; dükkân satırı yuvaları 40 pt yükseklikte (önerilen 44 pt) |
| Metin boyutu | AÇIK (P2) | Dükkân adları 7 pt, bazı rozetler 10–11 pt: küçük. Sistem yazı boyutu büyütme sınırlı test edildi |
| Hareketi azalt | PASS | Ayarlar'da + sistem ayarı dikkate alınıyor |
| Titreşim / ses kontrolleri | PASS | Ayrı ayrı kapatılabilir |
| Renk körlüğü | KISMEN | Yeni ürünler renk **ve** şekille ayrılıyor; geçerli/geçersiz bırakma göstergesi yeşil/kırmızı (yalnız renk) |
| Türkçe karakter, iki dil | PASS | TR/EN tüm metinler test ile eşleşiyor |
| Güvenli alan / çentik | KISMEN | `react-native-safe-area-context`; gerçek iPhone'da doğrulanmadı |
| Yanıltıcı satın alma arayüzü | PASS | Düzeltildi (01 #2, #3) |
| Kritik işlemlerde onay | PASS | İlerleme sıfırlama, alan açma, iş iptali, hemen bitir onay istiyor |

Not: AB Erişilebilirlik Yasası (EAA) e-ticaret hizmetlerini kapsar; mikro işletmeler için istisnalar vardır. Uygulama içi satış başladığında kapsamın hukukçuyla teyidi önerilir.
