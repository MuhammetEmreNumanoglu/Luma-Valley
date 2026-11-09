# 13 · İzinler ve izleme

## Önce / sonra (`npx expo config --type introspect` ile)

| Platform | İzin / anahtar | Önce | Sonra | Neden |
|---|---|---|---|---|
| iOS | `NSMicrophoneUsageDescription` | Vardı (expo-audio varsayılanı) | **Yok** | Ses kaydı yok |
| iOS | `UIBackgroundModes: audio` | Vardı | **Yok** | Arka planda ses çalınmıyor |
| iOS | `NSLocalNetworkUsageDescription` | Var | Var (yalnız geliştirme derlemesi) | expo-dev-launcher Release derlemesinde siler |
| Android | `RECORD_AUDIO` | Vardı | **Engellendi** | Ses kaydı yok |
| Android | `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK` | Vardı | **Engellendi** | Ön plan servisi yok |
| Android | `READ/WRITE_EXTERNAL_STORAGE` | Vardı | **Engellendi** | Harici depolama kullanılmıyor |
| Android | `SYSTEM_ALERT_WINDOW` | Debug'da | **Engellendi** | Kullanılmıyor |
| Android | `INTERNET` | Var | Var | Normal izin (çalışma anında sorulmaz); geliştirme sunucusu ve ileride mağaza ödemesi için |
| Android | `MODIFY_AUDIO_SETTINGS` | Var | Var | Normal izin; ses çalma |

Kamera, fotoğraf, konum, rehber, Bluetooth, hareket, takvim, sağlık, bildirim izinleri: **istenmiyor**. Çalışma anında hiçbir izin penceresi açılmaz.

## İzleme

IDFA / reklam kimliği, ATT, analytics, çapraz uygulama izleme: **yok**. ATT penceresi eklenmedi (gerekmiyor). Privacy Manifest `NSPrivacyTracking: false`, izleme alan adı yok.
