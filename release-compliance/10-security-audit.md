# 10 · Güvenlik denetimi

| Kontrol | Durum | Kanıt |
|---|---|---|
| Depoda sır (API anahtarı, özel anahtar, token) | PASS | İzlenen tüm dosyalarda ve **tüm git geçmişinde** (`git log -p --all`) Google, OpenAI, GitHub, AWS, Slack ve PEM özel anahtar desenleri: 0 eşleşme |
| `.env`, imza anahtarları | PASS | `.gitignore`: `.env`, `.env.*`, `*.p8`, `*.p12`, `*.keystore`, `*.jks`; izlenen böyle dosya yok |
| Geliştiricinin `GOOGLE_API_KEY`'i | BİLGİ | Yalnız `~/.zshrc` içinde (depo dışında), oyun kodunda kullanılmıyor. Paylaşılmadıkça rotasyon gerekmez; görsel üretimi bitince silinebilir |
| Ağ iletişimi, HTTPS | UYGULANMAZ | Uygulama ağ isteği yapmıyor (test ile korunuyor) |
| Bağımlılık açıkları | PASS (kritik/yüksek yok) | `npm audit --omit=dev`: 5 orta (glob/minimatch, yalnız Expo CLI) · tüm ağaç: 1 düşük, 30 orta, 0 yüksek, 0 kritik |
| Zararlı / güvensiz kurulum betikleri | PASS | Kök `postinstall`: `setup-skia-web public` (Skia'nın resmi web dosyası kopyalama aracı) |
| Hassas veri loglama | PASS | Kişisel veri yok; `console` çağrıları yalnız sprite yükleme uyarısı |
| Üretimde debug | PASS | `expo-dev-client` Release derlemesine girmez; React Native Release'te dev menüsü kapalı |
| Kayıt bütünlüğü | PASS | Çift slot, sağlama toplamı, bozuk slottan eskiye dönüş, onarım (`tests/save.test.ts`) |
| Satın alma güvenliği | KOŞULLU | Motor yalnız `grantPurchase`/`grantWorkerPurchase` ile ve işlem kimliğiyle tek seferlik verir; doğrulanmamış sonuç asla başarı sayılmaz. Gerçek satışta **sunucu taraflı makbuz doğrulama** önerilir (11) |
| Hile / kayıt düzenleme | KABUL EDİLEN RİSK | Çevrimdışı tek oyunculu oyun: cihazdaki kaydı değiştiren kişi yalnız kendi oyununu etkiler; rekabetçi veya paylaşılan ekonomi yok |
| Web sürümü başlıkları (CSP, HSTS) | UYGULANMAZ | Web sürümü yayınlanmıyor; yayınlanırsa 24. madde |
