# Mobil düzen, kutular ve test profili

Üreticiler ve siparişler üstteki kontrol satırında açılır; üretici şeridi kapalıyken tahtanın altında ayrı bir satır yer tutmaz. Sezonun bildirimleri görev ve ödül kayıtlarından hesaplanır; ekranı ziyaret etmek bildirimi kaldırmaz.

375×812, 390×844, 393×852 ve 430×932 mobil web görüntülerinde sırasıyla 51, 53, 53 ve 59 px hücre ölçüldü. Önceki 375, 390 ve 430 px genişliklerde 50, 52 ve 58 px ölçülmüştü. Bunlar gerçek cihaz ölçümleri değildir.

Yeni kayıt 40 normal ve ilk gün için verilmiş 10 günlük kutu içerir. Normal dolum 270 saniyede bir gerçekleşir ve toplam kullanılabilir kutu 40'a ulaştığında durur. Günlük, enerjiyle alınan ve hediye kutuları ayrı izlenir. Enerji paketi 25 enerjiye 10 kutudur. Önceki kayıt tek toplam tuttuğundan 210 dahil geçmiş bakiyelerin kaynağı kesin olarak çıkarılamaz; tüm eski miktar `legacy` altında korunur. Önceki sistemde seviyeye +20, siparişe +5, keşfe +5, komboya +2 ve günlük +10 ödülleri birikiyordu; bunlar yüksek bakiye oluşturabilir, fakat belirli bir kaydın sebebini kanıtlamaz.

Başlangıç tüccarı ilk iki seviyede çiçek buketi ister; buğday ve süt erişilebilir olduğunda sonraki tarif, daha ileri seviyelerde meyve, domates, üzüm ve bahçe ürünlerinden açılmış tarifler kullanılır. Daha ileri tarifler kademeli süre ve ek XP verir. Önceden başlatılmış işler korunur. Diğer dükkânların tariflerinde ürün kaynakları kontrol edilir.

İşlemler sekmesinden normal kayıt kopyalanarak bağımsız geliştirme profili açılabilir. Test jetonu eklemeleri ve oyun içi jeton hareketleri bu profilin işlem geçmişinde tutulur; normal profile dönülebilir. Üretim sürümü test profilini ve test jetonu panelini açmaz. Gerçek ödeme yapılmaz.

`npm run web` çalışırken `node --no-warnings --import ./scripts/ts-register.mjs scripts/verify-mobile-layout.mjs`, `scripts/verify-dev-profile.mjs` ve `scripts/verify-season-notices.mjs` aynı Node seçenekleriyle çalıştırılabilir. Betikler geçici tarayıcı profilleri kullanır. Fiziksel iPhone veya iOS Simulator üzerinde doğrulama yapılmadı.
