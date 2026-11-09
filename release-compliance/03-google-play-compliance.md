# 03 · Google Play uyumu

| Kontrol | Durum | Kanıt / açıklama |
|---|---|---|
| Target API (31 Ağu 2026'dan itibaren yeni uygulama/güncelleme API 36) | PASS | RN 0.88 `targetSdk = "36"`, `compileSdk = "37"`, `minSdk = "24"` |
| İzinler | PASS | Etkin izinler: `INTERNET` (normal, çalışma anında istenmez), `MODIFY_AUDIO_SETTINGS` (normal, ses çalma). Engellenen: `RECORD_AUDIO`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW` |
| Ön plan servisi beyanı | UYGULANMAZ | Ön plan servisi kalmadı |
| Data Safety formu | MANUEL | Veri toplanmıyor ve paylaşılmıyor; form yine de doldurulmalı ve gizlilik politikası bağlantısı verilmeli. Cevaplar: 04-privacy-data-inventory.md |
| Gizlilik politikası URL'si | MANUEL | `legal/privacy-policy.html` barındırılmalı |
| Hesap silme (uygulama içi + web) | UYGULANMAZ | Hesap yok |
| Play Billing | KOŞULLU | Mağaza yapılandırılınca; dijital ürünler yalnız Play Billing ile satılmalı |
| Hedef kitle ve içerik | MANUEL | Families programı seçilirse ek şartlar (14-age-rating) |
| Reklam beyanı | PASS | "Reklam içermiyor" |
| App Bundle ve imzalama | BLOCKED | EAS Build + Play App Signing; hesap gerekli |
| Kapalı test şartı (yeni kişisel geliştirici hesapları) | MANUEL | Play Console'un o an gösterdiği tester ve süre şartına göre |
| Cihaz uyumluluğu, ANR/çökme | BLOCKED | Gerçek cihaz testi yapılmadı |
