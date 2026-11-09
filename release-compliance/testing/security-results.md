# Güvenlik tarama sonuçları (2026-11-09)

| Tarama | Sonuç |
|---|---|
| Sır taraması, izlenen dosyalar (Google/OpenAI/GitHub/AWS/Slack anahtar desenleri, PEM özel anahtar) | **PASS** — 0 eşleşme |
| Sır taraması, tüm git geçmişi (`git log -p --all`) | **PASS** — 0 eşleşme |
| İzlenen `.env` / imza anahtarı dosyası | **PASS** — yok; `.gitignore` kapsıyor |
| `npm audit --omit=dev` | 0 kritik, 0 yüksek, **5 orta** (glob, minimatch → @expo/cli, @expo/fingerprint; derleme aracı) |
| `npm audit` (tüm ağaç) | 0 kritik, 0 yüksek, 30 orta, 1 düşük (geliştirme araçları) |
| Kaynak kodda ağ API'si (fetch/XHR/WebSocket/EventSource/sendBeacon) | **PASS** — yok (otomatik test) |
| Çalışma anında dış istek (web, gerçek tarayıcı) | **PASS** — 0 |
| Lisans taraması (489 çalışma zamanı paketi) | **PASS** — yalnız-GPL/AGPL yok; inceleme notları 06 |
